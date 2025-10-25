-- Fix: Replace INNER JOIN with LEFT JOIN to preserve all calls
-- Issue: INNER JOIN loses 72 calls (399 -> 327) that don't have matching contacts

DROP MATERIALIZED VIEW IF EXISTS call_contact_matches_mv CASCADE;
DROP VIEW IF EXISTS call_contact_matches CASCADE;

CREATE OR REPLACE VIEW call_contact_matches AS
SELECT
  c.hubspot_id as call_id,
  c.call_to_number,
  c.call_from_number,
  c.call_timestamp,
  c.call_duration,
  c.call_direction,
  c.call_disposition,
  ct.hubspot_id as contact_id,
  ct.firstname,
  ct.lastname,
  ct.email,
  ct.phone as contact_phone,
  ct.hubspot_owner_id,
  ct.createdate as contact_createdate,
  ct.lifecyclestage,
  EXTRACT(EPOCH FROM (c.call_timestamp - ct.createdate)) / 86400 as days_since_contact_created
FROM hubspot_calls_raw c
LEFT JOIN hubspot_contacts_raw ct  -- Changed from INNER to LEFT
  ON REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g')
   = REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
WHERE c.call_to_number IS NOT NULL;

CREATE MATERIALIZED VIEW call_contact_matches_mv AS
SELECT * FROM call_contact_matches;

CREATE INDEX idx_call_contact_matches_mv_call_id ON call_contact_matches_mv(call_id);
CREATE INDEX idx_call_contact_matches_mv_timestamp ON call_contact_matches_mv(call_timestamp);
CREATE INDEX idx_call_contact_matches_mv_owner ON call_contact_matches_mv(hubspot_owner_id);
CREATE INDEX idx_call_contact_matches_mv_contact ON call_contact_matches_mv(contact_id);
