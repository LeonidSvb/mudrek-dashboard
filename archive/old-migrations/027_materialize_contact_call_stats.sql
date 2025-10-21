-- ============================================================================
-- Migration 027: Convert contact_call_stats to MATERIALIZED VIEW
-- ============================================================================
-- Purpose: Fix performance bottleneck in get_all_metrics()
--
-- Problem:
--   contact_call_stats is currently a VIEW (migration 009)
--   This VIEW is recalculated on EVERY call to get_all_metrics()
--   Execution time: 8.6 seconds per query! (timeout without filters)
--
-- Solution:
--   Convert to MATERIALIZED VIEW (pre-calculated, stored)
--   Execution time after: <100ms per query
--
-- Impact:
--   get_all_metrics() will work instantly (even without filters)
--   Need to REFRESH after sync (similar to daily_metrics_mv)
--
-- Created: 2025-10-14
-- ============================================================================

-- Drop existing VIEW
DROP VIEW IF EXISTS contact_call_stats;

-- Create MATERIALIZED VIEW with exact same structure as migration 009
CREATE MATERIALIZED VIEW contact_call_stats AS
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

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
-- These indexes make queries on materialized view FAST

CREATE UNIQUE INDEX idx_contact_call_stats_contact_id
  ON contact_call_stats(contact_id);

CREATE INDEX idx_contact_call_stats_owner_id
  ON contact_call_stats(hubspot_owner_id);

CREATE INDEX idx_contact_call_stats_has_followups
  ON contact_call_stats(has_followups);

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON MATERIALIZED VIEW contact_call_stats IS
'Aggregated call stats per contact (MATERIALIZED for performance).
Refresh after sync: REFRESH MATERIALIZED VIEW contact_call_stats;';

-- ============================================================================
-- INITIAL REFRESH
-- ============================================================================

REFRESH MATERIALIZED VIEW contact_call_stats;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that materialized view was created:
-- SELECT COUNT(*) FROM contact_call_stats;
-- Expected: ~59-424 rows (number of contacts)

-- Test get_all_metrics() speed:
-- SELECT * FROM get_all_metrics();
-- Expected: <2 seconds (was >10 seconds before)

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Update src/hubspot/sync-parallel.js to refresh this MV after sync
-- 2. Add to frontend API refresh endpoint
-- 3. Update CHANGELOG.md with performance improvement results
-- ============================================================================
