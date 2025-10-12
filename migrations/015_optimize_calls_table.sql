/**
 * =====================================================================
 * Migration 015: Optimize Calls Table (Минимализм)
 * =====================================================================
 *
 * ЦЕЛЬ: Оставить только колонки нужные для 22 метрик
 *
 * ЧТО УДАЛЯЕМ (2 колонки):
 *   - call_direction: Не используется в метриках
 *   - call_from_number: Не используется (только call_to_number для matching)
 *
 * БЫЛО: 9 колонок
 * СТАНЕТ: 7 колонок
 *
 * ОСТАВШИЕСЯ КОЛОНКИ:
 *   1. hubspot_id       - HubSpot ID (unique)
 *   2. call_duration    - Avg Call Time, Total Call Time, 5min Rate
 *   3. call_timestamp   - Date filters
 *   4. call_to_number   - Phone matching с контактами
 *   5. call_disposition - Pickup rate (может пригодиться)
 *   6. synced_at        - Metadata
 *   7. updated_at       - Metadata
 *   8. raw_json         - RAW data (страховка)
 *
 * NOTE: call_disposition оставляем на случай если понадобится
 *       для pickup rate метрики (сейчас не используется)
 *
 * =====================================================================
 */

-- =====================================================================
-- STEP 1: Удалить ненужные колонки
-- =====================================================================

-- ОСТОРОЖНО! Эти данные будут удалены (но остаются в raw_json)
ALTER TABLE hubspot_calls_raw
  DROP COLUMN IF EXISTS call_direction,
  DROP COLUMN IF EXISTS call_from_number;

-- =====================================================================
-- STEP 2: Verification
-- =====================================================================

-- Проверить колонки после migration:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'hubspot_calls_raw'
-- ORDER BY ordinal_position;

-- Проверить что phone matching работает:
-- SELECT COUNT(*) AS matched_calls
-- FROM call_contact_matches;
-- -- Должно быть ~118k

-- =====================================================================
-- ROLLBACK (если что-то пошло не так)
-- =====================================================================

-- Восстановить call_direction:
-- ALTER TABLE hubspot_calls_raw ADD COLUMN call_direction TEXT;
-- UPDATE hubspot_calls_raw
-- SET call_direction = raw_json->>'hs_call_direction';

-- Восстановить call_from_number:
-- ALTER TABLE hubspot_calls_raw ADD COLUMN call_from_number TEXT;
-- UPDATE hubspot_calls_raw
-- SET call_from_number = raw_json->>'hs_call_from_number';

-- =====================================================================
-- END OF MIGRATION 015
-- =====================================================================
