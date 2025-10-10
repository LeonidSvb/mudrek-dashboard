import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('=== ПРОВЕРКА OWNERS В CONTACTS ===\n');

async function checkContactOwners() {
  // Всего контактов
  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  console.log(`Всего контактов: ${totalContacts}`);

  // Контакты с owner в raw_json
  const { data: contactsWithOwner } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, raw_json')
    .not('raw_json->hubspot_owner_id', 'is', null)
    .not('raw_json->hubspot_owner_id', 'eq', '');

  console.log(`\nКонтакты с owner_id в raw_json: ${contactsWithOwner?.length || 0}`);
  console.log(`Контакты БЕЗ owner: ${totalContacts - (contactsWithOwner?.length || 0)}`);

  const percentWithOwner = ((contactsWithOwner?.length || 0) / totalContacts * 100).toFixed(1);
  console.log(`\nПроцент с owner: ${percentWithOwner}%`);

  // Покажем несколько примеров с owner
  if (contactsWithOwner && contactsWithOwner.length > 0) {
    console.log(`\n--- Примеры контактов С owner: ---`);
    contactsWithOwner.slice(0, 5).forEach(c => {
      console.log(`  Contact ${c.hubspot_id}: owner = ${c.raw_json.hubspot_owner_id}`);
    });
  }

  // Проверим deals для сравнения
  console.log('\n\n=== СРАВНЕНИЕ С DEALS ===\n');

  const { count: totalDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  const { data: dealsWithOwner } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, raw_json')
    .not('raw_json->hubspot_owner_id', 'is', null)
    .not('raw_json->hubspot_owner_id', 'eq', '');

  console.log(`Всего deals: ${totalDeals}`);
  console.log(`Deals с owner: ${dealsWithOwner?.length || 0}`);
  console.log(`Deals БЕЗ owner: ${totalDeals - (dealsWithOwner?.length || 0)}`);

  const dealPercentWithOwner = ((dealsWithOwner?.length || 0) / totalDeals * 100).toFixed(1);
  console.log(`Процент с owner: ${dealPercentWithOwner}%`);

  console.log('\n=== ВЫВОД ===');
  console.log(`\nКонтакты: только ${percentWithOwner}% с owner`);
  console.log(`Deals: ${dealPercentWithOwner}% с owner`);
  console.log(`\nЭто НОРМАЛЬНО для HubSpot - не все контакты имеют назначенного менеджера.`);
}

checkContactOwners().catch(console.error);
