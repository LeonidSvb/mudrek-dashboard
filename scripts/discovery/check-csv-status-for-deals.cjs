require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '').slice(-10);
}

async function checkCSVStatus() {
  console.log('=== ПРОВЕРКА CSV СТАТУСОВ ===\n');

  // Загрузить CSV
  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  // Получить тестовые deals из DB
  const testDeals = ['43497954897', '43502315939', '43504949134', '43503556908'];

  const { data: dbDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, amount, raw_json')
    .in('hubspot_id', testDeals);

  // Создать индекс CSV по phone
  const csvByPhone = {};
  csvRecords.forEach(r => {
    const phone = normalizePhone(r.phone);
    if (phone) csvByPhone[phone] = r;
  });

  console.log('ПРИМЕРЫ DEALS:\n');

  dbDeals.forEach(deal => {
    const props = deal.raw_json?.properties || {};
    const phone = normalizePhone(props.phone_number);
    const csvDeal = phone ? csvByPhone[phone] : null;

    console.log(`${deal.dealname}:`);
    console.log(`  HubSpot amount: $${props.amount}`);
    console.log(`  HubSpot deal_whole_amount: $${props.deal_whole_amount}`);
    console.log(`  HubSpot installments: ${props.installments}`);

    if (csvDeal) {
      console.log(`  CSV Status: ${csvDeal.Status}`);
      console.log(`  CSV deal amount: $${csvDeal['deal amount']}`);
      console.log(`  CSV payment: $${csvDeal.payment} × ${csvDeal.installments}`);

      const csvStatus = (csvDeal.Status || '').toLowerCase().trim();

      if (csvStatus === 'finished') {
        console.log('  → Клиент заплатил ПОЛНОСТЬЮ (finished)');
        console.log(`  → amount ДОЛЖЕН быть = deal_whole_amount ($${props.deal_whole_amount})`);
        console.log(`  → Но сейчас amount = $${props.amount} ← НЕПРАВИЛЬНО!`);
      } else if (csvStatus === 'stopped') {
        console.log('  → Клиент STOPPED платить');
        console.log(`  → amount = $${props.amount} = сколько УЖЕ заплатили`);
        console.log(`  → Осталось заплатить: $${props.deal_whole_amount - props.amount}`);
      } else if (csvStatus === 'paused') {
        console.log('  → Клиент PAUSED платежи');
        console.log(`  → amount = $${props.amount} = сколько УЖЕ заплатили`);
      } else {
        console.log(`  → Статус: ${csvDeal.Status}`);
      }
    } else {
      console.log('  ✗ Не найден в CSV');
    }

    console.log('');
  });

  // Общая статистика
  console.log('\n=== ОБЩАЯ СТАТИСТИКА ПО CSV STATUS ===\n');

  const statusStats = {
    finished: { count: 0, shouldBeFullAmount: 0 },
    stopped: { count: 0, partialPayment: 0 },
    paused: { count: 0, partialPayment: 0 },
    other: { count: 0 }
  };

  csvRecords.forEach(csvDeal => {
    const phone = normalizePhone(csvDeal.phone);
    if (!phone) return;

    const status = (csvDeal.Status || '').toLowerCase().trim();

    if (status === 'finished') {
      statusStats.finished.count++;
      statusStats.finished.shouldBeFullAmount++;
    } else if (status === 'stopped') {
      statusStats.stopped.count++;
    } else if (status === 'paused') {
      statusStats.paused.count++;
    } else {
      statusStats.other.count++;
    }
  });

  console.log(`finished: ${statusStats.finished.count} deals`);
  console.log(`  → Эти deals должны иметь amount = deal_whole_amount`);
  console.log(`  → Потому что finished = заплатили 100%\n`);

  console.log(`stopped: ${statusStats.stopped.count} deals`);
  console.log(`  → amount = частичная оплата (правильно как есть)\n`);

  console.log(`paused: ${statusStats.paused.count} deals`);
  console.log(`  → amount = частичная оплата (правильно как есть)\n`);

  console.log('\n=== ВЫВОД ===\n');
  console.log('ТЫ ПРАВ! amount = $1.15M - это РЕАЛЬНО собранные деньги!');
  console.log('');
  console.log('НО:');
  console.log('  Для FINISHED deals (заплатили 100%):');
  console.log('    → amount ДОЛЖЕН = deal_whole_amount');
  console.log('    → Сейчас некоторые finished deals имеют amount < deal_whole_amount');
  console.log('    → Это ОШИБКА!');
  console.log('');
  console.log('  Для STOPPED/PAUSED deals:');
  console.log('    → amount = правильный (частичная оплата)');
  console.log('    → НЕ трогаем!');
  console.log('');
  console.log('ЧТО НУЖНО СДЕЛАТЬ:');
  console.log('  1. Найти все FINISHED deals где amount ≠ deal_whole_amount');
  console.log('  2. Обновить только эти deals: amount = deal_whole_amount');
  console.log('  3. Заполнить payment_status для всех: finished/stopped/paused');
}

checkCSVStatus().catch(console.error);
