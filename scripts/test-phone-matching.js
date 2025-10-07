import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testPhoneMatching() {
  console.log('\n=== PHONE MATCHING ACCURACY TEST ===\n');

  try {
    // 1. Get total counts
    console.log('--- BASIC STATS ---');
    const { count: totalCalls } = await supabase
      .from('hubspot_calls_raw')
      .select('*', { count: 'exact', head: true });

    const { count: callsWithPhone } = await supabase
      .from('hubspot_calls_raw')
      .select('*', { count: 'exact', head: true })
      .not('call_to_number', 'is', null);

    const { count: totalContacts } = await supabase
      .from('hubspot_contacts_raw')
      .select('*', { count: 'exact', head: true });

    const { count: contactsWithPhone } = await supabase
      .from('hubspot_contacts_raw')
      .select('*', { count: 'exact', head: true })
      .not('phone', 'is', null);

    console.log(`Total calls: ${totalCalls}`);
    console.log(`Calls with phone number: ${callsWithPhone} (${((callsWithPhone / totalCalls) * 100).toFixed(1)}%)`);
    console.log(`Total contacts: ${totalContacts}`);
    console.log(`Contacts with phone: ${contactsWithPhone} (${((contactsWithPhone / totalContacts) * 100).toFixed(1)}%)\n`);

    // 2. Test phone matching using VIEW
    console.log('--- PHONE MATCHING RESULTS ---');

    // Count matched calls via VIEW
    const { count: matchedCalls } = await supabase
      .from('call_contact_matches')
      .select('*', { count: 'exact', head: true });

    console.log(`Matched calls: ${matchedCalls}`);

    const matchRate = callsWithPhone > 0
      ? ((matchedCalls / callsWithPhone) * 100).toFixed(1)
      : 0;

    console.log(`Match rate: ${matchRate}% (of calls with phone numbers)\n`);

    // 3. Sample matched data
    console.log('--- SAMPLE MATCHED DATA (first 5) ---');
    const { data: samples } = await supabase
      .from('call_contact_matches')
      .select('call_id, call_to_number, contact_id, contact_phone, firstname, lastname')
      .limit(5);

    if (samples && samples.length > 0) {
      samples.forEach(match => {
        console.log(`\nCall ${match.call_id} → Contact ${match.contact_id}`);
        console.log(`  Call number: ${match.call_to_number}`);
        console.log(`  Contact phone: ${match.contact_phone}`);
        console.log(`  Name: ${match.firstname} ${match.lastname}`);
      });
    } else {
      console.log('No matches found');
    }

    // 4. Check for duplicate phone numbers
    console.log('\n--- DUPLICATE PHONE CHECK ---');
    const { data: duplicates } = await supabase
      .rpc('count_duplicate_phones')
      .single()
      .catch(() => null);

    // Если RPC не существует, делаем простой подсчет
    const { data: phoneGroups } = await supabase
      .from('hubspot_contacts_raw')
      .select('phone')
      .not('phone', 'is', null);

    if (phoneGroups) {
      const phoneCounts = {};
      phoneGroups.forEach(row => {
        phoneCounts[row.phone] = (phoneCounts[row.phone] || 0) + 1;
      });
      const duplicateCount = Object.values(phoneCounts).filter(count => count > 1).length;
      console.log(`Duplicate phones in contacts: ${duplicateCount}`);

      if (duplicateCount > 0) {
        console.log('Warning: Multiple contacts share same phone numbers');
      }
    }

    // 5. Summary
    console.log('\n=== SUMMARY ===');

    if (callsWithPhone === 0) {
      console.log('❌ NO PHONE NUMBERS FOUND IN CALLS');
      console.log('   → Check if resync completed successfully');
      console.log('   → Verify sync script includes call_to_number field');
    } else if (parseFloat(matchRate) >= 80) {
      console.log(`✅ Phone matching is RELIABLE (${matchRate}% match rate)`);
      console.log(`   → ${matchedCalls} calls matched to contacts`);
      console.log(`   → Ready to add phone-based metrics`);
    } else if (parseFloat(matchRate) >= 60) {
      console.log(`⚠️  Phone matching is MODERATE (${matchRate}% match rate)`);
      console.log(`   → ${matchedCalls} calls matched to contacts`);
      console.log(`   → Can use but may have gaps`);
    } else {
      console.log(`❌ Phone matching is UNRELIABLE (${matchRate}% match rate)`);
      console.log(`   → Only ${matchedCalls} calls matched`);
      console.log(`   → May need alternative matching strategy`);
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error testing phone matching:', error.message);
    console.error('   Make sure migration 004 (phone matching views) is applied\n');
  }
}

testPhoneMatching().catch(console.error);
