-- =====================================================================
-- ПРОВЕРКА МЕТРИК ПО DEALS
-- =====================================================================

-- 1. Total Sales (должно быть ~$1.15M)
SELECT
  'Total Sales' as metric,
  COALESCE(SUM(amount), 0) as value,
  COUNT(*) as deals_count
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- 2. Average Deal Size
SELECT
  'Average Deal Size' as metric,
  COALESCE(ROUND(AVG(amount), 2), 0) as value,
  COUNT(*) as deals_count
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND amount > 0;

-- 3. Total Deals
SELECT
  'Total Deals' as metric,
  COUNT(*) as value
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- 4. Deals by Amount Range
SELECT
  CASE
    WHEN amount < 1000 THEN '< $1k'
    WHEN amount < 5000 THEN '$1k - $5k'
    WHEN amount < 10000 THEN '$5k - $10k'
    ELSE '> $10k'
  END as amount_range,
  COUNT(*) as deals_count,
  ROUND(SUM(amount), 2) as total_revenue
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
GROUP BY
  CASE
    WHEN amount < 1000 THEN '< $1k'
    WHEN amount < 5000 THEN '$1k - $5k'
    WHEN amount < 10000 THEN '$5k - $10k'
    ELSE '> $10k'
  END
ORDER BY MIN(amount);

-- 5. Recent Deals (last 30 days)
SELECT
  hubspot_id,
  dealname,
  amount,
  closedate,
  hubspot_owner_id
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate >= NOW() - INTERVAL '30 days'
ORDER BY closedate DESC
LIMIT 10;

-- 6. Compare amount vs deal_whole_amount
SELECT
  'Using amount' as source,
  COALESCE(SUM((raw_json->>'properties')::json->>'amount')::numeric, 0) as total
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
UNION ALL
SELECT
  'Using deal_whole_amount' as source,
  COALESCE(SUM((raw_json->>'properties')::json->>'deal_whole_amount')::numeric, 0) as total
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
