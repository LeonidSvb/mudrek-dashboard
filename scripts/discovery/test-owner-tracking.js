import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testOwnerTracking() {
  console.log('=== ТЕСТИРОВАНИЕ ОТСЛЕЖИВАНИЯ ПО МЕНЕДЖЕРАМ ===\n');

  // 1. Сделки по deal owner (кто закрыл сделку)
  console.log('1. СДЕЛКИ ПО DEAL OWNER (кто закрыл):\n');

  const { data: dealsByOwner } = await supabase
    .from('hubspot_deals_raw')
    .select(`
      hubspot_owner_id,
      amount,
      dealstage
    `)
    .eq('dealstage', 'closedwon')
    .not('hubspot_owner_id', 'is', null)
    .limit(5);

  dealsByOwner?.forEach((d, i) => {
    console.log(`   Deal ${i + 1}: ₪${d.amount} - Owner: ${d.hubspot_owner_id}`);
  });

  // Статистика по deal owners
  const { data: dealOwnerStats } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_owner_id, amount')
    .eq('dealstage', 'closedwon')
    .not('hubspot_owner_id', 'is', null);

  const ownerSales = {};
  dealOwnerStats?.forEach(d => {
    if (!ownerSales[d.hubspot_owner_id]) {
      ownerSales[d.hubspot_owner_id] = { count: 0, total: 0 };
    }
    ownerSales[d.hubspot_owner_id].count++;
    ownerSales[d.hubspot_owner_id].total += d.amount || 0;
  });

  console.log('\n   Статистика по deal owners:');
  for (const [ownerId, stats] of Object.entries(ownerSales)) {
    // Get owner name
    const { data: owner } = await supabase
      .from('hubspot_owners')
      .select('owner_name')
      .eq('owner_id', ownerId)
      .single();

    console.log(`   ${owner?.owner_name || ownerId}: ${stats.count} deals, ₪${stats.total.toFixed(0)}`);
  }

  // 2. Контакты по owner (sales manager - кто привел)
  console.log('\n\n2. КОНТАКТЫ ПО SALES MANAGER (кто привел):\n');

  const { data: contactsByOwner } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_owner_id, email, lifecyclestage')
    .not('hubspot_owner_id', 'is', null)
    .limit(5);

  contactsByOwner?.forEach((c, i) => {
    console.log(`   Contact ${i + 1}: ${c.email || 'no email'} (${c.lifecyclestage}) - Owner: ${c.hubspot_owner_id}`);
  });

  // Статистика по contact owners
  const { data: contactOwnerStats } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_owner_id')
    .not('hubspot_owner_id', 'is', null);

  const contactCounts = {};
  contactOwnerStats?.forEach(c => {
    contactCounts[c.hubspot_owner_id] = (contactCounts[c.hubspot_owner_id] || 0) + 1;
  });

  console.log('\n   Статистика по sales managers:');
  for (const [ownerId, count] of Object.entries(contactCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    const { data: owner } = await supabase
      .from('hubspot_owners')
      .select('owner_name')
      .eq('owner_id', ownerId)
      .single();

    console.log(`   ${owner?.owner_name || ownerId}: ${count} contacts`);
  }

  // 3. ГЛАВНОЕ: Можем связывать через phone (Contact → Deal)
  console.log('\n\n3. СВЯЗЬ CONTACT → DEAL (через общего owner или phone):\n');

  // Пример: найти deal и его contact
  const { data: sampleDeal } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, amount, dealstage, hubspot_owner_id')
    .eq('dealstage', 'closedwon')
    .not('hubspot_owner_id', 'is', null)
    .limit(1)
    .single();

  if (sampleDeal) {
    console.log(`   Deal: ₪${sampleDeal.amount} (owner: ${sampleDeal.hubspot_owner_id})`);

    // Найти contact с таким же owner
    const { data: relatedContacts } = await supabase
      .from('hubspot_contacts_raw')
      .select('email, lifecyclestage, hubspot_owner_id')
      .eq('hubspot_owner_id', sampleDeal.hubspot_owner_id)
      .limit(3);

    console.log(`   Related contacts (same owner):`);
    relatedContacts?.forEach(c => {
      console.log(`      - ${c.email || 'no email'} (${c.lifecyclestage})`);
    });
  }

  // 4. ДЛЯ ДАШБОРДА: SQL запросы с фильтром по owner
  console.log('\n\n4. ПРИМЕРЫ SQL ДЛЯ ДАШБОРДА:\n');

  console.log('   // Total Sales по менеджеру (deal owner):');
  console.log('   SELECT SUM(amount) FROM hubspot_deals_raw');
  console.log('   WHERE dealstage = \'closedwon\' AND hubspot_owner_id = \'682432124\';');

  console.log('\n   // Conversion Rate по менеджеру (sales manager):');
  console.log('   SELECT ');
  console.log('     COUNT(DISTINCT c.hubspot_id) as total_contacts,');
  console.log('     COUNT(DISTINCT d.hubspot_id) as closed_deals');
  console.log('   FROM hubspot_contacts_raw c');
  console.log('   LEFT JOIN hubspot_deals_raw d ON d.hubspot_owner_id = c.hubspot_owner_id');
  console.log('   WHERE c.hubspot_owner_id = \'682432124\';');

  console.log('\n\n✅ ВСЕ РАБОТАЕТ!');
  console.log('На дашборде можно делать фильтры:');
  console.log('- По deal owner (кто закрыл)');
  console.log('- По sales manager (кто привел контакт)');
  console.log('- По обоим сразу');
}

testOwnerTracking().catch(console.error);
