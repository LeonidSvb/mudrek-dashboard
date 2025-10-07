# Discovery Scripts (One-time)

Эти скрипты были использованы для анализа данных и проверки миграций.
**Не нужны для production**, сохранены для истории.

## Использованные скрипты:

### Data Analysis
- `check-available-fields.js` - Проверка доступных полей в таблицах
- `check-call-associations.js` - Анализ связей звонков с контактами/сделками
- `check-currency.js` - Определение валюты (₪ vs $)
- `check-relationships.js` - Проверка связей между таблицами
- `check-raw-json-owner.js` - Поиск owner_id в JSONB
- `check-calls-count.js` - Подсчет звонков

### Testing
- `test-owner-tracking.js` - Тестирование отслеживания по менеджерам
- `verify-owner-columns.js` - Проверка owner columns после миграции

### Migration Helpers
- `execute-migration.js` - Запуск 001 миграции
- `run-migration.js` - Альтернативный способ миграции
- `run-migration-002.js` - Запуск 002 миграции (owner columns)

---

## Результаты discovery:

**Данные:**
- 31,636 контактов
- 1,193 сделок
- 118,799 звонков

**Валюта:** Israeli Shekels (₪)

**Owner tracking:** ✅ Работает
- 86.8% контактов имеют owner_id
- 100% сделок имеют owner_id
- 8 менеджеров

---

## Для production используй:

**Утилиты:**
- `check-sync-status.js` (в корне) - мониторинг синхронизации

**Sync скрипты:**
- `src/hubspot/sync-parallel.js` - Full sync
- `src/hubspot/sync-incremental.js` - Incremental sync
- `src/hubspot/fetch-owners.js` - Загрузка owners

**Миграции:**
- `migrations/001_create_hubspot_tables.sql`
- `migrations/002_add_owner_columns.sql`
