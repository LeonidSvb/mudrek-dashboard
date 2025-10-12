require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMetrics() {
  console.log('=== ТЕСТИРОВАНИЕ МЕТРИК ПОСЛЕ ИСПРАВЛЕНИЯ ===\n');

  // 1. Проверить totalCalls из raw
  const { count: rawCalls } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true });

  console.log(`1. hubspot_calls_raw: ${rawCalls} звонков\n`);

  // 2. Вызвать get_all_metrics() БЕЗ фильтров
  const { data: allMetrics, error } = await supabase
    .rpc('get_all_metrics');

  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  console.log('2. get_all_metrics() результат:');
  console.log(`   totalCalls: ${allMetrics.totalCalls}`);
  console.log(`   avgCallTime: ${allMetrics.avgCallTime} минут`);
  console.log(`   totalCallTime: ${allMetrics.totalCallTime} часов`);
  console.log(`   fiveMinReachedRate: ${allMetrics.fiveMinReachedRate}%\n`);

  // 3. Проверить с фильтром по дате (последние 30 дней)
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);

  const { data: filtered30d, error: error30d } = await supabase
    .rpc('get_all_metrics', {
      p_owner_id: null,
      p_date_from: dateFrom.toISOString(),
      p_date_to: new Date().toISOString()
    });

  if (!error30d) {
    console.log('3. Метрики за последние 30 дней:');
    console.log(`   totalCalls: ${filtered30d.totalCalls}`);
    console.log(`   avgCallTime: ${filtered30d.avgCallTime} минут\n`);
  }

  // 4. Проверить с фильтром по Shadi
  const { data: shadiMetrics, error: errorShadi } = await supabase
    .rpc('get_all_metrics', {
      p_owner_id: '682432124',
      p_date_from: null,
      p_date_to: null
    });

  if (!errorShadi) {
    console.log('4. Метрики Shadi (682432124):');
    console.log(`   totalCalls: ${shadiMetrics.totalCalls}`);
    console.log(`   totalDeals: ${shadiMetrics.totalDeals}`);
    console.log(`   totalContacts: ${shadiMetrics.totalContacts}\n`);
  }

  console.log('=== ВЫВОДЫ ===');
  if (allMetrics.totalCalls === rawCalls) {
    console.log('✓ totalCalls ПРАВИЛЬНО считается из RAW!');
  } else {
    console.log('✗ totalCalls НЕ СОВПАДАЕТ с RAW:');
    console.log(`  Ожидалось: ${rawCalls}`);
    console.log(`  Получено: ${allMetrics.totalCalls}`);
    console.log(`  Разница: ${rawCalls - allMetrics.totalCalls}`);
  }
}

testMetrics();
