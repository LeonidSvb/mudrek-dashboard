#!/usr/bin/env node
/**
 * Fetch Test Data from HubSpot
 *
 * PURPOSE: Get 10 successful deals + linked contacts + calls for data mapping validation
 *
 * USAGE:
 *   cd "C:\Users\79818\Desktop\Shadi - new"
 *   node scripts/discovery/fetch-test-data.js
 *
 * OUTPUT:
 *   scripts/discovery/test-data/
 *     ├── deals.json         - 10 successful deals (closedwon)
 *     ├── contacts.json      - All contacts linked to those deals
 *     ├── calls.json         - All calls linked to those contacts
 *     └── summary.json       - Counts and metadata
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { makeHubSpotRequest } from '../../src/hubspot/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, 'test-data');

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchSuccessfulDeals(limit = 10) {
  console.log(`\n🔍 Fetching ${limit} successful deals (closedwon)...`);

  const searchBody = {
    filterGroups: [{
      filters: [{
        propertyName: 'dealstage',
        operator: 'EQ',
        value: 'closedwon'
      }]
    }],
    sorts: [{
      propertyName: 'closedate',
      direction: 'DESCENDING'
    }],
    properties: [
      'dealname', 'amount', 'dealstage', 'closedate', 'createdate',
      'qualified_status', 'trial_status', 'payment_status',
      'number_of_installments__months', 'cancellation_reason',
      'is_refunded', 'installment_plan', 'upfront_payment',
      'offer_given', 'offer_accepted', 'hubspot_owner_id'
    ],
    limit: limit
  };

  const response = await makeHubSpotRequest('/crm/v3/objects/deals/search', {
    method: 'POST',
    body: JSON.stringify(searchBody)
  });

  console.log(`✓ Found ${response.results.length} deals`);
  return response.results;
}

async function fetchDealAssociations(dealId) {
  console.log(`  → Fetching associations for deal ${dealId}...`);

  try {
    const response = await makeHubSpotRequest(
      `/crm/v3/objects/deals/${dealId}/associations/contacts`
    );

    const contactIds = response.results?.map(r => r.id) || [];
    console.log(`    Found ${contactIds.length} contacts`);
    return contactIds;
  } catch (error) {
    console.error(`    ✗ Error fetching associations:`, error.message);
    return [];
  }
}

async function fetchContactsByIds(contactIds) {
  if (contactIds.length === 0) return [];

  console.log(`\n🔍 Fetching ${contactIds.length} contacts...`);

  const batchSize = 100;
  const allContacts = [];

  for (let i = 0; i < contactIds.length; i += batchSize) {
    const batch = contactIds.slice(i, i + batchSize);

    const requestBody = {
      inputs: batch.map(id => ({ id: id.toString() })),
      properties: [
        'email', 'phone', 'firstname', 'lastname', 'createdate',
        'lifecyclestage', 'sales_script_version', 'vsl_watched',
        'vsl_watch_duration', 'hubspot_owner_id'
      ]
    };

    const response = await makeHubSpotRequest('/crm/v3/objects/contacts/batch/read', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    allContacts.push(...response.results);
    console.log(`  ✓ Batch ${i + 1}-${Math.min(i + batchSize, contactIds.length)}/${contactIds.length}`);
  }

  console.log(`✓ Total contacts: ${allContacts.length}`);
  return allContacts;
}

async function fetchCallsByContacts(contacts) {
  console.log(`\n🔍 Fetching calls for ${contacts.length} contacts...`);

  const phones = contacts
    .map(c => c.properties.phone)
    .filter(Boolean)
    .map(p => p.replace(/[^0-9]/g, ''));

  console.log(`  Found ${phones.length} phone numbers`);

  if (phones.length === 0) return [];

  // Search calls by phone numbers
  const searchBody = {
    filterGroups: phones.slice(0, 50).map(phone => ({
      filters: [{
        propertyName: 'hs_call_to_number',
        operator: 'CONTAINS_TOKEN',
        value: phone
      }]
    })),
    properties: [
      'hs_call_duration', 'hs_call_direction', 'hs_call_to_number',
      'hs_call_from_number', 'hs_timestamp', 'hs_call_disposition'
    ],
    limit: 100
  };

  try {
    const response = await makeHubSpotRequest('/crm/v3/objects/calls/search', {
      method: 'POST',
      body: JSON.stringify(searchBody)
    });

    console.log(`✓ Found ${response.results.length} calls`);
    return response.results;
  } catch (error) {
    console.error(`✗ Error fetching calls:`, error.message);
    return [];
  }
}

async function main() {
  console.log('=== HUBSPOT TEST DATA FETCHER ===\n');

  try {
    // Step 1: Fetch 10 successful deals
    const deals = await fetchSuccessfulDeals(10);

    // Step 2: Get all associated contact IDs
    console.log(`\n🔍 Fetching contact associations...`);
    const contactIdSets = await Promise.all(
      deals.map(deal => fetchDealAssociations(deal.id))
    );

    const uniqueContactIds = [...new Set(contactIdSets.flat())];
    console.log(`✓ Total unique contacts: ${uniqueContactIds.length}`);

    // Step 3: Fetch full contact data
    const contacts = await fetchContactsByIds(uniqueContactIds);

    // Step 4: Fetch calls for those contacts
    const calls = await fetchCallsByContacts(contacts);

    // Save to files
    console.log(`\n💾 Saving data to ${OUTPUT_DIR}...`);

    writeFileSync(
      join(OUTPUT_DIR, 'deals.json'),
      JSON.stringify(deals, null, 2)
    );
    console.log(`  ✓ deals.json (${deals.length} records)`);

    writeFileSync(
      join(OUTPUT_DIR, 'contacts.json'),
      JSON.stringify(contacts, null, 2)
    );
    console.log(`  ✓ contacts.json (${contacts.length} records)`);

    writeFileSync(
      join(OUTPUT_DIR, 'calls.json'),
      JSON.stringify(calls, null, 2)
    );
    console.log(`  ✓ calls.json (${calls.length} records)`);

    // Summary
    const summary = {
      fetchedAt: new Date().toISOString(),
      counts: {
        deals: deals.length,
        contacts: contacts.length,
        calls: calls.length
      },
      dealIds: deals.map(d => d.id),
      contactIds: uniqueContactIds,
      dateRange: {
        oldestDeal: deals[deals.length - 1]?.properties.closedate,
        newestDeal: deals[0]?.properties.closedate
      }
    };

    writeFileSync(
      join(OUTPUT_DIR, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log(`  ✓ summary.json`);

    console.log(`\n=== SUCCESS ===`);
    console.log(`📊 Fetched:`);
    console.log(`   - ${deals.length} deals (closedwon)`);
    console.log(`   - ${contacts.length} contacts`);
    console.log(`   - ${calls.length} calls`);
    console.log(`\n📁 Saved to: scripts/discovery/test-data/`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
