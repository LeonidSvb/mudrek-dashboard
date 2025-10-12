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

async function analyzeActualPayments() {
  console.log('=== АНАЛИЗ РЕАЛЬНЫХ ПЛАТЕЖЕЙ (upfront cash collected) ===\n');

  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  console.log(`Total deals в CSV: ${records.length}\n`);

  // 1. Анализ по статусам
  const byStatus = {
    finished: [],
    paused: [],
    stopped: [],
    pending: [],
    other: []
  };

  records.forEach(r => {
    const status = (r.Status || '').toLowerCase().trim();
    if (status === 'finished') byStatus.finished.push(r);
    else if (status === 'paused') byStatus.paused.push(r);
    else if (status === 'stopped' || status === 'stoppped') byStatus.stopped.push(r);
    else if (status === 'pending') byStatus.pending.push(r);
    else byStatus.other.push(r);
  });

  console.log('1. СТАТУСЫ И ИХ ЗНАЧЕНИЕ:\n');
  console.log(`finished: ${byStatus.finished.length} deals - ЗАПЛАТИЛИ ПОЛНОСТЬЮ`);
  console.log(`paused: ${byStatus.paused.length} deals - ПРИОСТАНОВИЛИ платежи`);
  console.log(`stopped: ${byStatus.stopped.length} deals - ПЕРЕСТАЛИ платить`);
  console.log(`pending: ${byStatus.pending.length} deals - В ОЖИДАНИИ`);
  console.log(`no status/other: ${byStatus.other.length} deals - НЕИЗВЕСТНО\n`);

  // 2. Договорная сумма vs реально собранное
  const finishedRevenue = byStatus.finished.reduce((sum, r) => sum + parseAmount(r['deal amount']), 0);
  const finishedAvg = finishedRevenue / byStatus.finished.length;

  console.log('2. FINISHED DEALS (заплатили полностью):\n');
  console.log(`   Количество: ${byStatus.finished.length}`);
  console.log(`   Договорная сумма: $${finishedRevenue.toLocaleString()}`);
  console.log(`   Средний чек: $${finishedAvg.toFixed(2)}\n`);

  // 3. Проверить колонку "Latest paid"
  console.log('3. КОЛОНКА "Latest paid" (сколько реально заплатили):\n');

  let examplesWithLatestPaid = records
    .filter(r => r['Latest paid'] && r['Latest paid'].trim())
    .slice(0, 10);

  console.log('Примеры deals с "Latest paid":');
  examplesWithLatestPaid.forEach(r => {
    console.log(`   ${r.fname} ${r.lname}:`);
    console.log(`     deal amount: ${r['deal amount']}`);
    console.log(`     payment: ${r.payment}`);
    console.log(`     installments: ${r.installments}`);
    console.log(`     Status: ${r.Status}`);
    console.log(`     Latest paid: ${r['Latest paid']}`);
    console.log('');
  });

  // 4. Попытка извлечь реальные суммы из "Latest paid"
  console.log('4. ПАРСИНГ РЕАЛЬНЫХ ПЛАТЕЖЕЙ ИЗ "Latest paid":\n');

  let totalActualPayments = 0;
  let countWithActualPayments = 0;

  records.forEach(r => {
    const latestPaid = r['Latest paid'] || '';
    // Ищем числа в формате "360 on 10/10/2025" или "540 on 02/07/2025"
    const match = latestPaid.match(/(\d+(?:\.\d+)?)\s+on/i);
    if (match) {
      const amount = parseFloat(match[1]);
      totalActualPayments += amount;
      countWithActualPayments++;
    }
  });

  console.log(`Deals с записями о платежах: ${countWithActualPayments}`);
  console.log(`Сумма последних платежей: $${totalActualPayments.toLocaleString()}`);
  console.log('(Это только ПОСЛЕДНИЙ платеж, не все!)\n');

  // 5. Вычислить сколько ДОЛЖНЫ были собрать vs сколько СОБРАЛИ
  console.log('5. РАСЧЕТ UPFRONT CASH COLLECTED:\n');

  // Для finished = заплатили ВСЁ
  const finishedCash = byStatus.finished.reduce((sum, r) =>
    sum + parseAmount(r['deal amount']), 0
  );

  // Для paused/stopped - нужно узнать сколько платежей сделали
  console.log('ЛОГИКА:');
  console.log('  finished status → заплатили 100% (full deal amount)');
  console.log('  paused status → заплатили частично (нужно считать из Latest paid)');
  console.log('  stopped status → заплатили частично (нужно считать из Latest paid)\n');

  // 6. Сравнение с DB
  const { data: dbAmounts } = await supabase
    .from('hubspot_deals_raw')
    .select('amount, dealstage')
    .eq('dealstage', 'closedwon');

  const dbTotalAmount = dbAmounts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  console.log('6. СРАВНЕНИЕ:\n');
  console.log('CSV finished (заплатили полностью):');
  console.log(`  Deals: ${byStatus.finished.length}`);
  console.log(`  Revenue: $${finishedRevenue.toLocaleString()}\n`);

  console.log('DATABASE closedwon:');
  console.log(`  Deals: ${dbAmounts.length}`);
  console.log(`  Amount: $${dbTotalAmount.toLocaleString()}\n`);

  console.log('ГИПОТЕЗА:');
  console.log(`  DB amount ($${dbTotalAmount.toLocaleString()}) = РЕАЛЬНО собранные деньги`);
  console.log(`  CSV finished ($${finishedRevenue.toLocaleString()}) = договорная сумма finished deals`);
  console.log(`  Разница: $${(finishedRevenue - dbTotalAmount).toLocaleString()}`);
  console.log('');

  // 7. Проверить notes/комментарии
  console.log('7. АНАЛИЗ NOTES (сколько платежей сделано):\n');

  const examplesWithPaymentInfo = records
    .filter(r => {
      const notes = (r.notes || '').toLowerCase();
      return notes.includes('paid') || notes.includes('دفع') || notes.includes('payment');
    })
    .slice(0, 5);

  examplesWithPaymentInfo.forEach(r => {
    console.log(`   ${r.fname} ${r.lname}:`);
    console.log(`     Status: ${r.Status}`);
    console.log(`     deal amount: ${r['deal amount']}`);
    console.log(`     installments: ${r.installments}`);
    console.log(`     notes: ${r.notes}`);
    console.log('');
  });

  // 8. ИТОГОВАЯ СТАТИСТИКА
  console.log('=== ВЫВОДЫ ===\n');
  console.log(`✓ Total deals в CSV: ${records.length}`);
  console.log(`✓ Finished (заплатили полностью): ${byStatus.finished.length} ($${finishedRevenue.toLocaleString()})`);
  console.log(`✓ Paused (приостановили): ${byStatus.paused.length}`);
  console.log(`✓ Stopped (перестали платить): ${byStatus.stopped.length}`);
  console.log('');
  console.log(`❌ В DB: ${dbAmounts.length} closedwon, $${dbTotalAmount.toLocaleString()}`);
  console.log('');
  console.log('ПРОБЛЕМА:');
  console.log('  1. DB closedwon = 1143, но в CSV finished = 710');
  console.log('  2. DB показывает все deals как closedwon, даже если stopped/paused');
  console.log('  3. DB amount возможно = реально собранные деньги?');
  console.log('  4. Нужно проверить откуда 433 лишних closedwon в DB');
}

analyzeActualPayments().catch(console.error);
