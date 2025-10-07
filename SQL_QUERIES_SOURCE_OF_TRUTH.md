# SQL Queries - Source of Truth

## Временная связь Calls ↔ Contacts через телефон

```sql
-- CREATE VIEW для связи calls с contacts через phone matching
CREATE OR REPLACE VIEW call_contact_matches AS
SELECT
  c.hubspot_id as call_id,
  c.call_timestamp,
  c.call_duration,
  c.call_to_number,
  ct.hubspot_id as contact_id,
  ct.phone as contact_phone,
  ct.firstname,
  ct.lastname,
  ct.hubspot_owner_id
FROM hubspot_calls_raw c
INNER JOIN hubspot_contacts_raw ct ON (
  -- Normalize phone numbers for matching
  REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g') = REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
  OR c.call_to_number = ct.phone
)
WHERE ct.phone IS NOT NULL;
```

## Метрики через raw_json (JSONB queries)

### 1. Lifecyclestage distribution
```sql
SELECT
  raw_json->>'lifecyclestage' as stage,
  COUNT(*) as count
FROM hubspot_contacts_raw
WHERE raw_json->>'lifecyclestage' IS NOT NULL
GROUP BY raw_json->>'lifecyclestage'
ORDER BY count DESC;
```

### 2. Call disposition breakdown
```sql
SELECT
  raw_json->>'hs_call_disposition' as disposition_id,
  COUNT(*) as calls_count,
  AVG(call_duration::numeric) / 60000 as avg_duration_minutes
FROM hubspot_calls_raw
WHERE raw_json->>'hs_call_disposition' IS NOT NULL
GROUP BY raw_json->>'hs_call_disposition'
ORDER BY calls_count DESC;
```

### 3. Calls per contact (через phone matching)
```sql
SELECT
  ct.hubspot_id,
  ct.firstname,
  ct.lastname,
  ct.phone,
  COUNT(c.hubspot_id) as total_calls,
  AVG(c.call_duration::numeric) / 60000 as avg_call_minutes
FROM hubspot_contacts_raw ct
LEFT JOIN hubspot_calls_raw c ON (
  REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g') = REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
)
WHERE ct.phone IS NOT NULL
GROUP BY ct.hubspot_id, ct.firstname, ct.lastname, ct.phone
HAVING COUNT(c.hubspot_id) > 0
ORDER BY total_calls DESC
LIMIT 100;
```

### 4. Followup rate (повторные звонки)
```sql
WITH contact_calls AS (
  SELECT
    REGEXP_REPLACE(call_to_number, '[^0-9]', '', 'g') as normalized_phone,
    COUNT(*) as call_count
  FROM hubspot_calls_raw
  WHERE call_to_number IS NOT NULL
  GROUP BY REGEXP_REPLACE(call_to_number, '[^0-9]', '', 'g')
)
SELECT
  COUNT(*) FILTER (WHERE call_count > 1) as contacts_with_followup,
  COUNT(*) as total_contacts_called,
  ROUND((COUNT(*) FILTER (WHERE call_count > 1)::numeric / COUNT(*)) * 100, 2) as followup_rate
FROM contact_calls;
```

### 5. Average followups per contact
```sql
WITH contact_calls AS (
  SELECT
    REGEXP_REPLACE(call_to_number, '[^0-9]', '', 'g') as normalized_phone,
    COUNT(*) as call_count
  FROM hubspot_calls_raw
  WHERE call_to_number IS NOT NULL
  GROUP BY REGEXP_REPLACE(call_to_number, '[^0-9]', '', 'g')
)
SELECT
  ROUND(AVG(call_count), 2) as avg_calls_per_contact,
  MAX(call_count) as max_calls_to_one_contact,
  MIN(call_count) as min_calls
FROM contact_calls;
```

### 6. Time to first contact (через phone matching)
```sql
WITH first_calls AS (
  SELECT
    ct.hubspot_id as contact_id,
    ct.createdate as contact_created,
    MIN(c.call_timestamp) as first_call_time
  FROM hubspot_contacts_raw ct
  INNER JOIN hubspot_calls_raw c ON (
    REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g') = REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
  )
  WHERE ct.phone IS NOT NULL
    AND ct.createdate IS NOT NULL
    AND c.call_timestamp IS NOT NULL
  GROUP BY ct.hubspot_id, ct.createdate
)
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (first_call_time - contact_created)) / 3600), 2) as avg_hours_to_first_contact,
  ROUND(AVG(EXTRACT(EPOCH FROM (first_call_time - contact_created)) / 86400), 2) as avg_days_to_first_contact,
  COUNT(*) as contacts_with_calls
FROM first_calls
WHERE first_call_time > contact_created; -- Only count calls AFTER contact creation
```

### 7. Pickup rate (через call_disposition)
**ВАЖНО**: Сначала нужно получить mapping disposition UUID → текст из HubSpot API

```sql
-- Temporary: count dispositions
SELECT
  raw_json->>'hs_call_disposition' as disposition,
  COUNT(*) as count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER ()) * 100, 2) as percentage
FROM hubspot_calls_raw
WHERE raw_json->>'hs_call_disposition' IS NOT NULL
GROUP BY raw_json->>'hs_call_disposition'
ORDER BY count DESC;
```

## Что НЕ МОЖЕМ посчитать без resync:

### ❌ Точная связь calls → deals
- Нужно: `associations.deals` из HubSpot API
- Решение: Обновить sync script

### ❌ Точная связь calls → specific contacts
- Phone matching = 80-90% точность (дубликаты телефонов, форматы)
- Решение: Получать `associations.contacts` из API

### ❌ Декодировать call_disposition UUID
- UUID в базе: `73a0d17f-1163-4015-bdd5-ec830791da20`
- Нужно: Получить список dispositions из HubSpot account settings
- Решение: API запрос `/crm/v3/properties/calls/hs_call_disposition`

## Следующие шаги:

1. ✅ **Создать VIEW** `call_contact_matches` (выше)
2. 📊 **Добавить 3 новые метрики** (используя phone matching):
   - Followup rate
   - Avg followups per contact
   - Time to first contact
3. 🔧 **Обновить sync script** для получения associations (опционально, для 100% точности)
