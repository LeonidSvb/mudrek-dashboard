/**
 * =====================================================================
 * Migration 010: Timeline Charts Function
 * =====================================================================
 *
 * Creates get_metrics_timeline() function for Sales and Calls charts
 * with adaptive granularity (daily/weekly/monthly).
 *
 * PARAMETERS:
 *   p_owner_id     - HubSpot owner ID (manager filter)
 *   p_date_from    - Start date for filtering
 *   p_date_to      - End date for filtering
 *   p_granularity  - 'daily', 'weekly', or 'monthly'
 *
 * RETURNS:
 *   JSON with two arrays:
 *   - sales: [{ date, value }] - Revenue timeline
 *   - calls: [{ date, value }] - Calls count timeline
 *
 * USAGE EXAMPLES:
 *   -- Last 7 days (daily granularity)
 *   SELECT * FROM get_metrics_timeline(
 *     NULL,
 *     NOW() - INTERVAL '7 days',
 *     NOW(),
 *     'daily'
 *   );
 *
 *   -- Last 90 days (weekly granularity)
 *   SELECT * FROM get_metrics_timeline(
 *     NULL,
 *     NOW() - INTERVAL '90 days',
 *     NOW(),
 *     'weekly'
 *   );
 *
 *   -- Specific manager + date range
 *   SELECT * FROM get_metrics_timeline(
 *     '682432124',
 *     '2025-10-01'::timestamp,
 *     '2025-10-31'::timestamp,
 *     'daily'
 *   );
 *
 * VERSION: 1.0 (Initial implementation)
 * =====================================================================
 */

CREATE OR REPLACE FUNCTION get_metrics_timeline(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_granularity TEXT DEFAULT 'daily'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  v_trunc_unit TEXT;
BEGIN
  -- Convert granularity to PostgreSQL DATE_TRUNC unit
  -- 'daily' -> 'day', 'weekly' -> 'week', 'monthly' -> 'month'
  v_trunc_unit := CASE p_granularity
    WHEN 'daily' THEN 'day'
    WHEN 'weekly' THEN 'week'
    WHEN 'monthly' THEN 'month'
    ELSE 'day'  -- default to day
  END;

  SELECT json_build_object(
    -- ================================================================
    -- SALES TIMELINE
    -- Revenue (SUM of amount) per day/week/month
    -- ================================================================
    'sales', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
      FROM (
        SELECT
          DATE_TRUNC(v_trunc_unit, closedate)::date as date,
          COALESCE(SUM(amount), 0) as value
        FROM hubspot_deals_raw
        WHERE dealstage = 'closedwon'
          AND closedate IS NOT NULL
          AND closedate >= p_date_from
          AND closedate <= p_date_to
          AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        GROUP BY DATE_TRUNC(v_trunc_unit, closedate)
        ORDER BY DATE_TRUNC(v_trunc_unit, closedate)
      ) t
    ),

    -- ================================================================
    -- CALLS TIMELINE
    -- Count of calls per day/week/month
    -- ================================================================
    'calls', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
      FROM (
        SELECT
          DATE_TRUNC(v_trunc_unit, call_timestamp)::date as date,
          COUNT(*) as value
        FROM hubspot_calls_raw
        WHERE call_timestamp IS NOT NULL
          AND call_timestamp >= p_date_from
          AND call_timestamp <= p_date_to
        GROUP BY DATE_TRUNC(v_trunc_unit, call_timestamp)
        ORDER BY DATE_TRUNC(v_trunc_unit, call_timestamp)
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =====================================================================
-- PERMISSIONS
-- =====================================================================
GRANT EXECUTE ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
-- Uncomment to test after creation:

-- Test 1: Last 7 days (daily)
-- SELECT * FROM get_metrics_timeline(NULL, NOW() - INTERVAL '7 days', NOW(), 'daily');

-- Test 2: Last 30 days (daily)
-- SELECT * FROM get_metrics_timeline(NULL, NOW() - INTERVAL '30 days', NOW(), 'daily');

-- Test 3: Last 90 days (weekly)
-- SELECT * FROM get_metrics_timeline(NULL, NOW() - INTERVAL '90 days', NOW(), 'weekly');

-- Test 4: Specific manager
-- SELECT * FROM get_metrics_timeline('682432124', NOW() - INTERVAL '30 days', NOW(), 'daily');
