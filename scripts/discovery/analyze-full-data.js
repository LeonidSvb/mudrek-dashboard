import { readFileSync } from 'fs';

console.log('╔═══════════════════════════════════════════╗');
console.log('║     HUBSPOT DATA FULL ANALYSIS           ║');
console.log('╚═══════════════════════════════════════════╝\n');

// Load data
const contacts = JSON.parse(readFileSync('data/hubspot-full/contacts.json', 'utf8'));
const deals = JSON.parse(readFileSync('data/hubspot-full/deals.json', 'utf8'));
const calls = JSON.parse(readFileSync('data/hubspot-full/calls.json', 'utf8'));

// ========================================
// 1. ASSOCIATIONS ANALYSIS
// ========================================
console.log('═══ 1. ASSOCIATIONS ═══\n');

// Contacts associations
const contactsWithAssoc = contacts.filter(c => c.associations && Object.keys(c.associations).length > 0);
console.log(`📊 CONTACTS (${contacts.length}):`);
console.log(`   With associations: ${contactsWithAssoc.length}`);
if (contactsWithAssoc.length > 0) {
  const sample = contactsWithAssoc[0];
  console.log(`   Types: ${Object.keys(sample.associations).join(', ')}`);
} else {
  console.log(`   Types: NONE`);
}

// Deals associations
const dealsWithAssoc = deals.filter(d => d.associations && Object.keys(d.associations).length > 0);
console.log(`\n💼 DEALS (${deals.length}):`);
console.log(`   With associations: ${dealsWithAssoc.length}`);
if (dealsWithAssoc.length > 0) {
  const sample = dealsWithAssoc[0];
  console.log(`   Types: ${Object.keys(sample.associations).join(', ')}`);

  // Check how many contacts per deal
  const contactCounts = dealsWithAssoc.map(d => d.associations.contacts?.results?.length || 0);
  const avgContacts = (contactCounts.reduce((a,b) => a+b, 0) / contactCounts.length).toFixed(1);
  console.log(`   Avg contacts per deal: ${avgContacts}`);
}

// Calls associations
const callsWithAssoc = calls.filter(c => c.associations && Object.keys(c.associations).length > 0);
console.log(`\n📞 CALLS (${calls.length}):`);
console.log(`   With associations: ${callsWithAssoc.length}`);
if (callsWithAssoc.length > 0) {
  const sample = callsWithAssoc[0];
  console.log(`   Types: ${Object.keys(sample.associations).join(', ')}`);
} else {
  console.log(`   Types: NONE`);
}

// ========================================
// 2. FIELDS COUNT
// ========================================
console.log('\n\n═══ 2. FIELDS COUNT ═══\n');

const contactFields = Object.keys(contacts[0].properties);
const dealFields = Object.keys(deals[0].properties);
const callFields = Object.keys(calls[0].properties);

console.log(`📊 CONTACTS: ${contactFields.length} properties`);
console.log(`💼 DEALS: ${dealFields.length} properties`);
console.log(`📞 CALLS: ${callFields.length} properties`);

// ========================================
// 3. SIZE CALCULATION
// ========================================
console.log('\n\n═══ 3. SIZE ESTIMATION ═══\n');

// Average size per record
const avgContactSize = JSON.stringify(contacts[0]).length;
const avgDealSize = JSON.stringify(deals[0]).length;
const avgCallSize = JSON.stringify(calls[0]).length;

console.log(`Average size per record:`);
console.log(`   Contact: ${(avgContactSize / 1024).toFixed(2)} KB`);
console.log(`   Deal: ${(avgDealSize / 1024).toFixed(2)} KB`);
console.log(`   Call: ${(avgCallSize / 1024).toFixed(2)} KB`);

// Full dataset size
const FULL_CONTACTS = 31643;
const FULL_DEALS = 1202;
const FULL_CALLS = 118931;

const totalContactsMB = (avgContactSize * FULL_CONTACTS / 1024 / 1024).toFixed(2);
const totalDealsMB = (avgDealSize * FULL_DEALS / 1024 / 1024).toFixed(2);
const totalCallsMB = (avgCallSize * FULL_CALLS / 1024 / 1024).toFixed(2);
const totalMB = (parseFloat(totalContactsMB) + parseFloat(totalDealsMB) + parseFloat(totalCallsMB)).toFixed(2);

console.log(`\nFull dataset size:`);
console.log(`   ${FULL_CONTACTS} contacts: ${totalContactsMB} MB`);
console.log(`   ${FULL_DEALS} deals: ${totalDealsMB} MB`);
console.log(`   ${FULL_CALLS} calls: ${totalCallsMB} MB`);
console.log(`   TOTAL: ${totalMB} MB`);

// ========================================
// 4. GARBAGE FIELDS ANALYSIS
// ========================================
console.log('\n\n═══ 4. GARBAGE FIELDS ANALYSIS ═══\n');

function analyzeFields(records, objectName, fields) {
  console.log(`\n${objectName}:`);

  const fieldStats = {};

  fields.forEach(field => {
    let nullCount = 0;
    let emptyCount = 0;
    let filledCount = 0;

    records.forEach(record => {
      const value = record.properties[field];
      if (value === null || value === undefined) {
        nullCount++;
      } else if (value === '' || value === 'nan' || value === 'null') {
        emptyCount++;
      } else {
        filledCount++;
      }
    });

    const fillRate = (filledCount / records.length * 100).toFixed(1);

    fieldStats[field] = {
      filled: filledCount,
      empty: emptyCount,
      null: nullCount,
      fillRate: parseFloat(fillRate)
    };
  });

  // Sort by fill rate
  const sorted = Object.entries(fieldStats).sort((a, b) => a[1].fillRate - b[1].fillRate);

  // Garbage fields (< 5% fill rate)
  const garbage = sorted.filter(([_, stats]) => stats.fillRate < 5);

  // Useful fields (>= 20% fill rate)
  const useful = sorted.filter(([_, stats]) => stats.fillRate >= 20);

  // Maybe useful (5-20% fill rate)
  const maybe = sorted.filter(([_, stats]) => stats.fillRate >= 5 && stats.fillRate < 20);

  console.log(`   Total fields: ${fields.length}`);
  console.log(`   🗑️  Garbage (< 5% filled): ${garbage.length} fields`);
  console.log(`   ⚠️  Maybe useful (5-20%): ${maybe.length} fields`);
  console.log(`   ✅ Useful (>= 20%): ${useful.length} fields`);

  // Show top 10 garbage fields
  console.log(`\n   Top 10 garbage fields:`);
  garbage.slice(0, 10).forEach(([field, stats]) => {
    console.log(`      ${field}: ${stats.fillRate}% filled`);
  });

  return { garbage, maybe, useful, fieldStats };
}

const contactsAnalysis = analyzeFields(contacts, '📊 CONTACTS', contactFields);
const dealsAnalysis = analyzeFields(deals, '💼 DEALS', dealFields);
const callsAnalysis = analyzeFields(calls, '📞 CALLS', callFields);

// ========================================
// 5. SIZE AFTER CLEANUP
// ========================================
console.log('\n\n═══ 5. SIZE AFTER CLEANUP ═══\n');

// Create cleaned record (only useful fields)
function cleanRecord(record, usefulFields) {
  const cleaned = {
    id: record.id,
    properties: {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archived: record.archived
  };

  if (record.associations) {
    cleaned.associations = record.associations;
  }

  usefulFields.forEach(([field]) => {
    cleaned.properties[field] = record.properties[field];
  });

  return cleaned;
}

const cleanedContact = cleanRecord(contacts[0], contactsAnalysis.useful);
const cleanedDeal = cleanRecord(deals[0], dealsAnalysis.useful);
const cleanedCall = cleanRecord(calls[0], callsAnalysis.useful);

const cleanedContactSize = JSON.stringify(cleanedContact).length;
const cleanedDealSize = JSON.stringify(cleanedDeal).length;
const cleanedCallSize = JSON.stringify(cleanedCall).length;

const cleanedContactsMB = (cleanedContactSize * FULL_CONTACTS / 1024 / 1024).toFixed(2);
const cleanedDealsMB = (cleanedDealSize * FULL_DEALS / 1024 / 1024).toFixed(2);
const cleanedCallsMB = (cleanedCallSize * FULL_CALLS / 1024 / 1024).toFixed(2);
const cleanedTotalMB = (parseFloat(cleanedContactsMB) + parseFloat(cleanedDealsMB) + parseFloat(cleanedCallsMB)).toFixed(2);

console.log(`Cleaned dataset size:`);
console.log(`   ${FULL_CONTACTS} contacts: ${cleanedContactsMB} MB (was ${totalContactsMB} MB)`);
console.log(`   ${FULL_DEALS} deals: ${cleanedDealsMB} MB (was ${totalDealsMB} MB)`);
console.log(`   ${FULL_CALLS} calls: ${cleanedCallsMB} MB (was ${totalCallsMB} MB)`);
console.log(`   TOTAL: ${cleanedTotalMB} MB (was ${totalMB} MB)`);
console.log(`   \n   💾 Savings: ${(totalMB - cleanedTotalMB).toFixed(2)} MB (${((1 - cleanedTotalMB/totalMB) * 100).toFixed(1)}%)`);

// ========================================
// 6. SUMMARY
// ========================================
console.log('\n\n═══ 6. SUMMARY ═══\n');

console.log(`🔗 ASSOCIATIONS:`);
console.log(`   Contacts → * : NO`);
console.log(`   Deals → Contacts: YES (${dealsWithAssoc.length}/${deals.length})`);
console.log(`   Calls → * : NO`);

console.log(`\n📊 FIELDS:`);
console.log(`   Contacts: ${contactsAnalysis.useful.length} useful / ${contactFields.length} total`);
console.log(`   Deals: ${dealsAnalysis.useful.length} useful / ${dealFields.length} total`);
console.log(`   Calls: ${callsAnalysis.useful.length} useful / ${callFields.length} total`);

console.log(`\n💾 SIZE:`);
console.log(`   Before cleanup: ${totalMB} MB`);
console.log(`   After cleanup: ${cleanedTotalMB} MB`);
console.log(`   Reduction: ${((1 - cleanedTotalMB/totalMB) * 100).toFixed(1)}%`);

console.log(`\n💡 RECOMMENDATIONS:`);
console.log(`   1. Remove ${contactsAnalysis.garbage.length + dealsAnalysis.garbage.length + callsAnalysis.garbage.length} garbage fields (< 5% filled)`);
console.log(`   2. Keep associations for deals (they work!)`);
console.log(`   3. Calls have NO associations - use phone matching`);
console.log(`   4. Focus on ${contactsAnalysis.useful.length + dealsAnalysis.useful.length + callsAnalysis.useful.length} useful fields for dashboard`);

// ========================================
// 7. EXPORT USEFUL FIELDS
// ========================================
import { writeFileSync } from 'fs';

const usefulFieldsList = {
  contacts: contactsAnalysis.useful.map(([field]) => field),
  deals: dealsAnalysis.useful.map(([field]) => field),
  calls: callsAnalysis.useful.map(([field]) => field)
};

const outputPath = 'data/hubspot-full/useful-fields.json';
writeFileSync(outputPath, JSON.stringify(usefulFieldsList, null, 2));

console.log(`\n📝 Exported useful fields list to: ${outputPath}`);
console.log(`   Contacts: ${usefulFieldsList.contacts.length} fields`);
console.log(`   Deals: ${usefulFieldsList.deals.length} fields`);
console.log(`   Calls: ${usefulFieldsList.calls.length} fields`);
