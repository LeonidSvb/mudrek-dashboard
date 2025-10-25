-- Add new deal amount fields to match HubSpot structure
-- HubSpot uses: deal_whole_amount (total), amount (upfront), the_left_amount (remaining)

ALTER TABLE hubspot_deals_raw
  ADD COLUMN IF NOT EXISTS deal_whole_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS the_left_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS installment_monthly_amount NUMERIC;

-- Add column comments to explain the payment structure
COMMENT ON COLUMN hubspot_deals_raw.deal_whole_amount IS 'Total deal value (full amount including installments)';
COMMENT ON COLUMN hubspot_deals_raw.amount IS 'Upfront payment amount (initial payment)';
COMMENT ON COLUMN hubspot_deals_raw.the_left_amount IS 'Remaining amount after upfront payment';
COMMENT ON COLUMN hubspot_deals_raw.installment_monthly_amount IS 'Monthly installment payment amount';
COMMENT ON COLUMN hubspot_deals_raw.number_of_installments__months IS 'Number of months for installment plan';

-- Update existing upfront_payment column comment for clarity
COMMENT ON COLUMN hubspot_deals_raw.upfront_payment IS 'Legacy field - use amount instead for upfront payment';

-- Update daily_metrics_mv to use correct fields
DROP MATERIALIZED VIEW IF EXISTS daily_metrics_mv;

CREATE MATERIALIZED VIEW daily_metrics_mv AS
SELECT
  DATE(closedate) as metric_date,
  hubspot_owner_id as owner_id,

  -- Sales metrics (use deal_whole_amount for total sales, fallback to amount)
  SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(deal_whole_amount, amount) ELSE 0 END) AS daily_sales,
  COUNT(*) FILTER (WHERE dealstage = 'closedwon') AS daily_deals_won,

  -- For avg calculation (only deals with amount > 0)
  SUM(CASE WHEN dealstage = 'closedwon' AND COALESCE(deal_whole_amount, amount) > 0
           THEN COALESCE(deal_whole_amount, amount) ELSE 0 END) AS daily_sales_sum_for_avg,
  COUNT(*) FILTER (WHERE dealstage = 'closedwon' AND COALESCE(deal_whole_amount, amount) > 0) AS daily_deals_count_for_avg,

  -- Conversion metrics
  COUNT(*) FILTER (WHERE qualified_status = 'yes') AS daily_qualified,
  COUNT(*) FILTER (WHERE trial_status = 'yes') AS daily_trials,
  COUNT(*) FILTER (WHERE dealstage = 'closedlost') AS daily_lost,
  COUNT(*) AS daily_total_deals,

  -- Payment metrics (use amount as upfront payment)
  SUM(CASE WHEN amount > 0 AND dealstage = 'closedwon' THEN amount ELSE 0 END) AS daily_upfront_cash,

  -- Installments
  SUM(CASE WHEN number_of_installments__months > 0 AND dealstage = 'closedwon'
           THEN number_of_installments__months ELSE 0 END) AS daily_installments_sum,
  COUNT(*) FILTER (WHERE number_of_installments__months > 0 AND dealstage = 'closedwon') AS daily_installments_count,

  -- Offers
  COUNT(*) FILTER (WHERE offer_given = true) AS daily_offers_given,
  COUNT(*) FILTER (WHERE offer_given = true AND offer_accepted = true AND dealstage = 'closedwon') AS daily_offers_closed,

  -- Time to sale
  SUM(CASE WHEN dealstage = 'closedwon' AND closedate IS NOT NULL AND createdate IS NOT NULL
           THEN EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400
           ELSE 0 END) AS daily_time_to_sale_sum,
  COUNT(*) FILTER (WHERE dealstage = 'closedwon' AND closedate IS NOT NULL AND createdate IS NOT NULL) AS daily_time_to_sale_count

FROM hubspot_deals_raw d
WHERE closedate IS NOT NULL
GROUP BY DATE(closedate), hubspot_owner_id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_daily_metrics_mv_date_owner ON daily_metrics_mv(metric_date, owner_id);
