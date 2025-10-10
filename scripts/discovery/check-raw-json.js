import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('=== ПРОВЕРКА RAW_JSON ===\n');

async function checkRawJson() {
  // Берём 1 deal для проверки
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, hubspot_owner_id, raw_json')
    .limit(1);

  if (deals && deals[0]) {
    const deal = deals[0];

    console.log('Deal ID:', deal.hubspot_id);
    console.log('\n--- Колонка hubspot_owner_id (extracted): ---');
    console.log(deal.hubspot_owner_id);

    console.log('\n--- raw_json.hubspot_owner_id (original): ---');
    console.log(deal.raw_json?.hubspot_owner_id);

    console.log('\n--- Все ключи в raw_json: ---');
    console.log(Object.keys(deal.raw_json || {}).sort().join(', '));

    console.log('\n--- Полный raw_json (первые 500 символов): ---');
    console.log(JSON.stringify(deal.raw_json, null, 2).substring(0, 500));
  }

  // Проверим contact
  console.log('\n\n=== CONTACT ===\n');

  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, hubspot_owner_id, raw_json')
    .limit(1);

  if (contacts && contacts[0]) {
    const contact = contacts[0];

    console.log('Contact ID:', contact.hubspot_id);
    console.log('\n--- Колонка hubspot_owner_id (extracted): ---');
    console.log(contact.hubspot_owner_id);

    console.log('\n--- raw_json.hubspot_owner_id (original): ---');
    console.log(contact.raw_json?.hubspot_owner_id);

    console.log('\n--- raw_json.vsl_watched: ---');
    console.log(contact.raw_json?.vsl_watched);

    console.log('\n--- raw_json.sales_script_version: ---');
    console.log(contact.raw_json?.sales_script_version);

    console.log('\n--- Все ключи в raw_json: ---');
    console.log(Object.keys(contact.raw_json || {}).sort().join(', '));
  }
}

checkRawJson().catch(console.error);
