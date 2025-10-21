require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('Testing timeline function...\n');

  const start = Date.now();

  const { data, error } = await supabase.rpc('get_metrics_timeline', {
    p_owner_id: null,
    p_date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_date_to: new Date().toISOString(),
    p_granularity: 'daily'
  });

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  if (error) {
    console.error('ERROR:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }

  console.log('SUCCESS: Timeline function works!');
  console.log(`Duration: ${duration}s (was timing out at 10s)`);
  console.log(`Sales points: ${data.sales?.length || 0}`);
  console.log(`Calls points: ${data.calls?.length || 0}`);

  if (data.calls?.length > 0) {
    const totalCalls = data.calls.reduce((sum, d) => sum + (d.value || 0), 0);
    console.log(`Total calls in data: ${totalCalls}`);
  }

  console.log('\nNow testing via API endpoint...');

  const apiStart = Date.now();
  const response = await fetch('http://localhost:3000/api/metrics/timeline?date_from=2025-09-21&date_to=2025-10-21');
  const apiDuration = ((Date.now() - apiStart) / 1000).toFixed(1);

  if (!response.ok) {
    console.error(`API ERROR: ${response.status}`);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const apiData = await response.json();
  console.log(`SUCCESS: API works! Duration: ${apiDuration}s`);
  console.log(`API Sales points: ${apiData.sales?.length || 0}`);
  console.log(`API Calls points: ${apiData.calls?.length || 0}`);
})();
