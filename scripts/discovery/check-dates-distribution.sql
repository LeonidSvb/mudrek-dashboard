-- =====================================================================
-- ПРОВЕРКА ДАТ - КОГДА ПОСЛЕДНИЕ DEALS И CONTACTS
-- =====================================================================

SELECT json_build_object(

  -- =================================================================
  -- DEALS DATES
  -- =================================================================
  'deals_dates', json_build_object(
    'oldest_createdate', (SELECT MIN(createdate) FROM hubspot_deals_raw),
    'newest_createdate', (SELECT MAX(createdate) FROM hubspot_deals_raw),
    'oldest_closedate', (SELECT MIN(closedate) FROM hubspot_deals_raw WHERE dealstage = 'closedwon'),
    'newest_closedate', (SELECT MAX(closedate) FROM hubspot_deals_raw WHERE dealstage = 'closedwon'),
    'days_since_last_closed', (
      SELECT ROUND(
        EXTRACT(EPOCH FROM (NOW() - MAX(closedate))) / 86400
      )
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
    )
  ),

  -- =================================================================
  -- CONTACTS DATES
  -- =================================================================
  'contacts_dates', json_build_object(
    'oldest_createdate', (SELECT MIN(createdate) FROM hubspot_contacts_raw),
    'newest_createdate', (SELECT MAX(createdate) FROM hubspot_contacts_raw),
    'days_since_last_contact', (
      SELECT ROUND(
        EXTRACT(EPOCH FROM (NOW() - MAX(createdate))) / 86400
      )
      FROM hubspot_contacts_raw
    )
  ),

  -- =================================================================
  -- CALLS DATES
  -- =================================================================
  'calls_dates', json_build_object(
    'oldest_call', (SELECT MIN(call_timestamp) FROM hubspot_calls_raw),
    'newest_call', (SELECT MAX(call_timestamp) FROM hubspot_calls_raw),
    'days_since_last_call', (
      SELECT ROUND(
        EXTRACT(EPOCH FROM (NOW() - MAX(call_timestamp))) / 86400
      )
      FROM hubspot_calls_raw
    )
  ),

  -- =================================================================
  -- DEALS BY YEAR/MONTH
  -- =================================================================
  'deals_by_period', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        TO_CHAR(closedate, 'YYYY-MM') as period,
        COUNT(*) as closed_deals,
        COALESCE(SUM(amount), 0) as total_sales
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
      GROUP BY TO_CHAR(closedate, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 12
    ) t
  ),

  -- =================================================================
  -- CONTACTS BY YEAR/MONTH
  -- =================================================================
  'contacts_by_period', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        TO_CHAR(createdate, 'YYYY-MM') as period,
        COUNT(*) as created_contacts
      FROM hubspot_contacts_raw
      WHERE createdate IS NOT NULL
      GROUP BY TO_CHAR(createdate, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 12
    ) t
  ),

  -- =================================================================
  -- TIME TO SALE DISTRIBUTION
  -- =================================================================
  'time_to_sale_distribution', (
    SELECT json_agg(row_to_json(t))
    FROM (
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
        ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedwon' AND closedate IS NOT NULL AND createdate IS NOT NULL) * 100, 1) as percent
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
        AND createdate IS NOT NULL
      GROUP BY time_range
      ORDER BY deals_count DESC
    ) t
  )

) AS dates_report;
