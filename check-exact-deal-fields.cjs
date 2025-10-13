require('dotenv').config();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

async function checkExactDealFields() {
  console.log('=== ПРОВЕРКА КОНКРЕТНОГО DEAL ===\n');

  // Deal: wael makhoul
  const dealId = '43497954897';

  console.log(`Deal ID: ${dealId}`);
  console.log(`Link: https://app.hubspot.com/contacts/44890341/deal/${dealId}\n`);

  // Получить ВСЕ properties этого deal
  const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=amount,deal_whole_amount,installments,payment_status,dealstage,dealname`, {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('Ошибка API:', response.status, response.statusText);
    return;
  }

  const data = await response.json();
  const props = data.properties;

  console.log('=== ВСЕ ПОЛЯ ЭТОГО DEAL ===\n');
  console.log(`dealname: ${props.dealname}`);
  console.log(`amount: ${props.amount}`);
  console.log(`deal_whole_amount: ${props.deal_whole_amount}`);
  console.log(`installments: ${props.installments}`);
  console.log(`payment_status: ${props.payment_status || '(пусто)'}`);
  console.log(`dealstage: ${props.dealstage}`);

  console.log('\n=== ЧТО ПОКАЗЫВАЕТ HUBSPOT UI ===\n');
  console.log('Если ты видишь в UI:');
  console.log('  - "Amount" field = ?');
  console.log('  - "Deal Whole Amount" field = ?');
  console.log('');
  console.log('То в API:');
  console.log(`  - amount = ${props.amount}`);
  console.log(`  - deal_whole_amount = ${props.deal_whole_amount}`);

  console.log('\n=== АНАЛИЗ ===\n');

  const amount = parseFloat(props.amount) || 0;
  const dealWhole = parseFloat(props.deal_whole_amount) || 0;

  if (Math.abs(amount - dealWhole) < 10) {
    console.log('✓ amount = deal_whole_amount → УЖЕ ПРАВИЛЬНО!');
    console.log('  Возможно мы уже обновили этот deal ранее?');
  } else {
    console.log('✗ amount ≠ deal_whole_amount → НУЖНО ИСПРАВИТЬ');
    console.log(`  amount: ${amount} (размер платежа)`);
    console.log(`  deal_whole_amount: ${dealWhole} (полная сумма договора)`);
    console.log('');
    console.log('ВОПРОС: Какое поле ты видишь в HubSpot UI?');
    console.log('  1. Если видишь "Deal Whole Amount" = 5300 → значит правильное поле УЖЕ ЕСТЬ');
    console.log('  2. Если видишь "Amount" = 1325 → значит показывается неправильное поле');
  }

  // Проверить ещё несколько deals
  console.log('\n\n=== ПРОВЕРКА ЕЩЁ 3 DEALS ===\n');

  const testDeals = [
    '43502315939', // هيلانه علي
    '43504949134', // Abdullah Al-Dulaimi
    '43503556908'  // Nasser Shehadeh
  ];

  for (const id of testDeals) {
    const resp = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}?properties=amount,deal_whole_amount,installments,dealname`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (resp.ok) {
      const d = await response.json();
      const p = d.properties;
      console.log(`${p.dealname || id}:`);
      console.log(`  amount: ${p.amount}`);
      console.log(`  deal_whole_amount: ${p.deal_whole_amount}`);
      console.log(`  installments: ${p.installments}`);
      console.log('');
    }
  }

  console.log('\n=== ВОПРОС К ТЕБЕ ===\n');
  console.log('Открой этот deal в HubSpot UI:');
  console.log(`https://app.hubspot.com/contacts/44890341/deal/${dealId}`);
  console.log('');
  console.log('И скажи:');
  console.log('1. Какие поля ты видишь в секции "Deal information"?');
  console.log('2. Есть ли там "Deal Whole Amount"?');
  console.log('3. Какое значение показывает?');
  console.log('4. Есть ли там "Amount"?');
  console.log('5. Какое значение показывает?');
  console.log('');
  console.log('Может быть "Deal Whole Amount" УЖЕ ИСПОЛЬЗУЕТСЯ в dashboards?');
  console.log('Тогда нам НЕ НУЖНО ничего обновлять!');
}

checkExactDealFields().catch(console.error);
