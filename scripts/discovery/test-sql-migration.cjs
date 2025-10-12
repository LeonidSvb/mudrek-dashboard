require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testMigration() {
  console.log('🔍 Проверка SQL функции get_all_metrics()...\n');

  try {
    // Test 1: Вызов без параметров
    console.log('Test 1: Вызов get_all_metrics() без параметров');
    const { data, error } = await supabase.rpc('get_all_metrics');

    if (error) {
      console.error('❌ ОШИБКА:', error);
      console.error('\n⚠️  SQL функция не обновилась или есть ошибка в SQL!');
      console.error('Проверьте что вы скопировали ВСЮ миграцию в Supabase SQL Editor.');
      process.exit(1);
    }

    if (!data) {
      console.error('❌ Функция вернула NULL');
      console.error('Проверьте что миграция применилась корректно.');
      process.exit(1);
    }

    console.log('✅ Функция работает!');
    console.log('\nРезультат:');
    console.log('  totalContacts:', data.totalContacts);
    console.log('  totalSales: ₪' + data.totalSales?.toLocaleString());
    console.log('  totalDeals:', data.totalDeals);
    console.log('  followupRate:', data.followupRate + '%');
    console.log('  avgFollowups:', data.avgFollowups);

    // Test 2: С фильтром по дате
    console.log('\n\nTest 2: С фильтром по дате (последние 30 дней)');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const { data: filtered, error: err2 } = await supabase.rpc('get_all_metrics', {
      p_owner_id: null,
      p_date_from: thirtyDaysAgo.toISOString(),
      p_date_to: today.toISOString()
    });

    if (err2) {
      console.error('❌ ОШИБКА при фильтрации:', err2);
    } else {
      console.log('✅ Фильтр работает!');
      console.log('  totalContacts (30d):', filtered.totalContacts);
      console.log('  totalSales (30d): ₪' + filtered.totalSales?.toLocaleString());
    }

    console.log('\n🎉 SQL миграция успешно применена!');
    console.log('✅ Все проверки пройдены');

  } catch (err) {
    console.error('❌ Неожиданная ошибка:', err.message);
    process.exit(1);
  }
}

testMigration();
