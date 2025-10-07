import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

let lastCount = 0;

async function checkProgress() {
  const { count: callsWithPhone } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true })
    .not('call_to_number', 'is', null);

  const { count: totalCalls } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true });

  const progress = totalCalls > 0 ? ((callsWithPhone / 118931) * 100).toFixed(1) : 0;
  const delta = callsWithPhone - lastCount;

  console.clear();
  console.log('=== LIVE SYNC MONITOR ===\n');
  console.log(`Total calls in DB: ${totalCalls}`);
  console.log(`Calls with phone: ${callsWithPhone} / 118931`);
  console.log(`Progress: ${progress}%`);

  if (delta > 0) {
    console.log(`Speed: +${delta} records in last 3 sec`);
  }

  if (callsWithPhone >= 118900) {
    console.log('\n✅ SYNC COMPLETE!');
    process.exit(0);
  }

  lastCount = callsWithPhone;
}

// Update every 3 seconds
setInterval(checkProgress, 3000);
checkProgress();
