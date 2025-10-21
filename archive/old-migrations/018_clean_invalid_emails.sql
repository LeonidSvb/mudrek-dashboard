/**
 * =====================================================================
 * Migration 018: Clean Invalid Emails
 * =====================================================================
 *
 * ПРОБЛЕМА: email колонка содержит MIX из emails и имен (95.1% заполнено)
 * ПРИЧИНА: Извлекли из raw_json.properties.hs_full_name_or_email
 *          Это HubSpot auto-generated поле: email ИЛИ firstname+lastname
 * РЕЗУЛЬТАТ: При валидации regex 100% записей = имена, не emails
 *
 * ПРИМЕРЫ НЕВАЛИДНЫХ ДАННЫХ:
 *   - "Deiaa"
 *   - "Maha"
 *   - "Rasha"
 *   - "Naseem"
 *
 * ПРИМЕРЫ ВАЛИДНЫХ:
 *   - "abeer.majadly@gmail.com"
 *   - "naseem_b87@hotmail.com"
 *
 * БЫЛО:
 *   email: 30,256 из 31,800 (95.1%) - MIX имен и emails
 *
 * СТАНЕТ:
 *   email: ~6,000-7,000 из 31,800 (20%) - только валидные emails
 *   Остальные: NULL (имена останутся в raw_json)
 *
 * ВРЕМЯ ВЫПОЛНЕНИЯ: ~3-5 секунд на 31,800 контактов
 *
 * БЕЗОПАСНОСТЬ: Данные НЕ удаляются, original в raw_json
 *
 * =====================================================================
 */

-- =====================================================================
-- STEP 1: Очистить невалидные emails
-- =====================================================================

UPDATE hubspot_contacts_raw
SET email = CASE
  WHEN email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'  -- PostgreSQL regex для email
  THEN email
  ELSE NULL
END
WHERE email IS NOT NULL;

-- ⏱️ ~3-5 секунд на 31,800 записей
-- 📊 Очистит ~24,000 имен, оставит ~6,000 валидных emails

-- =====================================================================
-- STEP 2: Verification
-- =====================================================================

-- Проверить сколько валидных email осталось:
-- SELECT
--   COUNT(*) AS total_contacts,
--   COUNT(email) AS with_valid_email,
--   ROUND(COUNT(email)::numeric / COUNT(*) * 100, 1) AS percent
-- FROM hubspot_contacts_raw;

-- Проверить примеры валидных emails:
-- SELECT hubspot_id, email, phone
-- FROM hubspot_contacts_raw
-- WHERE email IS NOT NULL
-- LIMIT 20;

-- Проверить что имена удалены (должно быть 0 результатов):
-- SELECT hubspot_id, email
-- FROM hubspot_contacts_raw
-- WHERE email IS NOT NULL
--   AND email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
-- LIMIT 10;

-- =====================================================================
-- ROLLBACK (если нужно вернуть обратно)
-- =====================================================================

-- Восстановить из raw_json:
-- UPDATE hubspot_contacts_raw
-- SET email = raw_json->'properties'->>'hs_full_name_or_email'
-- WHERE email IS NULL
--   AND raw_json->'properties'->>'hs_full_name_or_email' IS NOT NULL;

-- =====================================================================
-- NOTES
-- =====================================================================

-- Почему в email колонке были имена?
--   - HubSpot поле hs_full_name_or_email = auto-generated fallback
--   - Если email пустой → HubSpot подставляет firstname + lastname
--   - Команда не заполняет email поле в HubSpot (только телефоны)
--   - Это нормально для cold calling CRM

-- Почему не все контакты имеют email после очистки?
--   - В HubSpot CRM контакты создаются ТОЛЬКО с телефоном
--   - Email опциональное поле (только ~20% контактов)
--   - Основной идентификатор = phone (100% заполнено)
--   - Phone matching работает корректно (118k calls matched)

-- Что делать дальше?
--   - Email колонка теперь чистая (только валидные или NULL)
--   - Для метрик email НЕ нужен (используем phone)
--   - Для будущих incremental sync:
--     * Добавить validation в sync script transform function
--     * Не извлекать hs_full_name_or_email в email колонку
--     * Оставить raw_json как источник данных

-- =====================================================================
-- FUTURE: Incremental Sync Prevention
-- =====================================================================

-- В sync-parallel.js добавить validation:
--
-- const emailValue = contact.properties.email ||
--                    contact.properties.hs_full_name_or_email;
-- const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
--
-- return {
--   email: (emailValue && EMAIL_REGEX.test(emailValue)) ? emailValue : null,
--   // ... остальные поля
-- };

-- =====================================================================
-- END OF MIGRATION 018
-- =====================================================================
