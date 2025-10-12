/**
 * =====================================================================
 * Migration 013: Optimize Contacts Table (Минимализм)
 * =====================================================================
 *
 * ЦЕЛЬ: Оставить только колонки нужные для 22 метрик
 *
 * ЧТО УДАЛЯЕМ (4 колонки):
 *   - firstname: 51% данных, не используется в метриках (доступно в raw_json)
 *   - lastname: 0% данных, не используется
 *   - vsl_watch_duration: 0% данных, не используется
 *
 * ЧТО ИЗВЛЕКАЕМ:
 *   - email ← raw_json.properties.hs_full_name_or_email (для UI)
 *
 * БЫЛО: 14 колонок
 * СТАНЕТ: 11 колонок (минус 3, плюс 0)
 *
 * ОСТАВШИЕСЯ КОЛОНКИ:
 *   1. id                    - Auto-increment PK
 *   2. hubspot_id            - HubSpot ID (unique)
 *   3. email                 - Для UI (извлечём из raw_json)
 *   4. phone                 - Phone matching (100% данных)
 *   5. createdate            - Time to First Contact
 *   6. lifecyclestage        - Conversion Rate
 *   7. hubspot_owner_id      - Фильтры по менеджерам
 *   8. sales_script_version  - A/B Testing (0% сейчас)
 *   9. vsl_watched           - A/B Testing VSL Watch
 *  10. synced_at             - Metadata
 *  11. updated_at            - Metadata
 *  12. raw_json              - RAW data (страховка)
 *
 * =====================================================================
 */

-- =====================================================================
-- STEP 1: Извлечь email из raw_json
-- =====================================================================

-- Обновить email из raw_json для всех контактов
UPDATE hubspot_contacts_raw
SET email = raw_json->'properties'->>'hs_full_name_or_email'
WHERE email IS NULL
  AND raw_json->'properties'->>'hs_full_name_or_email' IS NOT NULL;

-- ⏱️ ~3-5 секунд на 31,800 контактов

-- =====================================================================
-- STEP 2: Удалить ненужные колонки
-- =====================================================================

-- ОСТОРОЖНО! Эти данные будут удалены (но остаются в raw_json)
ALTER TABLE hubspot_contacts_raw
  DROP COLUMN IF EXISTS firstname,
  DROP COLUMN IF EXISTS lastname,
  DROP COLUMN IF EXISTS vsl_watch_duration;

-- =====================================================================
-- STEP 3: Verification
-- =====================================================================

-- Проверить колонки после migration:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'hubspot_contacts_raw'
-- ORDER BY ordinal_position;

-- Проверить что email заполнен:
-- SELECT
--   COUNT(*) AS total,
--   COUNT(email) AS with_email,
--   ROUND(COUNT(email)::numeric / COUNT(*) * 100, 1) AS percent
-- FROM hubspot_contacts_raw;

-- =====================================================================
-- ROLLBACK (если что-то пошло не так)
-- =====================================================================

-- Восстановить firstname:
-- ALTER TABLE hubspot_contacts_raw ADD COLUMN firstname TEXT;
-- UPDATE hubspot_contacts_raw
-- SET firstname = raw_json->'properties'->>'firstname';

-- Восстановить lastname:
-- ALTER TABLE hubspot_contacts_raw ADD COLUMN lastname TEXT;
-- UPDATE hubspot_contacts_raw
-- SET lastname = raw_json->'properties'->>'lastname';

-- Восстановить vsl_watch_duration:
-- ALTER TABLE hubspot_contacts_raw ADD COLUMN vsl_watch_duration INTEGER;

-- =====================================================================
-- END OF MIGRATION 013
-- =====================================================================
