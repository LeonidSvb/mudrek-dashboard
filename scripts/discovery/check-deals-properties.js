import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDealsProperties() {
  console.log('🔍 Checking deals raw_json properties count...\n');

  const { data: deals, error } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, amount, dealstage, raw_json, synced_at')
    .order('synced_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${deals.length} deals\n`);

  deals.forEach((deal, i) => {
    const propsCount = Object.keys(deal.raw_json || {}).length;
    const hasAssociations = !!deal.raw_json?.associations;
    const associationsCount = hasAssociations ? Object.keys(deal.raw_json.associations).length : 0;

    console.log(`${i + 1}. Deal ${deal.hubspot_id}`);
    console.log(`   Amount: $${deal.amount || 0}`);
    console.log(`   Stage: ${deal.dealstage}`);
    console.log(`   Properties in raw_json: ${propsCount}`);
    console.log(`   Has associations: ${hasAssociations} (${associationsCount} types)`);
    console.log(`   Synced at: ${deal.synced_at}\n`);
  });
}

checkDealsProperties().catch(console.error);
