-- ============================================
-- MIGRATION: Transform sync_logs to runs
-- Date: 2025-10-25
-- Description: Rename and adapt sync_logs table to universal runs table
--              for all job types (sync, analysis, automation)
-- Based on: Vapi project logging system
-- ============================================

-- Step 0: Drop dependent views (will recreate at the end)
DROP VIEW IF EXISTS sync_summary CASCADE;

-- Step 1: Rename table
ALTER TABLE sync_logs RENAME TO runs;

-- Step 2: Add UUID primary key (keep old integer id as legacy_id)
ALTER TABLE runs RENAME COLUMN id TO legacy_id;
ALTER TABLE runs ADD COLUMN id uuid DEFAULT gen_random_uuid();

-- Step 3: Rename columns to standard names
ALTER TABLE runs RENAME COLUMN object_type TO script_name;
ALTER TABLE runs RENAME COLUMN sync_started_at TO started_at;
ALTER TABLE runs RENAME COLUMN sync_completed_at TO finished_at;

-- Step 4: Convert duration_seconds to duration_ms
ALTER TABLE runs ADD COLUMN duration_ms integer;
UPDATE runs SET duration_ms = duration_seconds * 1000 WHERE duration_seconds IS NOT NULL;
ALTER TABLE runs DROP COLUMN duration_seconds;

-- Step 5: Add new columns for future enhancements
-- api_cost - для будущих AI интеграций
-- metadata - для гибких данных
ALTER TABLE runs ADD COLUMN api_cost numeric(10,4);
ALTER TABLE runs ADD COLUMN metadata jsonb DEFAULT '{}';

-- Step 6: Keep batch_id (уже есть в sync_logs)
-- batch_id уже существует, ничего не делаем

-- Step 7: Keep last_modified_date_from и last_modified_date_to (для incremental sync)
-- Эти поля уже есть, оставляем как есть

-- Step 8: Update constraints
ALTER TABLE runs ALTER COLUMN script_name SET NOT NULL;
ALTER TABLE runs ALTER COLUMN status SET NOT NULL;
ALTER TABLE runs DROP CONSTRAINT IF EXISTS sync_logs_status_check;
ALTER TABLE runs ADD CONSTRAINT runs_status_check
  CHECK (status IN ('running', 'success', 'error', 'partial'));

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS runs_script_name_idx ON runs(script_name);
CREATE INDEX IF NOT EXISTS runs_started_at_idx ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status);
CREATE INDEX IF NOT EXISTS runs_batch_id_idx ON runs(batch_id);

-- Step 10: Set default value for triggered_by if NULL
UPDATE runs SET triggered_by = 'manual' WHERE triggered_by IS NULL;

-- Step 11: Add comments for documentation
COMMENT ON TABLE runs IS 'Universal execution tracking for all jobs (sync, analysis, automation)';
COMMENT ON COLUMN runs.id IS 'UUID primary key for new records';
COMMENT ON COLUMN runs.legacy_id IS 'Old integer ID from sync_logs (for backward compatibility)';
COMMENT ON COLUMN runs.script_name IS 'Script type: hubspot-sync, hubspot-full-sync, etc.';
COMMENT ON COLUMN runs.status IS 'Execution status: running, success, error, partial';
COMMENT ON COLUMN runs.batch_id IS 'UUID for grouping related operations';
COMMENT ON COLUMN runs.records_fetched IS 'Data sync metric: records fetched from API';
COMMENT ON COLUMN runs.records_inserted IS 'Data sync metric: records inserted to DB';
COMMENT ON COLUMN runs.records_updated IS 'Data sync metric: records updated in DB';
COMMENT ON COLUMN runs.records_failed IS 'Data sync metric: records that failed';
COMMENT ON COLUMN runs.api_cost IS 'Future AI metric: API cost in USD';
COMMENT ON COLUMN runs.metadata IS 'Flexible JSONB field for additional metrics';
COMMENT ON COLUMN runs.last_modified_date_from IS 'Incremental sync: start date filter';
COMMENT ON COLUMN runs.last_modified_date_to IS 'Incremental sync: end date filter';

-- Step 12: Recreate sync_summary view with new structure
CREATE OR REPLACE VIEW sync_summary AS
SELECT
    script_name as object_type,  -- для обратной совместимости
    started_at as sync_started_at,
    duration_ms / 1000 as duration_seconds,  -- конвертируем обратно в секунды для view
    records_fetched,
    records_inserted,
    records_updated,
    records_failed,
    status,
    triggered_by
FROM runs
ORDER BY started_at DESC
LIMIT 50;

COMMENT ON VIEW sync_summary IS 'Legacy view for backward compatibility (uses old column names)';

-- Verification query (run after migration)
-- SELECT id, script_name, status, started_at, duration_ms,
--        records_fetched, records_inserted, records_updated
-- FROM runs
-- ORDER BY started_at DESC
-- LIMIT 5;
