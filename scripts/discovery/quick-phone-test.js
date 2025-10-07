import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function quickPhoneTest() {
  console.log('\n=== QUICK PHONE MATCHING TEST ===\n');

  // Get counts
  const { count: totalCalls } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true });

  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  console.log(`Total calls: ${totalCalls}`);
  console.log(`Total contacts: ${totalContacts}\n`);

  // Sample 100 calls and test matching
  console.log('--- Testing with 100 random calls ---');
  const { data: sampleCalls } = await supabase
    .from('hubspot_calls_raw')
    .select('hubspot_id, call_to_number')
    .not('call_to_number', 'is', null)
    .limit(100);

  let exactMatches = 0;
  let normalizedMatches = 0;
  let noMatches = 0;
  let multipleMatches = 0;

  for (const call of sampleCalls) {
    // Try exact match
    const { data: exact } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, phone')
      .eq('phone', call.call_to_number);

    if (exact && exact.length > 0) {
      exactMatches++;
      if (exact.length > 1) multipleMatches++;
      continue;
    }

    // Try normalized match (remove non-digits)
    const normalizedCallNumber = call.call_to_number.replace(/[^0-9]/g, '');

    const { data: contacts } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, phone')
      .not('phone', 'is', null);

    const match = contacts?.find(c => {
      const normalizedPhone = c.phone.replace(/[^0-9]/g, '');
      return normalizedPhone === normalizedCallNumber;
    });

    if (match) {
      normalizedMatches++;
    } else {
      noMatches++;
    }
  }

  // Results
  const totalMatches = exactMatches + normalizedMatches;
  const matchRate = ((totalMatches / sampleCalls.length) * 100).toFixed(1);

  console.log(`\nExact matches: ${exactMatches}`);
  console.log(`Normalized matches: ${normalizedMatches}`);
  console.log(`No matches: ${noMatches}`);
  console.log(`Multiple contact matches: ${multipleMatches}`);
  console.log(`\nTotal match rate: ${matchRate}%`);

  // Extrapolate to full dataset
  const estimatedMatches = Math.round((totalMatches / sampleCalls.length) * totalCalls);
  console.log(`\nEstimated matches for all ${totalCalls} calls: ~${estimatedMatches}`);

  if (parseFloat(matchRate) >= 80) {
    console.log(`\n✅ Phone matching is RELIABLE (${matchRate}%)`);
  } else if (parseFloat(matchRate) >= 60) {
    console.log(`\n⚠️  Phone matching is MODERATE (${matchRate}%)`);
  } else {
    console.log(`\n❌ Phone matching is UNRELIABLE (${matchRate}%)`);
  }

  if (multipleMatches > 0) {
    console.log(`\n⚠️  ${multipleMatches} calls matched multiple contacts (duplicates)`);
  }
}

quickPhoneTest().catch(console.error);
