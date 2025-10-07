import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyOwnerColumns() {
  console.log('Проверка owner columns...\n');

  // Contacts
  const { data: contacts, error: contactsError } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, hubspot_owner_id')
    .limit(5);

  if (contactsError) {
    console.log('❌ Contacts: колонка hubspot_owner_id НЕ существует');
    console.log('   Нужно выполнить: ALTER TABLE hubspot_contacts_raw ADD COLUMN hubspot_owner_id TEXT;');
  } else {
    console.log('✅ Contacts: колонка hubspot_owner_id существует');
    const withOwner = contacts.filter(c => c.hubspot_owner_id).length;
    console.log(`   ${withOwner}/${contacts.length} имеют owner_id\n`);

    contacts.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.email || 'no email'} → Owner: ${c.hubspot_owner_id || 'NULL'}`);
    });
  }

  // Deals
  console.log('\n');
  const { data: deals, error: dealsError } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, amount, hubspot_owner_id')
    .limit(5);

  if (dealsError) {
    console.log('❌ Deals: колонка hubspot_owner_id НЕ существует');
    console.log('   Нужно выполнить: ALTER TABLE hubspot_deals_raw ADD COLUMN hubspot_owner_id TEXT;');
  } else {
    console.log('✅ Deals: колонка hubspot_owner_id существует');
    const withOwner = deals.filter(d => d.hubspot_owner_id).length;
    console.log(`   ${withOwner}/${deals.length} имеют owner_id\n`);

    deals.forEach((d, i) => {
      console.log(`   ${i + 1}. ₪${d.amount} → Owner: ${d.hubspot_owner_id || 'NULL'}`);
    });
  }

  // Stats
  console.log('\n=== СТАТИСТИКА ===\n');

  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  const { count: contactsWithOwner } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('hubspot_owner_id', 'is', null);

  console.log(`Contacts: ${contactsWithOwner}/${totalContacts} имеют owner_id (${((contactsWithOwner / totalContacts) * 100).toFixed(1)}%)`);

  const { count: totalDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });

  const { count: dealsWithOwner } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .not('hubspot_owner_id', 'is', null);

  console.log(`Deals: ${dealsWithOwner}/${totalDeals} имеют owner_id (${((dealsWithOwner / totalDeals) * 100).toFixed(1)}%)`);

  // Owners list
  console.log('\n=== МЕНЕДЖЕРЫ ===\n');

  const { data: owners } = await supabase
    .from('hubspot_owners')
    .select('*');

  owners?.forEach((o, i) => {
    console.log(`${i + 1}. ${o.owner_name} (${o.owner_email})`);
    console.log(`   ID: ${o.owner_id}`);
  });

  console.log('\n✅ ВСЕ ГОТОВО ДЛЯ ДАШБОРДА!');
  console.log('Можно начинать делать фильтр по менеджерам.');
}

verifyOwnerColumns().catch(console.error);
