/**
 * =====================================================================
 * Migration 032: Fix Deals Breakdown - Ambiguous Column
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   SQL error: column reference "amount" is ambiguous
 *
 * РЕШЕНИЕ:
 *   Явно указать hubspot_deals_raw.amount
 *
 * Created: 2025-10-14
 * =====================================================================
 */

CREATE OR REPLACE FUNCTION get_deals_breakdown(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  amount NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(d.dealstage, 'unknown') as stage,
    COUNT(*)::BIGINT as count,
    COALESCE(SUM(d.amount), 0) as amount
  FROM hubspot_deals_raw d
  WHERE
    (p_owner_id IS NULL OR d.hubspot_owner_id = p_owner_id)
    AND (p_date_from IS NULL OR d.closedate >= p_date_from)
    AND (p_date_to IS NULL OR d.closedate <= p_date_to)
  GROUP BY d.dealstage
  ORDER BY COUNT(*) DESC;
END;
$$;

COMMENT ON FUNCTION get_deals_breakdown(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns deals grouped by stage with counts and amounts. Fixed ambiguous column reference.';
