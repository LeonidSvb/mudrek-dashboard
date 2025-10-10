import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
}

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   DEBUG: Why 15 deals have NO calls?      ║');
console.log('╚════════════════════════════════════════════╝\n');

// ============================================================================
// 1. GET ALL DEALS + CONTACTS
// ============================================================================

const { data: deals } = await supabase.from('hubspot_deals_raw').select('*');
const allContactIds = new Set();
deals.forEach(deal => {
  const contactIds = deal.raw_json?.associations?.contacts?.results?.map(r => r.toObjectId.toString()) || [];
  contactIds.forEach(id => allContactIds.add(id));
});

const { data: contacts } = await supabase
  .from('hubspot_contacts_raw')
  .select('*')
  .in('hubspot_id', [...allContactIds]);

console.log(`✓ ${deals.length} deals`);
console.log(`✓ ${contacts.length} contacts\n`);

// ============================================================================
// 2. CHECK EACH CONTACT'S PHONE IN CALLS TABLE
// ============================================================================

console.log('═══ Checking each contact for calls ═══\n');

const contactsWithoutCalls = [];

for (const contact of contacts) {
  if (!contact.phone) {
    contactsWithoutCalls.push({
      id: contact.hubspot_id,
      name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim(),
      phone: 'NO PHONE',
      reason: 'Contact has no phone number'
    });
    continue;
  }

  const normalizedPhone = normalizePhone(contact.phone);

  // Try multiple matching strategies
  const strategies = [
    // Strategy 1: Exact match normalized
    { name: 'exact', query: supabase.from('hubspot_calls_raw').select('hubspot_id').eq('call_to_number', contact.phone).limit(1) },

    // Strategy 2: Last 9 digits (Israeli format)
    { name: 'last9', query: supabase.from('hubspot_calls_raw').select('hubspot_id').like('call_to_number', `%${normalizedPhone.slice(-9)}%`).limit(1) },

    // Strategy 3: Last 10 digits
    { name: 'last10', query: supabase.from('hubspot_calls_raw').select('hubspot_id').like('call_to_number', `%${normalizedPhone.slice(-10)}%`).limit(1) },

    // Strategy 4: Full normalized
    { name: 'normalized', query: supabase.from('hubspot_calls_raw').select('hubspot_id').like('call_to_number', `%${normalizedPhone}%`).limit(1) }
  ];

  let found = false;
  let matchedStrategy = null;

  for (const strategy of strategies) {
    const { data, error } = await strategy.query;
    if (!error && data && data.length > 0) {
      found = true;
      matchedStrategy = strategy.name;
      break;
    }
  }

  if (!found) {
    contactsWithoutCalls.push({
      id: contact.hubspot_id,
      name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim(),
      phone: contact.phone,
      normalized: normalizedPhone,
      reason: 'No calls found with any matching strategy'
    });
  }
}

// ============================================================================
// 3. REPORT MISSING CALLS
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║         CONTACTS WITHOUT CALLS             ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log(`Found ${contactsWithoutCalls.length} contacts WITHOUT calls:\n`);

contactsWithoutCalls.forEach((contact, i) => {
  console.log(`${i + 1}. ${contact.name}`);
  console.log(`   ID: ${contact.id}`);
  console.log(`   Phone: ${contact.phone}`);
  if (contact.normalized) {
    console.log(`   Normalized: ${contact.normalized}`);
  }
  console.log(`   ❌ Reason: ${contact.reason}`);
  console.log('');
});

// ============================================================================
// 4. SAMPLE CALL PHONE FORMATS
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║    SAMPLE PHONE FORMATS IN CALLS TABLE     ║');
console.log('╚════════════════════════════════════════════╝\n');

const { data: sampleCalls } = await supabase
  .from('hubspot_calls_raw')
  .select('call_to_number')
  .not('call_to_number', 'is', null)
  .limit(20);

console.log('Sample call_to_number formats:\n');
sampleCalls.slice(0, 10).forEach((call, i) => {
  const normalized = normalizePhone(call.call_to_number);
  console.log(`${i + 1}. Original: ${call.call_to_number}`);
  console.log(`   Normalized: ${normalized} (${normalized.length} digits)`);
  console.log('');
});

// ============================================================================
// 5. SAMPLE CONTACT PHONE FORMATS
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║   SAMPLE PHONE FORMATS IN CONTACTS TABLE   ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log('Sample contact.phone formats:\n');
contacts.slice(0, 10).forEach((contact, i) => {
  if (!contact.phone) return;
  const normalized = normalizePhone(contact.phone);
  console.log(`${i + 1}. Name: ${contact.firstname || 'Unknown'}`);
  console.log(`   Original: ${contact.phone}`);
  console.log(`   Normalized: ${normalized} (${normalized.length} digits)`);
  console.log('');
});

// ============================================================================
// 6. CONCLUSION
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║              CONCLUSION                    ║');
console.log('╚════════════════════════════════════════════╝\n');

const contactsWithPhone = contacts.filter(c => c.phone && c.phone.trim()).length;
const matchRate = ((contactsWithPhone - contactsWithoutCalls.length) / contactsWithPhone * 100).toFixed(1);

console.log(`📊 Stats:`);
console.log(`   Total contacts: ${contacts.length}`);
console.log(`   Contacts with phone: ${contactsWithPhone}`);
console.log(`   Contacts WITHOUT calls: ${contactsWithoutCalls.length}`);
console.log(`   Match rate: ${matchRate}%\n`);

if (contactsWithoutCalls.length > 0) {
  console.log(`❓ Possible reasons:`);
  console.log(`   1. Новые contacts (за последний месяц) - calls были раньше`);
  console.log(`   2. Contacts из других источников (не через calls)`);
  console.log(`   3. Phone format mismatch (проверяем выше)`);
  console.log(`   4. Calls с другого номера (не тот что в contact.phone)`);
}
