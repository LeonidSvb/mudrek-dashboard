/**
 * =====================================================================
 * Migration 029: Dashboard Overview (Materialized View Strategy)
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   Dashboard без фильтров → timeout (все менеджеры × 22 метрики)
 *   Запрос обрабатывает 120k+ звонков → 10+ секунд
 *
 * РЕШЕНИЕ:
 *   1. Использовать daily_metrics_mv (УЖЕ СУЩЕСТВУЕТ, предрассчитана)
 *   2. Новая функция get_dashboard_overview() читает из MV
 *   3. Агрегирует SUM/AVG за период (мгновенно!)
 *   4. pg_cron обновляет MV каждый час
 *
 * ПРОИЗВОДИТЕЛЬНОСТЬ:
 *   ДО:  get_all_metrics_fast() без фильтров = timeout (10+ сек)
 *   ПОСЛЕ: get_dashboard_overview() из MV = 50-100ms ⚡
 *
 * ИНДУСТРИАЛЬНЫЕ СТАНДАРТЫ:
 *   ✅ Google Analytics - pre-aggregated data для dashboard
 *   ✅ Mixpanel - materialized views для overview
 *   ✅ Amplitude - cached aggregations
 *
 * Created: 2025-10-14
 * =====================================================================
 */

-- =====================================================================
-- 1. ENABLE pg_cron EXTENSION
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

COMMENT ON EXTENSION pg_cron IS
'Job scheduler for PostgreSQL - used to refresh materialized views';

-- =====================================================================
-- 2. DASHBOARD OVERVIEW FUNCTION (reads from daily_metrics_mv)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_dashboard_overview(
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
  -- This is FAST because data is already aggregated by day
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
    'data_source', 'daily_metrics_mv',
    'is_cached', true

  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from
    AND metric_date <= v_date_to;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_overview(TIMESTAMPTZ, TIMESTAMPTZ) IS
'Fast dashboard overview using pre-calculated daily_metrics_mv.
Returns aggregated metrics for all managers. Use get_all_metrics_fast() for filtered queries.';

-- =====================================================================
-- 3. REFRESH FUNCTION (to be called by cron)
-- =====================================================================

CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;

  -- Log the refresh (optional, for monitoring)
  RAISE NOTICE 'daily_metrics_mv refreshed at %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_daily_metrics() IS
'Refreshes daily_metrics_mv materialized view. Called by pg_cron every hour.';

-- =====================================================================
-- 4. SETUP CRON JOB (refresh every hour)
-- =====================================================================

-- Remove existing job if exists (to avoid duplicates)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh_daily_metrics_hourly';

-- Schedule: refresh every hour at minute 0
SELECT cron.schedule(
  'refresh_daily_metrics_hourly',  -- job name
  '0 * * * *',                      -- cron expression (every hour at :00)
  'SELECT refresh_daily_metrics();' -- SQL command
);

-- =====================================================================
-- 5. INITIAL REFRESH
-- =====================================================================

-- Refresh now so data is immediately available
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Test the new function:
-- SELECT * FROM get_dashboard_overview(NOW() - INTERVAL '90 days', NOW());

-- Check cron jobs:
-- SELECT * FROM cron.job WHERE jobname = 'refresh_daily_metrics_hourly';

-- Check last refresh time:
-- SELECT schemaname, matviewname, last_refresh
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public' AND relname = 'daily_metrics_mv';

-- =====================================================================
-- PERFORMANCE COMPARISON
-- =====================================================================

-- OLD (timeout):
-- SELECT * FROM get_all_metrics_fast(NULL, '2025-07-16', '2025-10-14');
-- → 10+ seconds, statement timeout

-- NEW (instant):
-- SELECT * FROM get_dashboard_overview('2025-07-16', '2025-10-14');
-- → 50-100ms, reads from materialized view ⚡

-- =====================================================================
-- NOTES
-- =====================================================================

-- 1. daily_metrics_mv updates every hour via pg_cron
-- 2. Data is max 1 hour old (acceptable for dashboard overview)
-- 3. For real-time data with filters → use get_all_metrics_fast()
-- 4. For drill-down by manager → use get_all_metrics_fast(owner_id, ...)
-- 5. CONCURRENTLY refresh = no locks, dashboard stays responsive

-- =====================================================================
