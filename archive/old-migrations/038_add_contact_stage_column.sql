-- Migration 038: Add contact_stage column to hubspot_contacts_raw
-- Purpose: Store contact stage from HubSpot custom property
-- Created: 2025-10-17

-- Add contact_stage column
ALTER TABLE hubspot_contacts_raw
ADD COLUMN IF NOT EXISTS contact_stage TEXT;

-- Create index for fast filtering by contact_stage
CREATE INDEX IF NOT EXISTS idx_contacts_contact_stage
ON hubspot_contacts_raw(contact_stage);

-- Add comment for documentation
COMMENT ON COLUMN hubspot_contacts_raw.contact_stage IS
'HubSpot custom property: new_leads, no_answer, wrong_number, disqualified';
