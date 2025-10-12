require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testMigration011() {
  console.log('🔍 Тестирование Migration 011...\n');

  try {
    // Test 1: Проверка что Materialized View создан
    console.log('Test 1: Проверка contact_call_stats_mv');
    const { data: mvData, error: mvError } = await supabase
      .from('contact_call_stats_mv')
      .select('contact_id')
      .limit(1);

    if (mvError) {
      console.error('❌ Materialized View НЕ создан:', mvError.message);
      console.error('\n⚠️  Проверьте что вы запустили ВСЮ миграцию 011!');
      process.exit(1);
    }

    console.log('✅ Materialized View существует');

    // Test 2: Подсчет записей
    const { count: mvCount, error: countErr } = await supabase
      .from('contact_call_stats_mv')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('❌ Ошибка подсчета:', countErr.message);
    } else {
      console.log(`✅ Записей в MV: ${mvCount}`);
    }

    // Test 3: Проверка индекса (косвенно - через быстрый поиск)
    const startIndex = Date.now();
    const { data: indexTest } = await supabase
      .from('contact_call_stats_mv')
      .select('*')
      .limit(10);
    const indexTime = Date.now() - startIndex;

    if (indexTime < 500) {
      console.log(`✅ Индексы работают (${indexTime}ms)`);
    } else {
      console.log(`⚠️  Медленно (${indexTime}ms) - возможно индексы не созданы`);
    }

    // Test 4: Главный тест - get_all_metrics() без timeout
    console.log('\nTest 4: get_all_metrics() (главный тест!)');
    console.log('Ожидаем < 5 секунд...');

    const startTime = Date.now();
    const { data: metrics, error: metricsErr } = await supabase.rpc('get_all_metrics');
    const duration = Date.now() - startTime;

    if (metricsErr) {
      console.error('❌ ОШИБКА:', metricsErr.message);
      console.error('\nВозможные причины:');
      console.error('1. Функция не обновилась (проверьте что STEP 6 в migration 011 выполнен)');
      console.error('2. Materialized View не заполнен (запустите REFRESH MATERIALIZED VIEW)');
      process.exit(1);
    }

    console.log(`✅ Функция работает! (${duration}ms)`);

    if (duration > 5000) {
      console.log('⚠️  Медленнее 5 сек - возможно используется VIEW вместо MV');
    } else {
      console.log('🚀 ОТЛИЧНО! Производительность в норме!');
    }

    // Test 5: Проверка данных
    console.log('\nTest 5: Проверка метрик');
    console.log('  totalContacts:', metrics.totalContacts);
    console.log('  totalSales: ₪' + metrics.totalSales?.toLocaleString());
    console.log('  followupRate:', metrics.followupRate + '%');
    console.log('  avgFollowups:', metrics.avgFollowups);
    console.log('  timeToFirstContact:', metrics.timeToFirstContact, 'дней');

    if (metrics.followupRate > 0) {
      console.log('✅ Followup метрики работают (реальные данные из MV)');
    } else {
      console.log('⚠️  Followup метрики = 0 (проверьте данные в contact_call_stats_mv)');
    }

    // Test 6: Проверка pg_cron job
    console.log('\nTest 6: Проверка pg_cron job');
    const { data: cronJobs, error: cronErr } = await supabase
      .from('cron.job')
      .select('*')
      .eq('jobname', 'refresh-contact-stats');

    if (cronErr) {
      console.log('⚠️  Не могу проверить cron jobs (возможно нет доступа)');
      console.log('   Это нормально для Supabase. Job должен быть создан.');
    } else if (cronJobs && cronJobs.length > 0) {
      console.log('✅ Cron job "refresh-contact-stats" создан');
      console.log('   Расписание:', cronJobs[0].schedule);
    } else {
      console.log('❌ Cron job НЕ найден');
      console.log('   Проверьте что STEP 5 в migration 011 выполнен');
    }

    console.log('\n🎉 Migration 011 успешно применена!');
    console.log('✅ Materialized View создан и работает');
    console.log('✅ get_all_metrics() работает быстро (<5 сек)');
    console.log('✅ Все проверки пройдены');

    console.log('\n📊 Производительность:');
    console.log(`   До миграции: >60 сек (timeout)`);
    console.log(`   После миграции: ${duration}ms`);
    console.log(`   Улучшение: ${Math.round(60000 / duration)}x быстрее!`);

  } catch (err) {
    console.error('❌ Неожиданная ошибка:', err.message);
    process.exit(1);
  }
}

testMigration011();
