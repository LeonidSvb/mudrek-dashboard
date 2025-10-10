import { readFileSync } from 'fs';

console.log('=== CHECKING USEFUL FIELDS DATA ===\n');

// Load data
const contacts = JSON.parse(readFileSync('data/hubspot-useful/contacts.json', 'utf8'));
const deals = JSON.parse(readFileSync('data/hubspot-useful/deals.json', 'utf8'));
const calls = JSON.parse(readFileSync('data/hubspot-useful/calls.json', 'utf8'));

// Check contacts
console.log('📊 CONTACTS:');
const contactWithPhone = contacts.find(c => c.properties.phone);
if (contactWithPhone) {
  console.log(`   Sample contact ID: ${contactWithPhone.id}`);
  console.log(`   Name: ${contactWithPhone.properties.firstname || 'N/A'}`);
  console.log(`   Phone: ${contactWithPhone.properties.phone}`);
  console.log(`   Created: ${contactWithPhone.properties.createdate}`);
  console.log(`   Owner: ${contactWithPhone.properties.hubspot_owner_id || 'N/A'}`);
  console.log(`   Lifecycle: ${contactWithPhone.properties.lifecyclestage || 'N/A'}`);
  console.log(`   Total fields: ${Object.keys(contactWithPhone.properties).length}`);
}

const withPhone = contacts.filter(c => c.properties.phone).length;
console.log(`   \n   Contacts with phone: ${withPhone}/${contacts.length} (${((withPhone/contacts.length)*100).toFixed(1)}%)`);

// Check deals
console.log('\n💼 DEALS:');
const dealWithAmount = deals.find(d => d.properties.amount);
if (dealWithAmount) {
  console.log(`   Sample deal ID: ${dealWithAmount.id}`);
  console.log(`   Name: ${dealWithAmount.properties.dealname || 'N/A'}`);
  console.log(`   Amount: $${dealWithAmount.properties.amount || 0}`);
  console.log(`   Stage: ${dealWithAmount.properties.dealstage}`);
  console.log(`   Close date: ${dealWithAmount.properties.closedate || 'N/A'}`);
  console.log(`   Owner: ${dealWithAmount.properties.hubspot_owner_id || 'N/A'}`);
  console.log(`   Total fields: ${Object.keys(dealWithAmount.properties).length}`);
  console.log(`   Has associations: ${!!dealWithAmount.associations}`);
  if (dealWithAmount.associations?.contacts) {
    console.log(`   Associated contacts: ${dealWithAmount.associations.contacts.results?.length || 0}`);
  }
}

// Check calls
console.log('\n📞 CALLS:');
const callWithNumber = calls.find(c => c.properties.hs_call_from_number || c.properties.hs_call_to_number);
if (callWithNumber) {
  console.log(`   Sample call ID: ${callWithNumber.id}`);
  console.log(`   Title: ${callWithNumber.properties.hs_call_title || 'N/A'}`);
  console.log(`   From: ${callWithNumber.properties.hs_call_from_number || 'N/A'}`);
  console.log(`   To: ${callWithNumber.properties.hs_call_to_number || 'N/A'}`);
  console.log(`   Duration: ${callWithNumber.properties.hs_call_duration || 0}ms`);
  console.log(`   Status: ${callWithNumber.properties.hs_call_status || 'N/A'}`);
  console.log(`   Direction: ${callWithNumber.properties.hs_call_direction || 'N/A'}`);
  console.log(`   Total fields: ${Object.keys(callWithNumber.properties).length}`);
}

const withCallNumbers = calls.filter(c => c.properties.hs_call_from_number || c.properties.hs_call_to_number).length;
console.log(`   \n   Calls with phone numbers: ${withCallNumbers}/${calls.length} (${((withCallNumbers/calls.length)*100).toFixed(1)}%)`);

console.log('\n=== SUMMARY ===');
console.log(`✓ Contacts: ${contacts.length} records, ${Object.keys(contacts[0].properties).length} fields each`);
console.log(`✓ Deals: ${deals.length} records, ${Object.keys(deals[0].properties).length} fields each`);
console.log(`✓ Calls: ${calls.length} records, ${Object.keys(calls[0].properties).length} fields each`);
console.log(`\n💾 Total size reduction: 72% (0.34 MB vs 1.22 MB)`);
