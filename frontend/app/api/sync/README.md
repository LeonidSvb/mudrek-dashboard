# HubSpot → Supabase Sync API

Автоматическая синхронизация данных из HubSpot CRM в Supabase PostgreSQL.

## Endpoint

```
POST /api/sync
```

## Что синхронизируется

1. **Contacts** (29k записей)
   - Email, phone, name, lifecycle stage
   - VSL tracking (vsl_watched, vsl_watch_duration)
   - Sales script version (A/B testing)
   - Все associations (deals, calls)

2. **Deals** (1k записей)
   - Amount, stage, dates
   - Qualified/trial status
   - Payment tracking
   - Cancellation, refunds, installments
   - Все associations (contacts)

3. **Calls** (8k+ записей)
   - Duration, direction, timestamps
   - Phone numbers (для linking с contacts)
   - Call disposition (pickup rate)

## Как работает

### 1. Parallel Sync
Все 3 типа объектов синхронизируются **параллельно** (в 3 раза быстрее):

```typescript
await Promise.allSettled([
  syncContacts(),
  syncDeals(),
  syncCalls()
]);
```

### 2. Transformation
HubSpot data → Supabase hybrid schema:
- **Columns**: 8-10 часто используемых полей (для быстрых запросов)
- **raw_json**: ВСЕ данные включая associations (JSONB для гибкости)

### 3. UPSERT
```sql
INSERT INTO hubspot_contacts_raw (...)
VALUES (...)
ON CONFLICT (hubspot_id) DO UPDATE SET ...
```
- Новые записи → INSERT
- Существующие → UPDATE
- Нет дубликатов

### 4. Batch Processing
```typescript
const BATCH_SIZE = 500;
for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  await supabase.from('table').upsert(batch);
}
```

### 5. Logging
Каждая синхронизация логируется в `sync_logs`:
- Количество fetched/inserted/updated/failed records
- Duration
- Status (success/partial/failed)
- Error messages

## Использование

### Ручной запуск

```bash
# Из Next.js проекта
curl -X POST http://localhost:3000/api/sync

# Или через fetch
fetch('/api/sync', { method: 'POST' })
  .then(res => res.json())
  .then(console.log);
```

### Автоматический (Vercel Cron)

Создать `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/sync",
    "schedule": "0 * * * *"
  }]
}
```

Запуск каждый час.

## Response

```json
{
  "success": true,
  "results": {
    "contacts": {
      "object_type": "contacts",
      "records_fetched": 29000,
      "records_inserted": 0,
      "records_updated": 29000,
      "records_failed": 0,
      "status": "success",
      "duration_seconds": 45
    },
    "deals": {
      "object_type": "deals",
      "records_fetched": 1000,
      "records_updated": 1000,
      "status": "success",
      "duration_seconds": 12
    },
    "calls": {
      "object_type": "calls",
      "records_fetched": 8100,
      "records_updated": 8100,
      "status": "success",
      "duration_seconds": 65
    }
  },
  "total_duration_seconds": 120
}
```

## Мониторинг

### Просмотр логов синхронизации

```sql
-- Последние 10 синхронизаций
SELECT * FROM sync_summary;

-- Статистика по типу объекта
SELECT
  object_type,
  COUNT(*) as total_syncs,
  AVG(duration_seconds) as avg_duration,
  SUM(records_fetched) as total_fetched,
  SUM(records_updated) as total_updated
FROM sync_logs
WHERE sync_started_at > NOW() - INTERVAL '7 days'
GROUP BY object_type;

-- Ошибки за последние 24 часа
SELECT * FROM sync_logs
WHERE status = 'failed'
  AND sync_started_at > NOW() - INTERVAL '24 hours';
```

### Dashboard метрики

```typescript
import { getSyncStats } from '@/lib/logger';

// Общая статистика
const stats = await getSyncStats();

// По конкретному типу
const contactsStats = await getSyncStats('contacts');
```

## Troubleshooting

### "HUBSPOT_API_KEY is not defined"
Проверь `.env.local`:
```bash
HUBSPOT_API_KEY=pat-...
```

### "Supabase insert failed"
1. Проверь миграцию выполнена:
   ```sql
   SELECT * FROM hubspot_contacts_raw LIMIT 1;
   ```
2. Проверь SUPABASE_SERVICE_KEY в .env.local

### Sync слишком долгий (>5 минут)
- Vercel Functions имеют лимит 10 минут (Hobby plan)
- Можно разбить на несколько endpoint (/api/sync/contacts, /api/sync/deals, /api/sync/calls)
- Или использовать Background Jobs (BullMQ, Inngest)

### Partial sync (некоторые records failed)
Проверь `sync_logs` для деталей:
```sql
SELECT * FROM sync_logs
WHERE status = 'partial'
ORDER BY sync_started_at DESC
LIMIT 1;
```

## Производительность

**Ожидаемое время:**
- Contacts (29k): ~45 секунд
- Deals (1k): ~12 секунд
- Calls (8k): ~65 секунд
- **Total: ~2 минуты** (параллельная синхронизация)

**Bottlenecks:**
1. HubSpot API rate limits (100 records/request, max 10 req/sec)
2. Network latency
3. Supabase batch insert speed

**Оптимизация:**
- ✅ Parallel sync (3x faster)
- ✅ Batch processing (500 records/batch)
- ✅ UPSERT вместо DELETE+INSERT
- ✅ Indexes на hubspot_id
