-- Find who actually owns deals in HubSpot

SELECT
  hubspot_owner_id,
  COUNT(*) as total_deals,
  COUNT(CASE WHEN dealstage = 'closedwon' THEN 1 END) as closed_won,
  SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount::numeric, 0) ELSE 0 END) as revenue,
  ROUND(
    COUNT(CASE WHEN dealstage = 'closedwon' THEN 1 END)::numeric / COUNT(*) * 100,
    2
  ) as deal_conversion_rate
FROM hubspot_deals_raw
WHERE hubspot_owner_id IS NOT NULL
GROUP BY hubspot_owner_id
ORDER BY total_deals DESC
LIMIT 20;
