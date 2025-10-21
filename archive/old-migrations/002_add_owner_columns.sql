-- Migration: Extract hubspot_owner_id from JSONB to columns
-- Created: 2025-10-07
-- Description: Add owner columns and extract from raw_json

-- ============================================================================
-- 1. ADD OWNER COLUMNS
-- ============================================================================

-- Contacts
ALTER TABLE hubspot_contacts_raw ADD COLUMN IF NOT EXISTS hubspot_owner_id TEXT;

-- Deals
ALTER TABLE hubspot_deals_raw ADD COLUMN IF NOT EXISTS hubspot_owner_id TEXT;

-- ============================================================================
-- 2. EXTRACT FROM raw_json
-- ============================================================================

-- Contacts (owner_id в корне raw_json)
UPDATE hubspot_contacts_raw
SET hubspot_owner_id = raw_json->>'hubspot_owner_id'
WHERE raw_json->>'hubspot_owner_id' IS NOT NULL;

-- Deals (owner_id в корне raw_json)
UPDATE hubspot_deals_raw
SET hubspot_owner_id = raw_json->>'hubspot_owner_id'
WHERE raw_json->>'hubspot_owner_id' IS NOT NULL;

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON hubspot_contacts_raw(hubspot_owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON hubspot_deals_raw(hubspot_owner_id);

-- ============================================================================
-- 4. VERIFY RESULTS
-- ============================================================================

-- Check contacts
SELECT
  COUNT(*) as total_contacts,
  COUNT(hubspot_owner_id) as contacts_with_owner,
  ROUND(COUNT(hubspot_owner_id)::numeric / COUNT(*) * 100, 2) as percentage
FROM hubspot_contacts_raw;

-- Check deals
SELECT
  COUNT(*) as total_deals,
  COUNT(hubspot_owner_id) as deals_with_owner,
  ROUND(COUNT(hubspot_owner_id)::numeric / COUNT(*) * 100, 2) as percentage
FROM hubspot_deals_raw;

-- Top owners
SELECT
  hubspot_owner_id,
  COUNT(*) as contact_count
FROM hubspot_contacts_raw
WHERE hubspot_owner_id IS NOT NULL
GROUP BY hubspot_owner_id
ORDER BY contact_count DESC
LIMIT 5;

-- ============================================================================
-- 5. CREATE OWNERS TABLE (для имен менеджеров)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hubspot_owners (
  owner_id TEXT PRIMARY KEY,
  owner_name TEXT,
  owner_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger для auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_owners_updated_at
  BEFORE UPDATE ON hubspot_owners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE!
-- ============================================================================

-- Next step: Fetch owner names from HubSpot API
-- GET https://api.hubapi.com/crm/v3/owners
-- Then INSERT INTO hubspot_owners
