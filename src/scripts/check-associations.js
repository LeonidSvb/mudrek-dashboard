import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

/**
 * Проверяем КАК связаны объекты в HubSpot
 */
async function checkAssociations() {
  console.log('=== ПРОВЕРКА СВЯЗЕЙ В HUBSPOT ===\n');

  // 1. Запрос deal С associations
  console.log('📊 DEAL с associations...');
  const dealResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/deals?limit=1&associations=contacts,calls`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const dealData = await dealResponse.json();
  const deal = dealData.results[0];

  console.log('Deal ID:', deal.id);
  console.log('Deal properties:', Object.keys(deal.properties));
  console.log('Deal associations:', deal.associations ? Object.keys(deal.associations) : 'НЕТ');

  if (deal.associations) {
    console.log('\nAssociations content:');
    console.log(JSON.stringify(deal.associations, null, 2));
  }

  // 2. Запрос contact С associations
  console.log('\n\n📇 CONTACT с associations...');
  const contactResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/contacts?limit=1&associations=deals,calls`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const contactData = await contactResponse.json();
  const contact = contactData.results[0];

  console.log('Contact ID:', contact.id);
  console.log('Contact properties:', Object.keys(contact.properties));
  console.log('Contact associations:', contact.associations ? Object.keys(contact.associations) : 'НЕТ');

  if (contact.associations) {
    console.log('\nAssociations content:');
    console.log(JSON.stringify(contact.associations, null, 2));
  }

  // 3. Запрос call С associations
  console.log('\n\n📞 CALL с associations...');
  const callResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/calls?limit=1&associations=contacts,deals&properties=hs_call_duration,hs_call_direction,hs_call_body,hs_timestamp`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const callData = await callResponse.json();
  const call = callData.results[0];

  console.log('Call ID:', call.id);
  console.log('Call properties:', Object.keys(call.properties));
  console.log('Call associations:', call.associations ? Object.keys(call.associations) : 'НЕТ');

  if (call.associations) {
    console.log('\nAssociations content:');
    console.log(JSON.stringify(call.associations, null, 2));
  }

  // 4. Проверяем поля для связей в properties
  console.log('\n\n=== ПОЛЯ ДЛЯ СВЯЗЕЙ В PROPERTIES ===\n');

  // Проверяем у call есть ли поля с ID
  console.log('📞 Call properties (полный список):');
  const callPropsResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/calls?limit=1&properties=hs_call_duration,hs_call_direction,hs_timestamp,hs_call_to_number,hs_call_from_number,hs_object_source_id,hubspot_owner_id,hs_createdate`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const callPropsData = await callPropsResponse.json();
  console.log(JSON.stringify(callPropsData.results[0].properties, null, 2));

  // Проверяем у deal номер телефона
  console.log('\n\n📊 Deal phone_number:');
  const dealPhoneResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/deals?limit=1&properties=phone_number,dealname,amount`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const dealPhoneData = await dealPhoneResponse.json();
  console.log('phone_number:', dealPhoneData.results[0].properties.phone_number);

  // Проверяем у contact номер телефона
  console.log('\n📇 Contact phone:');
  const contactPhoneResponse = await fetch(
    `${BASE_URL}/crm/v3/objects/contacts?limit=1&properties=phone,email,firstname`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const contactPhoneData = await contactPhoneResponse.json();
  console.log('phone:', contactPhoneData.results[0].properties.phone);

  console.log('\n\n=== ВЫВОДЫ ===');
  console.log('1. Есть ли associations в API? -', deal.associations ? 'ДА ✅' : 'НЕТ ❌');
  console.log('2. Можем связать через phone? -', dealPhoneData.results[0].properties.phone_number ? 'ДА ✅' : 'НЕТ ❌');
  console.log('3. Как лучше хранить связи? - смотрим ниже');
}

checkAssociations().catch(console.error);
