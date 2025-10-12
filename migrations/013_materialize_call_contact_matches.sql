-- ============================================================================
-- Migration 013: Materialize call_contact_matches VIEW
-- ============================================================================
--
-- PROBLEM:
--   get_all_metrics() calls call_contact_matches VIEW 4 times (totalCalls,
--   avgCallTime, totalCallTime, fiveMinReachedRate). This VIEW does heavy
--   INNER JOIN with REGEXP_REPLACE on every query.
--
-- SOLUTION:
--   Create Materialized View and update get_all_metrics() to use it
--
-- PERFORMANCE IMPROVEMENT:
--   Before: 4 heavy JOINs = ~8-10 seconds (timeout)
--   After:  4 simple SELECTs from MV = < 1 second
--
-- CREATED: 2025-10-12
-- VERSION: 1.0
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Materialized View
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS call_contact_matches_mv AS
SELECT * FROM call_contact_matches;

COMMENT ON MATERIALIZED VIEW call_contact_matches_mv IS
'Materialized version of call_contact_matches VIEW. Auto-refreshed hourly via pg_cron. Use this for production queries.';

-- ============================================================================
-- STEP 2: Create Indexes
-- ============================================================================

-- UNIQUE index on call_id for fast lookups and CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_contact_matches_mv_pk
  ON call_contact_matches_mv(call_id);

-- Index on owner for filtering by manager
CREATE INDEX IF NOT EXISTS idx_call_contact_matches_mv_owner
  ON call_contact_matches_mv(hubspot_owner_id);

-- Index on timestamp for date filtering
CREATE INDEX IF NOT EXISTS idx_call_contact_matches_mv_timestamp
  ON call_contact_matches_mv(call_timestamp);

COMMENT ON INDEX idx_call_contact_matches_mv_pk IS
'Primary key index. Required for REFRESH MATERIALIZED VIEW CONCURRENTLY.';

-- ============================================================================
-- STEP 3: Initial Refresh
-- ============================================================================

REFRESH MATERIALIZED VIEW call_contact_matches_mv;

-- ============================================================================
-- STEP 4: Update pg_cron to Refresh Both MVs
-- ============================================================================

-- Remove old job
SELECT cron.unschedule('refresh-contact-stats')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-contact-stats'
);

-- Schedule hourly refresh for BOTH Materialized Views
SELECT cron.schedule(
  'refresh-contact-stats',
  '0 * * * *',  -- Every hour at :00
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY contact_call_stats_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY call_contact_matches_mv;
  $$
);

-- ============================================================================
-- STEP 5: Update get_all_metrics() Function
-- ============================================================================

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
    -- =======================================
    -- TOP 4 KPIs
    -- =======================================
    'totalSales', (
      SELECT COALESCE(SUM(amount), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    'avgDealSize', (
      SELECT COALESCE(AVG(amount), 0)
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
        (SELECT COUNT(*)::numeric FROM hubspot_deals_raw
         WHERE dealstage = 'closedwon'
           AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
           AND (p_date_from IS NULL OR closedate >= p_date_from)
           AND (p_date_to IS NULL OR closedate <= p_date_to))
        /
        NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw
                WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
                  AND (p_date_from IS NULL OR createdate >= p_date_from)
                  AND (p_date_to IS NULL OR createdate <= p_date_to)), 0)
        * 100,
        2
      )
    ),

    'totalContacts', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR createdate >= p_date_from)
        AND (p_date_to IS NULL OR createdate <= p_date_to)
    ),

    -- =======================================
    -- CALL METRICS (NOW USING MV!)
    -- =======================================
    'totalCalls', (
      SELECT COUNT(*)
      FROM call_contact_matches_mv
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'avgCallTime', (
      SELECT COALESCE(ROUND(AVG(call_duration) / 60000, 1), 0)
      FROM call_contact_matches_mv
      WHERE call_duration > 0
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'totalCallTime', (
      SELECT COALESCE(ROUND(SUM(call_duration) / 3600000, 1), 0)
      FROM call_contact_matches_mv
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'fiveMinReachedRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM call_contact_matches_mv
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    -- =======================================
    -- CONVERSION METRICS
    -- =======================================
    'qualifiedRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE (raw_json->>'qualified_status') = 'qualified')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    'trialRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE (raw_json->>'trial_status') = 'active')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    'cancellationRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE dealstage = 'closedlost')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    -- =======================================
    -- PAYMENT METRICS
    -- =======================================
    'upfrontCashCollected', (
      SELECT COALESCE(SUM((raw_json->>'upfront_payment')::numeric), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND raw_json->>'upfront_payment' IS NOT NULL
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    'avgInstallments', (
      SELECT COALESCE(ROUND(AVG((raw_json->>'installment_plan')::numeric), 1), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND raw_json->>'installment_plan' IS NOT NULL
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    -- =======================================
    -- FOLLOWUP METRICS (using Materialized View)
    -- =======================================
    'followupRate', (
      SELECT COALESCE(
        ROUND(
          SUM(has_followups)::numeric / NULLIF(COUNT(*), 0) * 100,
          2
        ),
        0
      )
      FROM contact_call_stats_mv
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'avgFollowups', (
      SELECT COALESCE(ROUND(AVG(followup_count), 1), 0)
      FROM contact_call_stats_mv
      WHERE total_calls > 0
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    'timeToFirstContact', (
      SELECT COALESCE(ROUND(AVG(days_to_first_call), 1), 0)
      FROM contact_call_stats_mv
      WHERE days_to_first_call > 0
        AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    ),

    -- =======================================
    -- TIME METRICS
    -- =======================================
    'timeToSale', (
      SELECT COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (closedate - createdate)) / 86400), 1),
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

    -- =======================================
    -- OFFER METRICS
    -- =======================================
    'offersGivenRate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE (raw_json->>'offer_given') = 'true')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    'offerCloseRate', (
      SELECT ROUND(
        COUNT(*) FILTER (
          WHERE dealstage = 'closedwon'
          AND (raw_json->>'offer_given') = 'true'
        )::numeric /
        NULLIF(COUNT(*) FILTER (WHERE (raw_json->>'offer_given') = 'true'), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
      WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
        AND (p_date_from IS NULL OR closedate >= p_date_from)
        AND (p_date_to IS NULL OR closedate <= p_date_to)
    ),

    -- =======================================
    -- A/B TESTING METRICS (no filters)
    -- =======================================
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
    )

  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_all_metrics IS
'Returns all 22 metrics with optional filters. v1.5 - Call Metrics use call_contact_matches_mv for performance.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check MV count (should be ~118k)
-- SELECT COUNT(*) FROM call_contact_matches_mv;

-- Check for call duplicates (should return 0)
-- SELECT call_id, COUNT(*)
-- FROM call_contact_matches_mv
-- GROUP BY call_id
-- HAVING COUNT(*) > 1;

-- Test function performance (should be < 1 second)
-- SELECT get_all_metrics(NULL, '2025-09-12'::timestamp, '2025-10-12'::timestamp);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
