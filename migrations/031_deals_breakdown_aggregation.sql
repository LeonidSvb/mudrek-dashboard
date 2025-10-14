/**
 * =====================================================================
 * Migration 031: Deals Breakdown Aggregation Function
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   Deals breakdown API загружает ВСЕ deals и группирует на клиенте
 *   Supabase лимит 1000 записей → показывает неполные данные
 *
 * РЕШЕНИЕ:
 *   SQL функция с GROUP BY (агрегация на сервере)
 *   Возвращает только сгруппированные данные (2-5 записей вместо тысяч!)
 *
 * ПРОИЗВОДИТЕЛЬНОСТЬ:
 *   ДО:  Загрузка всех deals (лимит 1000) + group by на клиенте
 *   ПОСЛЕ: GROUP BY на сервере → возвращает только итоги
 *
 * Created: 2025-10-14
 * =====================================================================
 */

CREATE OR REPLACE FUNCTION get_deals_breakdown(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  amount NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(dealstage, 'unknown') as stage,
    COUNT(*)::BIGINT as count,
    COALESCE(SUM(amount), 0) as amount
  FROM hubspot_deals_raw
  WHERE
    (p_owner_id IS NULL OR hubspot_owner_id = p_owner_id)
    AND (p_date_from IS NULL OR closedate >= p_date_from)
    AND (p_date_to IS NULL OR closedate <= p_date_to)
  GROUP BY dealstage
  ORDER BY COUNT(*) DESC;
END;
$$;

COMMENT ON FUNCTION get_deals_breakdown(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns deals grouped by stage with counts and amounts. Aggregates on server side.';

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Test all deals:
-- SELECT * FROM get_deals_breakdown(NULL, '2025-07-16', '2025-10-14');

-- Test specific manager:
-- SELECT * FROM get_deals_breakdown('81280578', '2025-07-16', '2025-10-14');

-- Should return only 2-5 rows (grouped stages), not thousands of deals!

-- =====================================================================
