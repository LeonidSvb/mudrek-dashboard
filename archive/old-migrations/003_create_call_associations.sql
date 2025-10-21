-- Migration: Create call_associations table
-- Purpose: Store HubSpot associations between calls and contacts/deals
-- Created: 2025-10-07

CREATE TABLE IF NOT EXISTS call_associations (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT NOT NULL,
  object_type VARCHAR(50) NOT NULL, -- 'contact' or 'deal'
  object_id BIGINT NOT NULL,
  association_type VARCHAR(100), -- e.g. 'call_to_contact', 'call_to_deal'
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one call can't have duplicate associations
  UNIQUE(call_id, object_type, object_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_call_associations_call_id ON call_associations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_associations_object ON call_associations(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_call_associations_synced ON call_associations(synced_at);

-- Comments
COMMENT ON TABLE call_associations IS 'Associations between calls and contacts/deals from HubSpot';
COMMENT ON COLUMN call_associations.call_id IS 'hubspot_id from hubspot_calls_raw';
COMMENT ON COLUMN call_associations.object_id IS 'hubspot_id of contact or deal';
COMMENT ON COLUMN call_associations.association_type IS 'HubSpot association type label';
