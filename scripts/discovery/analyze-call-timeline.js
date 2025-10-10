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
  return phone.replace(/\D/g, '');
}

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   CALL TIMELINE ANALYSIS: Before vs After ║');
console.log('╚════════════════════════════════════════════╝\n');

// ============================================================================
// 1. GET ALL 60 DEALS
// ============================================================================

console.log('═══ STEP 1: Fetch ALL deals ═══\n');

const { data: deals, error: dealsError } = await supabase
  .from('hubspot_deals_raw')
  .select('*');

if (dealsError) {
  console.error('✗ Error:', dealsError);
  process.exit(1);
}

console.log(`✓ Fetched ${deals.length} deals\n`);

// ============================================================================
// 2. EXTRACT ALL CONTACT IDS
// ============================================================================

console.log('═══ STEP 2: Extract ALL contact IDs ═══\n');

const allContactIds = new Set();
const dealContactMap = {};

deals.forEach(deal => {
  const contactIds = deal.raw_json?.associations?.contacts?.results?.map(r => r.toObjectId.toString()) || [];
  dealContactMap[deal.hubspot_id] = {
    dealName: deal.dealname,
    amount: deal.amount,
    createdate: new Date(deal.createdate),
    contactIds: contactIds
  };
  contactIds.forEach(id => allContactIds.add(id));
});

console.log(`✓ Found ${allContactIds.size} unique contacts across all deals\n`);

// ============================================================================
// 3. FETCH ALL CONTACTS WITH PHONES
// ============================================================================

console.log('═══ STEP 3: Fetch contacts with phones ═══\n');

const { data: contacts, error: contactsError } = await supabase
  .from('hubspot_contacts_raw')
  .select('hubspot_id, firstname, lastname, phone, createdate')
  .in('hubspot_id', [...allContactIds]);

if (contactsError) {
  console.error('✗ Error:', contactsError);
  process.exit(1);
}

console.log(`✓ Fetched ${contacts.length} contacts\n`);

// Create contact map with normalized phones
const contactMap = {};
const phoneToContactMap = {};

contacts.forEach(contact => {
  const normalizedPhone = normalizePhone(contact.phone);
  contactMap[contact.hubspot_id] = {
    name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || 'Unknown',
    phone: contact.phone,
    normalizedPhone: normalizedPhone,
    createdate: contact.createdate ? new Date(contact.createdate) : null
  };

  if (normalizedPhone && normalizedPhone.length > 5) {
    phoneToContactMap[normalizedPhone] = contact.hubspot_id;
  }
});

// ============================================================================
// 4. FETCH ALL CALLS FOR THESE PHONES (from 118k)
// ============================================================================

console.log('═══ STEP 4: Fetch ALL calls matching phones ═══\n');

const phoneNumbers = Object.keys(phoneToContactMap);
console.log(`📞 Searching for ${phoneNumbers.length} unique phone numbers in 118k calls...\n`);

// Build OR query for phone matching (last 9 digits)
const phoneQueries = phoneNumbers.map(p => `call_to_number.like.%${p.slice(-9)}%`);

const { data: allCalls, error: callsError } = await supabase
  .from('hubspot_calls_raw')
  .select('call_to_number, call_timestamp, call_duration, call_direction, hubspot_id')
  .or(phoneQueries.join(','))
  .order('call_timestamp', { ascending: true });

if (callsError) {
  console.error('✗ Error:', callsError);
  process.exit(1);
}

console.log(`✓ Found ${allCalls.length} calls matching these contacts\n`);

// Group calls by normalized phone
const callsByPhone = {};
allCalls.forEach(call => {
  const normalizedCallPhone = normalizePhone(call.call_to_number);
  if (!callsByPhone[normalizedCallPhone]) {
    callsByPhone[normalizedCallPhone] = [];
  }
  callsByPhone[normalizedCallPhone].push({
    timestamp: new Date(call.call_timestamp),
    duration: call.call_duration,
    direction: call.call_direction,
    id: call.hubspot_id
  });
});

// ============================================================================
// 5. ANALYZE TIMELINE: BEFORE vs AFTER DEAL CREATION
// ============================================================================

console.log('═══ STEP 5: Timeline Analysis ═══\n');

const timeline = {
  totalDeals: deals.length,
  dealsWithCalls: 0,
  dealsWithoutCalls: 0,
  totalCalls: 0,
  callsBeforeDeal: 0,
  callsAfterDeal: 0,
  callsNoTimeline: 0, // calls where we can't determine (no deal createdate)
  details: []
};

deals.forEach(deal => {
  const dealInfo = dealContactMap[deal.hubspot_id];
  const dealCreateDate = dealInfo.createdate;

  let dealCalls = {
    dealName: dealInfo.dealName,
    amount: dealInfo.amount,
    createdate: dealCreateDate,
    totalCalls: 0,
    beforeDeal: 0,
    afterDeal: 0,
    contactsWithCalls: 0
  };

  dealInfo.contactIds.forEach(contactId => {
    const contact = contactMap[contactId];
    if (!contact || !contact.normalizedPhone) return;

    const contactCalls = callsByPhone[contact.normalizedPhone] || [];

    if (contactCalls.length > 0) {
      dealCalls.contactsWithCalls++;
      dealCalls.totalCalls += contactCalls.length;

      // Classify each call
      contactCalls.forEach(call => {
        if (!dealCreateDate) {
          timeline.callsNoTimeline++;
        } else if (call.timestamp < dealCreateDate) {
          dealCalls.beforeDeal++;
          timeline.callsBeforeDeal++;
        } else {
          dealCalls.afterDeal++;
          timeline.callsAfterDeal++;
        }
      });
    }
  });

  timeline.totalCalls += dealCalls.totalCalls;

  if (dealCalls.totalCalls > 0) {
    timeline.dealsWithCalls++;
    timeline.details.push(dealCalls);
  } else {
    timeline.dealsWithoutCalls++;
  }
});

// ============================================================================
// 6. SUMMARY REPORT
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║           OVERALL STATISTICS               ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log(`📊 Total Deals: ${timeline.totalDeals}`);
console.log(`   ✅ Deals with calls: ${timeline.dealsWithCalls} (${(timeline.dealsWithCalls/timeline.totalDeals*100).toFixed(1)}%)`);
console.log(`   ❌ Deals without calls: ${timeline.dealsWithoutCalls}\n`);

console.log(`📞 Total Calls Matched: ${timeline.totalCalls}`);
console.log(`   🔵 BEFORE deal created: ${timeline.callsBeforeDeal} (${(timeline.callsBeforeDeal/timeline.totalCalls*100).toFixed(1)}%)`);
console.log(`   🟢 AFTER deal created: ${timeline.callsAfterDeal} (${(timeline.callsAfterDeal/timeline.totalCalls*100).toFixed(1)}%)`);

if (timeline.callsNoTimeline > 0) {
  console.log(`   ⚪ No timeline data: ${timeline.callsNoTimeline}\n`);
} else {
  console.log('');
}

console.log(`📈 Average Calls per Deal: ${(timeline.totalCalls / timeline.dealsWithCalls).toFixed(1)}`);
console.log(`   - Before deal: ${(timeline.callsBeforeDeal / timeline.dealsWithCalls).toFixed(1)}`);
console.log(`   - After deal: ${(timeline.callsAfterDeal / timeline.dealsWithCalls).toFixed(1)}\n`);

// ============================================================================
// 7. TOP 10 DEALS BY CALLS
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║        TOP 10 DEALS BY TOTAL CALLS         ║');
console.log('╚════════════════════════════════════════════╝\n');

const top10 = timeline.details
  .sort((a, b) => b.totalCalls - a.totalCalls)
  .slice(0, 10);

top10.forEach((deal, i) => {
  console.log(`${i + 1}. ${deal.dealName} (₪${deal.amount})`);
  console.log(`   Total calls: ${deal.totalCalls}`);
  console.log(`   🔵 Before deal: ${deal.beforeDeal} (${(deal.beforeDeal/deal.totalCalls*100).toFixed(0)}%)`);
  console.log(`   🟢 After deal: ${deal.afterDeal} (${(deal.afterDeal/deal.totalCalls*100).toFixed(0)}%)`);
  console.log(`   Deal created: ${deal.createdate.toISOString().split('T')[0]}`);
  console.log('');
});

// ============================================================================
// 8. INSIGHTS
// ============================================================================

console.log('╔════════════════════════════════════════════╗');
console.log('║              KEY INSIGHTS                  ║');
console.log('╚════════════════════════════════════════════╝\n');

const avgBeforeRatio = timeline.callsBeforeDeal / timeline.totalCalls * 100;
const avgAfterRatio = timeline.callsAfterDeal / timeline.totalCalls * 100;

console.log('💡 INSIGHTS:\n');

if (avgBeforeRatio > avgAfterRatio) {
  console.log(`   ✅ Большинство звонков (${avgBeforeRatio.toFixed(0)}%) идёт ДО создания deal`);
  console.log(`      → Это ХОЛОДНЫЕ ЗВОНКИ для конвертации contact → deal`);
  console.log(`      → В среднем ${(timeline.callsBeforeDeal / timeline.dealsWithCalls).toFixed(0)} звонков для конвертации\n`);
} else {
  console.log(`   ✅ Большинство звонков (${avgAfterRatio.toFixed(0)}%) идёт ПОСЛЕ создания deal`);
  console.log(`      → Это FOLLOWUP звонки для закрытия сделки`);
  console.log(`      → В среднем ${(timeline.callsAfterDeal / timeline.dealsWithCalls).toFixed(0)} followup звонков\n`);
}

console.log(`   ✅ Phone matching покрывает ${timeline.dealsWithCalls}/${timeline.totalDeals} deals (${(timeline.dealsWithCalls/timeline.totalDeals*100).toFixed(0)}%)`);
console.log(`   ✅ Из 118k calls мы matched ${timeline.totalCalls} к этим deals`);

console.log('\n💾 Data ready for dashboard metrics!');
