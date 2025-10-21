-- ============================================================================
-- Migration 011: Optimize contact_call_stats with Materialized View + pg_cron
-- ============================================================================
--
-- PURPOSE:
--   Fix timeout issue in get_all_metrics() by replacing VIEW with
--   Materialized View that auto-refreshes every hour via pg_cron
--
-- WHAT THIS DOES:
--   1. Creates Materialized View from existing contact_call_stats VIEW
--   2. Adds UNIQUE INDEX for fast lookups
--   3. Enables pg_cron extension
--   4. Schedules hourly refresh
--   5. Updates get_all_metrics() to use Materialized View
--
-- PERFORMANCE IMPROVEMENT:
--   Before: 60+ seconds (timeout)
--   After:  < 1 second
--
-- AUTO-REFRESH:
--   - Every hour (0 * * * *)
--   - Can be changed to daily: '0 0 * * *'
--   - Uses CONCURRENTLY for zero downtime
--
-- CREATED: 2025-10-11
-- VERSION: 1.0
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Materialized View
-- ============================================================================

-- Create Materialized View from existing VIEW
-- This will execute the VIEW query ONCE and store results
CREATE MATERIALIZED VIEW IF NOT EXISTS contact_call_stats_mv AS
SELECT * FROM contact_call_stats;

COMMENT ON MATERIALIZED VIEW contact_call_stats_mv IS
'Materialized version of contact_call_stats VIEW. Auto-refreshed hourly via pg_cron. Use this for production queries instead of the VIEW.';

-- ============================================================================
-- STEP 2: Create Indexes
-- ============================================================================

-- UNIQUE index on contact_id for fast lookups and CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_call_stats_mv_pk
  ON contact_call_stats_mv(contact_id);

-- Index on owner for filtering by manager
CREATE INDEX IF NOT EXISTS idx_contact_call_stats_mv_owner
  ON contact_call_stats_mv(hubspot_owner_id);

COMMENT ON INDEX idx_contact_call_stats_mv_pk IS
'Primary key index. Required for REFRESH MATERIALIZED VIEW CONCURRENTLY.';

-- ============================================================================
-- STEP 3: Initial Refresh
-- ============================================================================

-- Refresh to populate with latest data
REFRESH MATERIALIZED VIEW contact_call_stats_mv;

-- ============================================================================
-- STEP 4: Enable pg_cron Extension
-- ============================================================================

-- Enable pg_cron for scheduled tasks
-- Note: This requires superuser privileges (should work in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 5: Schedule Auto-Refresh
-- ============================================================================

-- Remove existing job if exists (idempotent)
SELECT cron.unschedule('refresh-contact-stats')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-contact-stats'
);

-- Schedule hourly refresh at the top of each hour
-- Cron format: 'minute hour day month weekday'
-- Examples:
--   '0 * * * *'    = Every hour at :00
--   '0 */2 * * *'  = Every 2 hours
--   '0 0 * * *'    = Every day at midnight
--   '0 */6 * * *'  = Every 6 hours
SELECT cron.schedule(
  'refresh-contact-stats',           -- Job name
  '0 * * * *',                       -- Every hour at :00
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY contact_call_stats_mv $$
);

COMMENT ON EXTENSION pg_cron IS
'Cron job scheduler. Used to auto-refresh contact_call_stats_mv every hour.';

-- ============================================================================
-- STEP 6: Update get_all_metrics() Function
-- ============================================================================

-- Update function to use Materialized View instead of VIEW
-- This is the critical change that fixes the timeout
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
    -- CALL METRICS
    -- =======================================
    'totalCalls', (
      SELECT COUNT(*)
      FROM hubspot_calls_raw
      WHERE (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'avgCallTime', (
      SELECT COALESCE(ROUND(AVG(call_duration) / 60000, 1), 0)
      FROM hubspot_calls_raw
      WHERE call_duration > 0
        AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
        AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    ),

    'totalCallTime', (
      SELECT COALESCE(ROUND(SUM(call_duration) / 3600000, 1), 0)
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
    -- CHANGED: Use contact_call_stats_mv instead of contact_call_stats
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
'Returns all 22 metrics with optional filters. v1.3 - Uses contact_call_stats_mv for performance.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check Materialized View data
-- SELECT COUNT(*) FROM contact_call_stats_mv;

-- Check cron job status
-- SELECT * FROM cron.job WHERE jobname = 'refresh-contact-stats';

-- Check last run time
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-contact-stats')
-- ORDER BY start_time DESC LIMIT 5;

-- Manual refresh (if needed)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY contact_call_stats_mv;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- 1. Update get_all_metrics() to use contact_call_stats VIEW
-- 2. DROP MATERIALIZED VIEW contact_call_stats_mv;
-- 3. SELECT cron.unschedule('refresh-contact-stats');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
