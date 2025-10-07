import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRawJsonOwner() {
  console.log('Проверка raw_json на наличие hubspot_owner_id...\n');

  // Contacts
  console.log('=== CONTACTS ===\n');
  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, raw_json')
    .limit(5);

  contacts?.forEach((c, i) => {
    console.log(`Contact ${i + 1}: ${c.email}`);

    if (c.raw_json) {
      const ownerId = c.raw_json.hubspot_owner_id || c.raw_json.properties?.hubspot_owner_id;
      console.log(`  raw_json keys: ${Object.keys(c.raw_json).slice(0, 10).join(', ')}`);
      console.log(`  hubspot_owner_id: ${ownerId || 'НЕТ'}`);
    } else {
      console.log(`  raw_json: пустой`);
    }
    console.log('');
  });

  // Deals
  console.log('\n=== DEALS ===\n');
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, amount, raw_json')
    .limit(5);

  deals?.forEach((d, i) => {
    console.log(`Deal ${i + 1}: ₪${d.amount}`);

    if (d.raw_json) {
      const ownerId = d.raw_json.hubspot_owner_id || d.raw_json.properties?.hubspot_owner_id;
      console.log(`  raw_json keys: ${Object.keys(d.raw_json).slice(0, 10).join(', ')}`);
      console.log(`  hubspot_owner_id: ${ownerId || 'НЕТ'}`);
    } else {
      console.log(`  raw_json: пустой`);
    }
    console.log('');
  });

  // Вывод
  console.log('\n=== РЕШЕНИЕ ===\n');

  const { data: contactsWithOwner } = await supabase
    .from('hubspot_contacts_raw')
    .select('raw_json')
    .not('raw_json', 'is', null);

  const contactsCount = contactsWithOwner?.filter(c =>
    c.raw_json?.hubspot_owner_id || c.raw_json?.properties?.hubspot_owner_id
  ).length || 0;

  console.log(`Contacts с owner_id в raw_json: ${contactsCount} из ${contactsWithOwner?.length || 0}`);

  if (contactsCount > 0) {
    console.log('\n✅ ОТЛИЧНО! hubspot_owner_id есть в raw_json!');
    console.log('\n🚀 БЫСТРОЕ РЕШЕНИЕ (БЕЗ ре-синка):');
    console.log('\n1. Добавить колонку:');
    console.log(`   ALTER TABLE hubspot_contacts_raw ADD COLUMN hubspot_owner_id TEXT;`);
    console.log(`   ALTER TABLE hubspot_deals_raw ADD COLUMN hubspot_owner_id TEXT;`);
    console.log('\n2. Извлечь из JSONB одним SQL UPDATE:');
    console.log(`   UPDATE hubspot_contacts_raw`);
    console.log(`   SET hubspot_owner_id = raw_json->>'hubspot_owner_id';`);
    console.log('\n   или если в properties:');
    console.log(`   UPDATE hubspot_contacts_raw`);
    console.log(`   SET hubspot_owner_id = raw_json->'properties'->>'hubspot_owner_id';`);
    console.log('\n3. Создать indexes:');
    console.log(`   CREATE INDEX idx_contacts_owner ON hubspot_contacts_raw(hubspot_owner_id);`);
    console.log('\n⏱️  Время: ~30 секунд вместо 10 минут ре-синка!');
  } else {
    console.log('\n❌ raw_json пустой или нет owner_id');
    console.log('Нужен full re-sync с обновленным скриптом');
  }
}

checkRawJsonOwner().catch(console.error);
