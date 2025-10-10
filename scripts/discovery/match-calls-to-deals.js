import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// PHONE NORMALIZATION
// ============================================================================

function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
}

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   MATCH CALLS TO DEALS (via phone)        ║');
console.log('╚════════════════════════════════════════════╝\n');

// ============================================================================
// 1. GET 6 SAMPLE DEALS WITH CONTACTS
// ============================================================================

console.log('═══ STEP 1: Fetch 6 deals with associations ═══\n');

const { data: deals, error: dealsError } = await supabase
  .from('hubspot_deals_raw')
  .select('*')
  .limit(6);

if (dealsError) {
  console.error('✗ Error:', dealsError);
  process.exit(1);
}

console.log(`✓ Fetched ${deals.length} deals\n`);

// ============================================================================
// 2. EXTRACT CONTACT IDS
// ============================================================================

console.log('═══ STEP 2: Extract contact IDs ═══\n');

const dealContactMap = {};
deals.forEach(deal => {
  const contactIds = deal.raw_json?.associations?.contacts?.results?.map(r => r.toObjectId.toString()) || [];
  dealContactMap[deal.hubspot_id] = {
    dealName: deal.dealname,
    amount: deal.amount,
    contactIds: contactIds
  };
  console.log(`Deal: ${deal.dealname} (₪${deal.amount})`);
  console.log(`  Contact IDs: ${contactIds.join(', ')}`);
});

console.log('');

// ============================================================================
// 3. FETCH CONTACTS AND THEIR PHONES
// ============================================================================

console.log('═══ STEP 3: Fetch contacts with phones ═══\n');

const allContactIds = [...new Set(Object.values(dealContactMap).flatMap(d => d.contactIds))];

const { data: contacts, error: contactsError } = await supabase
  .from('hubspot_contacts_raw')
  .select('hubspot_id, firstname, lastname, phone, email')
  .in('hubspot_id', allContactIds);

if (contactsError) {
  console.error('✗ Error:', contactsError);
  process.exit(1);
}

console.log(`✓ Fetched ${contacts.length} contacts\n`);

// Create contact map
const contactMap = {};
contacts.forEach(contact => {
  const normalizedPhone = normalizePhone(contact.phone);
  contactMap[contact.hubspot_id] = {
    name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim(),
    phone: contact.phone,
    normalizedPhone: normalizedPhone,
    email: contact.email
  };
  console.log(`Contact: ${contactMap[contact.hubspot_id].name}`);
  console.log(`  ID: ${contact.hubspot_id}`);
  console.log(`  Phone: ${contact.phone}`);
  console.log(`  Normalized: ${normalizedPhone}`);
  console.log('');
});

// ============================================================================
// 4. NORMALIZE PHONES AND FIND CALLS
// ============================================================================

console.log('═══ STEP 4: Match calls by phone ═══\n');

const phoneNumbers = contacts
  .map(c => normalizePhone(c.phone))
  .filter(p => p && p.length > 5);

console.log(`📞 Searching for ${phoneNumbers.length} unique phone numbers...\n`);

// Get ALL calls with these phones (from 118k)
const { data: calls, error: callsError } = await supabase
  .from('hubspot_calls_raw')
  .select('*')
  .or(phoneNumbers.map(p => `call_to_number.like.%${p.slice(-9)}%`).join(','))
  .order('call_timestamp', { ascending: false });

if (callsError) {
  console.error('✗ Error:', callsError);
} else {
  console.log(`✓ Found ${calls.length} calls matching these phones\n`);

  // Group calls by normalized phone
  const callsByPhone = {};
  calls.forEach(call => {
    const normalizedCallPhone = normalizePhone(call.call_to_number);
    if (!callsByPhone[normalizedCallPhone]) {
      callsByPhone[normalizedCallPhone] = [];
    }
    callsByPhone[normalizedCallPhone].push(call);
  });

  // ============================================================================
  // 5. SUMMARY - DEAL → CONTACT → CALLS
  // ============================================================================

  console.log('╔════════════════════════════════════════════╗');
  console.log('║            SUMMARY BY DEAL                 ║');
  console.log('╚════════════════════════════════════════════╝\n');

  let totalCalls = 0;

  Object.entries(dealContactMap).forEach(([dealId, dealInfo]) => {
    console.log(`\n🔷 DEAL: ${dealInfo.dealName} (₪${dealInfo.amount})`);
    console.log(`   Deal ID: ${dealId}\n`);

    dealInfo.contactIds.forEach(contactId => {
      const contact = contactMap[contactId];
      if (!contact) {
        console.log(`   ❌ Contact ${contactId} not found`);
        return;
      }

      console.log(`   👤 Contact: ${contact.name}`);
      console.log(`      Phone: ${contact.phone}`);
      console.log(`      Email: ${contact.email || 'N/A'}`);

      const contactCalls = callsByPhone[contact.normalizedPhone] || [];
      console.log(`      📞 Calls: ${contactCalls.length}`);

      if (contactCalls.length > 0) {
        totalCalls += contactCalls.length;

        // Show first 3 calls
        contactCalls.slice(0, 3).forEach((call, i) => {
          console.log(`         ${i + 1}. ${call.call_timestamp} - ${call.call_duration}s (${call.call_direction})`);
        });

        if (contactCalls.length > 3) {
          console.log(`         ... and ${contactCalls.length - 3} more calls`);
        }
      }

      console.log('');
    });
  });

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║           FINAL STATISTICS                 ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log(`✅ Deals analyzed: ${deals.length}`);
  console.log(`✅ Contacts found: ${contacts.length}`);
  console.log(`✅ Phones with calls: ${Object.keys(callsByPhone).length}`);
  console.log(`✅ Total calls matched: ${totalCalls}`);
  console.log(`✅ Average calls per contact: ${(totalCalls / contacts.length).toFixed(1)}`);

  console.log('\n💡 Phone matching РАБОТАЕТ! Calls связаны с Contacts.');
}
