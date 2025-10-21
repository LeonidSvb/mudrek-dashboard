require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SALES_MANAGERS = {
  '81280578': 'Abd alslam Sharqawi',
  '726197388': 'Mothanna Alawneh',
  '687247262': "Wala' M Hassan",
  '83618074': 'Bisan Jaffari (Followup)'
};

(async () => {
  console.log('='.repeat(80));
  console.log('MANUAL CALL-TO-CLOSE CALCULATION (via Contact Owner)');
  console.log('='.repeat(80));
  console.log('\nLogic: Deal → Contact → Contact.owner_id = Sales Manager\n');

  const results = [];

  for (const [ownerId, name] of Object.entries(SALES_MANAGERS)) {
    console.log(`\nProcessing ${name}...`);

    // Step 1: Get all deals
    const { data: allDeals } = await supabase
      .from('hubspot_deals_raw')
      .select('hubspot_id, dealname, dealstage, amount, raw_json');

    // Step 2: Filter deals that have contact associations
    const dealsWithContacts = allDeals.filter(d =>
      d.raw_json?.associations?.contacts?.results?.length > 0
    );

    console.log(`  Total deals in system: ${allDeals.length}`);
    console.log(`  Deals with contact associations: ${dealsWithContacts.length}`);

    // Step 3: For each deal, get associated contact and check owner
    let ownerDeals = 0;
    let ownerClosedWon = 0;
    let ownerRevenue = 0;

    for (const deal of dealsWithContacts) {
      const contactId = deal.raw_json.associations.contacts.results[0].id;

      // Get contact owner
      const { data: contact } = await supabase
        .from('hubspot_contacts_raw')
        .select('hubspot_owner_id')
        .eq('hubspot_id', contactId)
        .single();

      if (contact && contact.hubspot_owner_id === ownerId) {
        ownerDeals++;

        if (deal.dealstage === 'closedwon') {
          ownerClosedWon++;
          ownerRevenue += parseFloat(deal.amount) || 0;
        }
      }
    }

    // Step 4: Get calls count for this owner
    const { count: callsCount } = await supabase
      .from('call_contact_matches_mv')
      .select('*', { count: 'exact', head: true })
      .eq('hubspot_owner_id', ownerId);

    const callToCloseRate = callsCount > 0
      ? ((ownerClosedWon / callsCount) * 100).toFixed(2)
      : '0.00';

    const dealConversionRate = ownerDeals > 0
      ? ((ownerClosedWon / ownerDeals) * 100).toFixed(2)
      : '0.00';

    results.push({
      name,
      ownerId,
      calls: callsCount,
      deals: ownerDeals,
      closedWon: ownerClosedWon,
      revenue: ownerRevenue,
      callToCloseRate: parseFloat(callToCloseRate),
      dealConversionRate: parseFloat(dealConversionRate)
    });

    console.log(`  Deals owned by this manager (via contact): ${ownerDeals}`);
    console.log(`  Closed won: ${ownerClosedWon}`);
    console.log(`  Calls made: ${callsCount}`);
    console.log(`  Call-to-Close Rate: ${callToCloseRate}%`);
    console.log(`  Deal Conversion Rate: ${dealConversionRate}%`);
    console.log(`  Revenue: $${ownerRevenue.toFixed(2)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY TABLE');
  console.log('='.repeat(80));
  console.log('\nManager                  | Calls | Deals | Won | Call→Close | Deal Conv | Revenue');
  console.log('-'.repeat(80));

  results.forEach(r => {
    const name = r.name.padEnd(24);
    const calls = String(r.calls).padStart(5);
    const deals = String(r.deals).padStart(5);
    const won = String(r.closedWon).padStart(3);
    const ctc = (r.callToCloseRate + '%').padStart(10);
    const dc = (r.dealConversionRate + '%').padStart(9);
    const rev = ('$' + r.revenue.toFixed(0)).padStart(10);

    console.log(`${name} | ${calls} | ${deals} | ${won} | ${ctc} | ${dc} | ${rev}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('SALES MANAGERS ONLY (exclude Bisan):');
  console.log('='.repeat(80));

  const salesOnly = results.filter(r => !r.name.includes('Bisan'));
  const totalCalls = salesOnly.reduce((sum, r) => sum + r.calls, 0);
  const totalClosedWon = salesOnly.reduce((sum, r) => sum + r.closedWon, 0);
  const totalRevenue = salesOnly.reduce((sum, r) => sum + r.revenue, 0);

  console.log(`Total Calls: ${totalCalls}`);
  console.log(`Total Closed Won: ${totalClosedWon}`);
  console.log(`Team Call-to-Close Rate: ${((totalClosedWon / totalCalls) * 100).toFixed(2)}%`);
  console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION:');
  console.log('='.repeat(80));

  if (totalClosedWon > 0) {
    console.log('✅ YES! This approach works!');
    console.log('   Deal → Contact → Contact.owner_id gives us sales manager attribution');
    console.log('   We can calculate Call-to-Close Rate for each sales manager');
    console.log('\nNext step: Create SQL function to automate this');
  } else {
    console.log('❌ PROBLEM: No closed won deals found via contact owner');
    console.log('   This approach might not work, need to investigate');
  }
})();
