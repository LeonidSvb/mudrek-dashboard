require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllDealProperties() {
  console.log('=== ВСЕ PROPERTIES В DEALS ===\n');

  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('raw_json')
    .limit(50);

  // Собрать ВСЕ уникальные ключи из всех deals
  const allKeys = new Set();
  deals.forEach(d => {
    const props = d.raw_json?.properties || {};
    Object.keys(props).forEach(k => allKeys.add(k));
  });

  console.log(`Всего уникальных properties: ${allKeys.size}\n`);

  // Разделить на категории
  const categories = {
    payment: [],
    status: [],
    dates: [],
    amounts: [],
    owner: [],
    trial: [],
    other: []
  };

  Array.from(allKeys).sort().forEach(key => {
    const lower = key.toLowerCase();
    if (lower.includes('payment') || lower.includes('installment')) {
      categories.payment.push(key);
    } else if (lower.includes('status') || lower.includes('stage')) {
      categories.status.push(key);
    } else if (lower.includes('date')) {
      categories.dates.push(key);
    } else if (lower.includes('amount') || lower.includes('price')) {
      categories.amounts.push(key);
    } else if (lower.includes('owner')) {
      categories.owner.push(key);
    } else if (lower.includes('trial') || lower.includes('qualified')) {
      categories.trial.push(key);
    } else {
      categories.other.push(key);
    }
  });

  console.log('🔹 PAYMENT RELATED:');
  categories.payment.forEach(k => console.log(`   ${k}`));

  console.log('\n🔹 STATUS/STAGE RELATED:');
  categories.status.forEach(k => console.log(`   ${k}`));

  console.log('\n🔹 AMOUNTS:');
  categories.amounts.forEach(k => console.log(`   ${k}`));

  console.log('\n🔹 DATES:');
  categories.dates.forEach(k => console.log(`   ${k}`));

  console.log('\n🔹 OWNER:');
  categories.owner.forEach(k => console.log(`   ${k}`));

  console.log('\n🔹 TRIAL/QUALIFIED:');
  categories.trial.forEach(k => console.log(`   ${k}`));

  console.log('\n🔹 OTHER (first 20):');
  categories.other.slice(0, 20).forEach(k => console.log(`   ${k}`));
  if (categories.other.length > 20) {
    console.log(`   ... и еще ${categories.other.length - 20} properties`);
  }

  // Примеры значений для ключевых полей
  console.log('\n\n=== ПРИМЕРЫ ЗНАЧЕНИЙ ===\n');

  const sampleDeal = deals.find(d => d.raw_json?.properties?.deal_whole_amount);
  if (sampleDeal) {
    const props = sampleDeal.raw_json.properties;

    console.log('Payment fields:');
    console.log(`  amount: ${props.amount}`);
    console.log(`  deal_whole_amount: ${props.deal_whole_amount}`);
    console.log(`  installments: ${props.installments}`);
    console.log(`  payment_method: ${props.payment_method}`);
    console.log(`  payment_type: ${props.payment_type}`);
    console.log(`  payment_status: ${props.payment_status}`);
    console.log(`  number_of_installments__months: ${props.number_of_installments__months}`);
    console.log(`  the_left_amount: ${props.the_left_amount}`);

    console.log('\nStatus fields:');
    console.log(`  dealstage: ${props.dealstage}`);
    console.log(`  qualified_status: ${props.qualified_status}`);
    console.log(`  trial_status: ${props.trial_status}`);

    console.log('\nDates:');
    console.log(`  n1st_payment: ${props.n1st_payment}`);
    console.log(`  last_payment: ${props.last_payment}`);
    console.log(`  createdate: ${props.createdate}`);
    console.log(`  closedate: ${props.closedate}`);
  }

  // Проверить есть ли кастомное поле payment_status уже
  console.log('\n\n=== ПРОВЕРКА payment_status FIELD ===\n');

  const withPaymentStatus = deals.filter(d => d.raw_json?.properties?.payment_status);
  console.log(`Deals с заполненным payment_status: ${withPaymentStatus.length} из ${deals.length}`);

  if (withPaymentStatus.length > 0) {
    const statusValues = new Set();
    withPaymentStatus.forEach(d => {
      const val = d.raw_json.properties.payment_status;
      if (val) statusValues.add(val);
    });

    console.log(`Уникальные значения payment_status:`);
    Array.from(statusValues).forEach(v => console.log(`  - ${v}`));
  } else {
    console.log('⚠️ Поле payment_status пустое во всех deals!');
  }
}

checkAllDealProperties().catch(console.error);
