-- Migration 036: Add batch_id tracking for sync sessions
-- Purpose: Track which records belong to which sync session for audit trail

-- =============================================
-- 1. Add batch_id to sync_logs
-- =============================================
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS batch_id UUID DEFAULT gen_random_uuid() UNIQUE;

COMMENT ON COLUMN sync_logs.batch_id IS 'Unique identifier for sync session (generated automatically)';

-- Create index for fast batch lookup
CREATE INDEX IF NOT EXISTS idx_sync_logs_batch_id ON sync_logs(batch_id);

-- =============================================
-- 2. Add sync_batch_id to raw tables
-- =============================================

-- Contacts
ALTER TABLE hubspot_contacts_raw
ADD COLUMN IF NOT EXISTS sync_batch_id UUID;

COMMENT ON COLUMN hubspot_contacts_raw.sync_batch_id IS 'References sync_logs.batch_id - which sync session created/updated this record';

CREATE INDEX IF NOT EXISTS idx_contacts_sync_batch_id ON hubspot_contacts_raw(sync_batch_id);

-- Deals
ALTER TABLE hubspot_deals_raw
ADD COLUMN IF NOT EXISTS sync_batch_id UUID;

COMMENT ON COLUMN hubspot_deals_raw.sync_batch_id IS 'References sync_logs.batch_id - which sync session created/updated this record';

CREATE INDEX IF NOT EXISTS idx_deals_sync_batch_id ON hubspot_deals_raw(sync_batch_id);

-- Calls
ALTER TABLE hubspot_calls_raw
ADD COLUMN IF NOT EXISTS sync_batch_id UUID;

COMMENT ON COLUMN hubspot_calls_raw.sync_batch_id IS 'References sync_logs.batch_id - which sync session created/updated this record';

CREATE INDEX IF NOT EXISTS idx_calls_sync_batch_id ON hubspot_calls_raw(sync_batch_id);

-- =============================================
-- 3. Add metadata columns for tracking
-- =============================================

-- Add columns to track date range for incremental sync
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS last_modified_date_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_modified_date_to TIMESTAMPTZ;

COMMENT ON COLUMN sync_logs.last_modified_date_from IS 'Start of date range for incremental sync (hs_lastmodifieddate filter)';
COMMENT ON COLUMN sync_logs.last_modified_date_to IS 'End of date range for incremental sync';

-- =============================================
-- 4. Update existing sync_logs to have batch_id
-- =============================================

-- Generate batch_id for existing records (if any don't have it)
UPDATE sync_logs
SET batch_id = gen_random_uuid()
WHERE batch_id IS NULL;

-- =============================================
-- Verification queries (commented out)
-- =============================================

-- Check that all tables have new columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sync_logs' AND column_name IN ('batch_id', 'last_modified_date_from', 'last_modified_date_to');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hubspot_contacts_raw' AND column_name = 'sync_batch_id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hubspot_deals_raw' AND column_name = 'sync_batch_id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hubspot_calls_raw' AND column_name = 'sync_batch_id';

-- Check indexes:
-- SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE '%sync_batch%' OR indexname LIKE '%batch_id%';
