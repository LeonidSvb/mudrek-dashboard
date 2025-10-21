-- Migration: Create HubSpot RAW tables and Sync Logs
-- Created: 2025-10-07
-- Description: Hybrid schema (columns + JSONB) for HubSpot data sync

-- ============================================================================
-- 1. HUBSPOT CONTACTS RAW
-- ============================================================================

CREATE TABLE IF NOT EXISTS hubspot_contacts_raw (
    -- Primary Key
    hubspot_id TEXT PRIMARY KEY,

    -- Frequently Used Fields (for fast queries)
    email TEXT,
    phone TEXT,                    -- For JOIN with calls
    firstname TEXT,
    lastname TEXT,
    createdate TIMESTAMP WITH TIME ZONE,
    lifecyclestage TEXT,
    sales_script_version TEXT,     -- A/B testing

    -- VSL metrics
    vsl_watched BOOLEAN,
    vsl_watch_duration INTEGER,

    -- ALL RAW DATA (including above fields)
    raw_json JSONB NOT NULL,

    -- Metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON hubspot_contacts_raw(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON hubspot_contacts_raw(email);
CREATE INDEX IF NOT EXISTS idx_contacts_createdate ON hubspot_contacts_raw(createdate);
CREATE INDEX IF NOT EXISTS idx_contacts_lifecyclestage ON hubspot_contacts_raw(lifecyclestage);

-- JSONB GIN index for flexible queries
CREATE INDEX IF NOT EXISTS idx_contacts_raw_json ON hubspot_contacts_raw USING GIN (raw_json);

-- ============================================================================
-- 2. HUBSPOT DEALS RAW
-- ============================================================================

CREATE TABLE IF NOT EXISTS hubspot_deals_raw (
    -- Primary Key
    hubspot_id TEXT PRIMARY KEY,

    -- Frequently Used Fields (for metrics)
    amount NUMERIC,                -- Total sales, Avg deal size
    dealstage TEXT,                -- Conversion rate, stages
    createdate TIMESTAMP WITH TIME ZONE,
    closedate TIMESTAMP WITH TIME ZONE,

    -- Custom fields for metrics
    qualified_status TEXT,         -- Qualified rate
    trial_status TEXT,             -- Trial rate
    payment_status TEXT,           -- Retention metrics
    number_of_installments__months INTEGER,  -- Avg installments

    -- Additional tracking
    cancellation_reason TEXT,
    is_refunded BOOLEAN,
    installment_plan TEXT,
    upfront_payment NUMERIC,
    offer_given BOOLEAN,
    offer_accepted BOOLEAN,

    -- ALL RAW DATA (including above fields)
    raw_json JSONB NOT NULL,

    -- Metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_deals_stage ON hubspot_deals_raw(dealstage);
CREATE INDEX IF NOT EXISTS idx_deals_amount ON hubspot_deals_raw(amount);
CREATE INDEX IF NOT EXISTS idx_deals_closedate ON hubspot_deals_raw(closedate);
CREATE INDEX IF NOT EXISTS idx_deals_createdate ON hubspot_deals_raw(createdate);
CREATE INDEX IF NOT EXISTS idx_deals_payment_status ON hubspot_deals_raw(payment_status);

-- JSONB GIN index
CREATE INDEX IF NOT EXISTS idx_deals_raw_json ON hubspot_deals_raw USING GIN (raw_json);

-- ============================================================================
-- 3. HUBSPOT CALLS RAW
-- ============================================================================

CREATE TABLE IF NOT EXISTS hubspot_calls_raw (
    -- Primary Key
    hubspot_id TEXT PRIMARY KEY,

    -- Frequently Used Fields (for metrics)
    call_duration INTEGER,         -- Milliseconds - for Avg call time
    call_direction TEXT,           -- OUTBOUND/INBOUND
    call_to_number TEXT,           -- For JOIN with contacts.phone
    call_from_number TEXT,
    call_timestamp TIMESTAMP WITH TIME ZONE,
    call_disposition TEXT,         -- Pickup rate (connected/no-answer/etc)

    -- ALL RAW DATA (including above fields)
    raw_json JSONB NOT NULL,

    -- Metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON hubspot_calls_raw(call_to_number);
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON hubspot_calls_raw(call_timestamp);
CREATE INDEX IF NOT EXISTS idx_calls_duration ON hubspot_calls_raw(call_duration);
CREATE INDEX IF NOT EXISTS idx_calls_disposition ON hubspot_calls_raw(call_disposition);

-- JSONB GIN index
CREATE INDEX IF NOT EXISTS idx_calls_raw_json ON hubspot_calls_raw USING GIN (raw_json);

-- ============================================================================
-- 4. SYNC LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGSERIAL PRIMARY KEY,

    -- Timing
    sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,

    -- What was synced
    object_type TEXT NOT NULL,     -- 'contacts' | 'deals' | 'calls'

    -- Statistics
    records_fetched INTEGER,       -- Retrieved from HubSpot API
    records_inserted INTEGER,      -- New records in Supabase
    records_updated INTEGER,       -- Updated existing records
    records_failed INTEGER,        -- Failed to process

    -- Status
    status TEXT NOT NULL,          -- 'success' | 'partial' | 'failed'
    error_message TEXT,            -- Error details if failed

    -- Additional info
    triggered_by TEXT,             -- 'cron' | 'manual' | 'api'
    metadata JSONB                 -- Any extra info
);

-- Indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_object_type ON sync_logs(object_type);

-- ============================================================================
-- 5. VIEWS FOR CONVENIENCE
-- ============================================================================

-- View: Deals with Contact associations
CREATE OR REPLACE VIEW deals_with_contacts AS
SELECT
    d.hubspot_id as deal_id,
    d.amount,
    d.dealstage,
    d.closedate,
    d.createdate,
    d.qualified_status,
    d.trial_status,
    d.payment_status,
    d.raw_json->'associations'->'contacts'->'results'->0->>'id' as contact_id,
    d.raw_json->>'dealname' as dealname,
    d.synced_at
FROM hubspot_deals_raw d;

-- View: Calls linked to Contacts (via phone)
CREATE OR REPLACE VIEW calls_with_contacts AS
SELECT
    ca.hubspot_id as call_id,
    ca.call_duration,
    ca.call_direction,
    ca.call_timestamp,
    ca.call_disposition,
    c.hubspot_id as contact_id,
    c.email,
    c.firstname,
    c.lastname,
    c.phone
FROM hubspot_calls_raw ca
JOIN hubspot_contacts_raw c
    ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '');

-- View: Recent sync summary
CREATE OR REPLACE VIEW sync_summary AS
SELECT
    object_type,
    sync_started_at,
    duration_seconds,
    records_fetched,
    records_inserted,
    records_updated,
    records_failed,
    status,
    triggered_by
FROM sync_logs
ORDER BY sync_started_at DESC
LIMIT 50;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON hubspot_contacts_raw
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON hubspot_deals_raw
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at
    BEFORE UPDATE ON hubspot_calls_raw
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
    RAISE NOTICE '✓ Migration complete!';
    RAISE NOTICE '✓ Created tables: hubspot_contacts_raw, hubspot_deals_raw, hubspot_calls_raw, sync_logs';
    RAISE NOTICE '✓ Created views: deals_with_contacts, calls_with_contacts, sync_summary';
    RAISE NOTICE '✓ Created indexes for performance';
    RAISE NOTICE '✓ Ready for HubSpot sync!';
END $$;
