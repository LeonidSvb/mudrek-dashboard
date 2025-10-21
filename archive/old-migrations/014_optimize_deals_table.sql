/**
 * =====================================================================
 * Migration 014: Optimize Deals Table (Минимализм)
 * =====================================================================
 *
 * ЦЕЛЬ: Оставить только колонки нужные для 22 метрик
 *
 * ЧТО УДАЛЯЕМ (6 колонок):
 *   - dealname: Не используется в метриках (доступно в raw_json)
 *   - pipeline: Не используется
 *   - payment_status: 0% данных, не используется
 *   - cancellation_reason: 0% данных, не используется
 *   - is_refunded: Не используется
 *   - installment_plan: 0% данных, не используется
 *
 * БЫЛО: 20 колонок
 * СТАНЕТ: 14 колонок
 *
 * ОСТАВШИЕСЯ КОЛОНКИ:
 *   1. id                               - Auto-increment PK
 *   2. hubspot_id                       - HubSpot ID (unique)
 *   3. amount                           - Total Sales, Avg Deal Size
 *   4. dealstage                        - Conversion, Cancellation
 *   5. createdate                       - Time to Sale
 *   6. closedate                        - Date filters
 *   7. hubspot_owner_id                 - Фильтры
 *   8. qualified_status                 - Qualified Rate (0% сейчас) ❌
 *   9. trial_status                     - Trial Rate (0% сейчас) ❌
 *  10. number_of_installments__months   - Avg Installments (0% сейчас) ❌
 *  11. upfront_payment                  - Upfront Cash (0% сейчас) ❌
 *  12. offer_given                      - Offers Given Rate
 *  13. offer_accepted                   - Offer→Close Rate
 *  14. synced_at                        - Metadata
 *  15. updated_at                       - Metadata
 *  16. raw_json                         - RAW data (страховка)
 *
 * ПРОБЛЕМА: 4 колонки имеют 0% данных (отмечены ❌)
 *   → Нужно проверить HubSpot properties
 *   → Возможно поля не существуют или не заполнены
 *
 * =====================================================================
 */

-- =====================================================================
-- STEP 1: Удалить ненужные колонки
-- =====================================================================

-- ОСТОРОЖНО! Эти данные будут удалены (но остаются в raw_json)
ALTER TABLE hubspot_deals_raw
  DROP COLUMN IF EXISTS dealname,
  DROP COLUMN IF EXISTS pipeline,
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS cancellation_reason,
  DROP COLUMN IF EXISTS is_refunded,
  DROP COLUMN IF EXISTS installment_plan;

-- =====================================================================
-- STEP 2: Verification
-- =====================================================================

-- Проверить колонки после migration:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'hubspot_deals_raw'
-- ORDER BY ordinal_position;

-- Проверить заполненность критичных полей:
-- SELECT
--   COUNT(*) AS total_deals,
--   COUNT(qualified_status) AS with_qualified_status,
--   COUNT(trial_status) AS with_trial_status,
--   COUNT(upfront_payment) AS with_upfront_payment,
--   COUNT(number_of_installments__months) AS with_installments
-- FROM hubspot_deals_raw;

-- =====================================================================
-- ROLLBACK (если что-то пошло не так)
-- =====================================================================

-- Восстановить dealname:
-- ALTER TABLE hubspot_deals_raw ADD COLUMN dealname TEXT;
-- UPDATE hubspot_deals_raw
-- SET dealname = raw_json->'properties'->>'dealname';

-- Восстановить pipeline:
-- ALTER TABLE hubspot_deals_raw ADD COLUMN pipeline TEXT;
-- UPDATE hubspot_deals_raw
-- SET pipeline = raw_json->'properties'->>'pipeline';

-- ... (аналогично для остальных)

-- =====================================================================
-- END OF MIGRATION 014
-- =====================================================================
