-- Migration: Create contacts and deals tables from scratch
-- Created: 2025-10-10
-- Description: Fresh table creation with all required columns

-- ============================================================================
-- DROP EXISTING TABLES (if exist)
-- ============================================================================

DROP TABLE IF EXISTS hubspot_contacts_raw CASCADE;
DROP TABLE IF EXISTS hubspot_deals_raw CASCADE;

-- ============================================================================
-- CREATE CONTACTS TABLE
-- ============================================================================

CREATE TABLE hubspot_contacts_raw (
    id SERIAL PRIMARY KEY,
    hubspot_id TEXT UNIQUE NOT NULL,

    -- Basic fields
    email TEXT,
    phone TEXT,
    firstname TEXT,
    lastname TEXT,
    createdate TIMESTAMPTZ,
    lifecyclestage TEXT,

    -- Owner field
    hubspot_owner_id TEXT,

    -- Custom fields
    sales_script_version TEXT,
    vsl_watched BOOLEAN DEFAULT FALSE,
    vsl_watch_duration INTEGER,

    -- Raw JSON storage
    raw_json JSONB,

    -- Sync tracking
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX idx_contacts_hubspot_id ON hubspot_contacts_raw(hubspot_id);
CREATE INDEX idx_contacts_email ON hubspot_contacts_raw(email);
CREATE INDEX idx_contacts_phone ON hubspot_contacts_raw(phone);
CREATE INDEX idx_contacts_owner ON hubspot_contacts_raw(hubspot_owner_id);
CREATE INDEX idx_contacts_createdate ON hubspot_contacts_raw(createdate);
CREATE INDEX idx_contacts_raw_json ON hubspot_contacts_raw USING GIN(raw_json);

-- ============================================================================
-- CREATE DEALS TABLE
-- ============================================================================

CREATE TABLE hubspot_deals_raw (
    id SERIAL PRIMARY KEY,
    hubspot_id TEXT UNIQUE NOT NULL,

    -- Basic fields
    amount DECIMAL(12,2),
    dealstage TEXT,
    dealname TEXT,
    pipeline TEXT,
    createdate TIMESTAMPTZ,
    closedate TIMESTAMPTZ,

    -- Owner field
    hubspot_owner_id TEXT,

    -- Custom metric fields
    qualified_status TEXT,
    trial_status TEXT,
    payment_status TEXT,
    number_of_installments__months INTEGER,
    cancellation_reason TEXT,
    is_refunded BOOLEAN DEFAULT FALSE,
    installment_plan TEXT,
    upfront_payment DECIMAL(12,2),
    offer_given BOOLEAN DEFAULT FALSE,
    offer_accepted BOOLEAN DEFAULT FALSE,

    -- Raw JSON storage
    raw_json JSONB,

    -- Sync tracking
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for deals
CREATE INDEX idx_deals_hubspot_id ON hubspot_deals_raw(hubspot_id);
CREATE INDEX idx_deals_dealstage ON hubspot_deals_raw(dealstage);
CREATE INDEX idx_deals_owner ON hubspot_deals_raw(hubspot_owner_id);
CREATE INDEX idx_deals_closedate ON hubspot_deals_raw(closedate);
CREATE INDEX idx_deals_createdate ON hubspot_deals_raw(createdate);
CREATE INDEX idx_deals_amount ON hubspot_deals_raw(amount);
CREATE INDEX idx_deals_raw_json ON hubspot_deals_raw USING GIN(raw_json);

-- ============================================================================
-- VERIFY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✓ hubspot_contacts_raw created';
    RAISE NOTICE '✓ hubspot_deals_raw created';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for data upload!';
    RAISE NOTICE 'Run: node src/hubspot/fetch-test-sample.js';
    RAISE NOTICE 'Then: node src/hubspot/upload-test-sample.js';
END $$;
