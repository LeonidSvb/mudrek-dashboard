-- =====================================================================
-- ОДИН ЗАПРОС - ВСЕ РЕЗУЛЬТАТЫ СРАЗУ
-- =====================================================================
-- Возвращает JSON со всеми проверками метрик

SELECT json_build_object(

  -- =================================================================
  -- 1. RAW DATA SUMMARY
  -- =================================================================
  'raw_data', json_build_object(
    'total_contacts', (SELECT COUNT(*) FROM hubspot_contacts_raw),
    'total_deals', (SELECT COUNT(*) FROM hubspot_deals_raw),
    'total_calls', (SELECT COUNT(*) FROM hubspot_calls_raw),
    'closed_deals', (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedwon'),
    'contacts_with_owner', (SELECT COUNT(*) FROM hubspot_contacts_raw WHERE hubspot_owner_id IS NOT NULL),
    'deals_with_owner', (SELECT COUNT(*) FROM hubspot_deals_raw WHERE hubspot_owner_id IS NOT NULL)
  ),

  -- =================================================================
  -- 2. SALES METRICS
  -- =================================================================
  'sales_metrics', json_build_object(
    'total_sales', (
      SELECT COALESCE(SUM(amount), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
    ),
    'avg_deal_size', (
      SELECT COALESCE(ROUND(AVG(amount), 2), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon' AND amount > 0
    ),
    'total_deals', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
    ),
    'conversion_rate', (
      SELECT ROUND(
        (SELECT COUNT(*)::numeric FROM hubspot_deals_raw WHERE dealstage = 'closedwon') /
        NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw), 0) * 100,
        2
      )
    )
  ),

  -- =================================================================
  -- 3. CALL METRICS
  -- =================================================================
  'call_metrics', json_build_object(
    'total_calls', (SELECT COUNT(*) FROM hubspot_calls_raw),
    'avg_call_minutes', (
      SELECT COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0)
      FROM hubspot_calls_raw
      WHERE call_duration > 0
    ),
    'total_call_hours', (
      SELECT COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0)
      FROM hubspot_calls_raw
    ),
    'five_min_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_calls_raw
    ),
    'calls_5min_plus', (
      SELECT COUNT(*) FROM hubspot_calls_raw WHERE call_duration >= 300000
    )
  ),

  -- =================================================================
  -- 4. CONVERSION METRICS
  -- =================================================================
  'conversion_metrics', json_build_object(
    'qualified_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE qualified_status = 'yes')::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'trial_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE trial_status = 'yes')::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'cancellation_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE dealstage = 'closedlost')::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'qualified_deals', (SELECT COUNT(*) FROM hubspot_deals_raw WHERE qualified_status = 'yes'),
    'trial_deals', (SELECT COUNT(*) FROM hubspot_deals_raw WHERE trial_status = 'yes'),
    'lost_deals', (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedlost')
  ),

  -- =================================================================
  -- 5. PAYMENT METRICS (ПРОБЛЕМА - все 0)
  -- =================================================================
  'payment_metrics', json_build_object(
    'upfront_cash_collected', (
      SELECT COALESCE(SUM(upfront_payment), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
    ),
    'deals_with_upfront', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE upfront_payment > 0
    ),
    'avg_installments', (
      SELECT COALESCE(ROUND(AVG(number_of_installments__months), 1), 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon' AND number_of_installments__months > 0
    ),
    'deals_with_installments', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE number_of_installments__months > 0
    ),
    'note', 'WARNING: upfront_payment and number_of_installments__months are NOT filled in table!'
  ),

  -- =================================================================
  -- 6. FOLLOWUP METRICS
  -- =================================================================
  'followup_metrics', json_build_object(
    'followup_rate', (
      SELECT COALESCE(
        ROUND(SUM(has_followups)::numeric / NULLIF(COUNT(*), 0) * 100, 2),
        0
      )
      FROM contact_call_stats
    ),
    'avg_followups', (
      SELECT COALESCE(ROUND(AVG(followup_count), 1), 0)
      FROM contact_call_stats
      WHERE total_calls > 0
    ),
    'avg_days_to_first_call', (
      SELECT COALESCE(ROUND(AVG(days_to_first_call), 1), 0)
      FROM contact_call_stats
      WHERE days_to_first_call IS NOT NULL
    ),
    'contacts_in_view', (SELECT COUNT(*) FROM contact_call_stats),
    'contacts_with_followups', (SELECT SUM(has_followups) FROM contact_call_stats)
  ),

  -- =================================================================
  -- 7. OFFER METRICS
  -- =================================================================
  'offer_metrics', json_build_object(
    'offers_given_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE offer_given = 'yes')::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM hubspot_deals_raw
    ),
    'offer_close_rate', (
      SELECT COALESCE(
        ROUND(
          COUNT(*) FILTER (WHERE offer_given = 'yes' AND offer_accepted = 'yes' AND dealstage = 'closedwon')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE offer_given = 'yes'), 0) * 100,
          2
        ),
        0
      )
      FROM hubspot_deals_raw
    ),
    'offers_given', (SELECT COUNT(*) FROM hubspot_deals_raw WHERE offer_given = 'yes'),
    'offers_accepted_and_closed', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE offer_given = 'yes' AND offer_accepted = 'yes' AND dealstage = 'closedwon'
    )
  ),

  -- =================================================================
  -- 8. TIME METRICS (ПРОБЛЕМА - 277 дней!)
  -- =================================================================
  'time_metrics', json_build_object(
    'avg_days_to_sale', (
      SELECT COALESCE(
        ROUND(
          AVG(EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400),
          1
        ),
        0
      )
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND createdate IS NOT NULL
    ),
    'deals_with_invalid_dates', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND createdate IS NOT NULL
        AND closedate < createdate
    ),
    'note', 'Check if createdate is correct - 277 days seems too long'
  ),

  -- =================================================================
  -- 9. DEALS BREAKDOWN BY STAGE
  -- =================================================================
  'deals_by_stage', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        COALESCE(dealstage, 'NO STAGE') as stage,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_deals_raw) * 100, 1) as percent
      FROM hubspot_deals_raw
      GROUP BY dealstage
      ORDER BY count DESC
    ) t
  ),

  -- =================================================================
  -- 10. CONTACTS BY OWNER (ПРОБЛЕМА - не 100%)
  -- =================================================================
  'contacts_by_owner', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        COALESCE(hubspot_owner_id, 'NO OWNER') as owner_id,
        COUNT(*) as contacts,
        ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_contacts_raw) * 100, 1) as percent
      FROM hubspot_contacts_raw
      GROUP BY hubspot_owner_id
      ORDER BY contacts DESC
      LIMIT 10
    ) t
  ),

  -- =================================================================
  -- 11. LAST 30 DAYS ANALYSIS (ПРОБЛЕМА - 0 closed deals!)
  -- =================================================================
  'last_30_days', json_build_object(
    'closed_deals', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'created_deals', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'created_contacts', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'calls', (
      SELECT COUNT(*)
      FROM hubspot_calls_raw
      WHERE call_timestamp >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'deals_by_stage', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          COALESCE(dealstage, 'NO STAGE') as stage,
          COUNT(*) as count
        FROM hubspot_deals_raw
        WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
        GROUP BY dealstage
        ORDER BY count DESC
      ) t
    )
  ),

  -- =================================================================
  -- 12. CONVERSION RATE PROBLEM (contacts not filtered by date)
  -- =================================================================
  'conversion_rate_problem', json_build_object(
    'closed_deals_30d', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'contacts_created_30d', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'all_contacts', (
      SELECT COUNT(*) FROM hubspot_contacts_raw
    ),
    'correct_conversion_30d', (
      SELECT ROUND(
        (SELECT COUNT(*)::numeric FROM hubspot_deals_raw WHERE dealstage = 'closedwon' AND closedate >= (NOW() - INTERVAL '30 days')::timestamp) /
        NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp), 0) * 100,
        2
      )
    ),
    'wrong_conversion_30d', (
      SELECT ROUND(
        (SELECT COUNT(*)::numeric FROM hubspot_deals_raw WHERE dealstage = 'closedwon' AND closedate >= (NOW() - INTERVAL '30 days')::timestamp) /
        NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw), 0) * 100,
        2
      )
    ),
    'note', 'Function uses ALL contacts instead of contacts created in date range'
  ),

  -- =================================================================
  -- 13. DATA QUALITY ISSUES
  -- =================================================================
  'data_quality', json_build_object(
    'contacts_without_owner_percent', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL)::numeric / NULLIF(COUNT(*), 0) * 100,
        1
      )
      FROM hubspot_contacts_raw
    ),
    'deals_without_owner_percent', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE hubspot_owner_id IS NULL)::numeric / NULLIF(COUNT(*), 0) * 100,
        1
      )
      FROM hubspot_deals_raw
    ),
    'deals_with_amount', (
      SELECT COUNT(*) FROM hubspot_deals_raw WHERE amount IS NOT NULL AND amount > 0
    ),
    'deals_without_amount', (
      SELECT COUNT(*) FROM hubspot_deals_raw WHERE amount IS NULL OR amount = 0
    ),
    'payment_fields_filled', false,
    'issues', json_build_array(
      'upfront_payment and installments fields are empty',
      'avg_days_to_sale is 277 days (too long)',
      'closed_deals in last 30 days is 0',
      'contacts_by_owner does not add up to 100% (missing owner_id)'
    )
  )

) AS full_metrics_report;
