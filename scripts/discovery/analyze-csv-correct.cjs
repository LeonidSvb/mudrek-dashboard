require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

async function analyzeCSV() {
  console.log('=== ПРАВИЛЬНЫЙ АНАЛИЗ CSV (с учетом многострочных ячеек) ===\n');

  // Правильный парсинг CSV с кавычками и переносами
  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  console.log(`✓ Правильно распарсено: ${records.length} deals\n`);

  // 1. Статусы
  const statusCounts = {};
  records.forEach(r => {
    const status = (r.Status || 'no status').trim();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('1. СТАТУСЫ:');
  const topStatuses = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  topStatuses.forEach(([status, count]) => {
    const percent = (count / records.length * 100).toFixed(1);
    console.log(`   ${status}: ${count} (${percent}%)`);
  });
  console.log(`   ... и еще ${Object.keys(statusCounts).length - 10} статусов\n`);

  // 2. Финансы
  const finishedDeals = records.filter(r => r.Status === 'finished');
  const totalRevenue = finishedDeals.reduce((sum, r) => sum + parseAmount(r['deal amount']), 0);
  const avgDeal = totalRevenue / finishedDeals.length;

  console.log('2. ФИНАНСЫ (finished deals):');
  console.log(`   Finished deals: ${finishedDeals.length}`);
  console.log(`   Total revenue: $${totalRevenue.toLocaleString()}`);
  console.log(`   Average deal: $${avgDeal.toFixed(2)}\n`);

  // 3. Payment structure
  const withPayment = records.filter(r => parseAmount(r.payment) > 0).length;
  const withInstallments = records.filter(r => parseAmount(r.installments) > 0).length;

  console.log('3. PAYMENT FIELDS:');
  console.log(`   payment заполнено: ${withPayment} (${(withPayment/records.length*100).toFixed(1)}%)`);
  console.log(`   installments заполнено: ${withInstallments} (${(withInstallments/records.length*100).toFixed(1)}%)\n`);

  // 4. Менеджеры
  const managers = {};
  records.forEach(r => {
    const mgr = (r.sales || r.niye || 'No Manager').trim();
    managers[mgr] = (managers[mgr] || 0) + 1;
  });

  console.log('4. МЕНЕДЖЕРЫ (топ-10):');
  Object.entries(managers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([mgr, count]) => {
      const percent = (count / records.length * 100).toFixed(1);
      console.log(`   ${mgr}: ${count} (${percent}%)`);
    });
  console.log('');

  // 5. Сравнение с DB
  const { count: dbDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  const { count: dbClosed } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon');

  const { data: dbAmounts } = await supabase
    .from('hubspot_deals_raw')
    .select('amount')
    .eq('dealstage', 'closedwon');

  const dbRevenue = dbAmounts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const dbAvg = dbRevenue / dbClosed;

  console.log('5. CSV vs DATABASE:\n');
  console.log('Finished/Closedwon Deals:');
  console.log(`  CSV finished: ${finishedDeals.length}`);
  console.log(`  DB closedwon: ${dbClosed}`);
  console.log(`  Разница: ${Math.abs(finishedDeals.length - dbClosed)} ` +
    (dbClosed > finishedDeals.length ? '(DB больше!)' : '(CSV больше!)'));
  console.log('');

  console.log('Total Revenue:');
  console.log(`  CSV: $${totalRevenue.toLocaleString()}`);
  console.log(`  DB:  $${dbRevenue.toLocaleString()}`);
  console.log(`  Разница: $${Math.abs(totalRevenue - dbRevenue).toLocaleString()}`);
  console.log(`  DB ${dbRevenue < totalRevenue ? 'меньше' : 'больше'} на $${Math.abs(totalRevenue - dbRevenue).toLocaleString()}\n`);

  console.log('Average Deal:');
  console.log(`  CSV: $${avgDeal.toFixed(2)}`);
  console.log(`  DB:  $${dbAvg.toFixed(2)}`);
  console.log(`  Разница: $${Math.abs(avgDeal - dbAvg).toFixed(2)}\n`);

  // 6. Installments distribution
  const installmentsDist = {};
  finishedDeals.forEach(r => {
    const inst = Math.floor(parseAmount(r.installments)) || 0;
    installmentsDist[inst] = (installmentsDist[inst] || 0) + 1;
  });

  console.log('6. РАССРОЧКА (installments):');
  Object.entries(installmentsDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([inst, count]) => {
      console.log(`   ${inst} платежей: ${count} deals`);
    });
  console.log('');

  // 7. ИТОГИ
  console.log('=== ИТОГИ ===\n');
  console.log(`✓ Всего records в CSV: ${records.length}`);
  console.log(`✓ Finished deals: ${finishedDeals.length}`);
  console.log(`✓ Revenue в CSV: $${totalRevenue.toLocaleString()}`);
  console.log(`✓ Avg deal в CSV: $${avgDeal.toFixed(2)}`);
  console.log('');
  console.log(`❌ В DB ${dbClosed} deals (разница: ${dbClosed - finishedDeals.length})`);
  console.log(`❌ Revenue в DB: $${dbRevenue.toLocaleString()} (разница: $${Math.abs(totalRevenue - dbRevenue).toLocaleString()})`);
  console.log(`❌ Avg deal в DB: $${dbAvg.toFixed(2)} (разница: $${Math.abs(avgDeal - dbAvg).toFixed(2)})`);
}

analyzeCSV().catch(console.error);
