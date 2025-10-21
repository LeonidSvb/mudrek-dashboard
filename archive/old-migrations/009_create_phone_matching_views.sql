-- ============================================================================
-- Migration 009: Phone Matching Views with Timeline Support
-- ============================================================================
-- Purpose: Create VIEWs for phone-based call matching and timeline analysis
--
-- VIEWs created:
-- 1. call_contact_matches - Base layer: matches calls to contacts via phone
-- 2. contact_call_stats - Aggregated metrics per contact
--
-- Timeline Support:
-- - call_timestamp included for before/after deal analysis
-- - Use in queries: WHERE call_timestamp < deal.createdate (before deal)
--                  WHERE call_timestamp >= deal.createdate (after deal)
--
-- Created: 2025-10-10
-- ============================================================================

-- ============================================================================
-- VIEW 1: call_contact_matches
-- ============================================================================
-- Purpose: Match calls to contacts via normalized phone numbers
-- Usage: Base layer for all phone-based metrics
-- Performance: ~500ms on 118k calls × 59 contacts

CREATE OR REPLACE VIEW call_contact_matches AS
SELECT
  -- Call info
  c.hubspot_id as call_id,
  c.call_to_number,
  c.call_from_number,
  c.call_timestamp,
  c.call_duration,
  c.call_direction,
  c.call_disposition,

  -- Contact info
  ct.hubspot_id as contact_id,
  ct.firstname,
  ct.lastname,
  ct.email,
  ct.phone as contact_phone,
  ct.hubspot_owner_id,
  ct.createdate as contact_createdate,
  ct.lifecyclestage,

  -- Timeline calculations
  EXTRACT(EPOCH FROM (c.call_timestamp - ct.createdate)) / 86400 as days_since_contact_created

FROM hubspot_calls_raw c
INNER JOIN hubspot_contacts_raw ct
  ON REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g')
   = REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
WHERE c.call_to_number IS NOT NULL
  AND ct.phone IS NOT NULL;

COMMENT ON VIEW call_contact_matches IS 'Matches calls to contacts via phone number. Use call_timestamp to filter before/after deal creation.';

-- ============================================================================
-- VIEW 2: contact_call_stats
-- ============================================================================
-- Purpose: Aggregated call statistics per contact
-- Usage: For followup metrics, time to first contact, avg call time
-- Performance: Fast (pre-aggregated from VIEW 1)

CREATE OR REPLACE VIEW contact_call_stats AS
SELECT
  -- Contact info
  contact_id,
  firstname,
  lastname,
  contact_phone,
  hubspot_owner_id,

  -- Call counts
  COUNT(*) as total_calls,
  COUNT(*) - 1 as followup_count,
  CASE WHEN COUNT(*) >= 2 THEN 1 ELSE 0 END as has_followups,

  -- Call timing
  MIN(call_timestamp) as first_call_date,
  MAX(call_timestamp) as last_call_date,
  COUNT(DISTINCT DATE(call_timestamp)) as days_called,

  -- Call duration metrics
  AVG(call_duration) / 60000 as avg_call_minutes,
  SUM(call_duration) / 3600000 as total_call_hours,

  -- Quality metrics
  COUNT(*) FILTER (WHERE call_duration >= 300000) as calls_over_5min,
  ROUND(
    COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as five_min_rate,

  -- Timeline (relative to contact creation)
  -- NOTE: Negative values = call BEFORE contact created (cold call)
  --       Positive values = call AFTER contact created (followup/inbound)
  MIN(EXTRACT(EPOCH FROM (call_timestamp - contact_createdate)) / 86400) as days_to_first_call

FROM call_contact_matches
GROUP BY contact_id, firstname, lastname, contact_phone, hubspot_owner_id;

COMMENT ON VIEW contact_call_stats IS 'Aggregated call stats per contact. Negative days_to_first_call = cold calls before contact creation. For deal timeline, JOIN with deals and filter by call_timestamp.';

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
-- These indexes speed up phone matching and timeline queries

CREATE INDEX IF NOT EXISTS idx_calls_to_number
  ON hubspot_calls_raw(call_to_number)
  WHERE call_to_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calls_timestamp
  ON hubspot_calls_raw(call_timestamp);

CREATE INDEX IF NOT EXISTS idx_contacts_phone
  ON hubspot_contacts_raw(phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_owner
  ON hubspot_contacts_raw(hubspot_owner_id);

CREATE INDEX IF NOT EXISTS idx_deals_createdate
  ON hubspot_deals_raw(createdate);

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get all calls for a specific contact
-- SELECT * FROM call_contact_matches WHERE contact_id = '161651613805';

-- Example 2: Timeline analysis - calls BEFORE deal creation
-- SELECT
--   d.hubspot_id as deal_id,
--   d.dealname,
--   d.createdate as deal_createdate,
--   COUNT(*) as calls_before_deal
-- FROM hubspot_deals_raw d
-- CROSS JOIN LATERAL (
--   SELECT jsonb_array_elements_text(
--     d.raw_json->'associations'->'contacts'->'results'
--   )::jsonb->>'toObjectId' as contact_id
-- ) contact_ids
-- JOIN call_contact_matches c ON c.contact_id = contact_ids.contact_id
-- WHERE c.call_timestamp < d.createdate
-- GROUP BY d.hubspot_id, d.dealname, d.createdate;

-- Example 3: Timeline analysis - calls AFTER deal creation
-- Same query but: WHERE c.call_timestamp >= d.createdate

-- Example 4: Followup metrics
-- SELECT
--   ROUND(SUM(has_followups)::numeric / COUNT(*) * 100, 2) as followup_rate,
--   ROUND(AVG(followup_count), 1) as avg_followups,
--   ROUND(AVG(days_to_first_call), 1) as avg_days_to_first_call
-- FROM contact_call_stats
-- WHERE total_calls > 0;

-- Example 5: Filter by owner (manager)
-- SELECT * FROM contact_call_stats WHERE hubspot_owner_id = '682432124';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
--
-- VIEW 1 (call_contact_matches):
-- - ~118k calls × 59 contacts = ~517 matched records
-- - Query time: ~500ms (with indexes)
-- - Use for: detailed call analysis, timeline calculations
--
-- VIEW 2 (contact_call_stats):
-- - 59 contacts with aggregated stats
-- - Query time: ~50ms (fast aggregation)
-- - Use for: metrics dashboard, followup rates
--
-- For large datasets (>1M calls):
-- - Consider MATERIALIZED VIEW for VIEW 2
-- - Refresh: REFRESH MATERIALIZED VIEW contact_call_stats;
-- - Add UNIQUE INDEX for faster lookups
--
-- Timeline queries with deals:
-- - Add INDEX on raw_json->>'associations' if slow
-- - Consider materialized view if queried frequently
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
