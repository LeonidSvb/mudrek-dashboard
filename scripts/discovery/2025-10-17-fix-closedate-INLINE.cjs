// Этот скрипт будет запущен вручную через Supabase SQL Editor
// или через MCP инструменты Claude

console.log(`
=============================================================
  СКРИПТ ИСПРАВЛЕНИЯ CLOSEDATE ИЗ CSV
  Дата: 2025-10-17
=============================================================

ИНСТРУКЦИЯ:
1. Откройте Supabase SQL Editor
2. Скопируйте SQL код ниже
3. Выполните его
4. Проверьте результат

ВНИМАНИЕ: Будет создан бэкап backup_closedate_20251017

=============================================================
`);

const SQL_CODE = `
-- =============================================================
-- ШАГ 1: БЭКАП
-- =============================================================
DROP TABLE IF EXISTS backup_closedate_20251017;
CREATE TABLE backup_closedate_20251017 AS
SELECT hubspot_id, closedate, updated_at
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';

SELECT 'БЭКАП СОЗДАН' as status, COUNT(*) as records
FROM backup_closedate_20251017;

-- =============================================================
-- ШАГ 2: ПОДГОТОВКА ДАННЫХ (ТЕСТ - 30 записей)
-- =============================================================
CREATE TEMP TABLE csv_dates_test (
  email TEXT PRIMARY KEY,
  closedate_correct DATE
);

INSERT INTO csv_dates_test (email, closedate_correct) VALUES
('Waelmak2@gmail.com', '2023-03-20'),
('helana.fee48@icloud.com', '2023-03-20'),
('samarqawasmi2019@gmail.com', '2023-03-20'),
('julaniebrahim@gmail.com', '2023-04-01'),
('b.haj873@gmail.com', '2023-04-26'),
('agd.aldulaimi@gmail.com', '2023-04-28'),
('alyan.dalia99@gmail.com', '2023-05-04'),
('nadia.reshiq@mail.huji.ac.il', '2023-05-05'),
('nouraldeanj@gmail.com', '2023-05-10'),
('alixd33b@gmail.com', '2023-05-25'),
('majdawi@outlook.com', '2023-05-31'),
('mhmmdbader9@gmail.com', '2023-05-31'),
('wessam09@gmail.com', '2023-06-01'),
('Atheer.abbadi27@gmail.com', '2023-06-11'),
('benhakameryem0@gmail.com', '2023-06-11'),
('enas.med@gmail.com', '2023-07-13'),
('walaa.aldda.1998@gmail.com', '2023-07-13'),
('tahany315@gmail.com', '2023-07-14'),
('Bilsan.mhajna@gmail.com', '2023-08-23'),
('yzynaldyn717@gmail.com', '2023-08-28'),
('elias_90@live.com', '2023-09-01'),
('sabreen_nassar@hotmail.com', '2023-09-02'),
('usama.butma@hotmail.com', '2023-09-10'),
('56malakjba@gmail.com', '2023-11-01'),
('fawzeeaboujesh2020@gmail.com', '2023-11-09'),
('mobeenzoabi@gmail.com', '2023-12-11'),
('Alaa.sabbagh1980@gmail.com', '2023-12-11'),
('ahmad16092005aaas@gmail.com', '2023-12-13'),
('saeedrajbio@gmail.com', '2023-12-20'),
('Namaira8@gmail.com', '2023-12-21');

-- =============================================================
-- ШАГ 3: ПРОВЕРКА ДО ОБНОВЛЕНИЯ
-- =============================================================
SELECT
  'ДО ОБНОВЛЕНИЯ' as status,
  COUNT(DISTINCT DATE(closedate)) as unique_dates,
  MIN(closedate)::date as min_date,
  MAX(closedate)::date as max_date
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- =============================================================
-- ШАГ 4: ПРИМЕНЕНИЕ UPDATE
-- =============================================================
UPDATE hubspot_deals_raw d
SET closedate = csv.closedate_correct::timestamp,
    updated_at = NOW()
FROM csv_dates_test csv
WHERE d.dealstage = 'closedwon'
  AND EXISTS (
    SELECT 1 FROM hubspot_contacts_raw c
    WHERE c.email = csv.email
      AND c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
  );

-- =============================================================
-- ШАГ 5: ПРОВЕРКА ПОСЛЕ ОБНОВЛЕНИЯ
-- =============================================================
SELECT
  'ПОСЛЕ ОБНОВЛЕНИЯ' as status,
  COUNT(DISTINCT DATE(closedate)) as unique_dates,
  MIN(closedate)::date as min_date,
  MAX(closedate)::date as max_date
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- Сколько записей обновилось
SELECT
  'ОБНОВЛЕНО ЗАПИСЕЙ' as info,
  COUNT(*) as count
FROM hubspot_deals_raw d
WHERE d.dealstage = 'closedwon'
  AND EXISTS (
    SELECT 1 FROM csv_dates_test csv
    JOIN hubspot_contacts_raw c ON c.email = csv.email
    WHERE c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
  );

-- Примеры обновлённых записей
SELECT dealname, closedate
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
ORDER BY closedate ASC
LIMIT 10;

-- =============================================================
-- ШАГ 6: ОБНОВЛЕНИЕ MATERIALIZED VIEW
-- =============================================================
REFRESH MATERIALIZED VIEW daily_metrics_mv;

SELECT
  'DAILY_METRICS_MV' as status,
  COUNT(DISTINCT metric_date) as unique_dates,
  MIN(metric_date) as min_date,
  MAX(metric_date) as max_date
FROM daily_metrics_mv;

-- =============================================================
-- ОТКАТ (если нужно):
-- =============================================================
-- UPDATE hubspot_deals_raw d
-- SET closedate = b.closedate, updated_at = b.updated_at
-- FROM backup_closedate_20251017 b
-- WHERE d.hubspot_id = b.hubspot_id;
-- REFRESH MATERIALIZED VIEW daily_metrics_mv;
`;

console.log(SQL_CODE);

console.log(`
=============================================================
  ГОТОВО! Скопируйте SQL код выше и выполните в Supabase
=============================================================
`);
