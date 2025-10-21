-- Migration 040: Fix Call-to-Close - Use Contact Owner Instead of Call History
-- Created: 2025-10-21
-- Purpose: Simplify logic - use contact.hubspot_owner_id instead of complex phone matching

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
  SET LOCAL statement_timeout = '10s';

  WITH
  -- Get calls count per owner (from materialized view)
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

  -- Get deals per owner (via Contact Owner - SIMPLE!)
  deals_per_owner AS (
    SELECT
      c.hubspot_owner_id as owner_id,
      COUNT(*) as total_deals,
      COUNT(CASE WHEN d.dealstage = 'closedwon' THEN 1 END) as closed_won,
      SUM(CASE WHEN d.dealstage = 'closedwon' THEN COALESCE(d.amount::numeric, 0) ELSE 0 END) as revenue
    FROM hubspot_deals_raw d
    LEFT JOIN hubspot_contacts_raw c
      ON c.hubspot_id = (d.raw_json->'associations'->'contacts'->'results'->0->>'id')
    WHERE d.raw_json->'associations'->'contacts'->'results' IS NOT NULL
      AND jsonb_array_length(d.raw_json->'associations'->'contacts'->'results') > 0
      AND (p_owner_id IS NULL OR c.hubspot_owner_id = p_owner_id)
      AND (p_date_from IS NULL OR d.closedate >= p_date_from)
      AND (p_date_to IS NULL OR d.closedate <= p_date_to)
    GROUP BY c.hubspot_owner_id
  ),

  -- Join with owner names
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

COMMENT ON FUNCTION get_call_to_close_metrics IS 'Calculate call-to-close metrics using contact.hubspot_owner_id (simple and fast)';
