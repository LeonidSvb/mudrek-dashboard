const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDeals() {
  console.log('=== CHECKING DEALS COUNT DISCREPANCY ===\n');

  // Fetch all deals
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealstage, amount, closedate');

  const closedwon = deals.filter(d => d.dealstage === 'closedwon');
  const closedwonWithAmount = closedwon.filter(d => d.amount > 0);
  const totalAmount = closedwon.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const uniqueIds = new Set(closedwon.map(d => d.hubspot_id)).size;

  console.log('Manual JavaScript calculation:');
  console.log('  Total deals in table:', deals.length);
  console.log('  Deals with dealstage=closedwon:', closedwon.length);
  console.log('  Closedwon with amount > 0:', closedwonWithAmount.length);
  console.log('  Total sales amount:', totalAmount);
  console.log('  Unique hubspot_ids (closedwon):', uniqueIds);

  // Check for NULL closedates
  const withClosedate = closedwon.filter(d => d.closedate).length;
  const withoutClosedate = closedwon.filter(d => !d.closedate).length;
  console.log('  With closedate:', withClosedate);
  console.log('  Without closedate (NULL):', withoutClosedate);

  // Check duplicates
  const allIds = closedwon.map(d => d.hubspot_id);
  const duplicates = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  console.log('  Duplicate hubspot_ids:', duplicates.length);

  if (duplicates.length > 0) {
    console.log('\nDuplicate IDs found:', Array.from(new Set(duplicates)).slice(0, 5));
  }

  console.log('\n=== SQL FUNCTION RESULT ===\n');

  const { data: metrics } = await supabase
    .rpc('get_all_metrics')
    .single();

  console.log('SQL Function says:');
  console.log('  totalDeals:', metrics.totalDeals);
  console.log('  totalSales:', metrics.totalSales);

  console.log('\n=== DISCREPANCY ===');
  console.log('  Expected (JS):', closedwon.length);
  console.log('  Actual (SQL):', metrics.totalDeals);
  console.log('  Difference:', metrics.totalDeals - closedwon.length);
}

checkDeals();
