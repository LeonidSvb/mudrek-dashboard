const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv/config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateFunction() {
  console.log('Updating get_all_metrics function...\n');

  const sql = readFileSync(
    join(__dirname, '../../migrations/005_create_metrics_function.sql'),
    'utf8'
  );

  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('✓ Function updated successfully!');
  console.log('\nTesting with 7 days filter...');

  const testDate = new Date();
  testDate.setDate(testDate.getDate() - 7);

  const { data: metrics, error: metricsError } = await supabase
    .rpc('get_all_metrics', {
      p_owner_id: null,
      p_date_from: testDate.toISOString(),
      p_date_to: new Date().toISOString()
    })
    .single();

  if (metricsError) {
    console.error('Metrics error:', metricsError.message);
    process.exit(1);
  }

  console.log('Total Contacts (7 days):', metrics.totalContacts);
  console.log('Total Deals (7 days):', metrics.totalDeals);
  console.log('Total Calls (7 days):', metrics.totalCalls);
}

updateFunction().catch(console.error);
