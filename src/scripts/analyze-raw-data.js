import fs from 'fs';
import path from 'path';

console.log('=== АНАЛИЗ RAW ДАННЫХ HUBSPOT ===\n');

// Читаем 10 deals
const dealsPath = path.join(process.cwd(), 'tests/fixtures/sample-deals.json');
const dealsData = JSON.parse(fs.readFileSync(dealsPath, 'utf-8'));
const first10Deals = dealsData.deals ? dealsData.deals.slice(0, 10) : (dealsData.results ? dealsData.results.slice(0, 10) : []);

console.log('📊 DEALS - 10 ЗАПИСЕЙ');
console.log('Всего deals:', dealsData.results.length);
console.log('\n--- СТРУКТУРА ПЕРВОЙ СДЕЛКИ ---');
console.log('ID:', first10Deals[0].id);
console.log('Properties keys:', Object.keys(first10Deals[0].properties).sort());
console.log('\n--- SAMPLE DEAL PROPERTIES ---');
console.log(JSON.stringify(first10Deals[0].properties, null, 2));

// Читаем 10 contacts
const contactsPath = path.join(process.cwd(), 'tests/fixtures/sample-contacts.json');
const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf-8'));
const first10Contacts = contactsData.results.slice(0, 10);

console.log('\n\n📇 CONTACTS - 10 ЗАПИСЕЙ');
console.log('Всего contacts:', contactsData.results.length);
console.log('\n--- СТРУКТУРА ПЕРВОГО КОНТАКТА ---');
console.log('ID:', first10Contacts[0].id);
console.log('Properties keys:', Object.keys(first10Contacts[0].properties).sort());

// Читаем calls
const callsPath = path.join(process.cwd(), 'docs/analysis/calls-data.json');
const callsData = JSON.parse(fs.readFileSync(callsPath, 'utf-8'));
const first10Calls = callsData.calls.slice(0, 10);

console.log('\n\n📞 CALLS - 10 ЗАПИСЕЙ');
console.log('Всего calls:', callsData.total_calls);
console.log('\n--- СТРУКТУРА ПЕРВОГО ЗВОНКА ---');
console.log('ID:', first10Calls[0].id);
console.log('Properties keys:', Object.keys(first10Calls[0].properties).sort());
console.log('\n--- SAMPLE CALL PROPERTIES ---');
console.log(JSON.stringify(first10Calls[0].properties, null, 2));

// Анализ полей для метрик
console.log('\n\n=== АНАЛИЗ ПОЛЕЙ ДЛЯ 22 МЕТРИК ===\n');

const metrics = [
  { name: '1. Total sales', source: 'deals', field: 'amount' },
  { name: '2. Total deals', source: 'deals', field: 'dealstage' },
  { name: '3. Average deal size', source: 'deals', field: 'amount' },
  { name: '4. Conversion rate', source: 'deals', field: 'dealstage' },
  { name: '5. Qualified rate', source: 'deals', field: 'qualified_status' },
  { name: '6. Trial rate', source: 'deals', field: 'trial_status' },
  { name: '7. Cancellation rate', source: 'deals', field: 'cancellation_reason, is_refunded' },
  { name: '8. Followup rate', source: 'deals', field: 'followup_count' },
  { name: '9. Avg installments', source: 'deals', field: 'installment_count, number_of_installments__months' },
  { name: '10. Average call time', source: 'calls', field: 'hs_call_duration' },
  { name: '11. Total call time', source: 'calls', field: 'hs_call_duration' },
  { name: '12. Time to sale', source: 'deals', field: 'createdate, closedate' },
  { name: '13. Sales scripts A/B', source: 'contacts', field: 'sales_script_version' },
  { name: '14. VSL watch -> close', source: 'contacts', field: 'vsl_watched' },
  { name: '15. Upfront cash', source: 'deals', field: 'upfront_payment' },
  { name: '16. Total calls made', source: 'calls', field: 'id' },
  { name: '17. 5min-reached rate', source: 'calls', field: 'hs_call_duration' },
  { name: '18. Offers given & rate', source: 'deals', field: 'offer_given, offer_accepted' },
  { name: '19. Team efficiency', source: 'deals', field: 'calculated from above' },
  { name: '20. Pickup rate', source: 'calls', field: 'hs_call_disposition, hs_call_body' },
  { name: '21. Time to first contact', source: 'contacts+calls', field: 'createdate + first call timestamp' },
  { name: '22. Avg followups', source: 'calls', field: 'count per contact/deal' },
];

metrics.forEach(metric => {
  console.log(`${metric.name}`);
  console.log(`   Source: ${metric.source}`);
  console.log(`   Fields: ${metric.field}\n`);
});

// Проверка наличия полей в реальных данных
console.log('\n=== ПРОВЕРКА ПОЛЕЙ В РЕАЛЬНЫХ ДАННЫХ ===\n');

const dealFields = Object.keys(first10Deals[0].properties);
const contactFields = Object.keys(first10Contacts[0].properties);
const callFields = Object.keys(first10Calls[0].properties);

const requiredDealFields = [
  'amount', 'dealstage', 'qualified_status', 'trial_status',
  'cancellation_reason', 'is_refunded', 'followup_count',
  'installment_count', 'number_of_installments__months',
  'createdate', 'closedate', 'offer_given', 'offer_accepted',
  'upfront_payment'
];

const requiredContactFields = [
  'sales_script_version', 'vsl_watched', 'createdate'
];

const requiredCallFields = [
  'hs_call_duration', 'hs_call_disposition', 'hs_timestamp'
];

console.log('📊 DEAL FIELDS:');
requiredDealFields.forEach(field => {
  const exists = dealFields.includes(field);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${field}`);
  if (exists && first10Deals[0].properties[field]) {
    console.log(`   Sample: ${first10Deals[0].properties[field]}`);
  }
});

console.log('\n📇 CONTACT FIELDS:');
requiredContactFields.forEach(field => {
  const exists = contactFields.includes(field);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${field}`);
  if (exists && first10Contacts[0].properties[field]) {
    console.log(`   Sample: ${first10Contacts[0].properties[field]}`);
  }
});

console.log('\n📞 CALL FIELDS:');
requiredCallFields.forEach(field => {
  const exists = callFields.includes(field);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${field}`);
  if (exists && first10Calls[0].properties[field]) {
    console.log(`   Sample: ${first10Calls[0].properties[field]}`);
  }
});

// Связи между объектами
console.log('\n\n=== СВЯЗИ МЕЖДУ ОБЪЕКТАМИ ===\n');
console.log('Проверяем связи в первой сделке:');
if (first10Deals[0].associations) {
  console.log('Associations:', JSON.stringify(first10Deals[0].associations, null, 2));
} else {
  console.log('❌ Нет поля associations в deals');
}

console.log('\n=== ИТОГ ===');
console.log('Deals:', dealsData.results.length, 'записей');
console.log('Contacts:', contactsData.results.length, 'записей');
console.log('Calls:', callsData.total_calls, 'записей');
