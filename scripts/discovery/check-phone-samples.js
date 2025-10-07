import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhoneSamples() {
  console.log('\n=== CHECKING PHONE SAMPLES ===\n');

  // Get sample calls
  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('hubspot_id, call_to_number')
    .not('call_to_number', 'is', null)
    .limit(10);

  console.log('--- SAMPLE CALL NUMBERS ---');
  calls.forEach(c => console.log(`Call ${c.hubspot_id}: ${c.call_to_number}`));

  // Get sample contacts
  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, phone, firstname, lastname')
    .not('phone', 'is', null)
    .limit(10);

  console.log('\n--- SAMPLE CONTACT PHONES ---');
  contacts.forEach(c => console.log(`Contact ${c.hubspot_id}: ${c.phone} (${c.firstname} ${c.lastname})`));

  // Try to find ANY overlap
  console.log('\n--- CHECKING FOR OVERLAPS ---');
  const callNumbers = calls.map(c => c.call_to_number.replace(/[^0-9]/g, ''));
  const contactPhones = contacts.map(c => c.phone.replace(/[^0-9]/g, ''));

  console.log('Call numbers (normalized):', callNumbers.slice(0, 5));
  console.log('Contact phones (normalized):', contactPhones.slice(0, 5));

  // Check if ANY call number appears in contacts
  let foundMatch = false;
  for (const callNum of callNumbers) {
    if (contactPhones.includes(callNum)) {
      console.log(`\n✓ Found match: ${callNum}`);
      foundMatch = true;
      break;
    }
  }

  if (!foundMatch) {
    console.log('\n❌ No matches found in samples');
    console.log('Possible reasons:');
    console.log('1. Calls are to different numbers (not in contacts database)');
    console.log('2. Different phone format/country codes');
    console.log('3. Calls are external (not to existing contacts)');
  }
}

checkPhoneSamples().catch(console.error);
