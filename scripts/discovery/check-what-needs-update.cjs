require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWhatNeedsUpdate() {
  console.log('=== ЧТО РЕАЛЬНО НУЖНО ОБНОВЛЯТЬ? ===\n');

  // 1. Проверить несколько deals через API
  const testDeals = [
    '43497954897', // wael makhoul
    '43502315939', // هيلانه علي
    '43504949134', // Abdullah Al-Dulaimi
    '43503556908'  // Nasser Shehadeh (stopped)
  ];

  console.log('1. ПРОВЕРКА ЧЕРЕЗ HUBSPOT API:\n');

  for (const dealId of testDeals) {
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=amount,deal_whole_amount,installments,payment_status,dealname,dealstage`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const props = data.properties;

      console.log(`${props.dealname || dealId}:`);
      console.log(`  amount: ${props.amount}`);
      console.log(`  deal_whole_amount: ${props.deal_whole_amount}`);
      console.log(`  installments: ${props.installments}`);
      console.log(`  payment_status: ${props.payment_status || '(пусто)'}`);
      console.log(`  dealstage: ${props.dealstage}`);

      if (props.amount === props.deal_whole_amount) {
        console.log('  ✓ amount = deal_whole_amount (УЖЕ ПРАВИЛЬНО!)');
      } else {
        console.log(`  ✗ amount (${props.amount}) ≠ deal_whole_amount (${props.deal_whole_amount})`);
      }
      console.log('');
    }
  }

  // 2. Проверить что используется в Supabase для метрик
  console.log('\n2. ПРОВЕРКА SUPABASE (что используется для метрик):\n');

  const { data: dbDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, amount, raw_json')
    .in('hubspot_id', testDeals);

  dbDeals.forEach(deal => {
    const props = deal.raw_json?.properties || {};
    console.log(`${deal.dealname}:`);
    console.log(`  Supabase amount column: ${deal.amount}`);
    console.log(`  raw_json.properties.amount: ${props.amount}`);
    console.log(`  raw_json.properties.deal_whole_amount: ${props.deal_whole_amount}`);
    console.log('');
  });

  // 3. Проверить общую статистику
  console.log('\n3. ОБЩАЯ СТАТИСТИКА:\n');

  const { data: allDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('amount, raw_json')
    .eq('dealstage', 'closedwon')
    .limit(100);

  let amountMatchesWhole = 0;
  let amountDifferent = 0;
  let paymentStatusEmpty = 0;

  allDeals.forEach(deal => {
    const props = deal.raw_json?.properties || {};
    const amount = parseFloat(props.amount) || 0;
    const dealWhole = parseFloat(props.deal_whole_amount) || 0;
    const paymentStatus = props.payment_status;

    if (Math.abs(amount - dealWhole) < 10) {
      amountMatchesWhole++;
    } else {
      amountDifferent++;
    }

    if (!paymentStatus) {
      paymentStatusEmpty++;
    }
  });

  console.log(`Проверено: ${allDeals.length} deals`);
  console.log(`amount = deal_whole_amount: ${amountMatchesWhole} (${(amountMatchesWhole/allDeals.length*100).toFixed(1)}%)`);
  console.log(`amount ≠ deal_whole_amount: ${amountDifferent} (${(amountDifferent/allDeals.length*100).toFixed(1)}%)`);
  console.log(`payment_status пусто: ${paymentStatusEmpty} (${(paymentStatusEmpty/allDeals.length*100).toFixed(1)}%)`);

  // 4. Вывод рекомендаций
  console.log('\n\n=== РЕКОМЕНДАЦИИ ===\n');

  if (amountMatchesWhole > amountDifferent) {
    console.log('✓ ХОРОШИЕ НОВОСТИ:');
    console.log('  Большинство deals УЖЕ имеют правильный amount!');
    console.log('  Возможно мы уже обновили их ранее.');
    console.log('');
    console.log('ЧТО НУЖНО СДЕЛАТЬ:');
    console.log(`  1. Обновить ${amountDifferent} deals где amount ≠ deal_whole_amount`);
    console.log(`  2. Заполнить payment_status для ${paymentStatusEmpty} deals`);
  } else {
    console.log('⚠️ ПРОБЛЕМА:');
    console.log('  Большинство deals имеют НЕПРАВИЛЬНЫЙ amount!');
    console.log('');
    console.log('ВАРИАНТЫ:');
    console.log('  A) Обновить amount field → deal_whole_amount (через API)');
    console.log('  B) Использовать deal_whole_amount в dashboards (НЕ amount)');
    console.log('  C) Проверить какое поле используют текущие dashboards');
  }

  if (paymentStatusEmpty > 90) {
    console.log('');
    console.log('✓ payment_status:');
    console.log('  Поле существует, но пустое.');
    console.log('  Нужно заполнить: finished/stopped/paused из CSV.');
  }

  // 5. Проверить revenue в DB
  console.log('\n\n=== REVENUE CALCULATION ===\n');

  const { data: revenueDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('amount, raw_json')
    .eq('dealstage', 'closedwon');

  const totalUsingAmount = revenueDeals.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const totalUsingDealWhole = revenueDeals.reduce((sum, d) => {
    const dealWhole = parseFloat(d.raw_json?.properties?.deal_whole_amount) || 0;
    return sum + dealWhole;
  }, 0);

  console.log('Если использовать "amount" field:');
  console.log(`  Total revenue: $${totalUsingAmount.toLocaleString()}`);
  console.log('');
  console.log('Если использовать "deal_whole_amount" field:');
  console.log(`  Total revenue: $${totalUsingDealWhole.toLocaleString()}`);
  console.log('');
  console.log('Разница: $' + (totalUsingDealWhole - totalUsingAmount).toLocaleString());

  console.log('\n\nВОПРОС К ТЕБЕ:');
  console.log('Какой revenue показывает твой dashboard сейчас?');
  console.log(`  A) ~$${(totalUsingAmount/1000).toFixed(0)}k → используешь "amount"`);
  console.log(`  B) ~$${(totalUsingDealWhole/1000).toFixed(0)}k → используешь "deal_whole_amount"`);
}

checkWhatNeedsUpdate().catch(console.error);
