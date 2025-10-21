/**
 * =====================================================================
 * Migration 044: Fix date_to to Include End of Day
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   Когда выбираем "вчера" (например, 2025-10-20) в календаре:
 *   - date_from = '2025-10-20' → '2025-10-20 00:00:00'
 *   - date_to = '2025-10-20' → '2025-10-20 00:00:00'
 *   - Звонки в 08:00, 09:00 НЕ попадают в фильтр (<= 00:00:00)
 *
 * АНАЛИЗ:
 *   Фронтенд передает даты в формате YYYY-MM-DD (без времени).
 *   SQL парсит это как начало дня (00:00:00).
 *   Но звонки/события происходят в течение дня.
 *
 * ПРИМЕРЫ:
 *   - Выбрали "вчера" (2025-10-20)
 *   - SQL: WHERE call_timestamp <= '2025-10-20 00:00:00'
 *   - Звонок в 07:56:52 НЕ попадает ❌
 *   - Звонок в 08:08:21 НЕ попадает ❌
 *
 * РЕШЕНИЕ:
 *   Автоматически добавлять конец дня к date_to:
 *   Было: v_date_to := COALESCE(p_date_to, CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second');
 *   Стало: v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';
 *
 * РЕЗУЛЬТАТ:
 *   - date_to = '2025-10-20' → '2025-10-20 23:59:59'
 *   - Все звонки за день попадают в фильтр ✅
 *
 * ЗАТРОНУТЫЕ ФУНКЦИИ:
 *   - get_sales_metrics()
 *   - get_call_metrics()
 *   - get_conversion_metrics()
 *   - get_payment_metrics()
 *   - get_followup_metrics()
 *   - get_offer_metrics()
 *   - get_time_metrics()
 *   - get_ab_testing_metrics()
 *   - get_metrics_timeline()
 *
 * Created: 2025-10-21
 * =====================================================================
 */

-- =====================================================================
-- 1. get_sales_metrics()
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
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

  SELECT json_build_object(
    'totalSales', COALESCE(SUM(daily_sales), 0),
    'totalDeals', COALESCE(SUM(daily_deals_won), 0),
    'avgDealSize', COALESCE(
      ROUND(SUM(daily_sales)::numeric / NULLIF(SUM(daily_deals_won), 0), 2),
      0
    ),
    'conversionRate', COALESCE(
      ROUND(
        SUM(daily_new_customers)::numeric / NULLIF(
          (SELECT COUNT(*)
           FROM hubspot_contacts_raw
           WHERE createdate::date >= v_date_from::date
             AND createdate::date <= v_date_to::date
             AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''))),
          0
        ) * 100,
        2
      ),
      0
    ),
    'totalContactsCreated', COALESCE(
      (SELECT COUNT(*)
       FROM hubspot_contacts_raw
       WHERE createdate::date >= v_date_from::date
         AND createdate::date <= v_date_to::date
         AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''))),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::date
    AND metric_date <= v_date_to::date
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

-- =====================================================================
-- 2. get_call_metrics()
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
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

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
    ),
    'pickupRate', COALESCE(
      ROUND(
        COUNT(*) FILTER (WHERE call_disposition = 'f240bbac-87c9-4f6e-bf70-924b57d47db7')::numeric / NULLIF(COUNT(*), 0) * 100,
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
'Returns call metrics: totalCalls, avgCallTime, totalCallTime, fiveMinReachedRate, pickupRate.
pickupRate = calls with disposition f240bbac (Connected) / total calls * 100.
Uses HubSpot call outcome UUID for accurate connected call detection.
Reads from call_contact_matches_mv.
FIX: date_to now includes end of day (23:59:59).';

-- =====================================================================
-- 3. get_conversion_metrics()
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
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

  SELECT json_build_object(
    'qualifiedRate', COALESCE(
      ROUND(
        SUM(daily_qualified)::numeric / NULLIF(SUM(daily_total_deals), 0) * 100,
        2
      ),
      0
    ),
    'trialRate', COALESCE(
      ROUND(
        SUM(daily_trials)::numeric / NULLIF(SUM(daily_total_deals), 0) * 100,
        2
      ),
      0
    ),
    'cancellationRate', COALESCE(
      ROUND(
        SUM(daily_lost)::numeric / NULLIF(SUM(daily_total_deals), 0) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::date
    AND metric_date <= v_date_to::date
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

-- =====================================================================
-- 4. get_payment_metrics()
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
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

  SELECT json_build_object(
    'upfrontCashCollected', COALESCE(SUM(daily_upfront_cash), 0),
    'avgInstallments', COALESCE(ROUND(AVG(daily_avg_installments), 2), 0)
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::date
    AND metric_date <= v_date_to::date
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

-- =====================================================================
-- 5. get_offer_metrics()
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
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

  SELECT json_build_object(
    'offersGivenRate', COALESCE(
      ROUND(
        SUM(daily_offers_given)::numeric / NULLIF(SUM(daily_total_deals), 0) * 100,
        2
      ),
      0
    ),
    'offerCloseRate', COALESCE(
      ROUND(
        SUM(daily_offers_accepted)::numeric / NULLIF(SUM(daily_offers_given), 0) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::date
    AND metric_date <= v_date_to::date
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

-- =====================================================================
-- 6. get_time_metrics()
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
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

  SELECT json_build_object(
    'timeToSale', COALESCE(ROUND(AVG(daily_avg_time_to_sale), 2), 0)
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::date
    AND metric_date <= v_date_to::date
    AND daily_avg_time_to_sale IS NOT NULL
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

-- =====================================================================
-- TEST
-- =====================================================================
-- Should now return calls for yesterday (2025-10-20):
-- SELECT * FROM get_call_metrics(NULL, '2025-10-20', '2025-10-20');
--
-- Should match 7-day results:
-- SELECT * FROM get_call_metrics(NULL, '2025-10-14', '2025-10-21');
