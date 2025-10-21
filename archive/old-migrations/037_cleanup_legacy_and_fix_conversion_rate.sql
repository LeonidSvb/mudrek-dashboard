/**
 * =====================================================================
 * Migration 037: Cleanup Legacy Functions + Fix Conversion Rate
 * =====================================================================
 *
 * ЦЕЛИ:
 *   1. Удалить legacy функции (get_dashboard_overview, get_all_metrics)
 *   2. Исправить conversionRate логику
 *   3. Добавить totalContactsCreated метрику
 *
 * ПРОБЛЕМА С conversionRate:
 *   ДО:  deals / all_contacts_ever (может быть >100%!)
 *   ПОСЛЕ: contacts_became_customers / contacts_created_in_period (правильно!)
 *
 * ПРИМЕР ПРАВИЛЬНОГО РАСЧЕТА:
 *   100 контактов создано за период
 *   → 10 сделок создано
 *   → 5 сделали первый платеж (стали 'customer')
 *   → conversion rate = 5/100 = 5% ✅
 *
 * НОВАЯ МЕТРИКА:
 *   totalContactsCreated - сколько контактов создано за период (полезная инфа!)
 *
 * Created: 2025-10-16
 * =====================================================================
 */

-- =====================================================================
-- 1. УДАЛЯЕМ LEGACY ФУНКЦИИ
-- =====================================================================

-- Удаляем старую get_dashboard_overview (2 параметра)
DROP FUNCTION IF EXISTS get_dashboard_overview(
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
);

-- Удаляем старую get_dashboard_overview (3 параметра)
DROP FUNCTION IF EXISTS get_dashboard_overview(
  p_owner_id TEXT,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
);

-- Удаляем старую get_all_metrics
DROP FUNCTION IF EXISTS get_all_metrics(
  p_owner_id TEXT,
  p_date_from TIMESTAMP,
  p_date_to TIMESTAMP
);

COMMENT ON SCHEMA public IS
'Legacy functions removed: get_dashboard_overview, get_all_metrics.
Use modular functions instead: get_sales_metrics, get_call_metrics, etc.';

-- =====================================================================
-- 2. ИСПРАВЛЯЕМ get_sales_metrics() - ПРАВИЛЬНЫЙ conversionRate
-- =====================================================================

CREATE OR REPLACE FUNCTION get_sales_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  v_date_from DATE;
  v_date_to DATE;
  v_contacts_created INTEGER;
  v_contacts_became_customers INTEGER;
BEGIN
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from::DATE, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to::DATE, CURRENT_DATE);

  -- НОВАЯ ЛОГИКА: Контакты созданные за период
  SELECT COUNT(*) INTO v_contacts_created
  FROM hubspot_contacts_raw
  WHERE createdate::DATE >= v_date_from
    AND createdate::DATE <= v_date_to
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- НОВАЯ ЛОГИКА: Контакты которые стали 'customer' (из тех что созданы за период)
  SELECT COUNT(*) INTO v_contacts_became_customers
  FROM hubspot_contacts_raw
  WHERE createdate::DATE >= v_date_from
    AND createdate::DATE <= v_date_to
    AND lifecyclestage = 'customer'
    AND (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id);

  -- Calculate sales metrics from MV
  SELECT json_build_object(
    'totalSales', COALESCE(SUM(daily_sales), 0),
    'totalDeals', COALESCE(SUM(daily_deals_won), 0),
    'avgDealSize', COALESCE(
      ROUND(SUM(daily_sales_sum_for_avg)::NUMERIC / NULLIF(SUM(daily_deals_count_for_avg), 0), 2),
      0
    ),
    'conversionRate', COALESCE(
      ROUND(v_contacts_became_customers::NUMERIC / NULLIF(v_contacts_created, 0) * 100, 2),
      0
    ),
    'totalContactsCreated', v_contacts_created
  ) INTO result
  FROM daily_metrics_mv
  WHERE metric_date >= v_date_from
    AND metric_date <= v_date_to
    AND (p_owner_id IS NULL OR owner_id = p_owner_id);

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_sales_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns sales metrics: totalSales, totalDeals, avgDealSize, conversionRate, totalContactsCreated.

CONVERSION RATE LOGIC:
  conversionRate = (contacts became customer / contacts created in period) * 100

EXAMPLE:
  100 contacts created in period
  → 10 deals created
  → 5 made first payment (became "customer")
  → conversion rate = 5/100 = 5%

READS FROM:
  - daily_metrics_mv (for sales data)
  - hubspot_contacts_raw (for contacts created & conversion)';

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Test: должен вернуть 5 полей (добавлено totalContactsCreated)
-- SELECT * FROM get_sales_metrics(NULL, '2025-10-01', '2025-10-16');

-- Test с owner:
-- SELECT * FROM get_sales_metrics('682432124', '2025-10-01', '2025-10-16');

-- Проверяем что старые функции удалены:
-- SELECT proname FROM pg_proc WHERE proname LIKE '%dashboard_overview%';
-- Должно быть пусто!

-- =====================================================================
