-- MANUAL CALL-TO-CLOSE CALCULATION (via Contact Owner)
-- Run this in Supabase SQL Editor
--
-- Logic: Deal → Contact → Contact.owner_id = Sales Manager

WITH sales_managers AS (
  SELECT '81280578' as owner_id, 'Abd alslam Sharqawi' as name
  UNION ALL SELECT '726197388', 'Mothanna Alawneh'
  UNION ALL SELECT '687247262', 'Wala'' M Hassan'
  UNION ALL SELECT '83618074', 'Bisan Jaffari (Followup)'
),
calls_per_owner AS (
  SELECT
    hubspot_owner_id,
    COUNT(DISTINCT call_id) as total_calls
  FROM call_contact_matches_mv
  GROUP BY hubspot_owner_id
),
deals_per_owner AS (
  SELECT
    c.hubspot_owner_id,
    COUNT(*) as total_deals,
    COUNT(CASE WHEN d.dealstage = 'closedwon' THEN 1 END) as closed_won,
    SUM(CASE WHEN d.dealstage = 'closedwon' THEN COALESCE(d.amount::numeric, 0) ELSE 0 END) as revenue
  FROM hubspot_deals_raw d
  LEFT JOIN hubspot_contacts_raw c
    ON c.hubspot_id = (d.raw_json->'associations'->'contacts'->'results'->0->>'id')
  WHERE d.raw_json->'associations'->'contacts'->'results' IS NOT NULL
    AND jsonb_array_length(d.raw_json->'associations'->'contacts'->'results') > 0
  GROUP BY c.hubspot_owner_id
)
SELECT
  sm.name,
  sm.owner_id,
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
FROM sales_managers sm
LEFT JOIN calls_per_owner cpo ON cpo.hubspot_owner_id = sm.owner_id
LEFT JOIN deals_per_owner dpo ON dpo.hubspot_owner_id = sm.owner_id
ORDER BY closed_won DESC;
