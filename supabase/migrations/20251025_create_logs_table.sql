-- ============================================
-- MIGRATION: Create logs table
-- Date: 2025-10-25
-- Description: Create detailed step-by-step logs table for run executions
--              Stores logs for each step: START, FETCH, PROCESS, SAVE, END
-- Based on: Vapi project logging system
-- ============================================

-- Create logs table
CREATE TABLE logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to parent run
  run_id uuid NOT NULL,

  -- Log entry details
  timestamp timestamptz DEFAULT now() NOT NULL,
  level text NOT NULL CHECK (level IN ('INFO', 'ERROR', 'WARNING', 'DEBUG')),
  step text NOT NULL,                    -- e.g., 'START', 'FETCH', 'PROCESS', 'SAVE', 'END'
  message text NOT NULL,

  -- Flexible metadata
  meta jsonb DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX logs_run_id_idx ON logs(run_id);
CREATE INDEX logs_timestamp_idx ON logs(timestamp DESC);
CREATE INDEX logs_level_idx ON logs(level);

-- Add foreign key constraint to runs table
-- Using UUID id column (not legacy_id)
ALTER TABLE logs ADD CONSTRAINT logs_run_id_fkey
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE logs IS 'Detailed step-by-step logs for each run execution';
COMMENT ON COLUMN logs.run_id IS 'Foreign key to runs.id (UUID)';
COMMENT ON COLUMN logs.level IS 'Log level: INFO, ERROR, WARNING, DEBUG';
COMMENT ON COLUMN logs.step IS 'Step name for categorization (START, FETCH, PROCESS, SAVE, END)';
COMMENT ON COLUMN logs.message IS 'Human-readable log message';
COMMENT ON COLUMN logs.meta IS 'Additional structured data (e.g., {"count": 150, "duration": 2.5})';

-- Sample usage:
--
-- 1. View all logs for a specific run:
--    SELECT timestamp, level, step, message, meta
--    FROM logs
--    WHERE run_id = 'your-run-uuid'
--    ORDER BY timestamp ASC;
--
-- 2. View only errors:
--    SELECT * FROM logs WHERE level = 'ERROR' ORDER BY timestamp DESC;
--
-- 3. View logs by step:
--    SELECT * FROM logs WHERE step = 'FETCH' ORDER BY timestamp DESC;
