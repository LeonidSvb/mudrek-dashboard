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

async function compareByPhone() {
  console.log('=== СРАВНЕНИЕ CSV vs DB ПО ТЕЛЕФОНУ ===\n');

  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true, relax_column_count: true });

  // Получить ВСЕ deals из DB один раз
  console.log('Загружаю все deals из DB...');
  const { data: allDBDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('dealname, amount, dealstage, raw_json');

  console.log(`✓ Загружено ${allDBDeals.length} deals из DB\n`);

  // Нормализация телефона
  function normalizePhone(phone) {
    if (!phone) return null;
    // Убрать всё кроме цифр
    const digits = phone.replace(/\D/g, '');
    // Взять последние 10 цифр (без кода страны)
    return digits.slice(-10);
  }

  // Создать индекс по телефону
  const dbByPhone = {};
  allDBDeals.forEach(d => {
    const phone = d.raw_json?.properties?.phone_number || d.raw_json?.properties?.phone;
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        dbByPhone[normalized] = d;
      }
    }
  });

  console.log(`✓ Проиндексировано ${Object.keys(dbByPhone).length} deals с телефонами\n`);

  // Сравнить примеры
  const examples = {
    finished: records.filter(r => r.Status === 'finished').slice(0, 5),
    stopped: records.filter(r => r.Status === 'stopped').slice(0, 5),
    paused: records.filter(r => r.Status === 'paused').slice(0, 5)
  };

  for (const [status, deals] of Object.entries(examples)) {
    console.log(`=== STATUS: ${status.toUpperCase()} ===\n`);

    for (const csvDeal of deals) {
      const phone = normalizePhone(csvDeal.phone);
      if (!phone) continue;

      const dbDeal = dbByPhone[phone];
      if (dbDeal) {
        const csvDealAmount = parseAmount(csvDeal['deal amount']);
        const csvPayment = parseAmount(csvDeal.payment);
        const csvInstallments = parseAmount(csvDeal.installments);
        const dbAmount = parseFloat(dbDeal.amount) || 0;

        console.log(`${csvDeal.fname} ${csvDeal.lname} (${phone}):`);
        console.log(`  CSV: deal=$${csvDealAmount}, payment=$${csvPayment} × ${csvInstallments}, status=${csvDeal.Status}`);
        console.log(`  DB: amount=$${dbAmount}, stage=${dbDeal.dealstage}`);

        if (Math.abs(dbAmount - csvDealAmount) < 10) {
          console.log('  ✓ DB amount = договорная сумма');
        } else if (Math.abs(dbAmount - csvPayment) < 10) {
          console.log('  ⚠️ DB amount = размер ОДНОГО платежа');
        } else if (dbAmount < csvDealAmount) {
          const percent = (dbAmount/csvDealAmount*100).toFixed(0);
          const expectedPayments = Math.round(dbAmount / csvPayment);
          console.log(`  ❓ DB amount = ${percent}% от договора (≈${expectedPayments} платежей из ${csvInstallments})`);
        }
        console.log('');
      }
    }
  }

  // Статистика
  console.log('\n=== СТАТИСТИКА ===\n');

  let matched = 0;
  let amountMatchesDeal = 0;
  let amountMatchesPayment = 0;
  let amountPartial = 0;

  for (const csvDeal of records.slice(0, 200)) {
    const phone = normalizePhone(csvDeal.phone);
    if (!phone) continue;

    const dbDeal = dbByPhone[phone];
    if (dbDeal) {
      matched++;
      const csvDealAmount = parseAmount(csvDeal['deal amount']);
      const csvPayment = parseAmount(csvDeal.payment);
      const dbAmount = parseFloat(dbDeal.amount) || 0;

      if (Math.abs(dbAmount - csvDealAmount) < 10) {
        amountMatchesDeal++;
      } else if (Math.abs(dbAmount - csvPayment) < 10) {
        amountMatchesPayment++;
      } else if (dbAmount < csvDealAmount * 0.9) {
        amountPartial++;
      }
    }
  }

  console.log(`Проверено: ${matched} deals`);
  console.log(`DB amount = договор: ${amountMatchesDeal} (${(amountMatchesDeal/matched*100).toFixed(0)}%)`);
  console.log(`DB amount = payment: ${amountMatchesPayment} (${(amountMatchesPayment/matched*100).toFixed(0)}%)`);
  console.log(`DB amount = частичная оплата: ${amountPartial} (${(amountPartial/matched*100).toFixed(0)}%)`);
}

compareByPhone().catch(console.error);
