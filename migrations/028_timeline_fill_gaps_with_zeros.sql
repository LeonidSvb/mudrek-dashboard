/**
 * =====================================================================
 * Migration 028: Timeline with Zero-Filling (Industry Standard)
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   Текущая функция возвращает ТОЛЬКО точки с данными.
 *   Пропуски в данных → gaps на графике → плохой UX.
 *
 * РЕШЕНИЕ:
 *   Использовать generate_series() для создания ВСЕХ дат в диапазоне.
 *   LEFT JOIN с фактическими данными.
 *   COALESCE(value, 0) → заменяет NULL на 0.
 *
 * СТАНДАРТЫ ИНДУСТРИИ:
 *   ✅ Google Analytics - заполняет нулями
 *   ✅ Mixpanel - заполняет нулями
 *   ✅ Amplitude - заполняет нулями
 *   ✅ Stripe Dashboard - заполняет нулями
 *
 * ЗАЧЕМ НУЛИ ВАЖНЫ:
 *   1. График ровный (ось X равномерная)
 *   2. Нули = важная информация (простои, сезонность)
 *   3. Видно реальную картину активности
 *
 * Created: 2025-10-14
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

-- =====================================================================
-- COMMENT
-- =====================================================================

COMMENT ON FUNCTION get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS
'Timeline function with zero-filling for missing periods (industry standard).
Returns ALL dates in range, with 0 for periods without data.';

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Test with 7 days (should return EXACTLY 7 points, even if some are 0)
-- SELECT * FROM get_metrics_timeline(NULL, NOW() - INTERVAL '7 days', NOW(), 'daily');

-- Test with 4 weeks (should return EXACTLY 4 points for weekly)
-- SELECT * FROM get_metrics_timeline(NULL, NOW() - INTERVAL '28 days', NOW(), 'weekly');

-- Compare with current data:
-- Before: 9 sales points, 13 calls points (sparse)
-- After: Should return same number of points for both (dense)

-- =====================================================================
-- EXAMPLE OUTPUT
-- =====================================================================
-- Before (sparse):
-- {
--   "sales": [
--     {"date": "2025-07-14", "value": 1800},
--     {"date": "2025-08-11", "value": 14880}  // 3 weeks gap!
--   ]
-- }
--
-- After (dense):
-- {
--   "sales": [
--     {"date": "2025-07-14", "value": 1800},
--     {"date": "2025-07-21", "value": 0},
--     {"date": "2025-07-28", "value": 0},
--     {"date": "2025-08-04", "value": 0},
--     {"date": "2025-08-11", "value": 14880}
--   ]
-- }
-- =====================================================================
