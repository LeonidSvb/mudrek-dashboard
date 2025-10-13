require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '').slice(-10);
}

async function getProblemDealsWithLinks() {
  console.log('=== ПРИМЕРЫ DEALS С ПРОБЛЕМАМИ ===\n');

  // 1. Получить portal_id из HubSpot API
  console.log('1. Получаю portal_id из HubSpot...\n');

  const accountResponse = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  let portalId = 'UNKNOWN';
  if (accountResponse.ok) {
    const accountData = await accountResponse.json();
    portalId = accountData.portalId;
    console.log(`✓ Portal ID: ${portalId}\n`);
  } else {
    console.log('⚠️ Не удалось получить portal_id, используем ID из URL\n');
  }

  // 2. Загрузить CSV
  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  // 3. Получить все deals из DB
  const { data: allDBDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, amount, dealstage, raw_json');

  // 4. Создать индекс по phone
  const dbByPhone = {};
  allDBDeals.forEach(d => {
    const phone = d.raw_json?.properties?.phone_number;
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        dbByPhone[normalized] = d;
      }
    }
  });

  // 5. Найти примеры с разными типами проблем
  const examples = {
    wrongAmount: [],
    wrongAmountStopped: [],
    wrongAmountPaused: []
  };

  csvRecords.forEach(csvDeal => {
    const phone = normalizePhone(csvDeal.phone);
    if (!phone) return;

    const dbDeal = dbByPhone[phone];
    if (!dbDeal) return;

    const props = dbDeal.raw_json?.properties || {};
    const dbAmount = parseFloat(props.amount) || 0;
    const dealWholeAmount = parseFloat(props.deal_whole_amount) || 0;
    const installments = parseFloat(props.installments) || 0;
    const csvStatus = (csvDeal.Status || '').toLowerCase().trim();

    // Проблема: amount ≠ deal_whole_amount
    if (Math.abs(dbAmount - dealWholeAmount) > 10) {
      const example = {
        hubspot_id: dbDeal.hubspot_id,
        dealname: dbDeal.dealname,
        phone: phone,
        csvStatus: csvStatus,
        currentAmount: dbAmount,
        correctAmount: dealWholeAmount,
        installments: installments,
        csvDealAmount: parseFloat(csvDeal['deal amount']?.replace(/[^0-9.]/g, '')) || 0,
        csvPayment: parseFloat(csvDeal.payment?.replace(/[^0-9.]/g, '')) || 0,
        csvInstallments: parseFloat(csvDeal.installments?.replace(/[^0-9.]/g, '')) || 0
      };

      if (csvStatus === 'finished' && examples.wrongAmount.length < 3) {
        examples.wrongAmount.push(example);
      } else if (csvStatus === 'stopped' && examples.wrongAmountStopped.length < 3) {
        examples.wrongAmountStopped.push(example);
      } else if (csvStatus === 'paused' && examples.wrongAmountPaused.length < 3) {
        examples.wrongAmountPaused.push(example);
      }
    }
  });

  // 6. Вывести примеры
  console.log('=== FINISHED DEALS (заплатили полностью, но сумма неправильная) ===\n');

  examples.wrongAmount.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.dealname}`);
    console.log(`   HubSpot Link: https://app.hubspot.com/contacts/${portalId}/deal/${ex.hubspot_id}`);
    console.log('');
    console.log('   ❌ ТЕКУЩЕЕ СОСТОЯНИЕ (НЕПРАВИЛЬНО):');
    console.log(`      amount: $${ex.currentAmount}`);
    console.log(`      installments: ${ex.installments}`);
    console.log(`      payment_status: (пусто)`);
    console.log('');
    console.log('   ✅ ЧТО НУЖНО (ПРАВИЛЬНО):');
    console.log(`      amount: $${ex.correctAmount} (из deal_whole_amount)`);
    console.log(`      installments: ${ex.installments} (без изменений)`);
    console.log(`      payment_status: "finished"`);
    console.log('');
    console.log('   📊 АНАЛИЗ:');
    console.log(`      CSV deal amount: $${ex.csvDealAmount}`);
    console.log(`      CSV payment: $${ex.csvPayment} × ${ex.csvInstallments}`);
    console.log(`      Расчет: ${ex.csvPayment} × ${ex.csvInstallments} = $${ex.csvPayment * ex.csvInstallments}`);
    console.log(`      Текущий DB amount = payment_size (${ex.currentAmount})`);
    console.log(`      Правильный amount = deal_whole_amount (${ex.correctAmount})`);
    console.log('');
    console.log('   🔧 ЧТО МЫ ОБНОВИМ:');
    console.log(`      1. amount: ${ex.currentAmount} → ${ex.correctAmount}`);
    console.log(`      2. payment_status: (пусто) → "finished"`);
    console.log('');
    console.log('─────────────────────────────────────────────────────\n');
  });

  console.log('=== STOPPED DEALS (перестали платить, сумма неправильная) ===\n');

  examples.wrongAmountStopped.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.dealname}`);
    console.log(`   HubSpot Link: https://app.hubspot.com/contacts/${portalId}/deal/${ex.hubspot_id}`);
    console.log('');
    console.log('   ❌ ТЕКУЩЕЕ СОСТОЯНИЕ:');
    console.log(`      amount: $${ex.currentAmount}`);
    console.log(`      dealstage: closedwon (НЕПРАВИЛЬНО - они stopped!)`);
    console.log(`      payment_status: (пусто)`);
    console.log('');
    console.log('   ✅ ЧТО НУЖНО:');
    console.log(`      amount: $${ex.correctAmount}`);
    console.log(`      dealstage: closedwon (оставим как есть)`);
    console.log(`      payment_status: "stopped" (показывает реальный статус)`);
    console.log('');
    console.log('   🔧 ЧТО МЫ ОБНОВИМ:');
    console.log(`      1. amount: ${ex.currentAmount} → ${ex.correctAmount}`);
    console.log(`      2. payment_status: (пусто) → "stopped"`);
    console.log('');
    console.log('─────────────────────────────────────────────────────\n');
  });

  console.log('=== PAUSED DEALS (приостановили платежи, сумма неправильная) ===\n');

  examples.wrongAmountPaused.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.dealname}`);
    console.log(`   HubSpot Link: https://app.hubspot.com/contacts/${portalId}/deal/${ex.hubspot_id}`);
    console.log('');
    console.log('   ❌ ТЕКУЩЕЕ СОСТОЯНИЕ:');
    console.log(`      amount: $${ex.currentAmount}`);
    console.log(`      payment_status: (пусто)`);
    console.log('');
    console.log('   ✅ ЧТО НУЖНО:');
    console.log(`      amount: $${ex.correctAmount}`);
    console.log(`      payment_status: "paused"`);
    console.log('');
    console.log('   🔧 ЧТО МЫ ОБНОВИМ:');
    console.log(`      1. amount: ${ex.currentAmount} → ${ex.correctAmount}`);
    console.log(`      2. payment_status: (пусто) → "paused"`);
    console.log('');
    console.log('─────────────────────────────────────────────────────\n');
  });

  // 7. Резюме
  console.log('\n\n=== РЕЗЮМЕ ===\n');
  console.log('🔹 ИСПОЛЬЗУЕМ СУЩЕСТВУЮЩИЕ ПОЛЯ (НЕ СОЗДАЕМ НОВЫЕ!):');
  console.log('   1. amount - ОБНОВИМ значение');
  console.log('   2. payment_status - ЗАПОЛНИМ (сейчас пусто)');
  console.log('   3. deal_whole_amount - ЧИТАЕМ (источник правильной суммы)');
  console.log('   4. installments - НЕ ТРОГАЕМ (уже правильно)');
  console.log('');
  console.log('🔹 НЕ СОЗДАЕМ НОВЫЕ ПОЛЯ!');
  console.log('   Все поля уже существуют в HubSpot.');
  console.log('');
  console.log('🔹 ЧТО ОБНОВЛЯЕМ:');
  console.log('   - amount field → правильная сумма из deal_whole_amount');
  console.log('   - payment_status → finished/stopped/paused из CSV');
  console.log('');
  console.log('🔹 ЧТО НЕ ТРОГАЕМ:');
  console.log('   - dealstage (остается closedwon)');
  console.log('   - installments (уже правильно)');
  console.log('   - hubspot_owner_id (пока не трогаем)');
  console.log('   - все остальные поля');
  console.log('');
  console.log('🔹 PORTAL ID для ссылок:');
  console.log(`   ${portalId}`);
  console.log('');
  console.log('🔹 ВСЕГО DEALS С ПРОБЛЕМАМИ:');
  console.log(`   Finished (wrong amount): ${examples.wrongAmount.length} примеров`);
  console.log(`   Stopped (wrong amount): ${examples.wrongAmountStopped.length} примеров`);
  console.log(`   Paused (wrong amount): ${examples.wrongAmountPaused.length} примеров`);
}

getProblemDealsWithLinks().catch(console.error);
