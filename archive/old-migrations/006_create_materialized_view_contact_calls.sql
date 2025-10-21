/**
 * =====================================================================
 * Migration 006: Fix contact_call_stats Performance
 * =====================================================================
 *
 * PROBLEM: contact_call_stats VIEW timeout
 *   - LEFT JOIN на 31k contacts × 118k calls
 *   - Regex phone normalization на лету
 *   - Result: 30+ seconds, часто timeout
 *
 * SOLUTION: MATERIALIZED VIEW
 *   - Вычисляется 1 раз при refresh
 *   - Читается мгновенно (<100ms)
 *   - Refresh после каждого sync (~5 секунд)
 *
 * USAGE:
 *   -- Refresh после sync (в sync script):
 *   REFRESH MATERIALIZED VIEW CONCURRENTLY contact_call_stats;
 *
 *   -- Query как обычный VIEW:
 *   SELECT * FROM contact_call_stats WHERE hubspot_owner_id = '682432124';
 *
 * =====================================================================
 */

-- Drop existing VIEW
DROP VIEW IF EXISTS contact_call_stats;

-- Create MATERIALIZED VIEW
CREATE MATERIALIZED VIEW contact_call_stats AS
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
  COUNT(CASE WHEN c.call_duration >= 300000 THEN 1 END) as calls_over_5min,

  -- Followup metrics
  COUNT(c.call_id) FILTER (WHERE c.call_id IS NOT NULL) - 1 as followup_count,
  CASE
    WHEN COUNT(c.call_id) > 1 THEN true
    ELSE false
  END as has_followup
FROM contacts_normalized ct
LEFT JOIN calls_normalized c ON ct.normalized_phone = c.normalized_to_number
GROUP BY ct.contact_id, ct.firstname, ct.lastname, ct.phone, ct.hubspot_owner_id;

-- Indexes for fast queries
CREATE UNIQUE INDEX idx_contact_call_stats_contact_id
ON contact_call_stats(contact_id);

CREATE INDEX idx_contact_call_stats_owner_id
ON contact_call_stats(hubspot_owner_id);

CREATE INDEX idx_contact_call_stats_total_calls
ON contact_call_stats(total_calls);

CREATE INDEX idx_contact_call_stats_has_followup
ON contact_call_stats(has_followup);

-- Comment
COMMENT ON MATERIALIZED VIEW contact_call_stats IS
'Aggregated call statistics per contact (MATERIALIZED for performance)';

-- Initial refresh
REFRESH MATERIALIZED VIEW contact_call_stats;

-- =====================================================================
-- INSTRUCTIONS FOR SYNC SCRIPT
-- =====================================================================
-- Add to src/hubspot/sync-parallel.js after successful sync:
--
-- async function refreshMaterializedViews() {
--   console.log('🔄 Refreshing materialized views...');
--   const { error } = await supabase.rpc('refresh_contact_call_stats');
--   if (error) {
--     console.error('✗ Failed to refresh materialized view:', error.message);
--   } else {
--     console.log('✓ Materialized views refreshed');
--   }
-- }
--
-- // In syncAll() after all syncs complete:
-- await refreshMaterializedViews();
-- =====================================================================

-- Create helper function for refresh (to call from JavaScript)
CREATE OR REPLACE FUNCTION refresh_contact_call_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY contact_call_stats;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_contact_call_stats() TO service_role;
GRANT EXECUTE ON FUNCTION refresh_contact_call_stats() TO authenticated;
