-- Migration: Fix deal amounts - extract correct values from raw_json
-- Problem: DB amount field stores payment_size instead of total deal amount
-- Solution: Add proper columns and populate from raw_json

-- Add new columns for proper payment tracking
ALTER TABLE hubspot_deals_raw
ADD COLUMN IF NOT EXISTS deal_total_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_size DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS installments_count INTEGER,
ADD COLUMN IF NOT EXISTS first_payment_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Update deal_total_amount from raw_json.properties.deal_whole_amount
UPDATE hubspot_deals_raw
SET deal_total_amount = CAST((raw_json->'properties'->>'deal_whole_amount') AS DECIMAL(10,2))
WHERE raw_json->'properties'->>'deal_whole_amount' IS NOT NULL
  AND raw_json->'properties'->>'deal_whole_amount' ~ '^\d+\.?\d*$';

-- Update payment_size from current amount field (which is actually payment size)
UPDATE hubspot_deals_raw
SET payment_size = amount;

-- Update installments_count from raw_json.properties.installments
UPDATE hubspot_deals_raw
SET installments_count = CAST((raw_json->'properties'->>'installments') AS INTEGER)
WHERE raw_json->'properties'->>'installments' IS NOT NULL
  AND raw_json->'properties'->>'installments' ~ '^\d+\.?\d*$';

-- Update first_payment_date from raw_json.properties.n1st_payment
UPDATE hubspot_deals_raw
SET first_payment_date = TO_DATE(raw_json->'properties'->>'n1st_payment', 'YYYY-MM-DD')
WHERE raw_json->'properties'->>'n1st_payment' IS NOT NULL
  AND raw_json->'properties'->>'n1st_payment' ~ '^\d{4}-\d{2}-\d{2}$';

-- Update last_payment_date from raw_json.properties.last_payment
UPDATE hubspot_deals_raw
SET last_payment_date = TO_DATE(raw_json->'properties'->>'last_payment', 'YYYY-MM-DD')
WHERE raw_json->'properties'->>'last_payment' IS NOT NULL
  AND raw_json->'properties'->>'last_payment' ~ '^\d{4}-\d{2}-\d{2}$';

-- Now fix the amount field to be actual deal total amount
UPDATE hubspot_deals_raw
SET amount = deal_total_amount
WHERE deal_total_amount IS NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deals_total_amount ON hubspot_deals_raw(deal_total_amount);
CREATE INDEX IF NOT EXISTS idx_deals_payment_size ON hubspot_deals_raw(payment_size);
CREATE INDEX IF NOT EXISTS idx_deals_installments ON hubspot_deals_raw(installments_count);

-- Verify results
SELECT
  'Before fix' as label,
  COUNT(*) as total_deals,
  ROUND(AVG(payment_size), 2) as avg_payment_size,
  ROUND(AVG(deal_total_amount), 2) as avg_deal_total,
  SUM(payment_size) as sum_payment_size,
  SUM(deal_total_amount) as sum_deal_total
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

-- Summary
SELECT
  'Payment tracking fields added' as status,
  COUNT(*) FILTER (WHERE deal_total_amount IS NOT NULL) as deals_with_total,
  COUNT(*) FILTER (WHERE payment_size IS NOT NULL) as deals_with_payment_size,
  COUNT(*) FILTER (WHERE installments_count IS NOT NULL) as deals_with_installments,
  ROUND(SUM(deal_total_amount), 2) as total_contract_value,
  ROUND(SUM(payment_size), 2) as total_payment_size
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
