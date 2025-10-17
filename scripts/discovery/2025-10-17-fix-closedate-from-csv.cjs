const { Pool } = require('pg');
require('dotenv').config();

// Используем прямое подключение к PostgreSQL (Session Mode, port 5432)
// DATABASE_URL использует Transaction Mode (6543), меняем на Session Mode
const connectionString = process.env.DATABASE_URL
  .replace(':6543/', ':5432/')
  .replace('?pgbouncer=true', '')
  .replace('pooler.supabase.com', 'pooler.supabase.com');

console.log('Connection:', connectionString.replace(/:[^:]+@/, ':***@'));

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function executeSQL(query) {
  const client = await pool.connect();
  try {
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('=== ШАГ 1: ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ===\n');

  // Проверяем сколько deals с closedwon
  const dealsCountQuery = `
    SELECT COUNT(*) as count FROM hubspot_deals_raw WHERE dealstage = 'closedwon'
  `;
  const dealsCount = await executeSQL(dealsCountQuery);

  console.log(`Всего closedwon deals: ${dealsCount[0].count}`);

  // Проверяем уникальные даты
  const checkQuery = `
    SELECT
      COUNT(DISTINCT DATE(closedate)) as unique_dates,
      MIN(closedate)::date as min_date,
      MAX(closedate)::date as max_date
    FROM hubspot_deals_raw
    WHERE dealstage = 'closedwon' AND closedate IS NOT NULL
  `;

  const before = await executeSQL(checkQuery);
  console.log('До обновления:', before);

  console.log('\n=== ШАГ 2: СОЗДАНИЕ БЭКАПА ===\n');

  const backupQuery = `
    DROP TABLE IF EXISTS backup_closedate_20251017;
    CREATE TABLE backup_closedate_20251017 AS
    SELECT hubspot_id, closedate, updated_at
    FROM hubspot_deals_raw
    WHERE dealstage = 'closedwon';
  `;

  await executeSQL(backupQuery);
  console.log('✅ Бэкап создан: backup_closedate_20251017');

  console.log('\n=== ШАГ 3: ПОДГОТОВКА ДАННЫХ ИЗ CSV ===\n');

  // Создаем временную таблицу с ПРАВИЛЬНЫМИ датами (first_payment_date, НЕ last!)
  const csvData = `
    CREATE TEMP TABLE csv_dates_temp (
      email TEXT PRIMARY KEY,
      closedate_correct DATE
    );

    INSERT INTO csv_dates_temp (email, closedate_correct) VALUES
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
  `;

  await executeSQL(csvData);
  console.log('✅ Временная таблица csv_dates_temp создана (показаны первые 30 записей)');

  console.log('\n⚠️  ВНИМАНИЕ: Это ТЕСТОВЫЙ запуск с 30 записями');
  console.log('После проверки результата можно применить полный список\n');

  console.log('\n=== ШАГ 4: ПРИМЕНЕНИЕ UPDATE ===\n');

  const updateQuery = `
    UPDATE hubspot_deals_raw d
    SET closedate = csv.closedate_correct::timestamp,
        updated_at = NOW()
    FROM csv_dates_temp csv
    WHERE d.dealstage = 'closedwon'
      AND EXISTS (
        SELECT 1 FROM hubspot_contacts_raw c
        WHERE c.email = csv.email
          AND c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
      );
  `;

  await executeSQL(updateQuery);
  console.log('✅ UPDATE применён');

  console.log('\n=== ШАГ 5: ПРОВЕРКА РЕЗУЛЬТАТА ===\n');

  const after = await executeSQL(checkQuery);
  console.log('После обновления:', after);

  // Проверяем сколько записей обновилось
  const updatedQuery = `
    SELECT COUNT(*) as updated_count
    FROM hubspot_deals_raw d
    WHERE d.dealstage = 'closedwon'
      AND EXISTS (
        SELECT 1 FROM csv_dates_temp csv
        JOIN hubspot_contacts_raw c ON c.email = csv.email
        WHERE c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
      );
  `;

  const updated = await executeSQL(updatedQuery);
  console.log(`\n✅ Обновлено записей: ${updated[0].updated_count}`);

  // Показываем примеры обновлённых записей
  const samplesQuery = `
    SELECT dealname, closedate
    FROM hubspot_deals_raw
    WHERE dealstage = 'closedwon'
    ORDER BY closedate ASC
    LIMIT 10
  `;
  const samples = await executeSQL(samplesQuery);

  console.log('\nПримеры обновлённых записей (первые 10 по дате):');
  console.table(samples);

  console.log('\n=== ШАГ 6: ОБНОВЛЕНИЕ MATERIALIZED VIEW ===\n');

  await executeSQL('REFRESH MATERIALIZED VIEW daily_metrics_mv');
  console.log('✅ daily_metrics_mv обновлён');

  const mvCheckQuery = `
    SELECT
      COUNT(DISTINCT metric_date) as unique_dates,
      MIN(metric_date) as min_date,
      MAX(metric_date) as max_date
    FROM daily_metrics_mv
  `;

  const mvResult = await executeSQL(mvCheckQuery);
  console.log('daily_metrics_mv статистика:', mvResult);

  console.log('\n=== ГОТОВО! ===\n');
  console.log('ЧТО ДЕЛАТЬ ДАЛЬШЕ:');
  console.log('1. Проверь результат - уникальных дат должно быть больше 30');
  console.log('2. Если всё ОК - применим полный список из UPDATE_DEALS_FROM_CSV.sql');
  console.log('3. Если что-то не так - откатим через:');
  console.log('   UPDATE hubspot_deals_raw d');
  console.log('   SET closedate = b.closedate');
  console.log('   FROM backup_closedate_20251017 b');
  console.log('   WHERE d.hubspot_id = b.hubspot_id;');

  await pool.end();
}

main().catch((err) => {
  console.error('ОШИБКА:', err);
  pool.end();
  process.exit(1);
});
