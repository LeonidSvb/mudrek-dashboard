-- Проверим почему 22k вместо 31k

-- 1. Всего контактов
SELECT 'Total contacts:' as metric, COUNT(*) as count
FROM hubspot_contacts_raw;

-- 2. Контакты БЕЗ телефона
SELECT 'Contacts WITHOUT phone:' as metric, COUNT(*) as count
FROM hubspot_contacts_raw
WHERE phone IS NULL OR phone = '';

-- 3. Контакты с КОРОТКИМИ номерами (< 10 цифр)
SELECT 'Contacts with SHORT phone (<10 digits):' as metric, COUNT(*) as count
FROM hubspot_contacts_raw
WHERE phone IS NOT NULL 
  AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) < 10;

-- 4. Контакты с НОРМАЛЬНЫМИ номерами (>= 10 цифр)
SELECT 'Contacts with VALID phone (>=10 digits):' as metric, COUNT(*) as count
FROM hubspot_contacts_raw
WHERE phone IS NOT NULL 
  AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10;

-- 5. Контакты которые matched to calls
SELECT 'Contacts WITH calls (in MV):' as metric, COUNT(*) as count
FROM contact_call_stats_mv;

-- 6. Разница = контакты с валидными номерами но БЕЗ звонков
SELECT 'Valid phones but NO calls:' as metric, 
  (SELECT COUNT(*) FROM hubspot_contacts_raw 
   WHERE phone IS NOT NULL 
     AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10)
  - 
  (SELECT COUNT(*) FROM contact_call_stats_mv)
  as count;
