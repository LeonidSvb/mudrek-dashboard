-- =====================================================================
-- ПРОВЕРКА ПРОБЛЕМ В ДАННЫХ
-- =====================================================================

-- =====================================================================
-- ПРОБЛЕМА 1: Contacts by owner не складывается до 100%
-- =====================================================================

-- 1. Сколько контактов БЕЗ owner_id?
SELECT
  COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL) as without_owner,
  COUNT(*) FILTER (WHERE hubspot_owner_id IS NOT NULL) as with_owner,
  COUNT(*) as total,
  ROUND(
    COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL)::numeric / COUNT(*) * 100,
    1
  ) as percent_without_owner
FROM hubspot_contacts_raw;

-- 2. ВСЕ owners (не только топ-10)
SELECT
  COALESCE(hubspot_owner_id, 'NO OWNER') as owner,
  COUNT(*) as contacts_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_contacts_raw) * 100, 1) as percent
FROM hubspot_contacts_raw
GROUP BY hubspot_owner_id
ORDER BY contacts_count DESC;


-- =====================================================================
-- ПРОБЛЕМА 2: Deals breakdown по stages за последние 30 дней
-- =====================================================================

-- 1. Все deals за последние 30 дней (по всем stages)
SELECT
  COALESCE(dealstage, 'NO STAGE') as stage,
  COUNT(*) as deals_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent,
  COALESCE(SUM(amount), 0) as total_amount
FROM hubspot_deals_raw
WHERE closedate >= (NOW() - INTERVAL '30 days')::timestamp
   OR createdate >= (NOW() - INTERVAL '30 days')::timestamp
GROUP BY dealstage
ORDER BY deals_count DESC;

-- 2. Только closedate за последние 30 дней
SELECT
  COALESCE(dealstage, 'NO STAGE') as stage,
  COUNT(*) as deals_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM hubspot_deals_raw
WHERE closedate >= (NOW() - INTERVAL '30 days')::timestamp
GROUP BY dealstage
ORDER BY deals_count DESC;

-- 3. Только createdate за последние 30 дней
SELECT
  COALESCE(dealstage, 'NO STAGE') as stage,
  COUNT(*) as deals_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM hubspot_deals_raw
WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
GROUP BY dealstage
ORDER BY deals_count DESC;


-- =====================================================================
-- ПРОБЛЕМА 3: Даты создания deals vs contacts (277 дней до закрытия)
-- =====================================================================

-- 1. Проверить distribution по времени создания deals
SELECT
  CASE
    WHEN createdate < '2024-01-01' THEN 'Before 2024'
    WHEN createdate < '2024-07-01' THEN '2024 H1'
    WHEN createdate < '2025-01-01' THEN '2024 H2'
    ELSE '2025+'
  END as period,
  COUNT(*) as deals_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM hubspot_deals_raw
WHERE createdate IS NOT NULL
GROUP BY period
ORDER BY period;

-- 2. Проверить distribution по времени создания contacts
SELECT
  CASE
    WHEN createdate < '2024-01-01' THEN 'Before 2024'
    WHEN createdate < '2024-07-01' THEN '2024 H1'
    WHEN createdate < '2025-01-01' THEN '2024 H2'
    ELSE '2025+'
  END as period,
  COUNT(*) as contacts_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM hubspot_contacts_raw
WHERE createdate IS NOT NULL
GROUP BY period
ORDER BY period;

-- 3. Сравнить: deals с closedate РАНЬШЕ createdate (ошибка данных)
SELECT
  COUNT(*) as deals_with_invalid_dates,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedwon') * 100, 1) as percent
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL
  AND closedate < createdate;

-- 4. Примеры deals с неправильными датами
SELECT
  hubspot_id,
  dealname,
  amount,
  createdate,
  closedate,
  EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 as days_diff
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL
  AND closedate < createdate
LIMIT 10;

-- 5. Distribution по времени закрытия (правильные даты)
SELECT
  CASE
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 0 THEN 'Invalid (negative)'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 7 THEN '0-7 days'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 30 THEN '7-30 days'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 90 THEN '30-90 days'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 180 THEN '90-180 days'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 365 THEN '180-365 days'
    ELSE '365+ days'
  END as time_range,
  COUNT(*) as deals_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL
GROUP BY time_range
ORDER BY
  CASE time_range
    WHEN 'Invalid (negative)' THEN 0
    WHEN '0-7 days' THEN 1
    WHEN '7-30 days' THEN 2
    WHEN '30-90 days' THEN 3
    WHEN '90-180 days' THEN 4
    WHEN '180-365 days' THEN 5
    ELSE 6
  END;

-- 6. Топ-10 самых быстрых сделок (меньше 7 дней)
SELECT
  hubspot_id,
  dealname,
  amount,
  createdate,
  closedate,
  ROUND(EXTRACT(EPOCH FROM (closedate - createdate)) / 86400, 1) as days_to_close
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL
  AND EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 >= 0
ORDER BY days_to_close ASC
LIMIT 10;

-- 7. Топ-10 самых долгих сделок (больше 365 дней)
SELECT
  hubspot_id,
  dealname,
  amount,
  createdate,
  closedate,
  ROUND(EXTRACT(EPOCH FROM (closedate - createdate)) / 86400, 1) as days_to_close
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL
ORDER BY days_to_close DESC
LIMIT 10;


-- =====================================================================
-- ПРОБЛЕМА 4: Payment поля (upfront_payment, installments)
-- =====================================================================

-- 1. Сколько deals имеют заполненные payment поля?
SELECT
  COUNT(*) as total_deals,
  COUNT(*) FILTER (WHERE dealstage = 'closedwon') as closed_deals,
  COUNT(*) FILTER (WHERE upfront_payment IS NOT NULL) as has_upfront_field,
  COUNT(*) FILTER (WHERE upfront_payment > 0) as has_upfront_value,
  COUNT(*) FILTER (WHERE number_of_installments__months IS NOT NULL) as has_installments_field,
  COUNT(*) FILTER (WHERE number_of_installments__months > 0) as has_installments_value
FROM hubspot_deals_raw;

-- 2. Примеры deals где upfront_payment заполнено
SELECT
  hubspot_id,
  dealname,
  amount,
  upfront_payment,
  number_of_installments__months,
  dealstage
FROM hubspot_deals_raw
WHERE upfront_payment IS NOT NULL
  AND upfront_payment > 0
LIMIT 10;

-- 3. Примеры deals где installments заполнено
SELECT
  hubspot_id,
  dealname,
  amount,
  upfront_payment,
  number_of_installments__months,
  dealstage
FROM hubspot_deals_raw
WHERE number_of_installments__months IS NOT NULL
  AND number_of_installments__months > 0
LIMIT 10;


-- =====================================================================
-- ДОПОЛНИТЕЛЬНО: Проверить качество других полей в deals
-- =====================================================================

SELECT
  COUNT(*) as total_deals,
  COUNT(*) FILTER (WHERE dealstage = 'closedwon') as closed_deals,
  COUNT(*) FILTER (WHERE amount IS NOT NULL) as has_amount,
  COUNT(*) FILTER (WHERE hubspot_owner_id IS NOT NULL) as has_owner,
  COUNT(*) FILTER (WHERE closedate IS NOT NULL) as has_closedate,
  COUNT(*) FILTER (WHERE createdate IS NOT NULL) as has_createdate,
  COUNT(*) FILTER (WHERE qualified_status = 'yes') as has_qualified,
  COUNT(*) FILTER (WHERE trial_status = 'yes') as has_trial,
  COUNT(*) FILTER (WHERE offer_given = 'yes') as has_offer_given,
  COUNT(*) FILTER (WHERE offer_accepted = 'yes') as has_offer_accepted
FROM hubspot_deals_raw;
