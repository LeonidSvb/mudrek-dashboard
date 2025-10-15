/**
 * =====================================================================
 * Migration 034: Add Call Metrics to Dashboard Overview
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   get_dashboard_overview() возвращает только deal metrics
 *   Call metrics, followup metrics показываются как 0
 *
 * РЕШЕНИЕ:
 *   Расширить get_dashboard_overview() чтобы включить:
 *   - Call metrics (из hubspot_calls_raw)
 *   - Followup metrics (из contact_call_stats)
 *   - Conversion rate (из contacts)
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
  -- BUILD COMPLETE DASHBOARD WITH ALL METRICS
  -- ================================================================

  WITH
  -- Deal metrics from materialized view
  deal_metrics AS (
    SELECT
      COALESCE(SUM(daily_sales), 0) as total_sales,
      COALESCE(SUM(daily_deals_won), 0) as deals_won,
      COALESCE(
        ROUND(SUM(daily_sales_sum_for_avg) / NULLIF(SUM(daily_deals_count_for_avg), 0), 2),
        0
      ) as average_deal_size,
      COALESCE(SUM(daily_qualified), 0) as qualified_leads,
      COALESCE(SUM(daily_trials), 0) as trials_given,
      COALESCE(SUM(daily_lost), 0) as deals_lost,
      COALESCE(SUM(daily_upfront_cash), 0) as upfront_cash_collected,
      COALESCE(
        ROUND(SUM(daily_installments_sum)::NUMERIC / NULLIF(SUM(daily_installments_count), 0), 1),
        0
      ) as average_installments,
      COALESCE(SUM(daily_offers_given), 0) as offers_given,
      COALESCE(SUM(daily_offers_closed), 0) as offers_closed,
      COALESCE(
        ROUND((SUM(daily_offers_closed)::NUMERIC / NULLIF(SUM(daily_offers_given), 0)) * 100, 2),
        0
      ) as offer_close_rate,
      COALESCE(
        ROUND(SUM(daily_time_to_sale_sum) / NULLIF(SUM(daily_time_to_sale_count), 0), 1),
        0
      ) as average_time_to_sale
    FROM daily_metrics_mv
    WHERE metric_date >= v_date_from
      AND metric_date <= v_date_to
      AND (p_owner_id IS NULL OR owner_id = p_owner_id)
  ),

  -- Call metrics from calls table
  call_metrics AS (
    SELECT
      COUNT(*)::INTEGER as total_calls,
      COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0) as avg_call_time_minutes,
      COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0) as total_call_time_hours,
      COALESCE(
        ROUND(
          COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
          NULLIF(COUNT(*), 0) * 100,
          2
        ),
        0
      ) as five_min_reached_rate
    FROM hubspot_calls_raw
    WHERE call_timestamp >= v_date_from::TIMESTAMPTZ
      AND call_timestamp <= (v_date_to::TIMESTAMPTZ + INTERVAL '1 day' - INTERVAL '1 second')
  ),

  -- Followup metrics from contact stats
  followup_metrics AS (
    SELECT
      COALESCE(
        ROUND(
          SUM(has_followups)::numeric / NULLIF(COUNT(*), 0) * 100,
          2
        ),
        0
      ) as followup_rate,
      COALESCE(ROUND(AVG(followup_count), 1), 0) as avg_followups,
      COALESCE(ROUND(AVG(days_to_first_call), 1), 0) as time_to_first_contact
    FROM contact_call_stats
    WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
  ),

  -- Contacts for conversion rate
  contact_metrics AS (
    SELECT
      COUNT(*)::INTEGER as total_contacts
    FROM hubspot_contacts_raw
    WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
  )

  -- Build final JSON
  SELECT json_build_object(
    -- Revenue Metrics
    'total_sales', dm.total_sales,
    'deals_won', dm.deals_won,
    'average_deal_size', dm.average_deal_size,

    -- Pipeline Metrics
    'qualified_leads', dm.qualified_leads,
    'trials_given', dm.trials_given,
    'deals_lost', dm.deals_lost,

    -- Cash Flow Metrics
    'upfront_cash_collected', dm.upfront_cash_collected,
    'average_installments', dm.average_installments,

    -- Conversion Metrics
    'offers_given', dm.offers_given,
    'offers_closed', dm.offers_closed,
    'offer_close_rate', dm.offer_close_rate,

    -- Time Metrics
    'average_time_to_sale', dm.average_time_to_sale,

    -- Call Metrics (NEW!)
    'total_calls', cm.total_calls,
    'avg_call_time', cm.avg_call_time_minutes,
    'total_call_time', cm.total_call_time_hours,
    'five_min_reached_rate', cm.five_min_reached_rate,

    -- Followup Metrics (NEW!)
    'followup_rate', fm.followup_rate,
    'avg_followups', fm.avg_followups,
    'time_to_first_contact', fm.time_to_first_contact,

    -- Conversion Rate (NEW!)
    'conversion_rate', COALESCE(
      ROUND(dm.deals_won::numeric / NULLIF(ctm.total_contacts, 0) * 100, 2),
      0
    ),
    'total_contacts', ctm.total_contacts,

    -- Meta
    'date_from', v_date_from,
    'date_to', v_date_to,
    'owner_id', p_owner_id,
    'data_source', 'daily_metrics_mv + calls + contacts',
    'is_cached', true

  ) INTO result
  FROM deal_metrics dm
  CROSS JOIN call_metrics cm
  CROSS JOIN followup_metrics fm
  CROSS JOIN contact_metrics ctm;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_overview(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Complete dashboard overview including deals, calls, followups, and conversion metrics.
Uses materialized view for deals (fast!) + direct queries for calls/contacts.';

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Test: should now return all metrics including calls
-- SELECT * FROM get_dashboard_overview(NULL, '2025-07-16', '2025-10-14');

-- Should see non-zero values for:
-- - total_calls
-- - avg_call_time
-- - followup_rate
-- - conversion_rate
