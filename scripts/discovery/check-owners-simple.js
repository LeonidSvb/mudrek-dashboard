import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('=== ПРОСТАЯ ПРОВЕРКА ===\n');

async function simpleCheck() {
  // Берём первые 10 deals и смотрим руками
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, hubspot_owner_id, raw_json')
    .order('closedate', { ascending: false })
    .limit(20);

  console.log('Первые 20 deals (по closedate desc):\n');

  let withOwnerInColumn = 0;
  let withOwnerInJson = 0;

  deals?.forEach((deal, i) => {
    const ownerFromColumn = deal.hubspot_owner_id;
    const ownerFromJson = deal.raw_json?.hubspot_owner_id;

    console.log(`${i + 1}. Deal ${deal.hubspot_id}:`);
    console.log(`   Колонка owner: "${ownerFromColumn}" (${typeof ownerFromColumn})`);
    console.log(`   JSON owner: "${ownerFromJson}" (${typeof ownerFromJson})`);

    if (ownerFromColumn) withOwnerInColumn++;
    if (ownerFromJson && ownerFromJson !== '' && ownerFromJson !== null) withOwnerInJson++;
  });

  console.log(`\n=== ИТОГО ===`);
  console.log(`Deals с owner в колонке: ${withOwnerInColumn}/20`);
  console.log(`Deals с owner в raw_json: ${withOwnerInJson}/20`);

  // Проверим contacts тоже
  console.log('\n\n=== CONTACTS ===\n');

  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, hubspot_owner_id, raw_json')
    .limit(10);

  let contactsWithOwnerInColumn = 0;
  let contactsWithOwnerInJson = 0;

  contacts?.forEach((contact, i) => {
    const ownerFromColumn = contact.hubspot_owner_id;
    const ownerFromJson = contact.raw_json?.hubspot_owner_id;

    console.log(`${i + 1}. Contact ${contact.hubspot_id}:`);
    console.log(`   Колонка: "${ownerFromColumn}"`);
    console.log(`   JSON: "${ownerFromJson}"`);

    if (ownerFromColumn) contactsWithOwnerInColumn++;
    if (ownerFromJson && ownerFromJson !== '' && ownerFromJson !== null) contactsWithOwnerInJson++;
  });

  console.log(`\n=== ИТОГО ===`);
  console.log(`Contacts с owner в колонке: ${contactsWithOwnerInColumn}/10`);
  console.log(`Contacts с owner в raw_json: ${contactsWithOwnerInJson}/10`);
}

simpleCheck().catch(console.error);
