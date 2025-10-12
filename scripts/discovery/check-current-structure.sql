-- Проверим текущую структуру
SELECT 'call_contact_matches columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_contact_matches' 
  AND table_schema = 'public';

SELECT 'contact_call_stats_mv columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contact_call_stats_mv'
  AND table_schema = 'public';

SELECT 'Sample from call_contact_matches (1 row):' as info;
SELECT * FROM call_contact_matches LIMIT 1;
