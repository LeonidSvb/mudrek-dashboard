-- =====================================================================
-- ИСПРАВЛЕНИЕ ПРОБЛЕМ С ДАННЫМИ
-- =====================================================================

-- =====================================================================
-- FIX 1: Применить Migration 017 - Extract owner_id from raw_json
-- =====================================================================
-- Это извлечет 20,581 owner_id которые есть в raw_json но не в колонке

UPDATE hubspot_contacts_raw
SET hubspot_owner_id = raw_json->'properties'->>'hubspot_owner_id'
WHERE hubspot_owner_id IS NULL
  AND raw_json->'properties'->>'hubspot_owner_id' IS NOT NULL;

-- ⏱️ ~5-10 секунд на 20,581 записей
-- 📊 Результат: "NO OWNER" уменьшится с 77.9% до ~13%

-- Проверка после:
-- SELECT
--   COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL) as without_owner,
--   COUNT(*) FILTER (WHERE hubspot_owner_id IS NOT NULL) as with_owner,
--   ROUND(COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL)::numeric / COUNT(*) * 100, 1) as percent_without_owner
-- FROM hubspot_contacts_raw;


-- =====================================================================
-- FIX 2: Исправить createdate для deals с датой в будущем
-- =====================================================================
-- Проблема: 82 deals имеют createdate > closedate (createdate в декабре 2025!)
-- Решение: Поставить createdate = closedate - 30 дней (примерно)

-- ОСТОРОЖНО! Это изменит данные. Сначала проверьте с клиентом!

-- Вариант 1: Поставить createdate = closedate (instant close)
-- UPDATE hubspot_deals_raw
-- SET createdate = closedate
-- WHERE createdate > closedate
--   AND closedate IS NOT NULL;

-- Вариант 2: Поставить createdate = closedate - 30 дней (реалистичнее)
-- UPDATE hubspot_deals_raw
-- SET createdate = (closedate - INTERVAL '30 days')::timestamp
-- WHERE createdate > closedate
--   AND closedate IS NOT NULL;

-- Вариант 3: Использовать среднее время закрытия (277 дней)
-- UPDATE hubspot_deals_raw
-- SET createdate = (closedate - INTERVAL '277 days')::timestamp
-- WHERE createdate > closedate
--   AND closedate IS NOT NULL;

-- ⚠️ РЕКОМЕНДАЦИЯ: Сначала спросить клиента почему createdate в будущем!
-- Может быть это не баг, а специальная логика?


-- =====================================================================
-- ПРОВЕРКА: Посмотреть что изменилось
-- =====================================================================

-- 1. Проверить owner_id extraction
SELECT
  'Owner ID Extraction' as check_name,
  COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL) as contacts_without_owner,
  COUNT(*) FILTER (WHERE hubspot_owner_id IS NOT NULL) as contacts_with_owner,
  ROUND(COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL)::numeric / COUNT(*) * 100, 1) as percent_without_owner
FROM hubspot_contacts_raw;

-- 2. Проверить invalid dates (должно стать 0)
-- SELECT
--   'Invalid Dates Fix' as check_name,
--   COUNT(*) as deals_with_invalid_dates
-- FROM hubspot_deals_raw
-- WHERE createdate > closedate
--   AND closedate IS NOT NULL;

-- 3. Новый avg_days_to_sale (должен стать меньше 277)
-- SELECT
--   'Average Days to Sale' as check_name,
--   ROUND(
--     AVG(EXTRACT(EPOCH FROM (closedate - createdate)) / 86400),
--     1
--   ) as avg_days
-- FROM hubspot_deals_raw
-- WHERE dealstage = 'closedwon'
--   AND closedate IS NOT NULL
--   AND createdate IS NOT NULL
--   AND createdate <= closedate;  -- Только правильные даты
