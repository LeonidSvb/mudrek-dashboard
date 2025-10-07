-- Migration 004: Create views for phone matching
-- Purpose: Easy access to call-contact relationships via phone numbers

-- 1. View: calls with normalized phone numbers
CREATE OR REPLACE VIEW calls_normalized AS
SELECT
  hubspot_id as call_id,
  call_to_number,
  call_from_number,
  call_duration,
  call_timestamp,
  call_direction,
  call_disposition,
  REGEXP_REPLACE(call_to_number, '[^0-9]', '', 'g') as normalized_to_number,
  REGEXP_REPLACE(call_from_number, '[^0-9]', '', 'g') as normalized_from_number
FROM hubspot_calls_raw
WHERE call_to_number IS NOT NULL OR call_from_number IS NOT NULL;

-- 2. View: contacts with normalized phone numbers
CREATE OR REPLACE VIEW contacts_normalized AS
SELECT
  hubspot_id as contact_id,
  phone,
  email,
  firstname,
  lastname,
  createdate,
  lifecyclestage,
  hubspot_owner_id,
  REGEXP_REPLACE(phone, '[^0-9]', '', 'g') as normalized_phone
FROM hubspot_contacts_raw
WHERE phone IS NOT NULL;

-- 3. Main view: call-contact matches via phone
CREATE OR REPLACE VIEW call_contact_matches AS
SELECT
  c.call_id,
  c.call_to_number,
  c.call_timestamp,
  c.call_duration,
  c.call_direction,
  ct.contact_id,
  ct.phone as contact_phone,
  ct.firstname,
  ct.lastname,
  ct.email,
  ct.hubspot_owner_id,
  ct.lifecyclestage
FROM calls_normalized c
INNER JOIN contacts_normalized ct ON c.normalized_to_number = ct.normalized_phone;

-- 4. Aggregated view: call statistics per contact
CREATE OR REPLACE VIEW contact_call_stats AS
SELECT
  ct.contact_id,
  ct.firstname,
  ct.lastname,
  ct.phone,
  ct.hubspot_owner_id,
  COUNT(c.call_id) as total_calls,
  COUNT(DISTINCT DATE(c.call_timestamp)) as days_called,
  MIN(c.call_timestamp) as first_call_date,
  MAX(c.call_timestamp) as last_call_date,
  AVG(c.call_duration) / 60000 as avg_call_minutes,
  SUM(c.call_duration) / 3600000 as total_call_hours,
  COUNT(CASE WHEN c.call_duration >= 300000 THEN 1 END) as calls_over_5min
FROM contacts_normalized ct
LEFT JOIN calls_normalized c ON ct.normalized_phone = c.normalized_to_number
GROUP BY ct.contact_id, ct.firstname, ct.lastname, ct.phone, ct.hubspot_owner_id;

-- Comments
COMMENT ON VIEW calls_normalized IS 'Calls with normalized phone numbers for matching';
COMMENT ON VIEW contacts_normalized IS 'Contacts with normalized phone numbers for matching';
COMMENT ON VIEW call_contact_matches IS 'Matched calls and contacts via phone numbers';
COMMENT ON VIEW contact_call_stats IS 'Aggregated call statistics per contact';

-- Indexes on base tables for performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_calls_to_number ON hubspot_calls_raw(call_to_number) WHERE call_to_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON hubspot_contacts_raw(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON hubspot_calls_raw(call_timestamp);
