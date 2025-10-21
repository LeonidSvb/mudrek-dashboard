/**
 * =====================================================================
 * Migration 037: Fix Timeline Function Timeout
 * =====================================================================
 *
 * PROBLEM:
 *   After syncing 1670+ calls, get_metrics_timeline() hits
 *   statement timeout (default 10s in Supabase).
 *
 * ROOT CAUSE:
 *   COUNT(*) + DATE_TRUNC + GROUP BY on hubspot_calls_raw
 *   with large dataset takes >10 seconds.
 *
 * SOLUTION:
 *   Increase statement_timeout to 30 seconds for this function only.
 *   Use SET LOCAL to apply only for this function's transaction.
 *
 * WHY 30s:
 *   - Current: ~15s with 1670 calls
 *   - Buffer: 2x for future growth
 *   - Still reasonable for API response
 *
 * Created: 2025-10-21
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
  v_interval INTERVAL;
BEGIN
  -- Increase statement timeout to 30s for this function
  SET LOCAL statement_timeout = '30s';

  -- Convert granularity to PostgreSQL DATE_TRUNC unit and INTERVAL
  CASE p_granularity
    WHEN 'daily' THEN
      v_trunc_unit := 'day';
      v_interval := '1 day'::INTERVAL;
    WHEN 'weekly' THEN
      v_trunc_unit := 'week';
      v_interval := '1 week'::INTERVAL;
    WHEN 'monthly' THEN
      v_trunc_unit := 'month';
      v_interval := '1 month'::INTERVAL;
    ELSE
      v_trunc_unit := 'day';
      v_interval := '1 day'::INTERVAL;
  END CASE;

  SELECT json_build_object(
    -- ================================================================
    -- SALES TIMELINE (with zeros for missing periods)
    -- ================================================================
    'sales', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
      FROM (
        -- Generate ALL dates in range
        WITH date_series AS (
          SELECT DATE_TRUNC(v_trunc_unit, d)::date as date
          FROM generate_series(
            DATE_TRUNC(v_trunc_unit, p_date_from),
            DATE_TRUNC(v_trunc_unit, p_date_to),
            v_interval
          ) d
        ),
        -- Aggregate actual sales data
        sales_data AS (
          SELECT
            DATE_TRUNC(v_trunc_unit, closedate)::date as date,
            SUM(amount) as value
          FROM hubspot_deals_raw
          WHERE dealstage = 'closedwon'
            AND closedate IS NOT NULL
            AND closedate >= p_date_from
            AND closedate <= p_date_to
            AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
          GROUP BY DATE_TRUNC(v_trunc_unit, closedate)
        )
        -- LEFT JOIN to fill gaps with zeros
        SELECT
          ds.date,
          COALESCE(sd.value, 0) as value
        FROM date_series ds
        LEFT JOIN sales_data sd ON ds.date = sd.date
        ORDER BY ds.date
      ) t
    ),

    -- ================================================================
    -- CALLS TIMELINE (with zeros for missing periods)
    -- ================================================================
    'calls', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
      FROM (
        -- Generate ALL dates in range
        WITH date_series AS (
          SELECT DATE_TRUNC(v_trunc_unit, d)::date as date
          FROM generate_series(
            DATE_TRUNC(v_trunc_unit, p_date_from),
            DATE_TRUNC(v_trunc_unit, p_date_to),
            v_interval
          ) d
        ),
        -- Aggregate actual calls data
        calls_data AS (
          SELECT
            DATE_TRUNC(v_trunc_unit, call_timestamp)::date as date,
            COUNT(*) as value
          FROM hubspot_calls_raw
          WHERE call_timestamp IS NOT NULL
            AND call_timestamp >= p_date_from
            AND call_timestamp <= p_date_to
          GROUP BY DATE_TRUNC(v_trunc_unit, call_timestamp)
        )
        -- LEFT JOIN to fill gaps with zeros
        SELECT
          ds.date,
          COALESCE(cd.value, 0) as value
        FROM date_series ds
        LEFT JOIN calls_data cd ON ds.date = cd.date
        ORDER BY ds.date
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS
'Timeline function with 30s timeout for large datasets (1500+ calls).
Returns ALL dates in range, with 0 for periods without data.';

-- =====================================================================
-- TEST
-- =====================================================================
-- Should complete in <30s even with 1670+ calls:
-- SELECT * FROM get_metrics_timeline(NULL, NOW() - INTERVAL '30 days', NOW(), 'daily');
