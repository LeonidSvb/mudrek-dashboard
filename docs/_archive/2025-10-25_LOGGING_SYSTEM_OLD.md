# Система логирования для HubSpot Sync

> Документация по универсальной системе логирования (скопирована из VAPI проекта)

## Обзор

Двухуровневая система логирования для отслеживания выполнения cron jobs (синхронизация, анализ, оптимизация):

- **`runs`** - метаданные выполнения (верхний уровень)
- **`logs`** - детальные пошаговые логи (нижний уровень)

---

## Таблица `runs`

### Назначение
Хранит метаданные выполнения скриптов: статус, метрики, время выполнения.

### Структура

```sql
CREATE TABLE runs (
  -- Идентификаторы
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL DEFAULT nextval('sync_logs_id_seq'),
  batch_id UUID,  -- Группировка связанных операций

  -- Метаданные скрипта
  script_name TEXT NOT NULL,  -- 'vapi-sync', 'qci-analysis', 'hubspot-sync-incremental', 'hubspot-sync-full'
  triggered_by TEXT DEFAULT 'manual',  -- 'manual', 'github-actions', 'cron'

  -- Время выполнения
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Статус
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  error_message TEXT,

  -- Метрики синхронизации (для sync скриптов)
  records_fetched INTEGER,
  records_inserted INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,
  sync_mode TEXT,  -- 'full', 'incremental', 'auto'
  sync_start_date TIMESTAMPTZ,  -- Начало периода синхронизации (с overlap)
  sync_end_date TIMESTAMPTZ,    -- Конец периода синхронизации

  -- Метрики анализа (для analysis скриптов)
  calls_analyzed INTEGER,
  api_cost NUMERIC,  -- Стоимость API вызовов (OpenAI, etc)

  -- Гибкие метаданные
  metadata JSONB DEFAULT '{}'
);
```

### Ключевые поля

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | UUID | Основной ключ (UUID) | `095517c2-4506-47a9-bdc9-a742cfba52e2` |
| `legacy_id` | BIGINT | Старый ID для обратной совместимости | `44` |
| `script_name` | TEXT | Название скрипта | `hubspot-sync-incremental` |
| `status` | TEXT | Статус выполнения | `running`, `success`, `error` |
| `triggered_by` | TEXT | Источник запуска | `manual`, `github-actions` |
| `duration_ms` | INTEGER | Длительность в миллисекундах | `5730` |
| `sync_mode` | TEXT | Режим синхронизации | `incremental`, `full` |
| `metadata` | JSONB | Дополнительные метаданные | `{"field_count": 35}` |

### Constraints

```sql
-- Статус должен быть только одним из трех
CHECK (status IN ('running', 'success', 'error'))

-- Обязательные поля
NOT NULL: id, legacy_id, script_name, status
```

### Примеры данных

```json
{
  "id": "891cca71-5002-44cf-bde2-fd0f4dc3b873",
  "script_name": "hubspot-sync-incremental",
  "status": "success",
  "triggered_by": "github-actions",
  "started_at": "2025-10-25T01:45:04.447Z",
  "finished_at": "2025-10-25T01:45:14.695Z",
  "duration_ms": 10248,
  "records_fetched": 150,
  "records_inserted": 10,
  "records_updated": 140,
  "records_failed": 0,
  "sync_mode": "incremental",
  "sync_start_date": "2025-10-24T16:31:24.623Z",
  "sync_end_date": "2025-10-25T01:45:07.821Z"
}
```

---

## Таблица `logs`

### Назначение
Хранит детальные пошаговые логи выполнения каждого скрипта.

### Структура

```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id),

  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL,  -- 'INFO', 'ERROR', 'WARNING', 'DEBUG'
  step TEXT NOT NULL,   -- 'START', 'FETCH', 'LOAD', 'ANALYZE', 'UPSERT', 'END'
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}'
);
```

### Ключевые поля

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `id` | UUID | Основной ключ | `7a016ef4-9045-4867-9fbf-a13ab7a33f8f` |
| `run_id` | UUID | Связь с `runs.id` | `095517c2-4506-47a9-bdc9-a742cfba52e2` |
| `level` | TEXT | Уровень лога | `INFO`, `ERROR`, `WARNING`, `DEBUG` |
| `step` | TEXT | Этап выполнения | `FETCH`, `UPSERT`, `END` |
| `message` | TEXT | Сообщение лога | `Fetched 150 contacts from HubSpot` |
| `meta` | JSONB | Структурированные метаданные | `{"count": 150, "page": 1}` |

### Constraints

```sql
-- Foreign key к runs
FOREIGN KEY (run_id) REFERENCES runs(id)

-- Обязательные поля
NOT NULL: id, run_id, timestamp, level, step, message
```

### Уровни логирования (level)

- **INFO** - Обычная информация о ходе выполнения
- **ERROR** - Ошибки выполнения
- **WARNING** - Предупреждения
- **DEBUG** - Отладочная информация

### Типовые шаги (step)

| Step | Описание | Использование |
|------|----------|---------------|
| `START` | Начало выполнения | Инициализация скрипта |
| `FETCH` | Получение данных | Запрос к API (HubSpot, VAPI) |
| `LOAD` | Загрузка конфигурации | Загрузка frameworks, настроек |
| `ANALYZE` | Анализ данных | Обработка, QCI анализ |
| `UPSERT` | Запись в БД | Вставка/обновление записей |
| `MERGE` | Слияние данных | JSONB merge операции |
| `END` | Завершение | Итоговая статистика |

### Примеры данных

```json
[
  {
    "id": "619c1b28-ba22-4df8-9197-a4d1b8ef2ef2",
    "run_id": "095517c2-4506-47a9-bdc9-a742cfba52e2",
    "timestamp": "2025-10-25T02:56:58.434Z",
    "level": "INFO",
    "step": "LOAD",
    "message": "QCI framework loaded successfully",
    "meta": {
      "model": "gpt-4o-mini",
      "max_tokens": 3000,
      "temperature": 0
    }
  },
  {
    "id": "720866d9-6130-4e05-a9af-1eac5e9d475b",
    "run_id": "095517c2-4506-47a9-bdc9-a742cfba52e2",
    "timestamp": "2025-10-25T02:57:00.956Z",
    "level": "INFO",
    "step": "FETCH",
    "message": "Found 0 calls needing QCI analysis",
    "meta": {}
  }
]
```

---

## Связь между таблицами

```
runs (1) ──────< logs (N)
  id              run_id
```

- Один run может иметь множество logs
- Каждый log принадлежит одному run (через `run_id`)
- При удалении run - автоматически удаляются все связанные logs (CASCADE)

---

## Использование в скриптах

### Пример для HubSpot Sync (incremental)

```javascript
const { createClient } = require('@supabase/supabase-js');

async function syncContacts() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Создать run
  const { data: run } = await supabase
    .from('runs')
    .insert({
      script_name: 'hubspot-sync-incremental',
      triggered_by: 'github-actions',
      started_at: new Date().toISOString(),
      status: 'running',
      sync_mode: 'incremental'
    })
    .select()
    .single();

  const runId = run.id;

  try {
    // 2. Логируем начало
    await logInfo(runId, 'START', 'Starting incremental sync', {
      sync_mode: 'incremental'
    });

    // 3. Получаем данные
    await logInfo(runId, 'FETCH', 'Fetching contacts from HubSpot');
    const contacts = await fetchContacts();

    await logInfo(runId, 'FETCH', `Found ${contacts.length} contacts`, {
      count: contacts.length
    });

    // 4. Записываем в БД
    await logInfo(runId, 'UPSERT', 'Upserting contacts to Supabase');
    const { inserted, updated } = await upsertContacts(contacts);

    await logInfo(runId, 'UPSERT', 'Upsert completed', {
      inserted,
      updated
    });

    // 5. Обновляем run как success
    await supabase
      .from('runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        records_fetched: contacts.length,
        records_inserted: inserted,
        records_updated: updated,
        sync_end_date: new Date().toISOString()
      })
      .eq('id', runId);

    await logInfo(runId, 'END', 'Sync completed successfully');

  } catch (error) {
    // Логируем ошибку
    await logError(runId, 'ERROR', error.message, { stack: error.stack });

    // Обновляем run как error
    await supabase
      .from('runs')
      .update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', runId);

    throw error;
  }
}

// Вспомогательные функции логирования
async function logInfo(runId, step, message, meta = {}) {
  await supabase.from('logs').insert({
    run_id: runId,
    level: 'INFO',
    step,
    message,
    meta
  });
  console.log(`[${step}] ${message}`);
}

async function logError(runId, step, message, meta = {}) {
  await supabase.from('logs').insert({
    run_id: runId,
    level: 'ERROR',
    step,
    message,
    meta
  });
  console.error(`[${step}] ERROR: ${message}`);
}
```

---

## Типовые запросы

### Получить последние 10 запусков

```sql
SELECT
  id,
  script_name,
  status,
  triggered_by,
  started_at,
  finished_at,
  duration_ms,
  records_fetched,
  records_inserted,
  records_updated
FROM runs
ORDER BY started_at DESC
LIMIT 10;
```

### Получить логи конкретного запуска

```sql
SELECT
  timestamp,
  level,
  step,
  message,
  meta
FROM logs
WHERE run_id = '891cca71-5002-44cf-bde2-fd0f4dc3b873'
ORDER BY timestamp ASC;
```

### Получить только ошибки за последние 24 часа

```sql
SELECT
  r.script_name,
  r.started_at,
  l.step,
  l.message,
  l.meta
FROM logs l
JOIN runs r ON l.run_id = r.id
WHERE l.level = 'ERROR'
  AND r.started_at > now() - interval '24 hours'
ORDER BY r.started_at DESC;
```

### Получить статистику по скриптам

```sql
SELECT
  script_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  AVG(duration_ms) / 1000 as avg_duration_sec,
  SUM(records_fetched) as total_records,
  MAX(started_at) as last_run
FROM runs
WHERE started_at > now() - interval '7 days'
GROUP BY script_name
ORDER BY last_run DESC;
```

### Получить время последней успешной синхронизации

```sql
SELECT
  script_name,
  finished_at,
  sync_end_date
FROM runs
WHERE script_name = 'hubspot-sync-incremental'
  AND status = 'success'
ORDER BY finished_at DESC
LIMIT 1;
```

---

## Миграция для HubSpot проекта

Чтобы скопировать систему логирования в HubSpot проект:

### Шаг 1: Создать миграцию

```bash
npx supabase migration new create_logging_system
```

### Шаг 2: SQL для миграции

```sql
-- supabase/migrations/YYYYMMDD_create_logging_system.sql

-- Создать таблицу runs
CREATE TABLE runs (
  -- Идентификаторы
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT NOT NULL DEFAULT nextval('sync_logs_id_seq'::regclass),
  batch_id UUID,

  -- Метаданные скрипта
  script_name TEXT NOT NULL,
  triggered_by TEXT DEFAULT 'manual',

  -- Время выполнения
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Статус
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  error_message TEXT,

  -- Метрики синхронизации
  records_fetched INTEGER,
  records_inserted INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,
  sync_mode TEXT,
  sync_start_date TIMESTAMPTZ,
  sync_end_date TIMESTAMPTZ,

  -- Метрики анализа
  calls_analyzed INTEGER,
  api_cost NUMERIC,

  -- Гибкие метаданные
  metadata JSONB DEFAULT '{}'
);

-- Комментарии к таблице
COMMENT ON TABLE runs IS 'Universal execution tracking for all cron jobs (sync, analysis, optimization)';
COMMENT ON COLUMN runs.id IS 'UUID primary key for new records';
COMMENT ON COLUMN runs.legacy_id IS 'Old integer ID from sync_logs (for backward compatibility)';
COMMENT ON COLUMN runs.batch_id IS 'UUID for grouping related operations';
COMMENT ON COLUMN runs.script_name IS 'Script type: hubspot-sync-incremental, hubspot-sync-full, etc';
COMMENT ON COLUMN runs.status IS 'Execution status: running, success, error';
COMMENT ON COLUMN runs.sync_mode IS 'Sync mode used: full, incremental, or auto';
COMMENT ON COLUMN runs.metadata IS 'Flexible JSONB field for additional metrics';

-- Создать таблицу logs
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,

  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('INFO', 'ERROR', 'WARNING', 'DEBUG')),
  step TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}'
);

-- Комментарии к таблице
COMMENT ON TABLE logs IS 'Detailed step-by-step logs for each run execution';
COMMENT ON COLUMN logs.run_id IS 'Foreign key to runs.id (UUID)';
COMMENT ON COLUMN logs.level IS 'Log level: INFO, ERROR, WARNING, DEBUG';
COMMENT ON COLUMN logs.step IS 'Step name for categorization (START, FETCH, etc.)';
COMMENT ON COLUMN logs.message IS 'Human-readable log message';
COMMENT ON COLUMN logs.meta IS 'Additional structured data (e.g., {"count": 150})';

-- Индексы для производительности
CREATE INDEX idx_runs_script_name ON runs(script_name);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX idx_logs_run_id ON logs(run_id);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);

-- Если sync_logs уже существует (для совместимости)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'sync_logs_id_seq') THEN
    CREATE SEQUENCE sync_logs_id_seq;
  END IF;
END $$;
```

### Шаг 3: Применить миграцию

```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxx"
npx supabase db push
```

---

## Преимущества системы

1. **Универсальность** - одна система для всех скриптов (sync, analysis, optimization)
2. **Детальность** - двухуровневое логирование (метаданные + пошаговые логи)
3. **Гибкость** - JSONB поля для специфичных метаданных
4. **Производительность** - индексы для быстрых запросов
5. **Обратная совместимость** - legacy_id для старого кода
6. **Группировка** - batch_id для связанных операций
7. **Отладка** - полная история выполнения с timestamps
8. **Мониторинг** - легко построить дашборды и алерты

---

## Best Practices

1. **Всегда создавайте run перед началом работы**
   - Статус: `running`
   - Записывайте `started_at`

2. **Логируйте важные этапы**
   - START - начало
   - FETCH - получение данных
   - UPSERT - запись в БД
   - END - завершение

3. **Обновляйте run при завершении**
   - Статус: `success` или `error`
   - Записывайте `finished_at` и `duration_ms`

4. **Используйте meta для структурированных данных**
   ```javascript
   meta: { count: 150, page: 1, api_cost: 0.05 }
   ```

5. **Логируйте ошибки с деталями**
   ```javascript
   meta: {
     error: error.message,
     stack: error.stack,
     hubspot_id: contact.id
   }
   ```

6. **Используйте batch_id для группировки**
   - Например, full sync может создать несколько runs (contacts, deals, calls)
   - Свяжите их одним batch_id

---

## Адаптация для HubSpot

### Значения script_name

- `hubspot-sync-incremental` - инкрементальная синхронизация
- `hubspot-sync-full` - полная синхронизация
- `hubspot-refresh-views` - обновление materialized views

### Специфичные поля для HubSpot

- `sync_mode`: `full`, `incremental`
- `sync_start_date`: дата начала периода синхронизации (с overlap)
- `sync_end_date`: дата конца периода синхронизации
- `metadata`: `{ "field_count": 35, "overlap_hours": 1 }`

### Пример логов для HubSpot

```javascript
// START
await logInfo(runId, 'START', 'Starting incremental sync', {
  sync_mode: 'incremental',
  overlap_hours: 1
});

// FETCH
await logInfo(runId, 'FETCH', 'Searching contacts since last sync', {
  since: lastSyncTime.toISOString()
});

await logInfo(runId, 'FETCH', 'Found 150 contacts', {
  count: 150,
  pages: 2
});

// MERGE
await logInfo(runId, 'MERGE', 'Merging JSONB properties', {
  existing: 100,
  new: 50
});

// UPSERT
await logInfo(runId, 'UPSERT', 'Upserting contacts', {
  batch_size: 500
});

await logInfo(runId, 'UPSERT', 'Upsert completed', {
  inserted: 50,
  updated: 100
});

// END
await logInfo(runId, 'END', 'Sync completed successfully', {
  total_duration_ms: 10248,
  records_processed: 150
});
```

---

## Дальнейшие улучшения

1. **Alerts** - создать функцию для отправки уведомлений при ошибках
2. **Dashboard** - построить дашборд с метриками sync
3. **Retention policy** - автоматически удалять старые логи (>30 дней)
4. **Analytics** - агрегированная статистика по sync performance

---

**Версия:** 1.0
**Последнее обновление:** 2025-10-25
**Источник:** VAPI Analytics Project
