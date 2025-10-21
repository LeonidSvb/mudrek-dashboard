-- ================================================
-- MIGRATION 019: Fix Deal Amounts
-- ================================================
-- ПРОБЛЕМА: DB amount = payment_size (размер платежа), а НЕ полная сумма договора
-- РЕШЕНИЕ: Добавить правильные колонки и заполнить из raw_json
-- ================================================

-- ШАГ 1: Добавить новые колонки
-- ================================================

ALTER TABLE hubspot_deals_raw
ADD COLUMN IF NOT EXISTS deal_total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_size DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS installments_count INTEGER,
ADD COLUMN IF NOT EXISTS first_payment_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;


-- ШАГ 2: Заполнить deal_total_amount из raw_json
-- ================================================

UPDATE hubspot_deals_raw
SET deal_total_amount = CASE
  WHEN raw_json->'properties'->>'deal_whole_amount' ~ '^\d+\.?\d*$'
  THEN CAST(raw_json->'properties'->>'deal_whole_amount' AS DECIMAL(10,2))
  ELSE NULL
END
WHERE raw_json->'properties'->>'deal_whole_amount' IS NOT NULL;


-- ШАГ 3: Сохранить текущий amount как payment_size
-- ================================================

UPDATE hubspot_deals_raw
SET payment_size = amount;


-- ШАГ 4: Заполнить installments_count из raw_json
-- ================================================

UPDATE hubspot_deals_raw
SET installments_count = CASE
  WHEN raw_json->'properties'->>'installments' ~ '^\d+\.?\d*$'
  THEN CAST((raw_json->'properties'->>'installments')::DECIMAL AS INTEGER)
  ELSE NULL
END
WHERE raw_json->'properties'->>'installments' IS NOT NULL;


-- ШАГ 5: Заполнить даты платежей
-- ================================================

-- First payment date
UPDATE hubspot_deals_raw
SET first_payment_date = TO_DATE(raw_json->'properties'->>'n1st_payment', 'YYYY-MM-DD')
WHERE raw_json->'properties'->>'n1st_payment' IS NOT NULL
  AND raw_json->'properties'->>'n1st_payment' ~ '^\d{4}-\d{2}-\d{2}$';

-- Last payment date
UPDATE hubspot_deals_raw
SET last_payment_date = TO_DATE(raw_json->'properties'->>'last_payment', 'YYYY-MM-DD')
WHERE raw_json->'properties'->>'last_payment' IS NOT NULL
  AND raw_json->'properties'->>'last_payment' ~ '^\d{4}-\d{2}-\d{2}$';


-- ШАГ 6: Исправить amount = deal_total_amount
-- ================================================

UPDATE hubspot_deals_raw
SET amount = deal_total_amount
WHERE deal_total_amount IS NOT NULL;


-- ШАГ 7: Создать индексы для быстрых запросов
-- ================================================

CREATE INDEX IF NOT EXISTS idx_deals_total_amount ON hubspot_deals_raw(deal_total_amount);
CREATE INDEX IF NOT EXISTS idx_deals_payment_size ON hubspot_deals_raw(payment_size);
CREATE INDEX IF NOT EXISTS idx_deals_installments ON hubspot_deals_raw(installments_count);


-- ================================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ================================================

-- Сравнение ДО и ПОСЛЕ
SELECT
  'SUMMARY' as type,
  COUNT(*) as total_deals,
  COUNT(*) FILTER (WHERE deal_total_amount IS NOT NULL) as has_total_amount,
  COUNT(*) FILTER (WHERE payment_size IS NOT NULL) as has_payment_size,
  COUNT(*) FILTER (WHERE installments_count IS NOT NULL) as has_installments,
  ROUND(AVG(payment_size), 2) as avg_payment_size,
  ROUND(AVG(deal_total_amount), 2) as avg_deal_total,
  SUM(payment_size)::BIGINT as sum_payment_size,
  SUM(deal_total_amount)::BIGINT as sum_deal_total
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- Примеры deals
SELECT
  dealname,
  payment_size as old_amount,
  deal_total_amount as new_amount,
  installments_count,
  dealstage
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND deal_total_amount IS NOT NULL
LIMIT 10;

-- Проверка расчетов (payment_size × installments = deal_total_amount?)
SELECT
  dealname,
  payment_size,
  installments_count,
  deal_total_amount,
  (payment_size * installments_count) as calculated_total,
  deal_total_amount - (payment_size * installments_count) as difference
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND payment_size IS NOT NULL
  AND installments_count IS NOT NULL
  AND deal_total_amount IS NOT NULL
LIMIT 10;
