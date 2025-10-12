-- =====================================================================
-- ПРОВЕРКА ПРОБЛЕМЫ С ДАТАМИ DEALS
-- =====================================================================

SELECT json_build_object(

  -- =================================================================
  -- ПРОБЛЕМА: closedate < createdate (82 deals!)
  -- =================================================================
  'invalid_dates_details', json_build_object(
    'total_invalid', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE closedate IS NOT NULL
        AND createdate IS NOT NULL
        AND closedate < createdate
    ),
    'invalid_closedwon', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND createdate IS NOT NULL
        AND closedate < createdate
    ),
    'examples', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          hubspot_id,
          dealname,
          dealstage,
          amount,
          createdate,
          closedate,
          ROUND(EXTRACT(EPOCH FROM (closedate - createdate)) / 86400, 1) as days_diff
        FROM hubspot_deals_raw
        WHERE closedate IS NOT NULL
          AND createdate IS NOT NULL
          AND closedate < createdate
        ORDER BY (createdate - closedate) DESC
        LIMIT 10
      ) t
    )
  ),

  -- =================================================================
  -- КОГДА ПОСЛЕДНИЕ DEALS ЗАКРЫВАЛИСЬ
  -- =================================================================
  'recent_closed_deals', json_build_object(
    'last_10_closed', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          hubspot_id,
          dealname,
          amount,
          closedate,
          ROUND(EXTRACT(EPOCH FROM (NOW() - closedate)) / 86400, 0) as days_ago
        FROM hubspot_deals_raw
        WHERE dealstage = 'closedwon'
          AND closedate IS NOT NULL
        ORDER BY closedate DESC
        LIMIT 10
      ) t
    ),
    'newest_closedate', (
      SELECT MAX(closedate)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
    ),
    'days_since_last_close', (
      SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(closedate))) / 86400, 0)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
    )
  ),

  -- =================================================================
  -- DEALS СОЗДАННЫЕ ЗА 30 ДНЕЙ (142 deals)
  -- =================================================================
  'deals_created_last_30d', json_build_object(
    'total_created', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
    ),
    'by_stage', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          COALESCE(dealstage, 'NO STAGE') as stage,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM hubspot_deals_raw
        WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
        GROUP BY dealstage
        ORDER BY count DESC
      ) t
    ),
    'recent_examples', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          hubspot_id,
          dealname,
          dealstage,
          amount,
          createdate,
          closedate
        FROM hubspot_deals_raw
        WHERE createdate >= (NOW() - INTERVAL '30 days')::timestamp
        ORDER BY createdate DESC
        LIMIT 10
      ) t
    )
  ),

  -- =================================================================
  -- ПРОВЕРКА: Может быть closedate НЕ обновляется при закрытии?
  -- =================================================================
  'closedate_analysis', json_build_object(
    'closedwon_without_closedate', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NULL
    ),
    'closedwon_with_very_old_closedate', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND closedate < '2024-01-01'::timestamp
    ),
    'closedwon_closedate_2024', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate >= '2024-01-01'::timestamp
        AND closedate < '2025-01-01'::timestamp
    ),
    'closedwon_closedate_2025', (
      SELECT COUNT(*)
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate >= '2025-01-01'::timestamp
    )
  ),

  -- =================================================================
  -- МИГРАЦИЯ 017: owner_id extraction - была ли применена?
  -- =================================================================
  'owner_extraction_check', json_build_object(
    'contacts_with_owner_in_column', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE hubspot_owner_id IS NOT NULL
    ),
    'contacts_with_owner_in_json', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE raw_json->'properties'->>'hubspot_owner_id' IS NOT NULL
    ),
    'contacts_missing_owner_extraction', (
      SELECT COUNT(*)
      FROM hubspot_contacts_raw
      WHERE hubspot_owner_id IS NULL
        AND raw_json->'properties'->>'hubspot_owner_id' IS NOT NULL
    ),
    'note', 'Migration 017 should extract owner_id from raw_json to column'
  ),

  -- =================================================================
  -- РЕКОМЕНДАЦИИ
  -- =================================================================
  'recommendations', json_build_array(
    'Run migration 017 to extract missing owner_id from raw_json',
    'Check why 82 deals have closedate < createdate - data corruption?',
    'Verify HubSpot sync is working - last closed deal was ' ||
      (SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(closedate))) / 86400, 0)::text || ' days ago'
       FROM hubspot_deals_raw WHERE dealstage = 'closedwon'),
    'Ask client: Is it normal to have 77.9% contacts without owner?',
    'Check payment fields in HubSpot - upfront_payment and installments are empty'
  )

) AS invalid_dates_report;
