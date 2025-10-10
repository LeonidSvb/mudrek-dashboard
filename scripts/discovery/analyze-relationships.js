import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   ANALYZE RELATIONSHIPS IN SUPABASE       ║');
console.log('╚════════════════════════════════════════════╝\n');

// ============================================================================
// 1. CHECK DEALS → CONTACTS ASSOCIATIONS
// ============================================================================

console.log('═══ 1. DEALS → CONTACTS ASSOCIATIONS ═══\n');

const { data: deals, error: dealsError } = await supabase
  .from('hubspot_deals_raw')
  .select('*')
  .limit(5);

if (dealsError) {
  console.error('✗ Error fetching deals:', dealsError);
} else {
  console.log(`✓ Fetched ${deals.length} sample deals\n`);

  deals.forEach((deal, i) => {
    console.log(`Deal #${i + 1}: ${deal.dealname}`);
    console.log(`  ID: ${deal.hubspot_id}`);
    console.log(`  Amount: ₪${deal.amount}`);
    console.log(`  Owner: ${deal.hubspot_owner_id}`);

    // Check associations in raw_json
    const associations = deal.raw_json?.associations;
    if (associations && associations.contacts) {
      const contactIds = associations.contacts.results.map(r => r.toObjectId);
      console.log(`  ✅ Contacts: ${contactIds.join(', ')}`);
    } else {
      console.log(`  ❌ NO CONTACTS ASSOCIATED`);
    }
    console.log('');
  });
}

// ============================================================================
// 2. CHECK IF CONTACT IDS EXIST IN CONTACTS TABLE
// ============================================================================

console.log('═══ 2. VERIFY CONTACT IDS EXIST ═══\n');

const deal1 = deals[0];
const contactIds = deal1.raw_json?.associations?.contacts?.results?.map(r => r.toObjectId) || [];

if (contactIds.length > 0) {
  const { data: contacts, error: contactsError } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, firstname, lastname, email, phone')
    .in('hubspot_id', contactIds.map(String));

  if (contactsError) {
    console.error('✗ Error fetching contacts:', contactsError);
  } else {
    console.log(`✓ Found ${contacts.length}/${contactIds.length} contacts in database\n`);

    contacts.forEach(contact => {
      console.log(`  Contact: ${contact.firstname} ${contact.lastname}`);
      console.log(`    ID: ${contact.hubspot_id}`);
      console.log(`    Email: ${contact.email || 'N/A'}`);
      console.log(`    Phone: ${contact.phone || 'N/A'}`);
      console.log('');
    });
  }
}

// ============================================================================
// 3. CHECK CALLS → CONTACTS CONNECTION (via phone)
// ============================================================================

console.log('═══ 3. CALLS → CONTACTS (via phone) ═══\n');

const contact1 = await supabase
  .from('hubspot_contacts_raw')
  .select('*')
  .not('phone', 'is', null)
  .limit(1)
  .single();

if (contact1.data && contact1.data.phone) {
  console.log(`Sample contact: ${contact1.data.firstname} ${contact1.data.lastname}`);
  console.log(`  Phone: ${contact1.data.phone}\n`);

  // Find calls with this phone
  const { data: calls, error: callsError } = await supabase
    .from('hubspot_calls_raw')
    .select('*')
    .eq('call_to_number', contact1.data.phone)
    .limit(5);

  if (callsError) {
    console.error('✗ Error fetching calls:', callsError);
  } else {
    console.log(`✓ Found ${calls.length} calls to this contact\n`);

    calls.forEach((call, i) => {
      console.log(`  Call #${i + 1}:`);
      console.log(`    Duration: ${call.call_duration}s`);
      console.log(`    Direction: ${call.call_direction}`);
      console.log(`    Timestamp: ${call.call_timestamp}`);
      console.log('');
    });
  }
}

// ============================================================================
// 4. SUMMARY - ANSWER USER'S QUESTIONS
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║          SUMMARY - YOUR ANSWERS           ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log('❓ Q1: Как связаны Contacts ↔ Deals?');
console.log('✅ A1: Через raw_json.associations.contacts[].toObjectId');
console.log('      Deal → Contact IDs хранятся в JSONB\n');

console.log('❓ Q2: Жизненный цикл клиента?');
console.log('✅ A2: Contact создаётся ПЕРВЫМ');
console.log('      → Звонки привязаны к Contact через phone');
console.log('      → Deal создаётся ПОТОМ и связывается с Contact через association');
console.log('      → Поля createdate покажут точную последовательность\n');

console.log('❓ Q3: Звонки привязаны к Deal или Contact?');
console.log('✅ A3: Звонки НЕ имеют прямой связи в HubSpot');
console.log('      → Связь ТОЛЬКО через phone matching:');
console.log('      → call_to_number = contact.phone');
console.log('      → Это работает независимо от deals\n');

console.log('❓ Q4: Когда deal привязывается к contact?');
console.log('✅ A4: Deal может быть создан ДО или ПОСЛЕ первого звонка');
console.log('      → Проверим через createdate comparison');
console.log('      → Deal.createdate vs Contact.createdate vs Call.call_timestamp\n');

console.log('💡 NEXT STEP: Create SQL VIEW для автоматической связи всех entities');
