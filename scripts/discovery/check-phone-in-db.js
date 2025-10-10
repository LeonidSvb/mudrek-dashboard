import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhoneField() {
  console.log('🔍 Checking if phone field is in raw_json...\n');

  // Get 10 random contacts
  const { data: contacts, error } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, phone, firstname, raw_json')
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${contacts.length} contacts\n`);

  contacts.forEach((contact, i) => {
    const hasPhoneColumn = !!contact.phone;
    const hasPhoneInRawJson = !!contact.raw_json?.phone;
    const hasMobileInRawJson = !!contact.raw_json?.mobilephone;
    const rawJsonKeys = Object.keys(contact.raw_json || {}).length;

    console.log(`${i + 1}. ${contact.firstname || 'No name'} (${contact.hubspot_id})`);
    console.log(`   phone column: ${hasPhoneColumn ? contact.phone : 'NULL'}`);
    console.log(`   raw_json.phone: ${hasPhoneInRawJson ? contact.raw_json.phone : 'NULL'}`);
    console.log(`   raw_json.mobilephone: ${hasMobileInRawJson ? contact.raw_json.mobilephone : 'NULL'}`);
    console.log(`   raw_json properties count: ${rawJsonKeys}`);
    console.log('');
  });

  // Summary
  const withPhone = contacts.filter(c => c.raw_json?.phone || c.raw_json?.mobilephone).length;
  console.log(`📊 Summary:`);
  console.log(`   Contacts with phone in raw_json: ${withPhone}/${contacts.length}`);
  console.log(`   Percentage: ${((withPhone / contacts.length) * 100).toFixed(1)}%`);
}

checkPhoneField().catch(console.error);
