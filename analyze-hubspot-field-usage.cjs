require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeFieldUsage() {
  console.log('=== АНАЛИЗ ИСПОЛЬЗОВАНИЯ ПОЛЕЙ В HUBSPOT DEALS ===\n');

  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, amount, dealstage, raw_json')
    .limit(200);

  console.log(`Проверяем ${deals.length} deals\n`);

  // Статистика по полям
  const stats = {
    // Payment fields
    amount: { filled: 0, empty: 0, examples: [] },
    deal_whole_amount: { filled: 0, empty: 0, examples: [] },
    installments: { filled: 0, empty: 0, examples: [] },
    payment_method: { filled: 0, empty: 0, examples: [] },
    payment_type: { filled: 0, empty: 0, examples: [] },
    payment_status: { filled: 0, empty: 0, examples: [] },
    number_of_installments__months: { filled: 0, empty: 0, examples: [] },
    the_left_amount: { filled: 0, empty: 0, examples: [] },

    // Status fields
    dealstage: { filled: 0, empty: 0, examples: [] },
    qualified_status: { filled: 0, empty: 0, examples: [] },
    trial_status: { filled: 0, empty: 0, examples: [] },

    // Date fields
    n1st_payment: { filled: 0, empty: 0, examples: [] },
    last_payment: { filled: 0, empty: 0, examples: [] },
    closedate: { filled: 0, empty: 0, examples: [] },

    // Owner
    hubspot_owner_id: { filled: 0, empty: 0, examples: [] },

    // Contact info (in deal properties!)
    phone_number: { filled: 0, empty: 0, examples: [] },
    email: { filled: 0, empty: 0, examples: [] }
  };

  deals.forEach(deal => {
    const props = deal.raw_json?.properties || {};

    Object.keys(stats).forEach(field => {
      const value = props[field];
      if (value !== null && value !== undefined && value !== '') {
        stats[field].filled++;
        if (stats[field].examples.length < 3) {
          stats[field].examples.push(value);
        }
      } else {
        stats[field].empty++;
      }
    });
  });

  // Вывод статистики
  console.log('📊 СТАТИСТИКА ЗАПОЛНЕНИЯ ПОЛЕЙ:\n');

  console.log('💰 PAYMENT FIELDS:');
  ['amount', 'deal_whole_amount', 'installments', 'payment_method', 'payment_type', 'payment_status', 'number_of_installments__months', 'the_left_amount'].forEach(field => {
    const s = stats[field];
    const percent = ((s.filled / deals.length) * 100).toFixed(1);
    const status = s.filled > 0 ? '✓' : '✗';
    console.log(`  ${status} ${field}: ${s.filled}/${deals.length} (${percent}%)`);
    if (s.examples.length > 0) {
      console.log(`     Примеры: ${s.examples.join(', ')}`);
    }
  });

  console.log('\n📋 STATUS FIELDS:');
  ['dealstage', 'qualified_status', 'trial_status'].forEach(field => {
    const s = stats[field];
    const percent = ((s.filled / deals.length) * 100).toFixed(1);
    const status = s.filled > 0 ? '✓' : '✗';
    console.log(`  ${status} ${field}: ${s.filled}/${deals.length} (${percent}%)`);
    if (s.examples.length > 0) {
      console.log(`     Примеры: ${s.examples.join(', ')}`);
    }
  });

  console.log('\n📅 DATE FIELDS:');
  ['n1st_payment', 'last_payment', 'closedate'].forEach(field => {
    const s = stats[field];
    const percent = ((s.filled / deals.length) * 100).toFixed(1);
    const status = s.filled > 0 ? '✓' : '✗';
    console.log(`  ${status} ${field}: ${s.filled}/${deals.length} (${percent}%)`);
    if (s.examples.length > 0) {
      console.log(`     Примеры: ${s.examples.slice(0, 2).join(', ')}`);
    }
  });

  console.log('\n👤 OWNER/CONTACT:');
  ['hubspot_owner_id', 'phone_number', 'email'].forEach(field => {
    const s = stats[field];
    const percent = ((s.filled / deals.length) * 100).toFixed(1);
    const status = s.filled > 0 ? '✓' : '✗';
    console.log(`  ${status} ${field}: ${s.filled}/${deals.length} (${percent}%)`);
  });

  // Уникальные значения для категориальных полей
  console.log('\n\n=== УНИКАЛЬНЫЕ ЗНАЧЕНИЯ ===\n');

  const uniqueValues = {
    dealstage: new Set(),
    payment_method: new Set(),
    payment_type: new Set(),
    payment_status: new Set(),
    qualified_status: new Set(),
    trial_status: new Set()
  };

  deals.forEach(deal => {
    const props = deal.raw_json?.properties || {};
    Object.keys(uniqueValues).forEach(field => {
      const val = props[field];
      if (val) uniqueValues[field].add(val);
    });
  });

  console.log('dealstage (все возможные статусы):');
  Array.from(uniqueValues.dealstage).forEach(v => console.log(`  - ${v}`));

  console.log('\npayment_method:');
  if (uniqueValues.payment_method.size > 0) {
    Array.from(uniqueValues.payment_method).forEach(v => console.log(`  - ${v}`));
  } else {
    console.log('  (пусто)');
  }

  console.log('\npayment_type:');
  if (uniqueValues.payment_type.size > 0) {
    Array.from(uniqueValues.payment_type).forEach(v => console.log(`  - ${v}`));
  } else {
    console.log('  (пусто)');
  }

  console.log('\npayment_status:');
  if (uniqueValues.payment_status.size > 0) {
    Array.from(uniqueValues.payment_status).forEach(v => console.log(`  - ${v}`));
  } else {
    console.log('  (пусто)');
  }

  // Проверить соотношение amount vs deal_whole_amount
  console.log('\n\n=== СРАВНЕНИЕ amount vs deal_whole_amount ===\n');

  let matchCount = 0;
  let mismatchCount = 0;
  const mismatches = [];

  deals.forEach(deal => {
    const props = deal.raw_json?.properties || {};
    const amount = parseFloat(props.amount) || 0;
    const dealWhole = parseFloat(props.deal_whole_amount) || 0;

    if (amount && dealWhole) {
      if (Math.abs(amount - dealWhole) < 10) {
        matchCount++;
      } else {
        mismatchCount++;
        if (mismatches.length < 5) {
          mismatches.push({
            name: deal.dealname,
            amount,
            dealWhole,
            installments: props.installments
          });
        }
      }
    }
  });

  console.log(`amount = deal_whole_amount: ${matchCount} deals (${(matchCount/(matchCount+mismatchCount)*100).toFixed(1)}%)`);
  console.log(`amount ≠ deal_whole_amount: ${mismatchCount} deals (${(mismatchCount/(matchCount+mismatchCount)*100).toFixed(1)}%)`);

  console.log('\nПримеры несоответствий:');
  mismatches.forEach(m => {
    console.log(`  ${m.name}:`);
    console.log(`    amount: ${m.amount}`);
    console.log(`    deal_whole_amount: ${m.dealWhole}`);
    console.log(`    installments: ${m.installments}`);
    console.log(`    → amount = payment_size (${m.amount} × ${m.installments} = ${m.amount * m.installments})`);
  });

  // Проверить логику installments
  console.log('\n\n=== ЛОГИКА INSTALLMENTS ===\n');

  const installmentLogic = [];
  deals.slice(0, 10).forEach(deal => {
    const props = deal.raw_json?.properties || {};
    const amount = parseFloat(props.amount) || 0;
    const dealWhole = parseFloat(props.deal_whole_amount) || 0;
    const installments = parseFloat(props.installments) || 0;
    const numInstallments = parseFloat(props.number_of_installments__months) || 0;

    if (amount && dealWhole && installments) {
      installmentLogic.push({
        name: deal.dealname,
        amount,
        dealWhole,
        installments,
        numInstallments,
        calculated: amount * installments,
        matches: Math.abs((amount * installments) - dealWhole) < 10
      });
    }
  });

  console.log('Проверка: amount × installments = deal_whole_amount?');
  installmentLogic.forEach(il => {
    const emoji = il.matches ? '✓' : '✗';
    console.log(`${emoji} ${il.name}:`);
    console.log(`   ${il.amount} × ${il.installments} = ${il.calculated} (deal_whole: ${il.dealWhole})`);
    console.log(`   number_of_installments__months: ${il.numInstallments || 'empty'}`);
  });
}

analyzeFieldUsage().catch(console.error);
