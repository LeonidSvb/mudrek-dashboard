/**
 * =====================================================================
 * Migration 020: Fix Timeline Function Conflict
 * =====================================================================
 *
 * Problem: Multiple versions of get_metrics_timeline() exist with
 * different timestamp types causing PGRST203 error.
 *
 * Solution: Drop all versions and recreate with single signature
 * using TIMESTAMPTZ (timestamp with timezone).
 *
 * VERSION: 1.0
 * =====================================================================
 */

-- Drop ALL versions of the function (regardless of signature)
DROP FUNCTION IF EXISTS get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_metrics_timeline(TEXT, TIMESTAMP, TIMESTAMP, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_metrics_timeline CASCADE;

-- Recreate with single signature (TIMESTAMPTZ)
CREATE FUNCTION get_metrics_timeline(
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
  v_trunc_unit := CASE p_granularity
    WHEN 'daily' THEN 'day'
    WHEN 'weekly' THEN 'week'
    WHEN 'monthly' THEN 'month'
    ELSE 'day'
  END;

  SELECT json_build_object(
    -- Sales Timeline: Revenue per period
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

    -- Calls Timeline: Count per period
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;

-- =====================================================================
-- VERIFICATION
-- =====================================================================
-- Verify only ONE version exists:
-- SELECT routine_name, data_type, parameter_mode, parameter_name, dtd_identifier
-- FROM information_schema.parameters
-- WHERE specific_schema = 'public' AND routine_name = 'get_metrics_timeline'
-- ORDER BY ordinal_position;
