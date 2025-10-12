require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkData() {
  console.log('🔍 Проверка полноты данных для метрик\n');
  console.log('═══════════════════════════════════════════════\n');

  // 1. CONTACTS - проверим email и другие поля
  console.log('📊 CONTACTS:');
  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  const { count: withEmail } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null);

  const { count: withPhone } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);

  const { count: withOwner } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('hubspot_owner_id', 'is', null);

  console.log(`  Всего контактов: ${totalContacts}`);
  console.log(`  С email: ${withEmail} (${(withEmail/totalContacts*100).toFixed(1)}%)`);
  console.log(`  С телефоном: ${withPhone} (${(withPhone/totalContacts*100).toFixed(1)}%)`);
  console.log(`  С owner_id: ${withOwner} (${(withOwner/totalContacts*100).toFixed(1)}%)`);

  // 2. DEALS - проверим все нужные поля
  console.log('\n💼 DEALS:');
  const { count: totalDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  const { count: dealsWithAmount } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .not('amount', 'is', null);

  const { count: dealsWithOwner } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .not('hubspot_owner_id', 'is', null);

  const { count: qualifiedStatus } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .not('qualified_status', 'is', null);

  const { count: trialStatus } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .not('trial_status', 'is', null);

  console.log(`  Всего сделок: ${totalDeals}`);
  console.log(`  С amount: ${dealsWithAmount} (${(dealsWithAmount/totalDeals*100).toFixed(1)}%)`);
  console.log(`  С owner_id: ${dealsWithOwner} (${(dealsWithOwner/totalDeals*100).toFixed(1)}%)`);
  console.log(`  С qualified_status: ${qualifiedStatus} (${(qualifiedStatus/totalDeals*100).toFixed(1)}%)`);
  console.log(`  С trial_status: ${trialStatus} (${(trialStatus/totalDeals*100).toFixed(1)}%)`);

  // 3. CALLS - проверим телефоны
  console.log('\n📞 CALLS:');
  const { count: totalCalls } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true });

  const { count: callsWithPhone } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true })
    .not('call_to_number', 'is', null);

  const { count: callsWithDuration } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true })
    .not('call_duration', 'is', null);

  console.log(`  Всего звонков: ${totalCalls}`);
  console.log(`  С номером: ${callsWithPhone} (${(callsWithPhone/totalCalls*100).toFixed(1)}%)`);
  console.log(`  С длительностью: ${callsWithDuration} (${(callsWithDuration/totalCalls*100).toFixed(1)}%)`);

  // 4. Примеры записей
  console.log('\n📝 Примеры данных:');

  const { data: sampleContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, firstname, lastname, phone')
    .limit(3);

  console.log('\n  Contacts (первые 3):');
  sampleContacts.forEach(c => {
    console.log(`    ID: ${c.hubspot_id}`);
    console.log(`    Email: ${c.email || 'NULL'}`);
    console.log(`    Name: ${c.firstname || '?'} ${c.lastname || '?'}`);
    console.log(`    Phone: ${c.phone || 'NULL'}`);
    console.log('');
  });

  // 5. Проверка нужных полей для метрик
  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 ПРОВЕРКА ПОЛЕЙ ДЛЯ 22 МЕТРИК:\n');

  const criticalFields = [
    { table: 'contacts', field: 'email', needed: 'для идентификации' },
    { table: 'contacts', field: 'phone', needed: 'для phone matching со звонками' },
    { table: 'contacts', field: 'hubspot_owner_id', needed: 'для фильтра по менеджерам' },
    { table: 'deals', field: 'amount', needed: 'для Total Sales, Avg Deal Size' },
    { table: 'deals', field: 'dealstage', needed: 'для Conversion Rate, Cancellation Rate' },
    { table: 'deals', field: 'qualified_status', needed: 'для Qualified Rate' },
    { table: 'deals', field: 'trial_status', needed: 'для Trial Rate' },
    { table: 'calls', field: 'call_duration', needed: 'для Avg Call Time, Total Call Time' },
    { table: 'calls', field: 'call_to_number', needed: 'для phone matching' }
  ];

  console.log('Критически важные поля:');
  criticalFields.forEach(({ table, field, needed }) => {
    console.log(`  ✓ ${table}.${field} - ${needed}`);
  });

  console.log('\n═══════════════════════════════════════════════');
}

checkData().catch(console.error);
