require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('Checking association coverage...\n');

  const { data: allDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealstage, raw_json');

  const total = allDeals.length;
  const withAssociations = allDeals.filter(d =>
    d.raw_json?.associations?.contacts?.results?.length > 0
  ).length;
  const withoutAssociations = total - withAssociations;

  console.log('OVERALL:');
  console.log(`  Total deals: ${total}`);
  console.log(`  With contact associations: ${withAssociations} (${(withAssociations/total*100).toFixed(1)}%)`);
  console.log(`  WITHOUT associations: ${withoutAssociations} (${(withoutAssociations/total*100).toFixed(1)}%)`);

  console.log('\nCLOSED WON ONLY:');
  const closedWon = allDeals.filter(d => d.dealstage === 'closedwon');
  const closedWonWithAssoc = closedWon.filter(d =>
    d.raw_json?.associations?.contacts?.results?.length > 0
  ).length;

  console.log(`  Total closed won: ${closedWon.length}`);
  console.log(`  With associations: ${closedWonWithAssoc} (${(closedWonWithAssoc/closedWon.length*100).toFixed(1)}%)`);
  console.log(`  WITHOUT: ${closedWon.length - closedWonWithAssoc} (${((closedWon.length - closedWonWithAssoc)/closedWon.length*100).toFixed(1)}%)`);

  if (withoutAssociations > 0) {
    console.log('\n⚠️  PROBLEM:');
    console.log(`${withoutAssociations} deals don't have contact associations in raw_json`);
    console.log('\nPossible reasons:');
    console.log('1. Not included in DEAL_ASSOCIATIONS when syncing');
    console.log('2. Deals created without contacts');
    console.log('3. Associations not synced yet');
  }

  console.log('\n✅ SOLUTION WORKS IF:');
  console.log('- We include "contacts" in DEAL_ASSOCIATIONS (CHECK THIS)');
  console.log('- Most deals have contact associations (>80%)');
})();
