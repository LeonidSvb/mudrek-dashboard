/**
 * =====================================================================
 * Migration 042: Add Pickup Rate to Call Metrics
 * =====================================================================
 *
 * ЗАДАЧА:
 *   Добавить метрику Pickup Rate = connected calls / total calls
 *
 * ОПРЕДЕЛЕНИЕ "CONNECTED":
 *   Звонок считается connected если call_duration >= 30 секунд (30000 ms)
 *
 *   Анализ показал:
 *   - Звонки > 30 сек: реальные разговоры
 *   - Звонки < 30 сек: no answer, busy, failed
 *
 * РЕШЕНИЕ:
 *   Добавить 5-ю метрику в get_call_metrics():
 *   - totalCalls (уже есть)
 *   - avgCallTime (уже есть)
 *   - totalCallTime (уже есть)
 *   - fiveMinReachedRate (уже есть)
 *   - pickupRate (NEW!) ← добавляем
 *
 * РАБОТАЕТ С ФИЛЬТРАМИ:
 *   - По дате (p_date_from, p_date_to)
 *   - По менеджерам (p_owner_id)
 *
 * Created: 2025-10-21
 * =====================================================================
 */

CREATE OR REPLACE FUNCTION get_call_metrics(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  -- Default to last 90 days
  v_date_from := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '90 days');
  v_date_to := COALESCE(p_date_to, CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second');

  -- Calculate call metrics (now with 5 metrics!)
  SELECT json_build_object(
    'totalCalls', COUNT(*)::INTEGER,
    'avgCallTime', COALESCE(ROUND(AVG(call_duration::numeric) / 60000, 2), 0),
    'totalCallTime', COALESCE(ROUND(SUM(call_duration::numeric) / 3600000, 2), 0),
    'fiveMinReachedRate', COALESCE(
      ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      ),
      0
    ),
    'pickupRate', COALESCE(
      ROUND(
        COUNT(*) FILTER (WHERE call_duration >= 30000)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM call_contact_matches_mv
  WHERE call_timestamp >= v_date_from
    AND call_timestamp <= v_date_to
    AND (p_owner_id IS NULL OR (hubspot_owner_id = p_owner_id AND hubspot_owner_id != ''));

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_call_metrics(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Returns call metrics: totalCalls, avgCallTime, totalCallTime, fiveMinReachedRate, pickupRate.
pickupRate = calls with duration >= 30s / total calls * 100.
Reads from call_contact_matches_mv.';

-- =====================================================================
-- TEST
-- =====================================================================
-- Should return pickupRate ~37-40%:
-- SELECT * FROM get_call_metrics(NULL, NOW() - INTERVAL '30 days', NOW());

-- Test with specific owner:
-- SELECT * FROM get_call_metrics('81280578', NOW() - INTERVAL '30 days', NOW());
