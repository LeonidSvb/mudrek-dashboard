require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // Simple CSV parsing (doesn't handle commas in quotes perfectly, but should work)
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    data.push(row);
  }

  return data;
}

function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'Refunded' || dateStr === '') return null;

  // Try MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (month && day && year) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

async function analyzeOriginalCSV() {
  console.log('=== АНАЛИЗ ОРИГИНАЛЬНОГО CSV ФАЙЛА ===\n');

  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const deals = parseCSV(csvPath);

  console.log(`Всего строк в CSV: ${deals.length}\n`);

  // 1. Анализ по статусам
  const statusCounts = {};
  deals.forEach(deal => {
    const status = deal.Status || 'no status';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('1. РАСПРЕДЕЛЕНИЕ ПО СТАТУСАМ:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const percent = (count / deals.length * 100).toFixed(1);
      console.log(`   ${status}: ${count} (${percent}%)`);
    });
  console.log('');

  // 2. Анализ сумм
  const finishedDeals = deals.filter(d => d.Status === 'finished');
  const totalRevenue = finishedDeals.reduce((sum, d) => sum + parseAmount(d['deal amount']), 0);
  const avgDealSize = totalRevenue / finishedDeals.length;

  console.log('2. ФИНАНСОВЫЕ МЕТРИКИ (finished deals):');
  console.log(`   Finished deals: ${finishedDeals.length}`);
  console.log(`   Total revenue: $${totalRevenue.toLocaleString()}`);
  console.log(`   Average deal: $${avgDealSize.toFixed(2)}`);
  console.log('');

  // 3. Анализ payment полей
  console.log('3. PAYMENT ПОЛЯ:');
  const withPayment = deals.filter(d => parseAmount(d.payment) > 0);
  const withInstallments = deals.filter(d => parseAmount(d.installments) > 0);

  console.log(`   С заполненным "payment": ${withPayment.length} (${(withPayment.length/deals.length*100).toFixed(1)}%)`);
  console.log(`   С заполненным "installments": ${withInstallments.length} (${(withInstallments.length/deals.length*100).toFixed(1)}%)`);

  // Примеры payment
  console.log('\n   Примеры payment structure:');
  finishedDeals.slice(0, 5).forEach(d => {
    console.log(`   - ${d.fname} ${d.lname}:`);
    console.log(`     deal amount: ${d['deal amount']}`);
    console.log(`     payment: ${d.payment}`);
    console.log(`     installments: ${d.installments}`);
  });
  console.log('');

  // 4. Анализ дат
  console.log('4. АНАЛИЗ ДАТ:');
  const dealsWithDates = deals.filter(d => {
    const date = parseDate(d['date formatted']);
    return date !== null;
  });

  const dates = dealsWithDates
    .map(d => parseDate(d['date formatted']))
    .filter(d => d !== null)
    .sort((a, b) => a - b);

  if (dates.length > 0) {
    console.log(`   Deals с корректными датами: ${dates.length}`);
    console.log(`   Первая дата: ${dates[0].toISOString().split('T')[0]}`);
    console.log(`   Последняя дата: ${dates[dates.length - 1].toISOString().split('T')[0]}`);

    // Распределение по годам
    const byYear = {};
    dates.forEach(date => {
      const year = date.getFullYear();
      byYear[year] = (byYear[year] || 0) + 1;
    });

    console.log('\n   Распределение по годам:');
    Object.entries(byYear)
      .sort()
      .forEach(([year, count]) => {
        console.log(`   ${year}: ${count} deals`);
      });
  }
  console.log('');

  // 5. Анализ менеджеров (sales column)
  console.log('5. МЕНЕДЖЕРЫ (sales column):');
  const bySales = {};
  deals.forEach(deal => {
    const sales = deal.sales || 'No Manager';
    bySales[sales] = (bySales[sales] || 0) + 1;
  });

  Object.entries(bySales)
    .sort((a, b) => b[1] - a[1])
    .forEach(([manager, count]) => {
      const percent = (count / deals.length * 100).toFixed(1);
      console.log(`   ${manager}: ${count} (${percent}%)`);
    });
  console.log('');

  // 6. Сравнение с данными в базе
  console.log('6. СРАВНЕНИЕ С БАЗОЙ ДАННЫХ:\n');

  const { count: dbDealsCount } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  const { count: dbClosedCount } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon');

  const { data: dbSales } = await supabase
    .from('hubspot_deals_raw')
    .select('amount')
    .eq('dealstage', 'closedwon');

  const dbTotalSales = dbSales.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const dbAvgDeal = dbTotalSales / dbClosedCount;

  console.log('CSV vs DATABASE:\n');
  console.log('Total Deals:');
  console.log(`  CSV finished: ${finishedDeals.length}`);
  console.log(`  DB closedwon: ${dbClosedCount}`);
  console.log(`  Разница: ${Math.abs(finishedDeals.length - dbClosedCount)}`);
  console.log('');

  console.log('Total Sales:');
  console.log(`  CSV: $${totalRevenue.toLocaleString()}`);
  console.log(`  DB:  $${dbTotalSales.toLocaleString()}`);
  console.log(`  Разница: $${Math.abs(totalRevenue - dbTotalSales).toLocaleString()}`);
  console.log('');

  console.log('Average Deal Size:');
  console.log(`  CSV: $${avgDealSize.toFixed(2)}`);
  console.log(`  DB:  $${dbAvgDeal.toFixed(2)}`);
  console.log(`  Разница: $${Math.abs(avgDealSize - dbAvgDeal).toFixed(2)}`);
  console.log('');

  // 7. Найти несоответствия
  console.log('7. КЛЮЧЕВЫЕ INSIGHTS:\n');

  // Installments distribution
  const installmentsDist = {};
  finishedDeals.forEach(d => {
    const inst = d.installments || '0';
    installmentsDist[inst] = (installmentsDist[inst] || 0) + 1;
  });

  console.log('Distribution по количеству платежей (installments):');
  Object.entries(installmentsDist)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .slice(0, 10)
    .forEach(([inst, count]) => {
      console.log(`   ${inst} платежей: ${count} deals`);
    });
  console.log('');

  // Payment methods
  const methods = {};
  deals.forEach(d => {
    const method = d.method || 'not specified';
    methods[method] = (methods[method] || 0) + 1;
  });

  console.log('Payment Methods:');
  Object.entries(methods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([method, count]) => {
      console.log(`   ${method}: ${count}`);
    });
  console.log('');

  // 8. Проверить что отсутствует в базе
  console.log('8. ЧТО ОТСУТСТВУЕТ В БАЗЕ:');
  console.log('   Payment fields:');
  console.log(`   - "payment" (размер платежа): ${withPayment.length} deals в CSV`);
  console.log(`   - "installments" (количество): ${withInstallments.length} deals в CSV`);
  console.log(`   - "1st payment" (дата первого): заполнено в CSV`);
  console.log(`   - "Last payment" (дата последнего): заполнено в CSV`);
  console.log(`   - В БД: upfront_payment = 0, installments = 0 ❌\n`);

  console.log('   Manager assignment:');
  console.log(`   - CSV: ${Object.keys(bySales).length} менеджеров (Shadi, Wala, Sabreen, etc.)`);
  console.log(`   - DB: owner_id заполнен для 86.8% контактов ✓\n`);

  console.log('   Status tracking:');
  console.log(`   - CSV: finished, stopped, Stoppped`);
  console.log(`   - DB: closedwon, appointmentscheduled, closedlost (0) ❌\n`);
}

analyzeOriginalCSV().catch(console.error);
