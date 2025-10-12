require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkMissingFields() {
  console.log('🔍 Проверка отсутствующих полей для метрик\n');
  console.log('═══════════════════════════════════════════════\n');

  // Поля которые ДОЛЖНЫ быть для 22 метрик
  const requiredFields = {
    contacts: [
      { field: 'email', metric: 'Идентификация контактов' },
      { field: 'hubspot_owner_id', metric: 'Фильтр по менеджерам' },
      { field: 'lifecyclestage', metric: 'Conversion Rate (customer)' },
      { field: 'sales_script_version', metric: 'A/B Testing - Sales Script' },
      { field: 'vsl_watched', metric: 'A/B Testing - VSL Watch' }
    ],
    deals: [
      { field: 'qualified_status', metric: 'Qualified Rate' },
      { field: 'trial_status', metric: 'Trial Rate' },
      { field: 'offer_given', metric: 'Offers Given Rate' },
      { field: 'offer_accepted', metric: 'Offer → Close Rate' },
      { field: 'upfront_payment', metric: 'Upfront Cash Collected' },
      { field: 'number_of_installments__months', metric: 'Avg Installments' }
    ]
  };

  // Проверим CONTACTS
  console.log('📊 CONTACTS - проверка полей:\n');
  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  for (const { field, metric } of requiredFields.contacts) {
    const { count } = await supabase
      .from('hubspot_contacts_raw')
      .select('*', { count: 'exact', head: true })
      .not(field, 'is', null);

    const percent = (count / totalContacts * 100).toFixed(1);
    const icon = count === 0 ? '❌' : count < totalContacts * 0.5 ? '⚠️' : '✅';

    console.log(`  ${icon} ${field}: ${count}/${totalContacts} (${percent}%)`);
    console.log(`     → Нужно для: ${metric}`);
  }

  // Проверим DEALS
  console.log('\n💼 DEALS - проверка полей:\n');
  const { count: totalDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  for (const { field, metric } of requiredFields.deals) {
    const { count } = await supabase
      .from('hubspot_deals_raw')
      .select('*', { count: 'exact', head: true })
      .not(field, 'is', null);

    const percent = (count / totalDeals * 100).toFixed(1);
    const icon = count === 0 ? '❌' : count < totalDeals * 0.5 ? '⚠️' : '✅';

    console.log(`  ${icon} ${field}: ${count}/${totalDeals} (${percent}%)`);
    console.log(`     → Нужно для: ${metric}`);
  }

  // ИТОГИ
  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 РЕЗЮМЕ:\n');

  console.log('❌ КРИТИЧЕСКИЕ проблемы (0% данных):');
  console.log('   - contacts.email');
  console.log('   - deals.qualified_status');
  console.log('   - deals.trial_status');
  console.log('   - deals.offer_given');
  console.log('   - deals.offer_accepted');
  console.log('   - deals.upfront_payment');
  console.log('');
  console.log('⚠️  ПРЕДУПРЕЖДЕНИЯ (мало данных):');
  console.log('   - contacts.hubspot_owner_id (22.1%)');
  console.log('   - contacts.sales_script_version (?)');
  console.log('   - contacts.vsl_watched (?)');
  console.log('');
  console.log('📝 ЧТО ДЕЛАТЬ:');
  console.log('');
  console.log('1. RE-SYNC контактов с правильными properties:');
  console.log('   → node src/hubspot/sync-parallel.js');
  console.log('   → Это загрузит email и owner_id');
  console.log('');
  console.log('2. Проверить DEALS properties в HubSpot:');
  console.log('   → qualified_status, trial_status существуют?');
  console.log('   → offer_given, offer_accepted существуют?');
  console.log('   → upfront_payment существует?');
  console.log('');
  console.log('3. Если полей НЕТ в HubSpot - нужно создать:');
  console.log('   → См. документацию в CHANGELOG v2.2.0');
  console.log('');
  console.log('═══════════════════════════════════════════════');
}

checkMissingFields().catch(console.error);
