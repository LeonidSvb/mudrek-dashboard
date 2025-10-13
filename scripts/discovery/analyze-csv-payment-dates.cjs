const fs = require('fs');
const { parse } = require('csv-parse/sync');

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'Refunded') return null;

  // Формат: DD/MM/YYYY или MM/DD/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  // date formatted = MM/DD/YYYY (03/20/2023)
  const month = parseInt(parts[0]);
  const day = parseInt(parts[1]);
  const year = parseInt(parts[2]);

  if (!month || !day || !year) return null;

  return new Date(year, month - 1, day);
}

function parsePaymentDate(dateStr) {
  if (!dateStr) return null;

  // Формат: D/M/YYYY (20/3/2023) or DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);

  if (!day || !month || !year) return null;

  return new Date(year, month - 1, day);
}

async function analyzePaymentDates() {
  console.log('=== АНАЛИЗ PAYMENT DATES В CSV ===\n');

  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  // Статистика по Last payment
  let hasLastPayment = 0;
  let lastPaymentDates = [];

  records.forEach(row => {
    if (row['Last payment']) {
      hasLastPayment++;
      const date = parsePaymentDate(row['Last payment']);
      if (date) lastPaymentDates.push(date);
    }
  });

  console.log('Last payment field:');
  console.log(`  Заполнено: ${hasLastPayment}/${records.length}`);

  if (lastPaymentDates.length > 0) {
    lastPaymentDates.sort((a, b) => a - b);
    const min = lastPaymentDates[0];
    const max = lastPaymentDates[lastPaymentDates.length - 1];

    console.log(`  MIN date: ${min.toLocaleDateString('en-US')}`);
    console.log(`  MAX date: ${max.toLocaleDateString('en-US')}`);
    console.log(`  Распределение по годам:`);

    // По годам
    const byYear = {};
    lastPaymentDates.forEach(d => {
      const year = d.getFullYear();
      byYear[year] = (byYear[year] || 0) + 1;
    });

    Object.entries(byYear).sort().forEach(([year, count]) => {
      console.log(`    ${year}: ${count} deals`);
    });
  }

  // Статистика по date formatted
  console.log('\ndate formatted field:');
  let dateFormattedDates = [];

  records.forEach(row => {
    if (row['date formatted'] && row['date formatted'] !== 'Refunded') {
      const date = parseDate(row['date formatted']);
      if (date) dateFormattedDates.push(date);
    }
  });

  if (dateFormattedDates.length > 0) {
    dateFormattedDates.sort((a, b) => a - b);
    const min = dateFormattedDates[0];
    const max = dateFormattedDates[dateFormattedDates.length - 1];

    console.log(`  MIN date: ${min.toLocaleDateString('en-US')}`);
    console.log(`  MAX date: ${max.toLocaleDateString('en-US')}`);
  }

  // Примеры finished deals
  console.log('\n=== ПРИМЕРЫ FINISHED DEALS ===\n');

  const finishedExamples = records
    .filter(r => r.Status?.toLowerCase().trim() === 'finished')
    .slice(0, 5);

  finishedExamples.forEach((row, i) => {
    console.log(`${i + 1}. ${row.fname} ${row.lname}:`);
    console.log(`   date formatted: ${row['date formatted']} (дата создания)`);
    console.log(`   1st payment: ${row['1st payment']} (первый платеж)`);
    console.log(`   Last payment: ${row['Last payment']} (последний платеж ← closedate!)`);
    console.log(`   Status: ${row.Status}`);
    console.log('');
  });

  // Примеры stopped deals
  console.log('=== ПРИМЕРЫ STOPPED DEALS ===\n');

  const stoppedExamples = records
    .filter(r => r.Status?.toLowerCase().trim() === 'stopped')
    .slice(0, 3);

  stoppedExamples.forEach((row, i) => {
    console.log(`${i + 1}. ${row.fname} ${row.lname}:`);
    console.log(`   date formatted: ${row['date formatted']}`);
    console.log(`   1st payment: ${row['1st payment']}`);
    console.log(`   Last payment: ${row['Last payment']} (когда остановился)`);
    console.log(`   Latest paid: ${row['Latest paid']}`);
    console.log(`   Status: ${row.Status}`);
    console.log('');
  });

  console.log('\n=== РЕКОМЕНДАЦИЯ ===\n');
  console.log('ДЛЯ ОБНОВЛЕНИЯ CLOSEDATE В HUBSPOT:');
  console.log('  1. finished deals → closedate = Last payment');
  console.log('  2. stopped deals → closedate = Last payment (когда остановился)');
  console.log('  3. paused deals → closedate = Last payment (последний платеж)');
  console.log('  4. no status / pending → closedate = date formatted (дата создания)');
  console.log('');
  console.log('После обновления closedate:');
  console.log('  - Фильтры по датам заработают');
  console.log('  - Dashboard покажет правильные метрики');
  console.log('  - Timeline charts заработают');
}

analyzePaymentDates().catch(console.error);
