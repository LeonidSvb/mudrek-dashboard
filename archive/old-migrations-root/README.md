# Database Migration Instructions

## Автоматический запуск миграции

### Вариант 1: Supabase SQL Editor (Рекомендуется)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите проект
3. SQL Editor → New Query
4. Скопируйте весь контент из `001_create_hubspot_tables.sql`
5. Run

**Время выполнения:** ~30 секунд

---

### Вариант 2: Через Node.js скрипт

```bash
node run-migration.js
```

**Примечание:** Может потребоваться ручное выполнение если Supabase API ограничивает SQL execution.

---

## Что создаст миграция

### Таблицы (4 шт):

1. **hubspot_contacts_raw** - 29k контактов
   - Hybrid schema: 8 колонок + raw_json (JSONB)
   - Indexes: phone, email, createdate

2. **hubspot_deals_raw** - 1k сделок
   - Hybrid schema: 12 колонок + raw_json (JSONB)
   - Indexes: dealstage, amount, closedate

3. **hubspot_calls_raw** - 8k+ звонков
   - Hybrid schema: 6 колонок + raw_json (JSONB)
   - Indexes: call_to_number, call_duration, call_timestamp

4. **sync_logs** - Логи синхронизации
   - Tracking: records_fetched, records_inserted, records_updated, errors
   - Indexes: sync_started_at, status

---

### Views (3 шт):

1. **deals_with_contacts** - Deals с извлеченными contact associations
2. **calls_with_contacts** - Calls связанные с Contacts через phone
3. **sync_summary** - Последние 50 синхронизаций

---

### Triggers:

- Auto-update `updated_at` на каждом UPDATE

---

## Проверка после миграции

```bash
# Запустить проверку
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tables = ['hubspot_contacts_raw', 'hubspot_deals_raw', 'hubspot_calls_raw', 'sync_logs'];
for (const table of tables) {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  console.log(\`✓ \${table}: \${count} rows\`);
}
"
```

Или в Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'hubspot_%';

-- Check views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';

-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'hubspot_%';
```

---

## Откат миграции (если нужно)

```sql
-- ВНИМАНИЕ: Удалит все данные!
DROP TABLE IF EXISTS hubspot_contacts_raw CASCADE;
DROP TABLE IF EXISTS hubspot_deals_raw CASCADE;
DROP TABLE IF EXISTS hubspot_calls_raw CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP VIEW IF EXISTS deals_with_contacts CASCADE;
DROP VIEW IF EXISTS calls_with_contacts CASCADE;
DROP VIEW IF EXISTS sync_summary CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## Следующие шаги

После успешной миграции:

1. ✅ Создать TypeScript logger → `frontend/lib/logger.ts`
2. ✅ Мигрировать HubSpot API → `frontend/lib/hubspot/api.ts`
3. ✅ Создать Sync route → `frontend/app/api/sync/route.ts`
4. ✅ Первый тестовый sync (100 records)
5. ✅ Full sync (все данные)

---

## Troubleshooting

**"Permission denied":**
- Используете SUPABASE_SERVICE_KEY (не ANON_KEY)
- Проверьте права доступа в Supabase Dashboard

**"Relation already exists":**
- Таблицы уже созданы, миграция выполнена ранее
- Проверьте: `SELECT * FROM hubspot_contacts_raw LIMIT 1;`

**"Too many statements":**
- Выполняйте миграцию по блокам (CREATE TABLE, потом CREATE INDEX, потом CREATE VIEW)
