-- =====================================================================
-- ТЕСТИРОВАНИЕ ВСЕХ ГРУПП МЕТРИК
-- =====================================================================
-- Запусти эти запросы в Supabase SQL Editor чтобы проверить метрики

-- =====================================================================
-- USE CASE 1: ВСЕ МЕТРИКИ БЕЗ ФИЛЬТРОВ
-- =====================================================================
SELECT * FROM get_all_metrics();

-- Ожидаем увидеть:
-- totalSales, avgDealSize, totalDeals, conversionRate (Sales)
-- totalCalls, avgCallTime, totalCallTime, fiveMinReachedRate (Calls)
-- qualifiedRate, trialRate, cancellationRate (Conversion)
-- upfrontCashCollected, avgInstallments (Payment)
-- followupRate, avgFollowups, timeToFirstContact (Followup)
-- offersGivenRate, offerCloseRate (Offers)
-- timeToSale (Time)
-- salesScriptStats, vslWatchStats (A/B Testing)
-- totalContacts (Metadata)


-- =====================================================================
-- USE CASE 2: МЕТРИКИ ДЛЯ SHADI (682432124)
-- =====================================================================
SELECT * FROM get_all_metrics('682432124', NULL, NULL);

-- Ожидаем:
-- - totalDeals только Shadi сделки
-- - totalContacts только Shadi контакты (424)
-- - totalCalls = 118931 (ВСЕ звонки, без фильтра owner)


-- =====================================================================
-- USE CASE 3: МЕТРИКИ ЗА ПОСЛЕДНИЕ 30 ДНЕЙ
-- =====================================================================
SELECT * FROM get_all_metrics(
  NULL,
  (NOW() - INTERVAL '30 days')::timestamp,
  NOW()::timestamp
);

-- Ожидаем:
-- - Deals закрытые за последние 30 дней
-- - Calls сделанные за последние 30 дней
-- - Contacts за последние 30 дней (⚠️ ПРОБЛЕМА: сейчас показывает ВСЕ контакты)


-- =====================================================================
-- USE CASE 4: SHADI + ПОСЛЕДНИЕ 30 ДНЕЙ
-- =====================================================================
SELECT * FROM get_all_metrics(
  '682432124',
  (NOW() - INTERVAL '30 days')::timestamp,
  NOW()::timestamp
);


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: SALES METRICS
-- =====================================================================

-- 1. Всего deals в базе
SELECT COUNT(*) as total_deals FROM hubspot_deals_raw;

-- 2. Закрытые deals (closedwon)
SELECT COUNT(*) as closed_deals
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- 3. Общая сумма продаж
SELECT
  COALESCE(SUM(amount), 0) as total_sales,
  COUNT(*) as closed_deals,
  ROUND(AVG(amount), 2) as avg_deal_size
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- 4. Sales метрики Shadi
SELECT
  COALESCE(SUM(amount), 0) as shadi_total_sales,
  COUNT(*) as shadi_deals,
  ROUND(AVG(amount), 2) as shadi_avg_deal_size
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND hubspot_owner_id = '682432124';

-- 5. Проверить distribution по deal stages
SELECT
  dealstage,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_deals_raw) * 100, 1) as percent
FROM hubspot_deals_raw
WHERE dealstage IS NOT NULL
GROUP BY dealstage
ORDER BY count DESC;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: CALL METRICS
-- =====================================================================

-- 1. Всего звонков
SELECT COUNT(*) as total_calls FROM hubspot_calls_raw;

-- 2. Средняя длительность (в минутах)
SELECT
  ROUND(AVG(call_duration::numeric) / 60000, 2) as avg_call_minutes,
  ROUND(SUM(call_duration::numeric) / 3600000, 2) as total_call_hours
FROM hubspot_calls_raw
WHERE call_duration > 0;

-- 3. Звонки ≥5 минут
SELECT
  COUNT(*) FILTER (WHERE call_duration >= 300000) as calls_5min_plus,
  COUNT(*) as total_calls,
  ROUND(
    COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric / COUNT(*) * 100,
    2
  ) as five_min_rate
FROM hubspot_calls_raw;

-- 4. Звонки за последние 30 дней
SELECT
  COUNT(*) as calls_last_30d,
  ROUND(AVG(call_duration::numeric) / 60000, 2) as avg_duration_minutes
FROM hubspot_calls_raw
WHERE call_timestamp >= NOW() - INTERVAL '30 days';


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: CONVERSION METRICS
-- =====================================================================

-- 1. Qualified rate
SELECT
  COUNT(*) FILTER (WHERE qualified_status = 'yes') as qualified_deals,
  COUNT(*) as total_deals,
  ROUND(
    COUNT(*) FILTER (WHERE qualified_status = 'yes')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as qualified_rate
FROM hubspot_deals_raw;

-- 2. Trial rate
SELECT
  COUNT(*) FILTER (WHERE trial_status = 'yes') as trial_deals,
  COUNT(*) as total_deals,
  ROUND(
    COUNT(*) FILTER (WHERE trial_status = 'yes')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as trial_rate
FROM hubspot_deals_raw;

-- 3. Cancellation rate (closedlost)
SELECT
  COUNT(*) FILTER (WHERE dealstage = 'closedlost') as lost_deals,
  COUNT(*) as total_deals,
  ROUND(
    COUNT(*) FILTER (WHERE dealstage = 'closedlost')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as cancellation_rate
FROM hubspot_deals_raw;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: PAYMENT METRICS
-- =====================================================================

-- 1. Upfront cash collected
SELECT
  COALESCE(SUM(upfront_payment), 0) as upfront_cash,
  COUNT(*) FILTER (WHERE upfront_payment > 0) as deals_with_upfront,
  COUNT(*) FILTER (WHERE dealstage = 'closedwon') as total_closed_deals
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- 2. Average installments
SELECT
  ROUND(AVG(number_of_installments__months), 1) as avg_installments,
  COUNT(*) FILTER (WHERE number_of_installments__months > 0) as deals_with_installments
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND number_of_installments__months IS NOT NULL;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: FOLLOWUP METRICS
-- =====================================================================

-- 1. Проверить VIEW contact_call_stats
SELECT
  COUNT(*) as total_contacts_in_view,
  SUM(has_followups) as contacts_with_followups,
  ROUND(SUM(has_followups)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as followup_rate,
  ROUND(AVG(followup_count), 1) as avg_followups,
  ROUND(AVG(days_to_first_call), 1) as avg_days_to_first_call
FROM contact_call_stats;

-- 2. Примеры из VIEW
SELECT
  contact_id,
  hubspot_owner_id,
  total_calls,
  followup_count,
  has_followups,
  days_to_first_call
FROM contact_call_stats
WHERE total_calls > 0
LIMIT 10;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: OFFER METRICS
-- =====================================================================

-- 1. Offers given rate
SELECT
  COUNT(*) FILTER (WHERE offer_given = 'yes') as offers_given,
  COUNT(*) as total_deals,
  ROUND(
    COUNT(*) FILTER (WHERE offer_given = 'yes')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as offers_given_rate
FROM hubspot_deals_raw;

-- 2. Offer close rate
SELECT
  COUNT(*) FILTER (
    WHERE offer_given = 'yes'
      AND offer_accepted = 'yes'
      AND dealstage = 'closedwon'
  ) as offers_accepted_and_closed,
  COUNT(*) FILTER (WHERE offer_given = 'yes') as total_offers_given,
  ROUND(
    COUNT(*) FILTER (
      WHERE offer_given = 'yes'
        AND offer_accepted = 'yes'
        AND dealstage = 'closedwon'
    )::numeric / NULLIF(COUNT(*) FILTER (WHERE offer_given = 'yes'), 0) * 100,
    2
  ) as offer_close_rate
FROM hubspot_deals_raw;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: TIME METRICS
-- =====================================================================

-- 1. Time to sale (дни от создания до закрытия)
SELECT
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400
    ),
    1
  ) as avg_days_to_sale,
  COUNT(*) as closed_deals
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL;

-- 2. Distribution по времени закрытия
SELECT
  CASE
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 7 THEN '0-7 days'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 30 THEN '7-30 days'
    WHEN EXTRACT(EPOCH FROM (closedate - createdate)) / 86400 < 90 THEN '30-90 days'
    ELSE '90+ days'
  END as time_range,
  COUNT(*) as deals_count
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL
GROUP BY time_range
ORDER BY deals_count DESC;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: A/B TESTING METRICS
-- =====================================================================

-- 1. Sales script stats
SELECT
  sales_script_version as version,
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as conversion_rate
FROM hubspot_contacts_raw
WHERE sales_script_version IS NOT NULL
GROUP BY sales_script_version
ORDER BY conversion_rate DESC;

-- 2. VSL watch stats
SELECT
  CASE
    WHEN vsl_watched IS NULL THEN 'unknown'
    WHEN vsl_watched = true THEN 'yes'
    WHEN vsl_watched = false THEN 'no'
  END as watched,
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as conversion_rate
FROM hubspot_contacts_raw
GROUP BY vsl_watched
ORDER BY conversion_rate DESC;


-- =====================================================================
-- ПРОВЕРКА RAW ДАННЫХ: METADATA
-- =====================================================================

-- 1. Total contacts
SELECT COUNT(*) as total_contacts FROM hubspot_contacts_raw;

-- 2. Contacts by owner
SELECT
  hubspot_owner_id,
  COUNT(*) as contacts_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_contacts_raw) * 100, 1) as percent
FROM hubspot_contacts_raw
WHERE hubspot_owner_id IS NOT NULL
GROUP BY hubspot_owner_id
ORDER BY contacts_count DESC
LIMIT 10;


-- =====================================================================
-- ПРОВЕРКА ПРОБЛЕМЫ: CONVERSION RATE С ФИЛЬТРОМ ПО ДАТАМ
-- =====================================================================

-- Проблема: conversionRate за 30 дней использует ВСЕ контакты, а не созданные за 30 дней

-- 1. Deals за последние 30 дней
SELECT COUNT(*) as deals_last_30d
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate >= NOW() - INTERVAL '30 days';

-- 2. Contacts созданные за последние 30 дней
SELECT COUNT(*) as contacts_created_last_30d
FROM hubspot_contacts_raw
WHERE createdate >= NOW() - INTERVAL '30 days';

-- 3. ВСЕ контакты (что использует функция сейчас)
SELECT COUNT(*) as all_contacts
FROM hubspot_contacts_raw;

-- 4. Правильная конверсия за 30 дней (должна быть)
WITH deals_30d AS (
  SELECT COUNT(*) as closed_deals
  FROM hubspot_deals_raw
  WHERE dealstage = 'closedwon'
    AND closedate >= (NOW() - INTERVAL '30 days')::timestamp
),
contacts_30d AS (
  SELECT COUNT(*) as total_contacts
  FROM hubspot_contacts_raw
  WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
)
SELECT
  d.closed_deals,
  c.total_contacts,
  ROUND(d.closed_deals::numeric / NULLIF(c.total_contacts, 0) * 100, 2) as correct_conversion_rate
FROM deals_30d d, contacts_30d c;

-- 5. Неправильная конверсия (что возвращает функция сейчас)
WITH deals_30d AS (
  SELECT COUNT(*) as closed_deals
  FROM hubspot_deals_raw
  WHERE dealstage = 'closedwon'
    AND closedate >= (NOW() - INTERVAL '30 days')::timestamp
),
all_contacts AS (
  SELECT COUNT(*) as total_contacts
  FROM hubspot_contacts_raw
)
SELECT
  d.closed_deals,
  c.total_contacts,
  ROUND(d.closed_deals::numeric / NULLIF(c.total_contacts, 0) * 100, 2) as wrong_conversion_rate
FROM deals_30d d, all_contacts c;
