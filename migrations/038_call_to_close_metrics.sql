-- Migration 038: Call-to-Close Rate Metrics with Auto-Learning Phone Mapping
-- Created: 2025-10-21
-- Purpose: Track call-to-close conversion rates by automatically determining closing manager from call history

-- =============================================================================
-- Step 1: Create materialized view for automatic phone-to-owner mapping
-- =============================================================================
-- This view learns which phone numbers belong to which owners by analyzing call patterns
-- Refreshes after each sync to adapt to new numbers automatically

CREATE MATERIALIZED VIEW IF NOT EXISTS phone_to_owner_mapping AS
WITH phone_owner_stats AS (
  SELECT
    c.call_from_number,
    ccm.hubspot_owner_id,
    COUNT(*) as call_count,
    MAX(c.call_timestamp) as last_call_date
  FROM hubspot_calls_raw c
  JOIN call_contact_matches_mv ccm ON ccm.call_id = c.hubspot_id
  WHERE c.call_direction = 'OUTBOUND'
    AND ccm.hubspot_owner_id IS NOT NULL
    AND c.call_from_number IS NOT NULL
  GROUP BY c.call_from_number, ccm.hubspot_owner_id
),
ranked_owners AS (
  SELECT
    call_from_number,
    hubspot_owner_id,
    call_count,
    last_call_date,
    ROUND((call_count::numeric / SUM(call_count) OVER (PARTITION BY call_from_number)) * 100, 2) as confidence_percent,
    ROW_NUMBER() OVER (PARTITION BY call_from_number ORDER BY call_count DESC) as rank
  FROM phone_owner_stats
)
SELECT
  call_from_number,
  hubspot_owner_id as owner_id,
  call_count,
  confidence_percent,
  last_call_date
FROM ranked_owners
WHERE rank = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_to_owner_unique ON phone_to_owner_mapping(call_from_number);
CREATE INDEX IF NOT EXISTS idx_phone_to_owner_id ON phone_to_owner_mapping(owner_id);

COMMENT ON MATERIALIZED VIEW phone_to_owner_mapping IS 'Auto-learning mapping of phone numbers to owners based on call history. Refreshes after each sync.';

-- =============================================================================
-- Step 2: Create function to get call-to-close metrics
-- =============================================================================

CREATE OR REPLACE FUNCTION get_call_to_close_metrics(
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
  -- Increase timeout for complex queries
  SET LOCAL statement_timeout = '30s';

  WITH
  -- Get calls count per owner
  calls_per_owner AS (
    SELECT
      hubspot_owner_id as owner_id,
      COUNT(DISTINCT call_id) as total_calls
    FROM call_contact_matches_mv
    WHERE (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
      AND (p_date_from IS NULL OR call_timestamp >= p_date_from)
      AND (p_date_to IS NULL OR call_timestamp <= p_date_to)
    GROUP BY hubspot_owner_id
  ),

  -- Determine closing manager for each deal
  deal_closing_manager AS (
    SELECT DISTINCT ON (d.hubspot_id)
      d.hubspot_id as deal_id,
      d.dealstage,
      d.amount,
      d.closedate,
      ptom.owner_id as closing_manager_id,
      c.call_timestamp as last_call_before_close
    FROM hubspot_deals_raw d
    -- Get associated contact
    CROSS JOIN LATERAL (
      SELECT (d.raw_json->'associations'->'contacts'->'results'->0->>'id') as contact_id
    ) contact_assoc
    -- Get contact details
    LEFT JOIN hubspot_contacts_raw cont ON cont.hubspot_id = contact_assoc.contact_id
    -- Get all calls to this contact before deal close
    LEFT JOIN hubspot_calls_raw c ON (
      c.call_to_number = REPLACE(REPLACE(cont.phone, '+', ''), ' ', '')
      OR c.call_to_number = REPLACE(REPLACE(REPLACE(cont.phone, '+', ''), ' ', ''), '-', '')
    )
    -- Map call phone number to owner
    LEFT JOIN phone_to_owner_mapping ptom ON ptom.call_from_number = c.call_from_number
    WHERE d.dealstage IS NOT NULL
      AND contact_assoc.contact_id IS NOT NULL
      AND (p_date_from IS NULL OR d.closedate >= p_date_from)
      AND (p_date_to IS NULL OR d.closedate <= p_date_to)
      AND (c.call_timestamp IS NULL OR c.call_timestamp <= d.closedate)
    ORDER BY d.hubspot_id, c.call_timestamp DESC NULLS LAST
  ),

  -- Aggregate deals per closing manager
  deals_per_owner AS (
    SELECT
      closing_manager_id as owner_id,
      COUNT(*) as total_deals,
      COUNT(CASE WHEN dealstage = 'closedwon' THEN 1 END) as closed_won,
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount::numeric, 0) ELSE 0 END) as revenue
    FROM deal_closing_manager
    WHERE closing_manager_id IS NOT NULL
      AND (p_owner_id IS NULL OR closing_manager_id = p_owner_id)
    GROUP BY closing_manager_id
  ),

  -- Join with owner names
  metrics AS (
    SELECT
      o.hubspot_owner_id as owner_id,
      o.name as owner_name,
      COALESCE(cpo.total_calls, 0) as total_calls,
      COALESCE(dpo.total_deals, 0) as total_deals,
      COALESCE(dpo.closed_won, 0) as closed_won,
      ROUND(COALESCE(dpo.revenue, 0), 2) as revenue,
      ROUND(
        (COALESCE(dpo.closed_won, 0)::numeric / NULLIF(COALESCE(cpo.total_calls, 0), 0)) * 100,
        2
      ) as call_to_close_rate,
      ROUND(
        (COALESCE(dpo.closed_won, 0)::numeric / NULLIF(COALESCE(dpo.total_deals, 0), 0)) * 100,
        2
      ) as deal_conversion_rate
    FROM hubspot_owners o
    LEFT JOIN calls_per_owner cpo ON cpo.owner_id = o.hubspot_owner_id
    LEFT JOIN deals_per_owner dpo ON dpo.owner_id = o.hubspot_owner_id
    WHERE (p_owner_id IS NULL OR o.hubspot_owner_id = p_owner_id)
      AND (cpo.total_calls > 0 OR dpo.total_deals > 0)
  )

  SELECT json_agg(
    json_build_object(
      'owner_id', owner_id,
      'owner_name', owner_name,
      'total_calls', total_calls,
      'total_deals', total_deals,
      'closed_won', closed_won,
      'revenue', revenue,
      'call_to_close_rate', call_to_close_rate,
      'deal_conversion_rate', deal_conversion_rate
    )
    ORDER BY closed_won DESC
  ) INTO result
  FROM metrics;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

COMMENT ON FUNCTION get_call_to_close_metrics IS 'Calculate call-to-close conversion metrics by automatically determining closing manager from call history before deal close date';

-- =============================================================================
-- Step 3: Refresh materialized view (initial load)
-- =============================================================================

REFRESH MATERIALIZED VIEW phone_to_owner_mapping;

-- =============================================================================
-- Migration complete
-- =============================================================================

-- Usage examples:
-- SELECT get_call_to_close_metrics();  -- All owners
-- SELECT get_call_to_close_metrics('687247262');  -- Specific owner (Wala)
-- SELECT get_call_to_close_metrics(NULL, '2025-09-01'::timestamptz, '2025-09-30'::timestamptz);  -- Date range
