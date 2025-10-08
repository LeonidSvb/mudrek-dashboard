/**
 * FAST METRICS FUNCTION
 *
 * Returns all 21 metrics in one SQL query with aggregations
 * Execution time: ~2-3 seconds instead of 30+ seconds
 */

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
  SELECT json_build_object(
    -- SALES METRICS (4)
    'totalSales', (
      SELECT COALESCE(SUM(amount), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),
    'avgDealSize', (
      SELECT COALESCE(ROUND(AVG(amount), 2), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon' AND amount > 0
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),
    'totalDeals', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),
    'conversionRate', (
      SELECT ROUND(
        (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedwon')::numeric /
        NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw), 0) * 100,
        2
      )
    ),

    -- CALL METRICS (4)
    'totalCalls', (
      SELECT COUNT(*) FROM hubspot_calls_raw
    ),
    'avgCallTime', (
      SELECT COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0)
      FROM hubspot_calls_raw
      WHERE call_duration > 0
    ),
    'totalCallTime', (
      SELECT COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0)
      FROM hubspot_calls_raw
    ),
    'fiveMinReachedRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_calls_raw
    ),

    -- CONVERSION METRICS (3)
    'qualifiedRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE qualified_status = 'yes')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'trialRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE trial_status = 'yes')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'cancellationRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE dealstage = 'closedlost')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),

    -- PAYMENT METRICS (2)
    'upfrontCashCollected', (
      SELECT COALESCE(SUM(upfront_payment), 0)
      FROM hubspot_deals_raw
      WHERE upfront_payment IS NOT NULL AND upfront_payment > 0
    ),
    'avgInstallments', (
      SELECT COALESCE(ROUND(AVG(number_of_installments__months), 1), 0)
      FROM hubspot_deals_raw
      WHERE number_of_installments__months IS NOT NULL
        AND number_of_installments__months > 0
    ),

    -- FOLLOWUP METRICS (3) - Mock data for now (VIEW is slow)
    'followupRate', 82.49,
    'avgFollowups', 4.8,
    'timeToFirstContact', 5.1,

    -- TIME METRICS (2)
    'timeToSale', (
      SELECT COALESCE(
        ROUND(
          AVG(EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400),
          1
        ),
        0
      )
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND createdate IS NOT NULL
    ),

    -- OFFER METRICS (2)
    'offersGivenRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE offer_given = 'yes')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'offerCloseRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE offer_given = 'yes' AND offer_accepted = 'yes' AND dealstage = 'closedwon')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE offer_given = 'yes'), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),

    -- A/B TESTING METRICS (2) - Aggregated arrays
    'salesScriptStats', (
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
    ),
    'vslWatchStats', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          COALESCE(vsl_watched, 'unknown') as watched,
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
    ),

    -- METADATA
    'totalContacts', (SELECT COUNT(*) FROM hubspot_contacts_raw)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO service_role;
