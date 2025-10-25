-- Fix: Remove duplicates using DISTINCT ON
-- Issue: LEFT JOIN creates duplicates when one phone number matches multiple contacts
-- Solution: Pick only the oldest contact per call using DISTINCT ON

DROP MATERIALIZED VIEW IF EXISTS call_contact_matches_mv CASCADE;
DROP MATERIALIZED VIEW IF EXISTS contact_call_stats_mv CASCADE;
DROP VIEW IF EXISTS call_contact_matches CASCADE;

CREATE OR REPLACE VIEW call_contact_matches AS
SELECT DISTINCT ON (c.hubspot_id)
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
LEFT JOIN hubspot_contacts_raw ct
  ON REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g')
   = REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
WHERE c.call_to_number IS NOT NULL
ORDER BY c.hubspot_id, ct.createdate ASC NULLS LAST;

COMMENT ON VIEW call_contact_matches IS 'One call = one contact (oldest). LEFT JOIN preserves all calls, DISTINCT ON removes duplicates.';

CREATE MATERIALIZED VIEW call_contact_matches_mv AS
SELECT * FROM call_contact_matches;

CREATE INDEX idx_call_contact_matches_mv_call_id ON call_contact_matches_mv(call_id);
CREATE INDEX idx_call_contact_matches_mv_timestamp ON call_contact_matches_mv(call_timestamp);
CREATE INDEX idx_call_contact_matches_mv_owner ON call_contact_matches_mv(hubspot_owner_id);
CREATE INDEX idx_call_contact_matches_mv_contact ON call_contact_matches_mv(contact_id);

-- Recreate contact_call_stats_mv
CREATE MATERIALIZED VIEW contact_call_stats_mv AS
SELECT
  contact_id,
  firstname,
  lastname,
  contact_phone,
  hubspot_owner_id,
  COUNT(*) as total_calls,
  COUNT(*) - 1 as followup_count,
  CASE WHEN COUNT(*) >= 2 THEN 1 ELSE 0 END as has_followups,
  MIN(call_timestamp) as first_call_date,
  MAX(call_timestamp) as last_call_date,
  COUNT(DISTINCT DATE(call_timestamp)) as days_called,
  AVG(call_duration) / 60000 as avg_call_minutes,
  SUM(call_duration) / 3600000 as total_call_hours,
  COUNT(*) FILTER (WHERE call_duration >= 300000) as calls_over_5min,
  ROUND(
    COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as five_min_rate,
  MIN(EXTRACT(EPOCH FROM (call_timestamp - contact_createdate)) / 86400) as days_to_first_call
FROM call_contact_matches
WHERE contact_id IS NOT NULL
GROUP BY contact_id, firstname, lastname, contact_phone, hubspot_owner_id;

CREATE INDEX idx_contact_call_stats_mv_contact ON contact_call_stats_mv(contact_id);
CREATE INDEX idx_contact_call_stats_mv_owner ON contact_call_stats_mv(hubspot_owner_id);
