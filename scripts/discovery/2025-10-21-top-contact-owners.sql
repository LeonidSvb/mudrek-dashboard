-- Find top contact owners in deal associations

WITH deal_contacts AS (
  SELECT
    d.hubspot_id as deal_id,
    d.dealstage,
    (d.raw_json->'associations'->'contacts'->'results'->0->>'id') as contact_id
  FROM hubspot_deals_raw d
  WHERE d.raw_json->'associations'->'contacts'->'results' IS NOT NULL
    AND jsonb_array_length(d.raw_json->'associations'->'contacts'->'results') > 0
)
SELECT
  c.hubspot_owner_id,
  COUNT(*) as total_deals,
  COUNT(CASE WHEN dc.dealstage = 'closedwon' THEN 1 END) as closed_won,
  ROUND(
    COUNT(CASE WHEN dc.dealstage = 'closedwon' THEN 1 END)::numeric / COUNT(*) * 100,
    2
  ) as deal_conversion_rate
FROM deal_contacts dc
LEFT JOIN hubspot_contacts_raw c ON c.hubspot_id = dc.contact_id
WHERE c.hubspot_owner_id IS NOT NULL
GROUP BY c.hubspot_owner_id
ORDER BY total_deals DESC
LIMIT 20;
