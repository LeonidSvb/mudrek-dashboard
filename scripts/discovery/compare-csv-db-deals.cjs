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

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, '').slice(-10);
}

async function compareCSVvsDeal() {
  console.log('=== СРАВНЕНИЕ КОНКРЕТНЫХ DEALS: CSV vs DATABASE ===\n');

  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  // Взять примеры: finished, stopped, paused
  const examples = {
    finished: records.filter(r => r.Status === 'finished').slice(0, 10),
    stopped: records.filter(r => r.Status === 'stopped').slice(0, 5),
    paused: records.filter(r => r.Status === 'paused').slice(0, 5)
  };

  console.log('Проверяю 20 deals из CSV...\n');

  for (const [status, deals] of Object.entries(examples)) {
    console.log(`\n=== STATUS: ${status.toUpperCase()} ===\n`);

    for (const csvDeal of deals) {
      const phone = normalizePhone(csvDeal.phone);
      if (!phone) continue;

      // Найти в DB по телефону
      const { data: dbDeals } = await supabase
        .from('hubspot_deals_raw')
        .select('dealname, amount, dealstage, closedate, phone')
        .ilike('phone', `%${phone}%`)
        .limit(1);

      if (dbDeals && dbDeals.length > 0) {
        const dbDeal = dbDeals[0];
        const csvDealAmount = parseAmount(csvDeal['deal amount']);
        const csvPayment = parseAmount(csvDeal.payment);
        const csvInstallments = parseAmount(csvDeal.installments);
        const dbAmount = parseFloat(dbDeal.amount) || 0;

        console.log(`${csvDeal.fname} ${csvDeal.lname} (${phone}):`);
        console.log(`  CSV Status: ${csvDeal.Status}`);
        console.log(`  CSV deal amount: $${csvDealAmount.toLocaleString()}`);
        console.log(`  CSV payment: $${csvPayment} × ${csvInstallments} installments`);
        console.log(`  DB dealstage: ${dbDeal.dealstage}`);
        console.log(`  DB amount: $${dbAmount.toLocaleString()}`);

        // Анализ
        if (Math.abs(dbAmount - csvDealAmount) < 10) {
          console.log(`  ✓ DB amount = CSV deal amount (договорная сумма)`);
        } else if (Math.abs(dbAmount - csvPayment) < 10) {
          console.log(`  ⚠️ DB amount = CSV payment (размер ОДНОГО платежа!)`);
        } else if (dbAmount < csvDealAmount * 0.5) {
          console.log(`  ⚠️ DB amount = ${(dbAmount/csvDealAmount*100).toFixed(0)}% от договора (частичная оплата?)`);
        } else {
          console.log(`  ❓ DB amount не совпадает с CSV`);
        }

        console.log('');
      }
    }
  }

  // Итоговая статистика
  console.log('\n=== СТАТИСТИКА СРАВНЕНИЯ ===\n');

  // Найти все deals в DB которые есть в CSV
  let matchedDeals = 0;
  let totalDBAmount = 0;
  let totalCSVDealAmount = 0;
  let dbAmountMatchesPayment = 0;
  let dbAmountMatchesDealAmount = 0;

  for (const csvDeal of records.slice(0, 100)) { // проверим 100 для статистики
    const phone = normalizePhone(csvDeal.phone);
    if (!phone) continue;

    const { data: dbDeals } = await supabase
      .from('hubspot_deals_raw')
      .select('amount')
      .ilike('phone', `%${phone}%`)
      .limit(1);

    if (dbDeals && dbDeals.length > 0) {
      matchedDeals++;
      const dbAmount = parseFloat(dbDeals[0].amount) || 0;
      const csvDealAmount = parseAmount(csvDeal['deal amount']);
      const csvPayment = parseAmount(csvDeal.payment);

      totalDBAmount += dbAmount;
      totalCSVDealAmount += csvDealAmount;

      if (Math.abs(dbAmount - csvPayment) < 10) {
        dbAmountMatchesPayment++;
      }
      if (Math.abs(dbAmount - csvDealAmount) < 10) {
        dbAmountMatchesDealAmount++;
      }
    }
  }

  console.log(`Проверено deals: ${matchedDeals}`);
  console.log(`DB amount = CSV payment: ${dbAmountMatchesPayment} (${(dbAmountMatchesPayment/matchedDeals*100).toFixed(0)}%)`);
  console.log(`DB amount = CSV deal amount: ${dbAmountMatchesDealAmount} (${(dbAmountMatchesDealAmount/matchedDeals*100).toFixed(0)}%)`);
  console.log('');
  console.log(`Сумма DB amount: $${totalDBAmount.toLocaleString()}`);
  console.log(`Сумма CSV deal amount: $${totalCSVDealAmount.toLocaleString()}`);
  console.log(`Средний DB amount: $${(totalDBAmount/matchedDeals).toFixed(2)}`);
  console.log(`Средний CSV deal amount: $${(totalCSVDealAmount/matchedDeals).toFixed(2)}`);
}

compareCSVvsDeal().catch(console.error);
