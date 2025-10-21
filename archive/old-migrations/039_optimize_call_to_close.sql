-- Migration 039: Optimize Call-to-Close Function (FAST!)
-- Created: 2025-10-21
-- Purpose: Use materialized views instead of slow phone JOINs

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
  -- No need for long timeout - this should be fast!
  SET LOCAL statement_timeout = '10s';

  WITH
  -- Get calls count per owner (from materialized view - FAST!)
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

  -- Determine closing manager for each deal using materialized view
  deal_closing_manager AS (
    SELECT DISTINCT ON (d.hubspot_id)
      d.hubspot_id as deal_id,
      d.dealstage,
      d.amount,
      d.closedate,
      ccm.hubspot_owner_id as closing_manager_id,
      ccm.call_timestamp as last_call_before_close
    FROM hubspot_deals_raw d
    -- Get associated contact
    CROSS JOIN LATERAL (
      SELECT (d.raw_json->'associations'->'contacts'->'results'->0->>'id') as contact_id
    ) contact_assoc
    -- Use materialized view instead of slow phone JOIN! (column is 'contact_id', not 'hubspot_contact_id')
    INNER JOIN call_contact_matches_mv ccm ON ccm.contact_id = contact_assoc.contact_id
    WHERE d.dealstage IS NOT NULL
      AND d.closedate IS NOT NULL
      AND contact_assoc.contact_id IS NOT NULL
      AND (p_date_from IS NULL OR d.closedate >= p_date_from)
      AND (p_date_to IS NULL OR d.closedate <= p_date_to)
      -- Only calls before deal close
      AND ccm.call_timestamp <= d.closedate
    ORDER BY d.hubspot_id, ccm.call_timestamp DESC
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

  -- Join with owner names (column is 'owner_name', not 'name')
  metrics AS (
    SELECT
      o.owner_id,
      o.owner_name,
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
    LEFT JOIN calls_per_owner cpo ON cpo.owner_id = o.owner_id
    LEFT JOIN deals_per_owner dpo ON dpo.owner_id = o.owner_id
    WHERE (p_owner_id IS NULL OR o.owner_id = p_owner_id)
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

COMMENT ON FUNCTION get_call_to_close_metrics IS 'FAST! Calculate call-to-close metrics using materialized views instead of slow phone JOINs. Execution time: <1s';
