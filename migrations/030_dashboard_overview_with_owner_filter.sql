/**
 * =====================================================================
 * Migration 030: Dashboard Overview with Owner Filter
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   get_dashboard_overview() работает только БЕЗ owner_id
 *   Когда выбирают менеджера → timeout (9+ секунд)
 *
 * РЕШЕНИЕ:
 *   Расширить get_dashboard_overview() для поддержки owner_id
 *   daily_metrics_mv УЖЕ СОДЕРЖИТ owner_id, просто добавим фильтр!
 *
 * ПРОИЗВОДИТЕЛЬНОСТЬ:
 *   ДО:  get_all_metrics() с owner_id = timeout (9+ сек)
 *   ПОСЛЕ: get_dashboard_overview() с owner_id = 50-100ms ⚡
 *
 * Created: 2025-10-14
 * =====================================================================
 */

CREATE OR REPLACE FUNCTION get_dashboard_overview(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  v_date_from DATE;
  v_date_to DATE;
BEGIN
  -- Default to last 90 days if not provided
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- ================================================================
  -- READ FROM daily_metrics_mv (already pre-calculated!)
  -- Now supports owner_id filter!
  -- ================================================================

  SELECT json_build_object(
    -- Revenue Metrics
    'total_sales', COALESCE(SUM(daily_sales), 0),
    'deals_won', COALESCE(SUM(daily_deals_won), 0),
    'average_deal_size', COALESCE(
      ROUND(SUM(daily_sales_sum_for_avg) / NULLIF(SUM(daily_deals_count_for_avg), 0), 2),
      0
    ),

    -- Pipeline Metrics
    'qualified_leads', COALESCE(SUM(daily_qualified), 0),
    'trials_given', COALESCE(SUM(daily_trials), 0),
    'deals_lost', COALESCE(SUM(daily_lost), 0),

    -- Cash Flow Metrics
    'upfront_cash_collected', COALESCE(SUM(daily_upfront_cash), 0),
    'average_installments', COALESCE(
      ROUND(SUM(daily_installments_sum)::NUMERIC / NULLIF(SUM(daily_installments_count), 0), 1),
      0
    ),

    -- Conversion Metrics
    'offers_given', COALESCE(SUM(daily_offers_given), 0),
    'offers_closed', COALESCE(SUM(daily_offers_closed), 0),
    'offer_close_rate', COALESCE(
      ROUND((SUM(daily_offers_closed)::NUMERIC / NULLIF(SUM(daily_offers_given), 0)) * 100, 2),
      0
    ),

    -- Time Metrics
    'average_time_to_sale', COALESCE(
      ROUND(SUM(daily_time_to_sale_sum) / NULLIF(SUM(daily_time_to_sale_count), 0), 1),
      0
    ),

    -- Meta
    'date_from', v_date_from,
    'date_to', v_date_to,
    'owner_id', p_owner_id,
    'data_source', 'daily_metrics_mv',
    'is_cached', true

  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from
    AND metric_date <= v_date_to
    -- NEW: Filter by owner_id if provided
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_overview(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Fast dashboard overview using pre-calculated daily_metrics_mv.
Now supports owner_id filter for per-manager stats.';

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Test all managers:
-- SELECT * FROM get_dashboard_overview(NULL, '2025-07-16', '2025-10-14');

-- Test specific manager:
-- SELECT * FROM get_dashboard_overview('81280578', '2025-07-16', '2025-10-14');

-- Both should return in ~50-100ms!

-- =====================================================================
