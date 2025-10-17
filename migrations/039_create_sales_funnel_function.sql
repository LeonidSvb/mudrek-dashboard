-- Migration 039: Create get_sales_funnel_metrics() function
-- Purpose: Sales funnel metrics for contacts and deals
-- Created: 2025-10-17

CREATE OR REPLACE FUNCTION get_sales_funnel_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_from DATE;
  v_date_to DATE;
  v_contacts_total INTEGER;
  v_contacts_new_leads INTEGER;
  v_contacts_no_answer INTEGER;
  v_contacts_wrong_number INTEGER;
  v_contacts_disqualified INTEGER;
  v_deals_total INTEGER;
  v_deals_qualified INTEGER;
  v_deals_high_interest INTEGER;
  v_deals_offer_received INTEGER;
  v_deals_closed_won INTEGER;
  v_deals_closed_lost INTEGER;
  v_contact_to_deal_rate NUMERIC;
  v_deal_to_won_rate NUMERIC;
  result JSON;
BEGIN
  -- Set date range
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '30 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- ============================================================
  -- CONTACTS METRICS
  -- ============================================================

  -- Total contacts created in period
  SELECT COUNT(*)
  INTO v_contacts_total
  FROM hubspot_contacts_raw
  WHERE createdate::DATE >= v_date_from
    AND createdate::DATE <= v_date_to
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- Contacts by stage (contact_stage property)
  SELECT
    COUNT(*) FILTER (WHERE contact_stage = 'new_leads'),
    COUNT(*) FILTER (WHERE contact_stage = 'no_answer'),
    COUNT(*) FILTER (WHERE contact_stage = 'wrong_number'),
    COUNT(*) FILTER (WHERE contact_stage = 'disqualified')
  INTO
    v_contacts_new_leads,
    v_contacts_no_answer,
    v_contacts_wrong_number,
    v_contacts_disqualified
  FROM hubspot_contacts_raw
  WHERE createdate::DATE >= v_date_from
    AND createdate::DATE <= v_date_to
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- ============================================================
  -- DEALS METRICS
  -- ============================================================

  -- Total deals created in period
  SELECT COUNT(*)
  INTO v_deals_total
  FROM hubspot_deals_raw
  WHERE createdate::DATE >= v_date_from
    AND createdate::DATE <= v_date_to
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- Deals by stage (dealstage property)
  SELECT
    COUNT(*) FILTER (WHERE dealstage = 'qualifiedtobuy'),
    COUNT(*) FILTER (WHERE dealstage = '199274159'),
    COUNT(*) FILTER (WHERE dealstage = '199274158'),
    COUNT(*) FILTER (WHERE dealstage = 'closedwon'),
    COUNT(*) FILTER (WHERE dealstage = 'closedlost')
  INTO
    v_deals_qualified,
    v_deals_high_interest,
    v_deals_offer_received,
    v_deals_closed_won,
    v_deals_closed_lost
  FROM hubspot_deals_raw
  WHERE createdate::DATE >= v_date_from
    AND createdate::DATE <= v_date_to
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- ============================================================
  -- CONVERSION RATES
  -- ============================================================

  -- Contact → Deal conversion rate
  v_contact_to_deal_rate := CASE
    WHEN v_contacts_total > 0 THEN
      ROUND((v_deals_total::NUMERIC / v_contacts_total::NUMERIC) * 100, 2)
    ELSE 0
  END;

  -- Deal → Won conversion rate
  v_deal_to_won_rate := CASE
    WHEN v_deals_total > 0 THEN
      ROUND((v_deals_closed_won::NUMERIC / v_deals_total::NUMERIC) * 100, 2)
    ELSE 0
  END;

  -- ============================================================
  -- BUILD RESULT
  -- ============================================================

  SELECT json_build_object(
    'contacts', json_build_object(
      'total', COALESCE(v_contacts_total, 0),
      'new_leads', COALESCE(v_contacts_new_leads, 0),
      'no_answer', COALESCE(v_contacts_no_answer, 0),
      'wrong_number', COALESCE(v_contacts_wrong_number, 0),
      'disqualified', COALESCE(v_contacts_disqualified, 0)
    ),
    'deals', json_build_object(
      'total', COALESCE(v_deals_total, 0),
      'qualified_to_buy', COALESCE(v_deals_qualified, 0),
      'high_interest', COALESCE(v_deals_high_interest, 0),
      'offer_received', COALESCE(v_deals_offer_received, 0),
      'closed_won', COALESCE(v_deals_closed_won, 0),
      'closed_lost', COALESCE(v_deals_closed_lost, 0)
    ),
    'conversion_rates', json_build_object(
      'contact_to_deal', COALESCE(v_contact_to_deal_rate, 0),
      'deal_to_won', COALESCE(v_deal_to_won_rate, 0)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Test function
COMMENT ON FUNCTION get_sales_funnel_metrics IS
'Sales funnel metrics: contacts by stage, deals by stage, conversion rates';
