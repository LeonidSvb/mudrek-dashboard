require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('Analyzing owner activity...\n');

  // Get all unique owner IDs
  const { data: owners } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_owner_id')
    .not('hubspot_owner_id', 'is', null);

  const ownerIds = [...new Set(owners.map(o => o.hubspot_owner_id))];

  console.log(`Found ${ownerIds.length} unique owners\n`);
  console.log('='.repeat(80));

  const stats = [];

  for (const ownerId of ownerIds) {
    // Count calls
    const { count: callCount } = await supabase
      .from('hubspot_calls_raw')
      .select('*', { count: 'exact', head: true })
      .eq('hubspot_owner_id', ownerId);

    // Count contacts
    const { count: contactCount } = await supabase
      .from('hubspot_contacts_raw')
      .select('*', { count: 'exact', head: true })
      .eq('hubspot_owner_id', ownerId);

    // Get deals
    const { data: deals } = await supabase
      .from('hubspot_deals_raw')
      .select('dealstage')
      .eq('hubspot_owner_id', ownerId);

    const totalDeals = deals?.length || 0;
    const closedWon = deals?.filter(d => d.dealstage === 'closedwon').length || 0;

    const callToCloseRate = callCount > 0 ? ((closedWon / callCount) * 100).toFixed(2) : 0;

    stats.push({
      ownerId,
      calls: callCount || 0,
      contacts: contactCount || 0,
      deals: totalDeals,
      closedWon,
      callToCloseRate
    });
  }

  // Sort by calls descending
  stats.sort((a, b) => b.calls - a.calls);

  stats.forEach(s => {
    console.log(`\nOwner ID: ${s.ownerId}`);
    console.log(`  Calls: ${s.calls}`);
    console.log(`  Contacts: ${s.contacts}`);
    console.log(`  Total Deals: ${s.deals}`);
    console.log(`  Closed Won: ${s.closedWon}`);
    console.log(`  Call-to-Close Rate: ${s.callToCloseRate}%`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\nSALES MANAGERS (Wala, Mothana, Abd Elsalam):');
  console.log('Need to map owner IDs to names first');
})();
