/**
 * Check closedate distribution in deals
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCloseDates() {
  console.log('Checking closedate distribution...\n');

  // Get all closed won deals with closedate
  const { data: deals, error } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, closedate, dealstage, hubspot_owner_id')
    .eq('dealstage', 'closedwon')
    .not('closedate', 'is', null)
    .order('closedate', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total closed won deals: ${deals.length}`);
  console.log('\nMost recent 20 deals:');
  console.log('');

  deals.forEach((deal, i) => {
    const date = new Date(deal.closedate);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`${i + 1}. ${date.toISOString().split('T')[0]} (${daysAgo} days ago) - Owner: ${deal.hubspot_owner_id}`);
  });

  // Check date ranges
  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  console.log('\n\nDate range analysis:');
  console.log(`Today: ${now.toISOString().split('T')[0]}`);
  console.log(`7 days ago: ${last7d.toISOString().split('T')[0]}`);
  console.log(`30 days ago: ${last30d.toISOString().split('T')[0]}`);
  console.log(`90 days ago: ${last90d.toISOString().split('T')[0]}`);

  // Count deals in each range
  const { count: count7d } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .gte('closedate', last7d.toISOString());

  const { count: count30d } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .gte('closedate', last30d.toISOString());

  const { count: count90d } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .gte('closedate', last90d.toISOString());

  console.log('\nDeals by date range:');
  console.log(`Last 7 days: ${count7d} deals`);
  console.log(`Last 30 days: ${count30d} deals`);
  console.log(`Last 90 days: ${count90d} deals`);
  console.log(`All time: 1143 deals`);

  if (count7d === 0 && count30d === 0 && count90d === 0) {
    console.log('\n⚠️ WARNING: All deals are older than 90 days!');
    console.log('Date filters won\'t show any difference.');
  }
}

checkCloseDates();
