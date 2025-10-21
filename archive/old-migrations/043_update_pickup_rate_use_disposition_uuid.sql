/**
 * =====================================================================
 * Migration 043: Update Pickup Rate - Use Disposition UUID
 * =====================================================================
 *
 * ПРОБЛЕМА:
 *   Текущая формула (duration >= 30s) дает 81.5% pickup rate - слишком высоко!
 *   30 секунд могут быть просто гудки, не реальный разговор.
 *
 * АНАЛИЗ 500 ЗВОНКОВ:
 *   Duration >= 30s: 77.2% - много ложных positives
 *   Duration >= 60s: 45.2% - лучше, но все равно приблизительно
 *
 *   По disposition UUID:
 *   - f240bbac-87c9-4f6e-bf70-924b57d47db7: 214 calls (42.8%), avg 246.7s (4+ мин) ✅
 *   - 73a0d17f-1163-4015-bdd5-ec830791da20: 264 calls (52.8%), avg 38.9s ❌
 *   - b2cf5968-551e-4856-9783-52b3da59a7d0: 22 calls (4.4%), avg 36.9s ❌
 *
 * РЕШЕНИЕ:
 *   Использовать call_disposition UUID = 'f240bbac-...' для определения connected
 *   Это самый точный способ:
 *   - Avg 4+ минуты = явно реальные разговоры
 *   - Менеджеры/система правильно выставляют outcome
 *   - Не зависит от произвольного threshold
 *
 * ИЗМЕНЕНИЕ:
 *   Было: WHERE call_duration >= 30000
 *   Стало: WHERE call_disposition = 'f240bbac-87c9-4f6e-bf70-924b57d47db7'
 *
 * ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
 *   Pickup Rate: ~42.8% (вместо 81.5%)
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

  -- Calculate call metrics (with accurate pickup rate!)
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
        COUNT(*) FILTER (WHERE call_disposition = 'f240bbac-87c9-4f6e-bf70-924b57d47db7')::numeric / NULLIF(COUNT(*), 0) * 100,
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
pickupRate = calls with disposition f240bbac (Connected) / total calls * 100.
Uses HubSpot call outcome UUID for accurate connected call detection.
Reads from call_contact_matches_mv.';

-- =====================================================================
-- TEST
-- =====================================================================
-- Should return pickupRate ~42-43%:
-- SELECT * FROM get_call_metrics(NULL, NOW() - INTERVAL '30 days', NOW());
