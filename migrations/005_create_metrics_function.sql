/**
 * =====================================================================
 * Migration 005: Fast Metrics Function with Filters
 * =====================================================================
 *
 * Creates get_all_metrics() function that returns all 21 metrics
 * with optional filtering by manager and date range.
 *
 * PARAMETERS:
 *   p_owner_id   - HubSpot owner ID (manager filter)
 *                  NULL = all managers
 *   p_date_from  - Start date for filtering (inclusive)
 *                  NULL = no start date limit
 *   p_date_to    - End date for filtering (inclusive)
 *                  NULL = no end date limit
 *
 * FILTER LOGIC:
 *   - Deals metrics: Filtered by closedate + owner_id
 *   - Calls metrics: Filtered by call_timestamp (no owner filter)
 *   - A/B Testing: No filters (shows all historical data)
 *   - Conversion rates: Uses filtered deal counts
 *
 * USAGE EXAMPLES:
 *   -- All data
 *   SELECT * FROM get_all_metrics();
 *
 *   -- Specific manager
 *   SELECT * FROM get_all_metrics('682432124', NULL, NULL);
 *
 *   -- Last 30 days (all managers)
 *   SELECT * FROM get_all_metrics(
 *     NULL,
 *     NOW() - INTERVAL '30 days',
 *     NOW()
 *   );
 *
 *   -- Specific manager + date range
 *   SELECT * FROM get_all_metrics(
 *     '682432124',
 *     '2025-10-01'::timestamp,
 *     '2025-10-31'::timestamp
 *   );
 *
 * TO UPDATE:
 *   Simply run this file again - CREATE OR REPLACE will update the function
 *   without losing any data.
 *
 * VERSION: 1.2 (Replaced followup metrics mock data with real VIEWs)
 * =====================================================================
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
    -- ================================================================
    -- SALES METRICS (4)
    -- Filtered by: owner_id + closedate
    -- ================================================================
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
      WHERE dealstage = 'closedwon'
        AND amount > 0
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
        (
          SELECT COUNT(*)::numeric
          FROM hubspot_deals_raw
          WHERE dealstage = 'closedwon'
            AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
            AND (p_date_from IS NULL OR closedate >= p_date_from)
            AND (p_date_to IS NULL OR closedate <= p_date_to)
        ) /
        NULLIF(
          (
            SELECT COUNT(*)::numeric
            FROM hubspot_contacts_raw
            WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
          ),
          0
        ) * 100,
        2
      )
    ),

    -- ================================================================
    -- CALL METRICS (4)
    -- Filtered by: call_timestamp only (no owner_id in calls table)
    -- ================================================================
    'totalCalls', (
      SELECT COUNT(*)
      FROM hubspot_calls_raw
      WHERE (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'avgCallTime', (
      SELECT COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0)
      FROM hubspot_calls_raw
      WHERE call_duration > 0
        AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'totalCallTime', (
      SELECT COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0)
      FROM hubspot_calls_raw
      WHERE (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'fiveMinReachedRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_calls_raw
      WHERE (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    -- ================================================================
    -- CONVERSION METRICS (3)
    -- Filtered by: owner_id (uses all deals, not just closed)
    -- ================================================================
    'qualifiedRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE qualified_status = 'yes')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'trialRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE trial_status = 'yes')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'cancellationRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE dealstage = 'closedlost')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    -- ================================================================
    -- PAYMENT METRICS (2)
    -- Filtered by: owner_id + closedate
    -- ================================================================
    'upfrontCashCollected', (
      SELECT COALESCE(SUM(upfront_payment), 0)
      FROM hubspot_deals_raw
      WHERE upfront_payment IS NOT NULL
        AND upfront_payment > 0
        AND dealstage = 'closedwon'
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    'avgInstallments', (
      SELECT COALESCE(ROUND(AVG(number_of_installments__months), 1), 0)
      FROM hubspot_deals_raw
      WHERE number_of_installments__months IS NOT NULL
        AND number_of_installments__months > 0
        AND dealstage = 'closedwon'
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    -- ================================================================
    -- FOLLOWUP METRICS (3)
    -- Filtered by: owner_id only (no date filter on aggregated VIEW)
    -- ================================================================
    'followupRate', (
      SELECT COALESCE(
        ROUND(
          SUM(has_followups)::numeric / NULLIF(COUNT(*), 0) * 100,
          2
        ),
        0
      )
      FROM contact_call_stats
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'avgFollowups', (
      SELECT COALESCE(ROUND(AVG(followup_count), 1), 0)
      FROM contact_call_stats
      WHERE total_calls > 0
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'timeToFirstContact', (
      SELECT COALESCE(ROUND(AVG(days_to_first_call), 1), 0)
      FROM contact_call_stats
      WHERE days_to_first_call IS NOT NULL
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    -- ================================================================
    -- OFFER METRICS (2)
    -- Filtered by: owner_id + closedate for closed deals
    -- ================================================================
    'offersGivenRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE offer_given = 'yes')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'offerCloseRate', (
      SELECT COALESCE(
        ROUND(
          COUNT(*) FILTER (
            WHERE offer_given = 'yes'
              AND offer_accepted = 'yes'
              AND dealstage = 'closedwon'
          )::numeric /
          NULLIF(COUNT(*) FILTER (WHERE offer_given = 'yes'), 0) * 100,
          2
        ),
        0
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    -- ================================================================
    -- TIME METRICS (1)
    -- Filtered by: owner_id + closedate
    -- ================================================================
    'timeToSale', (
      SELECT COALESCE(
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400
          ),
          1
        ),
        0
      )
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND createdate IS NOT NULL
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    -- ================================================================
    -- A/B TESTING METRICS (2)
    -- No filters - shows all historical data for statistical significance
    -- ================================================================
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
    ),

    -- ================================================================
    -- METADATA
    -- ================================================================
    'totalContacts', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =====================================================================
-- PERMISSIONS
-- =====================================================================
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO service_role;
GRANT EXECUTE ON FUNCTION get_all_metrics(TEXT, TIMESTAMP, TIMESTAMP) TO anon;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
-- Uncomment to test after creation:

-- Test 1: All data (no filters)
-- SELECT * FROM get_all_metrics();

-- Test 2: Specific manager
-- SELECT * FROM get_all_metrics('682432124', NULL, NULL);

-- Test 3: Last 7 days
-- SELECT * FROM get_all_metrics(NULL, NOW() - INTERVAL '7 days', NOW());

-- Test 4: Manager + date range
-- SELECT * FROM get_all_metrics(
--   '682432124',
--   '2025-09-01'::timestamp,
--   '2025-09-30'::timestamp
-- );
