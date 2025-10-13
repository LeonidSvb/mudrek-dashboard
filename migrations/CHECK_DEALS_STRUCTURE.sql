-- Check if deals have email
SELECT
  'Column check' as step,
  column_name
FROM information_schema.columns
WHERE table_name = 'hubspot_deals_raw'
AND column_name LIKE '%email%';

-- Check raw_json structure
SELECT
  'Sample deal raw_json' as step,
  jsonb_object_keys(raw_json) as json_keys
FROM hubspot_deals_raw
LIMIT 1;

-- Try to find email in raw_json
SELECT
  'Email from raw_json' as step,
  hubspot_id,
  raw_json->>'email' as email_direct,
  raw_json->'associations'->'contacts' as contact_associations
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
LIMIT 3;
