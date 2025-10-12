require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSalesMetrics() {
  console.log('=== ПРОВЕРКА SALES METRICS ===\n');

  // 1. Проверить RAW данные
  const { count: totalDealsRaw } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  const { count: closedWonCount } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon');

  console.log('1. RAW данные:');
  console.log(`   Всего deals: ${totalDealsRaw}`);
  console.log(`   Закрытые (closedwon): ${closedWonCount}\n`);

  // 2. Получить Sales metrics из функции (все данные)
  const { data: allMetrics, error } = await supabase
    .rpc('get_all_metrics');

  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  console.log('2. Sales Metrics (все данные):');
  console.log(`   totalSales: $${allMetrics.totalSales.toLocaleString()}`);
  console.log(`   avgDealSize: $${allMetrics.avgDealSize.toLocaleString()}`);
  console.log(`   totalDeals: ${allMetrics.totalDeals}`);
  console.log(`   conversionRate: ${allMetrics.conversionRate}%`);
  console.log(`   totalContacts: ${allMetrics.totalContacts}\n`);

  // 3. Проверить за последние 30 дней
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);

  const { data: metrics30d, error: error30d } = await supabase
    .rpc('get_all_metrics', {
      p_owner_id: null,
      p_date_from: dateFrom.toISOString(),
      p_date_to: new Date().toISOString()
    });

  if (!error30d) {
    console.log('3. Sales Metrics (последние 30 дней):');
    console.log(`   totalSales: $${metrics30d.totalSales.toLocaleString()}`);
    console.log(`   totalDeals: ${metrics30d.totalDeals}`);
    console.log(`   conversionRate: ${metrics30d.conversionRate}%`);
    console.log(`   totalContacts: ${metrics30d.totalContacts}\n`);
  }

  // 4. Проверить Shadi метрики
  const { data: shadiMetrics, error: errorShadi } = await supabase
    .rpc('get_all_metrics', {
      p_owner_id: '682432124',
      p_date_from: null,
      p_date_to: null
    });

  if (!errorShadi) {
    console.log('4. Sales Metrics Shadi (682432124):');
    console.log(`   totalSales: $${shadiMetrics.totalSales.toLocaleString()}`);
    console.log(`   avgDealSize: $${shadiMetrics.avgDealSize.toLocaleString()}`);
    console.log(`   totalDeals: ${shadiMetrics.totalDeals}`);
    console.log(`   conversionRate: ${shadiMetrics.conversionRate}%`);
    console.log(`   totalContacts: ${shadiMetrics.totalContacts}\n`);
  }

  // 5. Проверить проблему с conversionRate (за 30 дней)
  const { data: contactsCreated30d } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id', { count: 'exact', head: true })
    .gte('createdate', dateFrom.toISOString())
    .lte('createdate', new Date().toISOString());

  console.log('=== ПРОБЛЕМА С CONVERSION RATE ===');
  console.log('\nЗа последние 30 дней:');
  console.log(`  Deals закрытых: ${metrics30d.totalDeals}`);
  console.log(`  Contacts (из функции): ${metrics30d.totalContacts}`);
  console.log(`  Contacts (реально созданных): ${contactsCreated30d.count || 0}`);
  console.log(`\n  Конверсия (текущая): ${metrics30d.conversionRate}%`);

  if (contactsCreated30d.count > 0) {
    const correctConversion = (metrics30d.totalDeals / contactsCreated30d.count * 100).toFixed(2);
    console.log(`  Конверсия (ПРАВИЛЬНАЯ): ${correctConversion}%`);
    console.log(`\n  ⚠️ Разница: ${(correctConversion - metrics30d.conversionRate).toFixed(2)}%`);
  }

  // 6. Вычислить вручную
  console.log('\n=== ПРОВЕРКА РАСЧЕТОВ ===');
  const manualAvg = (allMetrics.totalSales / allMetrics.totalDeals).toFixed(2);
  console.log(`avgDealSize вручную: $${manualAvg}`);
  console.log(`avgDealSize из функции: $${allMetrics.avgDealSize}`);

  if (Math.abs(manualAvg - allMetrics.avgDealSize) < 1) {
    console.log('✓ avgDealSize правильно рассчитан');
  } else {
    console.log('✗ avgDealSize НЕ совпадает');
  }
}

testSalesMetrics();
