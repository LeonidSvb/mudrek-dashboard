const fs = require('fs');
const { parse } = require('csv-parse/sync');

async function checkCSVDates() {
  console.log('=== ПРОВЕРКА ДАТ В CSV ===\n');

  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  console.log(`Всего строк в CSV: ${records.length}\n`);

  // Показать все колонки
  console.log('=== КОЛОНКИ В CSV ===\n');
  const columns = Object.keys(records[0]);
  columns.forEach((col, i) => {
    console.log(`${i + 1}. ${col}`);
  });

  console.log('\n=== ПРИМЕРЫ С ДАТАМИ ===\n');

  // Показать 5 примеров
  records.slice(0, 5).forEach((row, i) => {
    console.log(`Пример ${i + 1}:`);
    columns.forEach(col => {
      const val = row[col];
      // Показываем только колонки с датами или важные поля
      if (col.toLowerCase().includes('date') ||
          col.toLowerCase().includes('תאריך') ||
          col === 'Status' ||
          col === 'deal amount' ||
          col === 'customer name' ||
          val?.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/)) {
        console.log(`  ${col}: ${val || '(пусто)'}`);
      }
    });
    console.log('');
  });

  // Найти уникальные даты
  console.log('\n=== АНАЛИЗ ДАТ ===\n');

  const dateColumns = columns.filter(col =>
    col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('תאריך')
  );

  console.log(`Колонки с датами: ${dateColumns.length}`);
  dateColumns.forEach(col => {
    const uniqueDates = new Set();
    records.forEach(row => {
      if (row[col]) uniqueDates.add(row[col]);
    });
    console.log(`\n${col}:`);
    console.log(`  Уникальных значений: ${uniqueDates.size}`);
    console.log(`  Заполнено: ${records.filter(r => r[col]).length}/${records.length}`);

    if (uniqueDates.size <= 10) {
      console.log('  Примеры:');
      Array.from(uniqueDates).slice(0, 10).forEach(d => {
        console.log(`    - ${d}`);
      });
    } else {
      console.log('  Первые 5 примеров:');
      Array.from(uniqueDates).slice(0, 5).forEach(d => {
        console.log(`    - ${d}`);
      });
    }
  });

  // Проверить Status field
  console.log('\n=== STATUS FIELD ===\n');
  const statuses = {};
  records.forEach(row => {
    const status = row.Status || 'No Status';
    statuses[status] = (statuses[status] || 0) + 1;
  });

  Object.entries(statuses).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

checkCSVDates().catch(console.error);
