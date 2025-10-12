require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugContact() {
  const phone = '+972528408060';
  const hubspotId = '44890341';
  const supabaseId = '162944314788';

  console.log('🔍 Debugging Contact Email Issue\n');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Проверим в HubSpot API по ID
  console.log('📡 HubSpot API - по ID:', hubspotId, '\n');

  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}?properties=email,firstname,lastname,phone,hs_full_name_or_email`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const contact = await response.json();
      console.log('✅ Контакт найден в HubSpot:');
      console.log('  ID:', contact.id);
      console.log('  Email (property):', contact.properties.email || 'NULL');
      console.log('  hs_full_name_or_email:', contact.properties.hs_full_name_or_email || 'NULL');
      console.log('  Firstname:', contact.properties.firstname || 'NULL');
      console.log('  Lastname:', contact.properties.lastname || 'NULL');
      console.log('  Phone:', contact.properties.phone || 'NULL');
      console.log('');
      console.log('  Все properties:');
      Object.keys(contact.properties).forEach(key => {
        if (key.includes('email') || key.includes('mail')) {
          console.log(`    ${key}: ${contact.properties[key]}`);
        }
      });
    } else {
      console.log('❌ Контакт НЕ НАЙДЕН в HubSpot по ID:', hubspotId);
      console.log('   Status:', response.status);
    }
  } catch (error) {
    console.log('❌ HubSpot API Error:', error.message);
  }

  // 2. Поищем в HubSpot по телефону (search API)
  console.log('\n📡 HubSpot API - поиск по телефону:', phone, '\n');

  try {
    const searchBody = {
      filterGroups: [{
        filters: [{
          propertyName: 'phone',
          operator: 'EQ',
          value: phone
        }]
      }],
      properties: ['email', 'firstname', 'lastname', 'phone', 'hs_full_name_or_email']
    };

    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchBody)
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`✅ Найдено контактов по телефону: ${searchData.total}\n`);

      searchData.results.forEach((contact, i) => {
        console.log(`  Contact ${i + 1}:`);
        console.log('    ID:', contact.id);
        console.log('    Email:', contact.properties.email || 'NULL');
        console.log('    hs_full_name_or_email:', contact.properties.hs_full_name_or_email || 'NULL');
        console.log('    Name:', contact.properties.firstname || '?', contact.properties.lastname || '?');
        console.log('    Phone:', contact.properties.phone);
        console.log('');
      });
    } else {
      console.log('❌ Search failed:', searchResponse.status);
    }
  } catch (error) {
    console.log('❌ HubSpot Search Error:', error.message);
  }

  // 3. Проверим в Supabase по телефону
  console.log('\n💾 Supabase - поиск по телефону:', phone, '\n');

  const { data: supabaseContacts, error: supabaseError } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, firstname, lastname, phone, raw_json')
    .eq('phone', phone);

  if (supabaseError) {
    console.log('❌ Supabase Error:', supabaseError.message);
  } else if (supabaseContacts.length === 0) {
    console.log('❌ Контакт НЕ НАЙДЕН в Supabase по телефону');
  } else {
    console.log(`✅ Найдено в Supabase: ${supabaseContacts.length}\n`);

    supabaseContacts.forEach((contact, i) => {
      console.log(`  Contact ${i + 1}:`);
      console.log('    hubspot_id:', contact.hubspot_id);
      console.log('    email:', contact.email || 'NULL');
      console.log('    firstname:', contact.firstname || 'NULL');
      console.log('    lastname:', contact.lastname || 'NULL');
      console.log('    phone:', contact.phone);

      // Проверим raw_json
      if (contact.raw_json) {
        const emailInRaw = contact.raw_json.email;
        const hsFullName = contact.raw_json.hs_full_name_or_email;
        console.log('    raw_json.email:', emailInRaw || 'NULL');
        console.log('    raw_json.hs_full_name_or_email:', hsFullName || 'NULL');
      }
      console.log('');
    });
  }

  // 4. Проверим по ID из Supabase
  console.log('\n💾 Supabase - по ID:', supabaseId, '\n');

  const { data: byId, error: idError } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, firstname, lastname, phone, raw_json')
    .eq('hubspot_id', supabaseId)
    .single();

  if (idError) {
    console.log('❌ Контакт НЕ НАЙДЕН по ID:', supabaseId);
  } else {
    console.log('✅ Контакт найден:');
    console.log('  hubspot_id:', byId.hubspot_id);
    console.log('  email:', byId.email || 'NULL');
    console.log('  phone:', byId.phone);
    if (byId.raw_json?.email) {
      console.log('  raw_json.email:', byId.raw_json.email);
    }
    if (byId.raw_json?.hs_full_name_or_email) {
      console.log('  raw_json.hs_full_name_or_email:', byId.raw_json.hs_full_name_or_email);
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 ВЫВОДЫ:\n');

  console.log('1. ID в HubSpot vs Supabase:');
  console.log(`   HubSpot показывает: ${hubspotId}`);
  console.log(`   Supabase имеет: ${supabaseId}`);
  console.log('   → Возможно это разные контакты (дубли по телефону)');
  console.log('');

  console.log('2. Email проблема:');
  console.log('   → Проверяем какое поле содержит email в HubSpot API');
  console.log('   → properties.email или hs_full_name_or_email?');
  console.log('');

  console.log('3. Следующий шаг:');
  console.log('   → Обновить sync script использовать правильное email поле');
  console.log('   → Re-sync всех контактов');
  console.log('═══════════════════════════════════════════════');
}

debugContact().catch(console.error);
