import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAvailableFields() {
  console.log('Checking available fields in Supabase tables...\n');

  // Check contacts
  console.log('=== CONTACTS ===');
  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*')
    .limit(1);

  if (contacts && contacts.length > 0) {
    const contact = contacts[0];
    console.log('Columns:', Object.keys(contact).filter(k => k !== 'raw_json'));
    console.log('\nSample raw_json keys:', Object.keys(contact.raw_json?.properties || {}).slice(0, 20));
  }

  // Check deals
  console.log('\n\n=== DEALS ===');
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('*')
    .limit(1);

  if (deals && deals.length > 0) {
    const deal = deals[0];
    console.log('Columns:', Object.keys(deal).filter(k => k !== 'raw_json'));
    console.log('\nSample raw_json keys:', Object.keys(deal.raw_json?.properties || {}).slice(0, 20));
  }

  // Check calls
  console.log('\n\n=== CALLS ===');
  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('*')
    .limit(1);

  if (calls && calls.length > 0) {
    const call = calls[0];
    console.log('Columns:', Object.keys(call).filter(k => k !== 'raw_json'));
    console.log('\nSample raw_json keys:', Object.keys(call.raw_json?.properties || {}).slice(0, 20));
  }

  // Check what we can calculate
  console.log('\n\n=== AVAILABLE METRICS (из dashboard-design.md) ===\n');

  // Total Sales
  const { data: salesData } = await supabase
    .from('hubspot_deals_raw')
    .select('amount, dealstage')
    .eq('dealstage', 'closedwon');

  const total = salesData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  console.log('1. Total Sales:', total > 0 ? `$${total.toFixed(2)}` : 'NO DATA (dealstage=closedwon not found)');

  // Average Deal Size
  const avg = salesData && salesData.length > 0
    ? salesData.reduce((sum, d) => sum + (d.amount || 0), 0) / salesData.length
    : 0;
  console.log('2. Average Deal Size:', avg > 0 ? `$${avg.toFixed(2)}` : 'NO DATA');

  // Total Deals
  const { count: totalDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true });
  console.log('3. Total Deals:', totalDeals);

  // Conversion Rate (Contacts -> Deals)
  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });
  const conversionRate = totalContacts > 0 ? (totalDeals / totalContacts * 100).toFixed(2) : 0;
  console.log('4. Conversion Rate:', `${conversionRate}%`);

  // Average Call Time
  const { data: callsData } = await supabase
    .from('hubspot_calls_raw')
    .select('call_duration')
    .not('call_duration', 'is', null)
    .limit(1000);

  const avgCallTime = callsData && callsData.length > 0
    ? callsData.reduce((sum, c) => sum + (c.call_duration || 0), 0) / callsData.length / 60000
    : 0;
  console.log('5. Average Call Time:', avgCallTime > 0 ? `${avgCallTime.toFixed(2)} min` : 'NO DATA');

  console.log('\nВывод: Делаем дашборд с метриками которые доступны прямо сейчас!');
}

checkAvailableFields().catch(console.error);
