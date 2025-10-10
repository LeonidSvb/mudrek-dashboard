import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyAll() {
  console.log('\n=== VERIFICATION: VIEWs & METRICS ===\n');

  try {
    // 1. Check calls_normalized
    console.log('1. calls_normalized VIEW');
    const { count: callsNorm, error: e1 } = await supabase
      .from('calls_normalized')
      .select('*', { count: 'exact', head: true });

    if (e1) {
      console.log('   ERROR:', e1.message);
    } else {
      console.log('   Total records:', callsNorm);

      const { data: sample1 } = await supabase
        .from('calls_normalized')
        .select('call_id, call_to_number, normalized_to_number')
        .not('normalized_to_number', 'is', null)
        .limit(2);
      console.log('   Sample:', sample1);
    }

    // 2. Check contacts_normalized
    console.log('\n2. contacts_normalized VIEW');
    const { count: contactsNorm, error: e2 } = await supabase
      .from('contacts_normalized')
      .select('*', { count: 'exact', head: true });

    if (e2) {
      console.log('   ERROR:', e2.message);
    } else {
      console.log('   Total records:', contactsNorm);

      const { data: sample2 } = await supabase
        .from('contacts_normalized')
        .select('contact_id, phone, normalized_phone, firstname, lastname')
        .not('normalized_phone', 'is', null)
        .limit(2);
      console.log('   Sample:', sample2);
    }

    // 3. Check call_contact_matches
    console.log('\n3. call_contact_matches VIEW');
    const { count: matches, error: e3 } = await supabase
      .from('call_contact_matches')
      .select('*', { count: 'exact', head: true });

    if (e3) {
      console.log('   ERROR:', e3.message);
    } else {
      console.log('   Total matches:', matches);

      const { data: sample3 } = await supabase
        .from('call_contact_matches')
        .select('call_id, call_to_number, contact_id, contact_phone, firstname, lastname')
        .limit(2);
      console.log('   Sample:', sample3);
    }

    // 4. Check contact_call_stats
    console.log('\n4. contact_call_stats VIEW');
    const { count: stats, error: e4 } = await supabase
      .from('contact_call_stats')
      .select('*', { count: 'exact', head: true });

    if (e4) {
      console.log('   ERROR:', e4.message);
    } else {
      console.log('   Total contacts with stats:', stats);

      const { data: sample4 } = await supabase
        .from('contact_call_stats')
        .select('contact_id, firstname, lastname, total_calls, first_call_date, last_call_date, avg_call_minutes')
        .gt('total_calls', 0)
        .limit(3);
      console.log('   Sample:', sample4);
    }

    // 5. Test followup metrics calculation
    console.log('\n5. FOLLOWUP METRICS TEST');

    const { data: allStats, error: e5 } = await supabase
      .from('contact_call_stats')
      .select('contact_id, total_calls')
      .gt('total_calls', 0)
      .limit(1000);

    if (e5) {
      console.log('   ERROR:', e5.message);
    } else {
      const totalContactsWithCalls = allStats.length;
      const contactsWithFollowups = allStats.filter(s => s.total_calls > 1).length;
      const followupRate = totalContactsWithCalls > 0
        ? (contactsWithFollowups / totalContactsWithCalls) * 100
        : 0;

      const totalFollowups = allStats
        .filter(s => s.total_calls > 1)
        .reduce((sum, s) => sum + (s.total_calls - 1), 0);
      const avgFollowups = contactsWithFollowups > 0
        ? totalFollowups / contactsWithFollowups
        : 0;

      console.log('   Contacts with calls:', totalContactsWithCalls);
      console.log('   Contacts with followups:', contactsWithFollowups);
      console.log('   Followup rate:', followupRate.toFixed(2) + '%');
      console.log('   Avg followups per contact:', avgFollowups.toFixed(1));
    }

    // 6. Summary
    console.log('\n=== SUMMARY ===');

    if (!e1 && !e2 && !e3 && !e4 && !e5) {
      console.log('All VIEWs are working correctly');
      console.log('Ready to display metrics on dashboard');
    } else {
      console.log('ERRORS found - check above');
    }

    console.log('\nNext step: Add metrics to dashboard UI\n');

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
  }
}

verifyAll().catch(console.error);
