import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRelationships() {
  console.log('Проверка связей между Contact → Deal и Owner fields...\n');

  // 1. Проверить есть ли hubspot_owner_id в contacts
  console.log('=== CONTACTS - Owner Info ===\n');
  const { data: contactSample } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, firstname, lastname, raw_json')
    .not('email', 'is', null)
    .limit(3);

  contactSample?.forEach((contact, i) => {
    console.log(`Contact ${i + 1}: ${contact.firstname} ${contact.lastname} (${contact.email})`);

    if (contact.raw_json?.properties) {
      const props = contact.raw_json.properties;
      const ownerId = props.hubspot_owner_id;
      console.log(`  → hubspot_owner_id: ${ownerId || 'НЕТ'}`);
    }

    // Проверить associations
    if (contact.raw_json?.associations) {
      console.log(`  → Associations:`, Object.keys(contact.raw_json.associations));

      if (contact.raw_json.associations.deals) {
        console.log(`    - Deals: ${contact.raw_json.associations.deals.results?.length || 0} связей`);
      }
    } else {
      console.log(`  → Associations: НЕТ ДАННЫХ`);
    }
    console.log('');
  });

  // 2. Проверить есть ли hubspot_owner_id в deals
  console.log('\n=== DEALS - Owner Info ===\n');
  const { data: dealSample } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, amount, dealstage, raw_json')
    .eq('dealstage', 'closedwon')
    .limit(3);

  dealSample?.forEach((deal, i) => {
    console.log(`Deal ${i + 1}: ₪${deal.amount} (${deal.dealstage})`);

    if (deal.raw_json?.properties) {
      const props = deal.raw_json.properties;
      const ownerId = props.hubspot_owner_id;
      const dealname = props.dealname;
      console.log(`  → Deal name: ${dealname || 'N/A'}`);
      console.log(`  → hubspot_owner_id: ${ownerId || 'НЕТ'}`);
    }

    // Проверить associations с contacts
    if (deal.raw_json?.associations) {
      console.log(`  → Associations:`, Object.keys(deal.raw_json.associations));

      if (deal.raw_json.associations.contacts) {
        console.log(`    - Contacts: ${deal.raw_json.associations.contacts.results?.length || 0} связей`);
      }
    } else {
      console.log(`  → Associations: НЕТ ДАННЫХ`);
    }
    console.log('');
  });

  // 3. Проверить сколько unique owners
  console.log('\n=== СТАТИСТИКА OWNERS ===\n');

  const { data: allContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('raw_json');

  const contactOwners = new Set();
  allContacts?.forEach(c => {
    const ownerId = c.raw_json?.properties?.hubspot_owner_id;
    if (ownerId) contactOwners.add(ownerId);
  });

  console.log(`Unique contact owners: ${contactOwners.size}`);
  console.log(`Owner IDs:`, Array.from(contactOwners).slice(0, 10));

  const { data: allDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('raw_json');

  const dealOwners = new Set();
  allDeals?.forEach(d => {
    const ownerId = d.raw_json?.properties?.hubspot_owner_id;
    if (ownerId) dealOwners.add(ownerId);
  });

  console.log(`\nUnique deal owners: ${dealOwners.size}`);
  console.log(`Owner IDs:`, Array.from(dealOwners).slice(0, 10));

  // 4. Рекомендации
  console.log('\n=== ВЫВОД И РЕКОМЕНДАЦИИ ===\n');
  console.log('Для фильтра по менеджерам в дашборде нужно:');
  console.log('');
  console.log('1. Добавить колонку hubspot_owner_id в таблицы (извлечь из raw_json)');
  console.log('   - contacts: sales manager (ведет лида)');
  console.log('   - deals: account manager (ведет сделку)');
  console.log('');
  console.log('2. Создать таблицу owners с именами менеджеров:');
  console.log('   - owner_id');
  console.log('   - owner_name');
  console.log('   - owner_email');
  console.log('');
  console.log('3. На дашборде добавить фильтр:');
  console.log('   - "Sales Manager" (по contact owner)');
  console.log('   - "Account Manager" (по deal owner)');
  console.log('   - Опция показать оба или только один');
  console.log('');
  console.log('4. Для метрик типа "Conversion Rate" - фильтровать по sales manager');
  console.log('   (т.к. это метрика эффективности привлечения)');
  console.log('');
  console.log('5. Для метрик типа "Total Sales" - можно фильтровать по обоим:');
  console.log('   - Who closed the deal? (deal owner)');
  console.log('   - Who brought the lead? (contact owner)');
}

checkRelationships().catch(console.error);
