/**
 * =====================================================================
 * Migration 045: Fix Column Names in Metrics Functions
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   Миграция 044 использовала неправильные названия колонок:
 *   - hubspot_owner_id → должно быть owner_id
 *   - daily_avg_installments → должно быть расчет из daily_installments_sum/daily_installments_count
 *   - daily_offers_accepted → должно быть daily_offers_closed
 *   - daily_avg_time_to_sale → должно быть расчет из daily_time_to_sale_sum/daily_time_to_sale_count
 *
 * РЕАЛЬНЫЕ КОЛОНКИ daily_metrics_mv:
 *   - metric_date, owner_id
 *   - daily_sales, daily_deals_won, daily_sales_sum_for_avg, daily_deals_count_for_avg
 *   - daily_qualified, daily_trials, daily_lost, daily_total_deals
 *   - daily_upfront_cash, daily_installments_sum, daily_installments_count
 *   - daily_offers_given, daily_offers_closed
 *   - daily_time_to_sale_sum, daily_time_to_sale_count
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
  v_contacts_created INTEGER;
  v_contacts_became_customers INTEGER;
BEGIN
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  -- FIX: Add end of day to date_to
  v_date_to := COALESCE(p_date_to, CURRENT_DATE) + INTERVAL '1 day' - INTERVAL '1 second';

  -- Count contacts created in period
  SELECT COUNT(*) INTO v_contacts_created
  FROM hubspot_contacts_raw
  WHERE createdate::DATE >= v_date_from::DATE
    AND createdate::DATE <= v_date_to::DATE
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- Count contacts that became customers (from those created in period)
  SELECT COUNT(*) INTO v_contacts_became_customers
  FROM hubspot_contacts_raw
  WHERE createdate::DATE >= v_date_from::DATE
    AND createdate::DATE <= v_date_to::DATE
    AND lifecyclestage = 'customer'
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- Calculate sales metrics from MV
  SELECT json_build_object(
    'totalSales', COALESCE(SUM(daily_sales), 0),
    'totalDeals', COALESCE(SUM(daily_deals_won), 0),
    'avgDealSize', COALESCE(
      ROUND(SUM(daily_sales_sum_for_avg)::NUMERIC / NULLIF(SUM(daily_deals_count_for_avg), 0), 2),
      0
    ),
    'conversionRate', COALESCE(
      ROUND(v_contacts_became_customers::NUMERIC / NULLIF(v_contacts_created, 0) * 100, 2),
      0
    ),
    'totalContactsCreated', v_contacts_created
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::DATE
    AND metric_date <= v_date_to::DATE
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

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
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  RETURN result;
END;
$$;

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
  WHERE metric_date >= v_date_from::DATE
    AND metric_date <= v_date_to::DATE
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

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
    'avgInstallments', COALESCE(
      ROUND(SUM(daily_installments_sum)::NUMERIC / NULLIF(SUM(daily_installments_count), 0), 2),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::DATE
    AND metric_date <= v_date_to::DATE
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

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
        SUM(daily_offers_closed)::numeric / NULLIF(SUM(daily_offers_given), 0) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::DATE
    AND metric_date <= v_date_to::DATE
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

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
    'timeToSale', COALESCE(
      ROUND(SUM(daily_time_to_sale_sum)::NUMERIC / NULLIF(SUM(daily_time_to_sale_count), 0), 2),
      0
    )
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from::DATE
    AND metric_date <= v_date_to::DATE
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

  RETURN result;
END;
$$;

-- =====================================================================
-- TEST
-- =====================================================================
-- Should now work without column errors:
-- SELECT * FROM get_sales_metrics(NULL, '2025-10-20', '2025-10-20');
-- SELECT * FROM get_call_metrics(NULL, '2025-10-20', '2025-10-20');
-- SELECT * FROM get_payment_metrics(NULL, '2025-10-20', '2025-10-20');
-- SELECT * FROM get_offer_metrics(NULL, '2025-10-20', '2025-10-20');
-- SELECT * FROM get_time_metrics(NULL, '2025-10-20', '2025-10-20');
