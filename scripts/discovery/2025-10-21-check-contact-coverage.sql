-- Check contact owner coverage in deal associations

WITH deal_contacts AS (
  SELECT
    d.hubspot_id as deal_id,
    (d.raw_json->'associations'->'contacts'->'results'->0->>'id') as contact_id
  FROM hubspot_deals_raw d
  WHERE d.raw_json->'associations'->'contacts'->'results' IS NOT NULL
    AND jsonb_array_length(d.raw_json->'associations'->'contacts'->'results') > 0
)
SELECT
  COUNT(*) as total_deals_with_contacts,
  COUNT(c.hubspot_id) as contacts_found_in_db,
  COUNT(c.hubspot_owner_id) as contacts_with_owner,
  COUNT(CASE WHEN c.hubspot_owner_id IN ('81280578', '726197388', '687247262', '83618074') THEN 1 END) as contacts_owned_by_sales_managers,
  ROUND(COUNT(c.hubspot_owner_id)::numeric / COUNT(*) * 100, 2) as owner_coverage_percent
FROM deal_contacts dc
LEFT JOIN hubspot_contacts_raw c ON c.hubspot_id = dc.contact_id;
