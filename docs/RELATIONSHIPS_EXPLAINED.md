# Объяснение связей между таблицами

## Текущее состояние

### Связи через owner_id ✅
```sql
-- Deals по менеджеру
SELECT d.*, o.owner_name
FROM hubspot_deals_raw d
JOIN hubspot_owners o ON d.hubspot_owner_id = o.owner_id
WHERE o.owner_name = 'Shadi Halloun';

-- Contacts того же менеджера
SELECT c.*, o.owner_name
FROM hubspot_contacts_raw c
JOIN hubspot_owners o ON c.hubspot_owner_id = o.owner_id
WHERE o.owner_name = 'Shadi Halloun';
```

**Итог:** Связь через owner_id работает отлично для дашборда!

---

## JSONB - насколько полезен?

### ✅ JSONB очень полезен! Примеры:

**1. Извлечение полей on-the-fly:**
```sql
-- Мы УЖЕ использовали для owner_id
SELECT raw_json->>'hubspot_owner_id' as owner_id
FROM hubspot_contacts_raw;

-- Можем получить любое поле
SELECT
  email,
  raw_json->>'company' as company,
  raw_json->>'hs_lead_status' as lead_status
FROM hubspot_contacts_raw;
```

**2. Фильтрация по JSONB:**
```sql
SELECT * FROM hubspot_deals_raw
WHERE raw_json->>'payment_method' = 'credit_card';
```

**3. GIN индексы для быстрых запросов:**
```sql
-- Уже создан в миграции 001
CREATE INDEX idx_contacts_raw_json ON hubspot_contacts_raw USING GIN (raw_json);

-- Теперь запросы быстрые:
SELECT * FROM hubspot_contacts_raw
WHERE raw_json @> '{"lifecyclestage": "customer"}';
```

**4. Доступ к вложенным объектам:**
```sql
-- Если associations были бы сохранены:
SELECT
  hubspot_id,
  raw_json->'associations'->'deals' as related_deals
FROM hubspot_contacts_raw;
```

---

## Нужны ли дополнительные связи?

### ❌ Foreign Keys НЕ НУЖНЫ для дашборда

**Почему:**
1. JOIN по owner_id работает отлично
2. Foreign keys замедляют INSERT/UPDATE (а у нас sync каждые 2 часа)
3. HubSpot сам управляет связями через associations
4. Для аналитики достаточно JOIN on-the-fly

### ✅ Что у нас уже есть:

**Таблица owners (справочник):**
```sql
hubspot_owners (
  owner_id TEXT PRIMARY KEY,
  owner_name TEXT,
  owner_email TEXT
)
```

**JOIN для метрик:**
```sql
-- Total Sales по менеджеру
SELECT
  o.owner_name,
  COUNT(d.hubspot_id) as deals_count,
  SUM(d.amount) as total_sales
FROM hubspot_deals_raw d
JOIN hubspot_owners o ON d.hubspot_owner_id = o.owner_id
WHERE d.dealstage = 'closedwon'
GROUP BY o.owner_name;
```

---

## Рекомендации для дашборда

### ✅ Используй JOIN в SQL запросах:
```typescript
// В API route
const { data } = await supabase
  .from('hubspot_deals_raw')
  .select(`
    *,
    owner:hubspot_owners(owner_name, owner_email)
  `)
  .eq('hubspot_owner_id', ownerId);
```

### ✅ JSONB для дополнительных полей:
```typescript
// Если нужно поле которого нет в колонках
const { data } = await supabase
  .from('hubspot_deals_raw')
  .select('hubspot_id, amount, raw_json->payment_method as payment_method');
```

---

## Итог

**Что имеем:**
- ✅ Связь через owner_id (contacts ↔ deals)
- ✅ JSONB с GIN индексами для гибких запросов
- ✅ Справочник owners для JOIN

**Что НЕ нужно:**
- ❌ Foreign keys между таблицами
- ❌ Дополнительные связующие таблицы
- ❌ Re-sync для добавления associations (достаточно owner_id)

**Для дашборда этого достаточно!**
