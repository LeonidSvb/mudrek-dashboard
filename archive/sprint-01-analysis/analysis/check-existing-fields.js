import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

/**
 * Проверяем какие поля УЖЕ есть в HubSpot для каждого объекта
 */
async function checkExistingFields() {
  console.log('=== ПРОВЕРКА СУЩЕСТВУЮЩИХ ПОЛЕЙ В HUBSPOT ===\n');

  // Метрики из CSV + требования клиента
  const requiredFieldsByMetric = {
    // DEALS
    deals: {
      // Milestone 2
      'Total sales': ['amount'],
      'Average deal size': ['amount'],
      'Total deals': ['dealstage'],
      'Cancellation rate': ['cancellation_reason', 'is_refunded', 'payment_status'],
      'Conversion rate': ['dealstage', 'createdate', 'closedate'],
      'Followup rate': ['followup_count', 'days_between_stages'],
      'Qualified rate': ['qualified_status'],
      'Trial rate': ['trial_status'],
      'Avg installments': ['number_of_installments__months', 'installment_plan'],
      'Time to sale': ['createdate', 'closedate'],
      'Sales scripts testing': [], // в contacts
      'VSL effectiveness': ['vsl_watched', 'vsl_watch_duration'],

      // Milestone 3
      'Upfront cash collected': ['upfront_payment', 'payment_type'],
      'Offers given & rate': ['offer_given', 'offer_accepted'],

      // Retention (новые stages)
      'Retention': ['payment_status'] // Active/Paused/Stopped/Refunded/Completed
    },

    // CONTACTS
    contacts: {
      'Sales scripts testing': ['sales_script_version'],
      'VSL watch': ['vsl_watched', 'vsl_watch_duration'],
      'Time to first contact': ['createdate'] // + first call timestamp
    },

    // CALLS (Kavkom integration - уже есть!)
    calls: {
      'Average call time': ['hs_call_duration'],
      'Total call time': ['hs_call_duration'],
      'Total calls made': ['id'],
      '5min-reached-rate': ['hs_call_duration'],
      'Pickup rate': ['hs_call_direction', 'hs_call_body', 'hs_call_disposition'],
      'Average followups': ['hs_timestamp'] // count per contact
    }
  };

  // 1. Проверяем DEALS properties
  console.log('📊 DEALS PROPERTIES\n');
  const dealsPropsResponse = await fetch(
    `${BASE_URL}/crm/v3/properties/deals`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const dealsProps = await dealsPropsResponse.json();
  const dealFieldNames = dealsProps.results.map(p => p.name);

  console.log(`Всего deal properties: ${dealFieldNames.length}\n`);

  // Собираем все нужные поля для deals
  const allRequiredDealFields = new Set();
  Object.values(requiredFieldsByMetric.deals).forEach(fields => {
    fields.forEach(f => allRequiredDealFields.add(f));
  });

  console.log('Проверка required fields для DEALS:\n');
  const dealFieldsStatus = {};

  Array.from(allRequiredDealFields).sort().forEach(field => {
    const exists = dealFieldNames.includes(field);
    dealFieldsStatus[field] = exists;
    console.log(`  ${exists ? '✅' : '❌'} ${field}`);
  });

  // 2. Проверяем CONTACTS properties
  console.log('\n\n📇 CONTACTS PROPERTIES\n');
  const contactsPropsResponse = await fetch(
    `${BASE_URL}/crm/v3/properties/contacts`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const contactsProps = await contactsPropsResponse.json();
  const contactFieldNames = contactsProps.results.map(p => p.name);

  console.log(`Всего contact properties: ${contactFieldNames.length}\n`);

  const allRequiredContactFields = new Set();
  Object.values(requiredFieldsByMetric.contacts).forEach(fields => {
    fields.forEach(f => allRequiredContactFields.add(f));
  });

  console.log('Проверка required fields для CONTACTS:\n');
  const contactFieldsStatus = {};

  Array.from(allRequiredContactFields).sort().forEach(field => {
    const exists = contactFieldNames.includes(field);
    contactFieldsStatus[field] = exists;
    console.log(`  ${exists ? '✅' : '❌'} ${field}`);
  });

  // 3. Проверяем CALLS properties
  console.log('\n\n📞 CALLS PROPERTIES\n');
  const callsPropsResponse = await fetch(
    `${BASE_URL}/crm/v3/properties/calls`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const callsProps = await callsPropsResponse.json();
  const callFieldNames = callsProps.results.map(p => p.name);

  console.log(`Всего call properties: ${callFieldNames.length}\n`);

  const allRequiredCallFields = new Set();
  Object.values(requiredFieldsByMetric.calls).forEach(fields => {
    fields.forEach(f => allRequiredCallFields.add(f));
  });

  console.log('Проверка required fields для CALLS:\n');
  const callFieldsStatus = {};

  Array.from(allRequiredCallFields).sort().forEach(field => {
    const exists = callFieldNames.includes(field);
    callFieldsStatus[field] = exists;
    console.log(`  ${exists ? '✅' : '❌'} ${field}`);
  });

  // ИТОГИ
  console.log('\n\n═══════════════════════════════════════');
  console.log('              SUMMARY                  ');
  console.log('═══════════════════════════════════════\n');

  // Missing fields
  const missingDealFields = Array.from(allRequiredDealFields).filter(f => !dealFieldsStatus[f]);
  const missingContactFields = Array.from(allRequiredContactFields).filter(f => !contactFieldsStatus[f]);
  const missingCallFields = Array.from(allRequiredCallFields).filter(f => !callFieldsStatus[f]);

  console.log(`📊 DEALS: ${missingDealFields.length} missing fields`);
  if (missingDealFields.length > 0) {
    console.log('   Missing:');
    missingDealFields.forEach(f => console.log(`   - ${f}`));
  }

  console.log(`\n📇 CONTACTS: ${missingContactFields.length} missing fields`);
  if (missingContactFields.length > 0) {
    console.log('   Missing:');
    missingContactFields.forEach(f => console.log(`   - ${f}`));
  }

  console.log(`\n📞 CALLS: ${missingCallFields.length} missing fields`);
  if (missingCallFields.length > 0) {
    console.log('   Missing:');
    missingCallFields.forEach(f => console.log(`   - ${f}`));
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('          FIELDS TO CREATE             ');
  console.log('═══════════════════════════════════════\n');

  const fieldsToCreate = {
    deals: missingDealFields,
    contacts: missingContactFields,
    calls: missingCallFields
  };

  console.log('DEALS:');
  fieldsToCreate.deals.forEach(field => {
    console.log(`  - ${field}`);
  });

  console.log('\nCONTACTS:');
  fieldsToCreate.contacts.forEach(field => {
    console.log(`  - ${field}`);
  });

  console.log('\nCALLS:');
  if (fieldsToCreate.calls.length === 0) {
    console.log('  ✅ All fields exist (Kavkom integration)');
  } else {
    fieldsToCreate.calls.forEach(field => {
      console.log(`  - ${field}`);
    });
  }

  console.log('\n\nГотово! Теперь можем создать недостающие поля через HubSpot API.\n');

  return fieldsToCreate;
}

checkExistingFields().catch(console.error);
