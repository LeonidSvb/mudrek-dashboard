DROP MATERIALIZED VIEW IF EXISTS daily_metrics_mv CASCADE;

CREATE MATERIALIZED VIEW daily_metrics_mv AS
SELECT
  DATE(d.closedate) as metric_date,
  d.hubspot_owner_id as owner_id,

  SUM(CASE WHEN d.dealstage = 'closedwon' THEN d.amount ELSE 0 END) as daily_sales,
  COUNT(*) FILTER (WHERE d.dealstage = 'closedwon') as daily_deals_won,
  SUM(CASE WHEN d.dealstage = 'closedwon' AND d.amount > 0 THEN d.amount ELSE 0 END) as daily_sales_sum_for_avg,
  COUNT(*) FILTER (WHERE d.dealstage = 'closedwon' AND d.amount > 0) as daily_deals_count_for_avg,

  COUNT(*) FILTER (WHERE d.qualified_status = 'yes') as daily_qualified,
  COUNT(*) FILTER (WHERE d.trial_status = 'yes') as daily_trials,
  COUNT(*) FILTER (WHERE d.dealstage = 'closedlost') as daily_lost,
  COUNT(*) as daily_total_deals,

  SUM(CASE WHEN d.upfront_payment > 0 AND d.dealstage = 'closedwon'
    THEN d.upfront_payment ELSE 0 END) as daily_upfront_cash,
  SUM(CASE WHEN d.number_of_installments__months > 0 AND d.dealstage = 'closedwon'
    THEN d.number_of_installments__months ELSE 0 END) as daily_installments_sum,
  COUNT(*) FILTER (
    WHERE d.number_of_installments__months > 0
      AND d.dealstage = 'closedwon'
  ) as daily_installments_count,

  COUNT(*) FILTER (WHERE d.offer_given = 'yes') as daily_offers_given,
  COUNT(*) FILTER (
    WHERE d.offer_given = 'yes'
      AND d.offer_accepted = 'yes'
      AND d.dealstage = 'closedwon'
  ) as daily_offers_closed,

  SUM(
    CASE
      WHEN d.dealstage = 'closedwon'
        AND d.closedate IS NOT NULL
        AND d.createdate IS NOT NULL
      THEN EXTRACT(EPOCH FROM (d.closedate::timestamp - d.createdate::timestamp)) / 86400
      ELSE 0
    END
  ) as daily_time_to_sale_sum,
  COUNT(*) FILTER (
    WHERE d.dealstage = 'closedwon'
      AND d.closedate IS NOT NULL
      AND d.createdate IS NOT NULL
  ) as daily_time_to_sale_count

FROM hubspot_deals_raw d
WHERE d.closedate IS NOT NULL
GROUP BY DATE(d.closedate), d.hubspot_owner_id;

CREATE UNIQUE INDEX idx_daily_metrics_date_owner
  ON daily_metrics_mv (metric_date, owner_id);

CREATE INDEX idx_daily_metrics_date
  ON daily_metrics_mv (metric_date);

CREATE INDEX idx_daily_metrics_owner
  ON daily_metrics_mv (owner_id);

CREATE OR REPLACE FUNCTION get_all_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_data AS (
    SELECT
      SUM(daily_sales) as total_sales,
      SUM(daily_sales_sum_for_avg) as sales_sum_for_avg,
      SUM(daily_deals_count_for_avg) as deals_count_for_avg,
      SUM(daily_deals_won) as total_deals,

      SUM(daily_qualified) as total_qualified,
      SUM(daily_trials) as total_trials,
      SUM(daily_lost) as total_lost,
      SUM(daily_total_deals) as total_all_deals,

      SUM(daily_upfront_cash) as total_upfront_cash,
      SUM(daily_installments_sum) as installments_sum,
      SUM(daily_installments_count) as installments_count,

      SUM(daily_offers_given) as total_offers_given,
      SUM(daily_offers_closed) as total_offers_closed,

      SUM(daily_time_to_sale_sum) as time_to_sale_sum,
      SUM(daily_time_to_sale_count) as time_to_sale_count

    FROM daily_metrics_mv
    WHERE
      (p_owner_id IS NULL OR owner_id = p_owner_id)
      AND (p_date_from IS NULL OR metric_date >= p_date_from::date)
      AND (p_date_to IS NULL OR metric_date <= p_date_to::date)
  ),

  call_data AS (
    SELECT
      COUNT(*) as total_calls,
      COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0) as avg_call_time,
      COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0) as total_call_time,
      ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      ) as five_min_reached_rate
    FROM hubspot_calls_raw
    WHERE
      (p_date_from IS NULL OR call_timestamp >= p_date_from)
      AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
  ),

  followup_data AS (
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
    WHERE
      (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
  ),

  ab_testing_data AS (
    SELECT
      (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            sales_script_version as version,
            COUNT(*) as "totalContacts",
            COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
            ROUND(
              COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::numeric /
              NULLIF(COUNT(*), 0) * 100,
              2
            ) as "conversionRate"
          FROM hubspot_contacts_raw
          WHERE sales_script_version IS NOT NULL
          GROUP BY sales_script_version
          ORDER BY "conversionRate" DESC
        ) t
      ) as sales_script_stats,

      (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            CASE
              WHEN vsl_watched IS NULL THEN 'unknown'
              WHEN vsl_watched = true THEN 'yes'
              WHEN vsl_watched = false THEN 'no'
            END as watched,
            COUNT(*) as "totalContacts",
            COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
            ROUND(
              COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::numeric /
              NULLIF(COUNT(*), 0) * 100,
              2
            ) as "conversionRate"
          FROM hubspot_contacts_raw
          GROUP BY vsl_watched
          ORDER BY "conversionRate" DESC
        ) t
      ) as vsl_watch_stats
  ),

  contacts_data AS (
    SELECT COUNT(*) as total_contacts
    FROM hubspot_contacts_raw
    WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
  )

  SELECT json_build_object(
    'totalSales', COALESCE(f.total_sales, 0),
    'avgDealSize', COALESCE(
      CASE
        WHEN f.deals_count_for_avg > 0
        THEN ROUND(f.sales_sum_for_avg / f.deals_count_for_avg, 2)
        ELSE 0
      END,
      0
    ),
    'totalDeals', COALESCE(f.total_deals, 0),
    'conversionRate', COALESCE(
      ROUND(f.total_deals::numeric / NULLIF(c.total_contacts, 0) * 100, 2),
      0
    ),

    'totalCalls', call.total_calls,
    'avgCallTime', call.avg_call_time,
    'totalCallTime', call.total_call_time,
    'fiveMinReachedRate', call.five_min_reached_rate,

    'qualifiedRate', COALESCE(
      ROUND(f.total_qualified::numeric / NULLIF(f.total_all_deals, 0) * 100, 2),
      0
    ),
    'trialRate', COALESCE(
      ROUND(f.total_trials::numeric / NULLIF(f.total_all_deals, 0) * 100, 2),
      0
    ),
    'cancellationRate', COALESCE(
      ROUND(f.total_lost::numeric / NULLIF(f.total_all_deals, 0) * 100, 2),
      0
    ),

    'upfrontCashCollected', COALESCE(f.total_upfront_cash, 0),
    'avgInstallments', COALESCE(
      CASE
        WHEN f.installments_count > 0
        THEN ROUND(f.installments_sum / f.installments_count, 1)
        ELSE 0
      END,
      0
    ),

    'followupRate', fw.followup_rate,
    'avgFollowups', fw.avg_followups,
    'timeToFirstContact', fw.time_to_first_contact,

    'offersGivenRate', COALESCE(
      ROUND(f.total_offers_given::numeric / NULLIF(f.total_all_deals, 0) * 100, 2),
      0
    ),
    'offerCloseRate', COALESCE(
      ROUND(f.total_offers_closed::numeric / NULLIF(f.total_offers_given, 0) * 100, 2),
      0
    ),

    'timeToSale', COALESCE(
      CASE
        WHEN f.time_to_sale_count > 0
        THEN ROUND(f.time_to_sale_sum / f.time_to_sale_count, 1)
        ELSE 0
      END,
      0
    ),

    'salesScriptStats', ab.sales_script_stats,
    'vslWatchStats', ab.vsl_watch_stats,

    'totalContacts', c.total_contacts

  ) INTO result
  FROM filtered_data f
  CROSS JOIN call_data call
  CROSS JOIN followup_data fw
  CROSS JOIN ab_testing_data ab
  CROSS JOIN contacts_data c;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO anon;

SELECT COUNT(*) as rows_in_view FROM daily_metrics_mv;
SELECT pg_size_pretty(pg_total_relation_size('daily_metrics_mv')) as view_size;
SELECT * FROM daily_metrics_mv LIMIT 5;
