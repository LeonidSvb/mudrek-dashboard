/**
 * FETCH TO JSON: Download ALL HubSpot data to JSON files
 *
 * Usage:
 *   node src/hubspot/fetch-to-json.js
 *
 * Features:
 * - TEST_MODE: limit to 50 records per object type
 * - Saves to data/ folder as JSON
 * - NO database upload (just files)
 * - Easy to inspect before uploading
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  // API Settings
  HUBSPOT_API_KEY: process.env.HUBSPOT_API_KEY,
  BASE_URL: 'https://api.hubapi.com',

  // Test mode: fetch only 50 records per type
  TEST_MODE: true,
  TEST_LIMIT: 50,

  // Production mode: fetch ALL records
  BATCH_SIZE: 100,

  // Output directory
  OUTPUT_DIR: join(__dirname, '../../data/hubspot-full'),

  // Objects to fetch
  FETCH_CONTACTS: true,
  FETCH_DEALS: true,
  FETCH_CALLS: true,

  // Associations to include
  ASSOCIATIONS: {
    contacts: ['deals', 'companies'],
    deals: ['contacts', 'companies', 'line_items'],
    calls: ['contacts', 'deals', 'companies']
  }
};

// ========================================
// FUNCTIONS
// ========================================

/**
 * Get ALL property names for an object type
 */
async function getAllPropertyNames(objectType) {
  console.log(`🔍 Fetching property schema for ${objectType}...`);

  const url = `${CONFIG.BASE_URL}/crm/v3/properties/${objectType}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CONFIG.HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch properties schema: ${response.status}`);
  }

  const data = await response.json();
  const propertyNames = data.results.map(prop => prop.name);

  console.log(`✓ Found ${propertyNames.length} properties for ${objectType}\n`);

  return propertyNames;
}

/**
 * Fetch records from HubSpot with ALL properties
 */
async function fetchAllProperties(objectType, associations = []) {
  // Get ALL property names
  const propertyNames = await getAllPropertyNames(objectType);

  let allRecords = [];
  let after = null;
  let hasMore = true;
  let pageCount = 0;

  console.log(`📡 Fetching ${objectType} with ALL properties...`);

  if (CONFIG.TEST_MODE) {
    console.log(`⚠️  TEST MODE: Will fetch max ${CONFIG.TEST_LIMIT} records\n`);
  }

  while (hasMore) {
    pageCount++;

    // Build URL with ALL properties explicitly
    let url = `${CONFIG.BASE_URL}/crm/v3/objects/${objectType}?limit=${CONFIG.BATCH_SIZE}&archived=false`;

    // Add ALL properties
    const propsParam = propertyNames.map(p => `properties=${p}`).join('&');
    url += `&${propsParam}`;

    // Add associations
    if (associations.length > 0) {
      const assocParam = associations.join(',');
      url += `&associations=${assocParam}`;
    }

    if (after) {
      url += `&after=${after}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${CONFIG.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.results);

      // Progress
      const propertiesCount = data.results[0]?.properties ? Object.keys(data.results[0].properties).length : 0;
      console.log(`  → Page ${pageCount}: ${data.results.length} records (${propertiesCount} properties each, total: ${allRecords.length})`);

      // Check if we should continue
      if (data.paging?.next) {
        after = data.paging.next.after;

        // Stop if TEST_MODE and reached limit
        if (CONFIG.TEST_MODE && allRecords.length >= CONFIG.TEST_LIMIT) {
          console.log(`✓ Reached TEST_LIMIT (${CONFIG.TEST_LIMIT}), stopping...\n`);
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`✗ Failed to fetch ${objectType} page ${pageCount}:`, error.message);
      throw error;
    }
  }

  // Truncate to TEST_LIMIT if needed
  if (CONFIG.TEST_MODE && allRecords.length > CONFIG.TEST_LIMIT) {
    allRecords = allRecords.slice(0, CONFIG.TEST_LIMIT);
  }

  // Summary
  const sampleRecord = allRecords[0];
  if (sampleRecord) {
    const propertiesCount = Object.keys(sampleRecord.properties || {}).length;
    const hasAssociations = !!sampleRecord.associations;

    console.log(`✓ Total ${objectType}: ${allRecords.length}`);
    console.log(`✓ Properties per record: ${propertiesCount}`);
    console.log(`✓ Has associations: ${hasAssociations ? 'YES' : 'NO'}\n`);
  }

  return allRecords;
}

/**
 * Save data to JSON file
 */
function saveToJSON(filename, data) {
  const filepath = join(CONFIG.OUTPUT_DIR, filename);

  console.log(`💾 Saving to ${filepath}...`);

  // Create directory if doesn't exist
  mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });

  // Write JSON file
  writeFileSync(filepath, JSON.stringify(data, null, 2));

  const sizeMB = (JSON.stringify(data).length / 1024 / 1024).toFixed(2);
  console.log(`✓ Saved ${filename} (${sizeMB} MB)\n`);
}

/**
 * Main function
 */
async function fetchAll() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║       FETCH HUBSPOT DATA TO JSON         ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  console.log('📋 Configuration:');
  console.log(`   TEST_MODE: ${CONFIG.TEST_MODE ? `ON (${CONFIG.TEST_LIMIT} records max)` : 'OFF (fetch ALL)'}`);
  console.log(`   Fetch Contacts: ${CONFIG.FETCH_CONTACTS}`);
  console.log(`   Fetch Deals: ${CONFIG.FETCH_DEALS}`);
  console.log(`   Fetch Calls: ${CONFIG.FETCH_CALLS}`);
  console.log(`   Output: ${CONFIG.OUTPUT_DIR}\n`);

  const startTime = Date.now();
  const results = {};

  try {
    // Fetch contacts
    if (CONFIG.FETCH_CONTACTS) {
      results.contacts = await fetchAllProperties('contacts', CONFIG.ASSOCIATIONS.contacts);
      saveToJSON('contacts.json', results.contacts);
    }

    // Fetch deals
    if (CONFIG.FETCH_DEALS) {
      results.deals = await fetchAllProperties('deals', CONFIG.ASSOCIATIONS.deals);
      saveToJSON('deals.json', results.deals);
    }

    // Fetch calls
    if (CONFIG.FETCH_CALLS) {
      results.calls = await fetchAllProperties('calls', CONFIG.ASSOCIATIONS.calls);
      saveToJSON('calls.json', results.calls);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Summary
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║               SUMMARY                      ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    if (results.contacts) {
      const sample = results.contacts[0];
      const propsCount = Object.keys(sample?.properties || {}).length;
      const hasAssoc = !!sample?.associations;
      console.log(`📊 CONTACTS:`);
      console.log(`   Count: ${results.contacts.length}`);
      console.log(`   Properties: ${propsCount}`);
      console.log(`   Has associations: ${hasAssoc}\n`);
    }

    if (results.deals) {
      const sample = results.deals[0];
      const propsCount = Object.keys(sample?.properties || {}).length;
      const hasAssoc = !!sample?.associations;
      console.log(`💼 DEALS:`);
      console.log(`   Count: ${results.deals.length}`);
      console.log(`   Properties: ${propsCount}`);
      console.log(`   Has associations: ${hasAssoc}\n`);
    }

    if (results.calls) {
      const sample = results.calls[0];
      const propsCount = Object.keys(sample?.properties || {}).length;
      const hasAssoc = !!sample?.associations;
      console.log(`📞 CALLS:`);
      console.log(`   Count: ${results.calls.length}`);
      console.log(`   Properties: ${propsCount}`);
      console.log(`   Has associations: ${hasAssoc}\n`);
    }

    console.log(`⏱️  Total duration: ${duration}s`);
    console.log(`\n✅ Data saved to: ${CONFIG.OUTPUT_DIR}`);
    console.log(`\n💡 Next step: Check JSON files, then run upload-from-json.js`);

  } catch (error) {
    console.error('\n❌ Fetch failed:', error.message);
    throw error;
  }
}

// Run
fetchAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
