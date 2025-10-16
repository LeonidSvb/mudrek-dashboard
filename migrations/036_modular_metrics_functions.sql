/**
 * =====================================================================
 * Migration 036: Modular Metrics Functions (8 Independent Functions)
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   get_dashboard_overview() - монолитная функция на 257 строк
 *   - Сложно дебажить отдельные метрики
 *   - Невозможно протестировать категории отдельно
 *   - A/B testing метрики отсутствуют
 *   - Если одна метрика сломается → ломается всё
 *
 * РЕШЕНИЕ:
 *   Разбить на 8 независимых модульных функций:
 *   1. get_sales_metrics() - Sales (4 метрики)
 *   2. get_call_metrics() - Calls (4 метрики)
 *   3. get_conversion_metrics() - Conversion (3 метрики)
 *   4. get_payment_metrics() - Payment (2 метрики)
 *   5. get_followup_metrics() - Followup (3 метрики)
 *   6. get_offer_metrics() - Offers (2 метрики)
 *   7. get_time_metrics() - Time (1 метрика)
 *   8. get_ab_testing_metrics() - A/B Testing (2 метрики) ← NEW!
 *
 * ПРЕИМУЩЕСТВА:
 *   ✅ Каждую функцию можно тестировать отдельно
 *   ✅ Легко найти баг (знаешь в какой функции искать)
 *   ✅ Можно обновлять одну категорию без риска сломать другие
 *   ✅ A/B testing метрики добавлены
 *   ✅ Простой и понятный код
 *
 * ПРОИЗВОДИТЕЛЬНОСТЬ:
 *   ДО:  1 запрос = 50-100ms
 *   ПОСЛЕ: 8 параллельных запросов = 100-200ms (+100ms приемлемо)
 *
 * ИСПОЛЬЗУЕМ СУЩЕСТВУЮЩУЮ ИНФРАСТРУКТУРУ:
 *   - daily_metrics_mv (обновляется каждый час через CRON)
 *   - call_contact_matches_mv
 *   - contact_call_stats_mv
 *   - Ничего нового не создаём!
 *
 * Created: 2025-10-16
 * =====================================================================
 */

-- =====================================================================
-- 1. SALES METRICS (4 metrics)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_sales_metrics(
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
  v_total_contacts INTEGER;
BEGIN
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- Get total contacts for conversion rate
  SELECT COUNT(*) INTO v_total_contacts
  FROM hubspot_contacts_raw
  WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- Calculate sales metrics from MV
  SELECT json_build_object(
    'totalSales', COALESCE(SUM(daily_sales), 0),
    'totalDeals', COALESCE(SUM(daily_deals_won), 0),
    'avgDealSize', COALESCE(
      ROUND(SUM(daily_sales_sum_for_avg)::NUMERIC / NULLIF(SUM(daily_deals_count_for_avg), 0), 2),
      0
    ),
    'conversionRate', COALESCE(
      ROUND(SUM(daily_deals_won)::NUMERIC / NULLIF(v_total_contacts, 0) * 100, 2),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from
    AND metric_date <= v_date_to
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_sales_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns sales metrics: totalSales, totalDeals, avgDealSize, conversionRate.
Reads from daily_metrics_mv (fast, cached every hour).';

-- =====================================================================
-- 2. CALL METRICS (4 metrics)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_call_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to, CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second');

  -- Calculate call metrics
  SELECT json_build_object(
    'totalCalls', COUNT(*)::INTEGER,
    'avgCallTime', COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0),
    'totalCallTime', COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0),
    'fiveMinReachedRate', COALESCE(
      ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM call_contact_matches_mv
  WHERE call_timestamp >= v_date_from
    AND call_timestamp <= v_date_to
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_call_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns call metrics: totalCalls, avgCallTime, totalCallTime, fiveMinReachedRate.
Reads from call_contact_matches_mv.';

-- =====================================================================
-- 3. CONVERSION METRICS (3 metrics)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_conversion_metrics(
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
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- Calculate conversion metrics from MV
  WITH stats AS (
    SELECT
      SUM(daily_qualified) as qualified,
      SUM(daily_trials) as trials,
      SUM(daily_lost) as lost,
      SUM(daily_total_deals) as total
    FROM daily_metrics_mv
    WHERE metric_date >= v_date_from
      AND metric_date <= v_date_to
      AND (p_owner_id IS NULL OR owner_id = p_owner_id)
  )
  SELECT json_build_object(
    'qualifiedRate', COALESCE(ROUND(qualified::NUMERIC / NULLIF(total, 0) * 100, 2), 0),
    'trialRate', COALESCE(ROUND(trials::NUMERIC / NULLIF(total, 0) * 100, 2), 0),
    'cancellationRate', COALESCE(ROUND(lost::NUMERIC / NULLIF(total, 0) * 100, 2), 0)
  ) INTO result
  FROM stats;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_conversion_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns conversion metrics: qualifiedRate, trialRate, cancellationRate.
Reads from daily_metrics_mv.';

-- =====================================================================
-- 4. PAYMENT METRICS (2 metrics)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_payment_metrics(
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
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- Calculate payment metrics from MV
  SELECT json_build_object(
    'upfrontCashCollected', COALESCE(SUM(daily_upfront_cash), 0),
    'avgInstallments', COALESCE(
      ROUND(SUM(daily_installments_sum)::NUMERIC / NULLIF(SUM(daily_installments_count), 0), 1),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from
    AND metric_date <= v_date_to
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_payment_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns payment metrics: upfrontCashCollected, avgInstallments.
Reads from daily_metrics_mv.';

-- =====================================================================
-- 5. FOLLOWUP METRICS (3 metrics)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_followup_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  -- Calculate followup metrics from MV
  SELECT json_build_object(
    'followupRate', COALESCE(
      ROUND(
        SUM(has_followups)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      ),
      0
    ),
    'avgFollowups', COALESCE(ROUND(AVG(followup_count), 1), 0),
    'timeToFirstContact', COALESCE(ROUND(AVG(days_to_first_call), 1), 0)
  ) INTO result
  FROM contact_call_stats_mv
  WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_followup_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns followup metrics: followupRate, avgFollowups, timeToFirstContact.
Reads from contact_call_stats_mv.';

-- =====================================================================
-- 6. OFFER METRICS (2 metrics)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_offer_metrics(
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
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- Calculate offer metrics from MV
  WITH stats AS (
    SELECT
      SUM(daily_offers_given) as given,
      SUM(daily_offers_closed) as closed,
      SUM(daily_total_deals) as total
    FROM daily_metrics_mv
    WHERE metric_date >= v_date_from
      AND metric_date <= v_date_to
      AND (p_owner_id IS NULL OR owner_id = p_owner_id)
  )
  SELECT json_build_object(
    'offersGivenRate', COALESCE(ROUND(given::NUMERIC / NULLIF(total, 0) * 100, 2), 0),
    'offerCloseRate', COALESCE(ROUND(closed::NUMERIC / NULLIF(given, 0) * 100, 2), 0)
  ) INTO result
  FROM stats;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_offer_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns offer metrics: offersGivenRate, offerCloseRate.
Reads from daily_metrics_mv.';

-- =====================================================================
-- 7. TIME METRICS (1 metric)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_time_metrics(
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
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- Calculate time metrics from MV
  SELECT json_build_object(
    'timeToSale', COALESCE(
      ROUND(SUM(daily_time_to_sale_sum) / NULLIF(SUM(daily_time_to_sale_count), 0), 1),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from
    AND metric_date <= v_date_to
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_time_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns time metrics: timeToSale (average days from create to close).
Reads from daily_metrics_mv.';

-- =====================================================================
-- 8. A/B TESTING METRICS (2 metrics) ← NEW!
-- =====================================================================

CREATE OR REPLACE FUNCTION get_ab_testing_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  -- Calculate A/B testing metrics from contacts table
  WITH
  sales_script_stats AS (
    SELECT
      sales_script_version as version,
      COUNT(*) as total_contacts,
      COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
      ROUND(
        COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::NUMERIC / NULLIF(COUNT(*), 0) * 100,
        2
      ) as conversion_rate
    FROM hubspot_contacts_raw
    WHERE sales_script_version IS NOT NULL
      AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    GROUP BY sales_script_version
  ),
  vsl_watch_stats AS (
    SELECT
      vsl_watched as watched,
      COUNT(*) as total_contacts,
      COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
      ROUND(
        COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::NUMERIC / NULLIF(COUNT(*), 0) * 100,
        2
      ) as conversion_rate
    FROM hubspot_contacts_raw
    WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    GROUP BY vsl_watched
  )
  SELECT json_build_object(
    'salesScriptStats', COALESCE(
      (SELECT json_agg(json_build_object(
        'version', version,
        'totalContacts', total_contacts,
        'conversions', conversions,
        'conversionRate', conversion_rate
      )) FROM sales_script_stats),
      '[]'::json
    ),
    'vslWatchStats', COALESCE(
      (SELECT json_agg(json_build_object(
        'watched', watched,
        'totalContacts', total_contacts,
        'conversions', conversions,
        'conversionRate', conversion_rate
      )) FROM vsl_watch_stats),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_ab_testing_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns A/B testing metrics: salesScriptStats, vslWatchStats.
Reads from hubspot_contacts_raw (not cached - fresh data).';

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Test each function individually:

-- SELECT * FROM get_sales_metrics(NULL, '2025-10-01', '2025-10-16');
-- SELECT * FROM get_call_metrics(NULL, '2025-10-01', '2025-10-16');
-- SELECT * FROM get_conversion_metrics(NULL, '2025-10-01', '2025-10-16');
-- SELECT * FROM get_payment_metrics(NULL, '2025-10-01', '2025-10-16');
-- SELECT * FROM get_followup_metrics(NULL, NULL, NULL);
-- SELECT * FROM get_offer_metrics(NULL, '2025-10-01', '2025-10-16');
-- SELECT * FROM get_time_metrics(NULL, '2025-10-01', '2025-10-16');
-- SELECT * FROM get_ab_testing_metrics(NULL, NULL, NULL);

-- Test with owner filter:
-- SELECT * FROM get_sales_metrics('682432124', '2025-10-01', '2025-10-16');

-- =====================================================================
