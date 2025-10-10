-- Migration: Clean tables and prepare for test data upload
-- Created: 2025-10-10
-- Description: Add missing columns and clean all raw tables for fresh test data

-- ============================================================================
-- 1. ADD MISSING COLUMNS (if not exist)
-- ============================================================================

-- Add hubspot_owner_id to contacts (for manager performance dashboard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_contacts_raw'
        AND column_name = 'hubspot_owner_id'
    ) THEN
        ALTER TABLE hubspot_contacts_raw
        ADD COLUMN hubspot_owner_id TEXT;

        CREATE INDEX IF NOT EXISTS idx_contacts_owner
        ON hubspot_contacts_raw(hubspot_owner_id);

        RAISE NOTICE '✓ Added hubspot_owner_id to contacts';
    ELSE
        RAISE NOTICE '✓ hubspot_owner_id already exists in contacts';
    END IF;
END $$;

-- Add missing columns to deals (for dashboard)
DO $$
BEGIN
    -- hubspot_owner_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals_raw'
        AND column_name = 'hubspot_owner_id'
    ) THEN
        ALTER TABLE hubspot_deals_raw
        ADD COLUMN hubspot_owner_id TEXT;

        CREATE INDEX IF NOT EXISTS idx_deals_owner
        ON hubspot_deals_raw(hubspot_owner_id);

        RAISE NOTICE '✓ Added hubspot_owner_id to deals';
    ELSE
        RAISE NOTICE '✓ hubspot_owner_id already exists in deals';
    END IF;

    -- dealname
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals_raw'
        AND column_name = 'dealname'
    ) THEN
        ALTER TABLE hubspot_deals_raw
        ADD COLUMN dealname TEXT;

        RAISE NOTICE '✓ Added dealname to deals';
    ELSE
        RAISE NOTICE '✓ dealname already exists in deals';
    END IF;

    -- pipeline
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals_raw'
        AND column_name = 'pipeline'
    ) THEN
        ALTER TABLE hubspot_deals_raw
        ADD COLUMN pipeline TEXT;

        RAISE NOTICE '✓ Added pipeline to deals';
    ELSE
        RAISE NOTICE '✓ pipeline already exists in deals';
    END IF;
END $$;

-- ============================================================================
-- 2. CLEAN ALL TABLES
-- ============================================================================

-- Clean contacts
TRUNCATE TABLE hubspot_contacts_raw CASCADE;
RAISE NOTICE '✓ Cleaned hubspot_contacts_raw';

-- Clean deals
TRUNCATE TABLE hubspot_deals_raw CASCADE;
RAISE NOTICE '✓ Cleaned hubspot_deals_raw';

-- Clean calls
TRUNCATE TABLE hubspot_calls_raw CASCADE;
RAISE NOTICE '✓ Cleaned hubspot_calls_raw';

-- Clean sync logs
TRUNCATE TABLE sync_logs CASCADE;
RAISE NOTICE '✓ Cleaned sync_logs';

-- ============================================================================
-- 3. VERIFY SCHEMA
-- ============================================================================

DO $$
DECLARE
    contacts_count INTEGER;
    deals_count INTEGER;
    calls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contacts_count FROM hubspot_contacts_raw;
    SELECT COUNT(*) INTO deals_count FROM hubspot_deals_raw;
    SELECT COUNT(*) INTO calls_count FROM hubspot_calls_raw;

    RAISE NOTICE '';
    RAISE NOTICE '═══ MIGRATION COMPLETE ═══';
    RAISE NOTICE '✓ All tables cleaned';
    RAISE NOTICE '✓ Contacts: % records', contacts_count;
    RAISE NOTICE '✓ Deals: % records', deals_count;
    RAISE NOTICE '✓ Calls: % records', calls_count;
    RAISE NOTICE '';
    RAISE NOTICE '📊 Ready for test data upload!';
    RAISE NOTICE 'Run: node src/hubspot/fetch-test-sample.js';
    RAISE NOTICE 'Then: node src/hubspot/upload-test-sample.js';
END $$;
