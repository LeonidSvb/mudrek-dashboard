import { readFileSync } from 'fs';

console.log('=== CSV FILES ANALYSIS ===\n');

// Analyze deals CSV
try {
  const dealsCSV = readFileSync('C:/Users/79818/Downloads/hubspot-crm-exports-all-deals-2025-10-10.csv', 'utf8');
  const dealsLines = dealsCSV.split('\n');
  const dealsHeaders = dealsLines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  console.log('💼 DEALS CSV:');
  console.log(`   Total rows: ${dealsLines.length - 1} (excluding header)`);
  console.log(`   Total columns: ${dealsHeaders.length}`);
  console.log(`\n   First 30 columns:`);
  dealsHeaders.slice(0, 30).forEach((h, i) => {
    console.log(`      ${i+1}. ${h}`);
  });

  // Check if key fields are present
  console.log(`\n   Key fields check:`);
  console.log(`      ✓ amount: ${dealsHeaders.includes('Amount')}`);
  console.log(`      ✓ dealstage: ${dealsHeaders.includes('Deal Stage')}`);
  console.log(`      ✓ closedate: ${dealsHeaders.includes('Close Date')}`);
  console.log(`      ✓ hubspot_owner_id: ${dealsHeaders.includes('Deal Owner')}`);
  console.log(`      ✓ phone: ${dealsHeaders.includes('Phone Number') || dealsHeaders.includes('phone_number')}`);

  // Sample first deal
  console.log(`\n   Sample first deal (first 5 fields):`);
  const firstDeal = dealsLines[1].split(',');
  for (let i = 0; i < Math.min(5, firstDeal.length); i++) {
    console.log(`      ${dealsHeaders[i]}: ${firstDeal[i]}`);
  }
} catch (error) {
  console.error('Error reading deals CSV:', error.message);
}

console.log('\n---\n');

// Analyze contacts CSV
try {
  const contactsCSV = readFileSync('data/all-contacts.csv', 'utf8');
  const contactsLines = contactsCSV.split('\n');
  const contactsHeaders = contactsLines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  console.log('📊 CONTACTS CSV:');
  console.log(`   Total rows: ${contactsLines.length - 1} (excluding header)`);
  console.log(`   Total columns: ${contactsHeaders.length}`);
  console.log(`\n   First 30 columns:`);
  contactsHeaders.slice(0, 30).forEach((h, i) => {
    console.log(`      ${i+1}. ${h}`);
  });

  // Check if key fields are present
  console.log(`\n   Key fields check:`);
  console.log(`      ✓ firstname: ${contactsHeaders.includes('First Name')}`);
  console.log(`      ✓ phone: ${contactsHeaders.includes('Phone Number')}`);
  console.log(`      ✓ email: ${contactsHeaders.includes('Email')}`);
  console.log(`      ✓ hubspot_owner_id: ${contactsHeaders.includes('Contact owner')}`);
  console.log(`      ✓ lifecyclestage: ${contactsHeaders.includes('Lifecycle Stage')}`);

  // Sample first contact
  console.log(`\n   Sample first contact (first 5 fields):`);
  const firstContact = contactsLines[1].split(',');
  for (let i = 0; i < Math.min(5, firstContact.length); i++) {
    console.log(`      ${contactsHeaders[i]}: ${firstContact[i]}`);
  }
} catch (error) {
  console.error('Error reading contacts CSV:', error.message);
}

console.log('\n=== COMPARISON ===\n');
console.log('API vs CSV:');
console.log('   Deals: 215 fields (API) vs ? (CSV)');
console.log('   Contacts: 422 fields (API) vs ? (CSV)');
