import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

async function fetchFromHubSpot(endpoint, limit = 10, properties = []) {
  let url = `${BASE_URL}${endpoint}?limit=${limit}&archived=false`;

  // Если указаны properties, добавляем их в запрос
  if (properties.length > 0) {
    const propsParam = properties.map(p => `properties=${p}`).join('&');
    url += `&${propsParam}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

console.log('=== ЗАПРОС СВЕЖИХ ДАННЫХ ИЗ HUBSPOT ===\n');

// Список properties для deals
const dealProperties = [
  'amount', 'dealstage', 'dealname', 'pipeline', 'createdate', 'closedate',
  'hs_lastmodifieddate', 'qualified_status', 'trial_status', 'vsl_watched',
  'number_of_installments__months', 'payment_method', 'payment_type', 'payment_status',
  'deal_whole_amount', 'the_left_amount', 'installment_monthly_amount',
  'date_of_last_installment', 'number_of_already_paid_installments',
  'number_of_left_installments', 'phone_number', 'hubspot_owner_id'
];

// Список properties для contacts
const contactProperties = [
  'email', 'firstname', 'lastname', 'phone', 'company', 'createdate',
  'lastmodifieddate', 'lifecyclestage', 'hs_lead_status', 'hubspot_owner_id',
  'vsl_watched', 'sales_script_version'
];

// Список properties для calls
const callProperties = [
  'hs_call_duration', 'hs_call_direction', 'hs_call_disposition', 'hs_call_body',
  'hs_timestamp', 'hs_call_recording_url', 'hs_call_from_number', 'hs_call_to_number',
  'hs_call_status', 'hs_call_title', 'hs_createdate', 'hs_lastmodifieddate'
];

// Запрашиваем 10 deals с ассоциациями
console.log('📊 Загружаем 10 deals со всеми полями...');
const dealsResponse = await fetchFromHubSpot('/crm/v3/objects/deals', 10, dealProperties);
console.log(`✅ Получено ${dealsResponse.results.length} deals\n`);

// Запрашиваем 10 contacts
console.log('📇 Загружаем 10 contacts со всеми полями...');
const contactsResponse = await fetchFromHubSpot('/crm/v3/objects/contacts', 10, contactProperties);
console.log(`✅ Получено ${contactsResponse.results.length} contacts\n`);

// Запрашиваем 10 calls
console.log('📞 Загружаем 10 calls со всеми полями...');
const callsResponse = await fetchFromHubSpot('/crm/v3/objects/calls', 10, callProperties);
console.log(`✅ Получено ${callsResponse.results.length} calls\n`);

// Анализируем структуру
console.log('=== СТРУКТУРА ДАННЫХ ===\n');

console.log('--- DEAL SAMPLE ---');
const sampleDeal = dealsResponse.results[0];
console.log('ID:', sampleDeal.id);
console.log('Properties:', Object.keys(sampleDeal.properties).sort().slice(0, 30));
console.log('\nВсе properties deal:');
console.log(JSON.stringify(sampleDeal.properties, null, 2));

console.log('\n\n--- CONTACT SAMPLE ---');
const sampleContact = contactsResponse.results[0];
console.log('ID:', sampleContact.id);
console.log('Properties (первые 30):', Object.keys(sampleContact.properties).sort().slice(0, 30));

console.log('\n\n--- CALL SAMPLE ---');
const sampleCall = callsResponse.results[0];
console.log('ID:', sampleCall.id);
console.log('Properties:', Object.keys(sampleCall.properties).sort());
console.log('\nCall properties:');
console.log(JSON.stringify(sampleCall.properties, null, 2));

// Проверка полей для 22 метрик
console.log('\n\n=== ПРОВЕРКА ПОЛЕЙ ДЛЯ 22 МЕТРИК ===\n');

const dealProps = Object.keys(sampleDeal.properties);
const contactProps = Object.keys(sampleContact.properties);
const callProps = Object.keys(sampleCall.properties);

const requiredFields = {
  deals: [
    'amount',
    'dealstage',
    'qualified_status',
    'trial_status',
    'vsl_watched',
    'number_of_installments__months',
    'createdate',
    'closedate',
    'hs_lastmodifieddate'
  ],
  contacts: [
    'createdate',
    'vsl_watched',
    'email',
    'phone'
  ],
  calls: [
    'hs_call_duration',
    'hs_call_direction',
    'hs_call_disposition',
    'hs_call_body',
    'hs_timestamp',
    'hs_call_recording_url'
  ]
};

console.log('📊 DEALS:');
requiredFields.deals.forEach(field => {
  const exists = dealProps.includes(field);
  const value = sampleDeal.properties[field];
  console.log(`  ${exists ? '✅' : '❌'} ${field}${value ? `: ${value}` : ''}`);
});

console.log('\n📇 CONTACTS:');
requiredFields.contacts.forEach(field => {
  const exists = contactProps.includes(field);
  const value = sampleContact.properties[field];
  console.log(`  ${exists ? '✅' : '❌'} ${field}${value ? `: ${value}` : ''}`);
});

console.log('\n📞 CALLS:');
requiredFields.calls.forEach(field => {
  const exists = callProps.includes(field);
  const value = sampleCall.properties[field];
  console.log(`  ${exists ? '✅' : '❌'} ${field}${value ? `: ${String(value).substring(0, 50)}` : ''}`);
});

// Проверяем associations
console.log('\n\n=== ASSOCIATIONS (СВЯЗИ) ===\n');
console.log('Deal associations:', sampleDeal.associations ? Object.keys(sampleDeal.associations) : 'НЕТ');
console.log('Contact associations:', sampleContact.associations ? Object.keys(sampleContact.associations) : 'НЕТ');
console.log('Call associations:', sampleCall.associations ? Object.keys(sampleCall.associations) : 'НЕТ');

console.log('\n=== ВЫВОД ===');
console.log('Теперь видим что:');
console.log('1. Какие поля УЖЕ есть в HubSpot');
console.log('2. Какие поля НУЖНО создать');
console.log('3. Как связаны объекты между собой');
console.log('\nГотово! Теперь можем создавать SQL схему.');
