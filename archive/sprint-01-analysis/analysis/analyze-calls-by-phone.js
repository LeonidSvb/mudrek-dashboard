import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

/**
 * Анализируем как связать calls с contacts через номер телефона
 */
async function analyzeCallsByPhone() {
  console.log('=== АНАЛИЗ: КАК СВЯЗАТЬ CALLS ЧЕРЕЗ PHONE ===\n');

  // 1. Получаем 50 calls с номерами
  console.log('📞 Получаем 50 calls...');
  const callsResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/calls?limit=50&properties=hs_call_to_number,hs_call_from_number,hs_call_direction,hs_call_duration,hs_timestamp`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const callsData = await callsResponse.json();
  const calls = callsData.results;

  console.log(`✓ Получено ${calls.length} calls\n`);

  // Анализируем номера
  const phoneNumbers = new Set();
  calls.forEach(call => {
    if (call.properties.hs_call_to_number) {
      phoneNumbers.add(call.properties.hs_call_to_number);
    }
    if (call.properties.hs_call_from_number) {
      phoneNumbers.add(call.properties.hs_call_from_number);
    }
  });

  console.log(`📊 Уникальных номеров: ${phoneNumbers.size}\n`);

  // 2. Получаем 50 contacts с номерами
  console.log('📇 Получаем 50 contacts...');
  const contactsResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/contacts?limit=50&properties=phone,firstname,lastname,email`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const contactsData = await contactsResponse.json();
  const contacts = contactsData.results;

  console.log(`✓ Получено ${contacts.length} contacts\n`);

  // 3. Получаем 50 deals с номерами
  console.log('💼 Получаем 50 deals...');
  const dealsResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/deals?limit=50&properties=phone_number,dealname,amount`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const dealsData = await dealsResponse.json();
  const deals = dealsData.results;

  console.log(`✓ Получено ${deals.length} deals\n`);

  // Проверяем можем ли связать
  console.log('═══════════════════════════════════════');
  console.log('        АНАЛИЗ ВОЗМОЖНОСТИ СВЯЗИ       ');
  console.log('═══════════════════════════════════════\n');

  // Находим пример call
  const sampleCall = calls.find(c => c.properties.hs_call_to_number);

  if (sampleCall) {
    const callPhone = sampleCall.properties.hs_call_to_number;
    console.log('📞 ПРИМЕР CALL:');
    console.log(`   ID: ${sampleCall.id}`);
    console.log(`   To number: ${callPhone}`);
    console.log(`   From number: ${sampleCall.properties.hs_call_from_number}`);
    console.log(`   Direction: ${sampleCall.properties.hs_call_direction}`);
    console.log(`   Duration: ${sampleCall.properties.hs_call_duration} ms\n`);

    // Ищем contact с таким phone
    const matchingContact = contacts.find(c =>
      c.properties.phone && c.properties.phone.replace(/\D/g, '') === callPhone.replace(/\D/g, '')
    );

    if (matchingContact) {
      console.log('✅ НАЙДЕН MATCHING CONTACT:');
      console.log(`   ID: ${matchingContact.id}`);
      console.log(`   Phone: ${matchingContact.properties.phone}`);
      console.log(`   Name: ${matchingContact.properties.firstname} ${matchingContact.properties.lastname}`);
      console.log(`   Email: ${matchingContact.properties.email}\n`);
    } else {
      console.log('❌ Contact с таким phone НЕ НАЙДЕН в первых 50\n');
    }

    // Ищем deal с таким phone
    const matchingDeal = deals.find(d =>
      d.properties.phone_number && d.properties.phone_number.replace(/\D/g, '') === callPhone.replace(/\D/g, '')
    );

    if (matchingDeal) {
      console.log('✅ НАЙДЕН MATCHING DEAL:');
      console.log(`   ID: ${matchingDeal.id}`);
      console.log(`   Phone: ${matchingDeal.properties.phone_number}`);
      console.log(`   Deal: ${matchingDeal.properties.dealname}`);
      console.log(`   Amount: ${matchingDeal.properties.amount}\n`);
    } else {
      console.log('❌ Deal с таким phone НЕ НАЙДЕН в первых 50\n');
    }
  }

  // Статистика по телефонам
  console.log('═══════════════════════════════════════');
  console.log('          СТАТИСТИКА ТЕЛЕФОНОВ         ');
  console.log('═══════════════════════════════════════\n');

  const callsWithPhone = calls.filter(c => c.properties.hs_call_to_number || c.properties.hs_call_from_number);
  const contactsWithPhone = contacts.filter(c => c.properties.phone);
  const dealsWithPhone = deals.filter(d => d.properties.phone_number);

  console.log(`📞 Calls с номерами:    ${callsWithPhone.length}/${calls.length} (${(callsWithPhone.length/calls.length*100).toFixed(1)}%)`);
  console.log(`📇 Contacts с номерами: ${contactsWithPhone.length}/${contacts.length} (${(contactsWithPhone.length/contacts.length*100).toFixed(1)}%)`);
  console.log(`💼 Deals с номерами:    ${dealsWithPhone.length}/${deals.length} (${(dealsWithPhone.length/deals.length*100).toFixed(1)}%)`);

  console.log('\n═══════════════════════════════════════');
  console.log('              ВЫВОДЫ                   ');
  console.log('═══════════════════════════════════════\n');

  console.log('🎯 КАК СВЯЗЫВАТЬ CALLS:\n');
  console.log('1. ❌ Через associations НЕ работает (calls не имеют associations)');
  console.log('2. ✅ Через номер телефона МОЖНО:');
  console.log('   - call.hs_call_to_number → contact.phone');
  console.log('   - call.hs_call_to_number → deal.phone_number');
  console.log('3. 💡 Используем SQL JOIN через phone для связи\n');

  console.log('📋 РЕКОМЕНДАЦИЯ:\n');
  console.log('Хранить в таблице hubspot_calls_raw:');
  console.log('- call_to_number (для JOIN с contacts.phone)');
  console.log('- call_from_number');
  console.log('- raw_json (все данные)\n');

  console.log('SQL запрос для связи calls → contacts:');
  console.log('SELECT');
  console.log('  ca.hubspot_id,');
  console.log('  ca.call_duration,');
  console.log('  c.hubspot_id as contact_id,');
  console.log('  c.email');
  console.log('FROM hubspot_calls_raw ca');
  console.log('JOIN hubspot_contacts_raw c ');
  console.log('  ON REPLACE(ca.call_to_number, \'+\', \'\') = REPLACE(c.phone, \'+\', \'\');');
  console.log();
}

analyzeCallsByPhone().catch(console.error);
