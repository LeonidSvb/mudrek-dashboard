import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';
const LIMIT = 50;

/**
 * Fetch objects from HubSpot with ALL properties and associations
 */
async function fetchWithAssociations(objectType, associationTypes = []) {
  console.log(`\n=== Fetching ${objectType} ===`);

  // Build URL with all associations
  let url = `${BASE_URL}/crm/v3/objects/${objectType}?limit=${LIMIT}`;

  if (associationTypes.length > 0) {
    const assocParam = associationTypes.join(',');
    url += `&associations=${assocParam}`;
  }

  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log(`SUCCESS: Fetched ${data.results?.length || 0} ${objectType}`);

    if (data.results && data.results.length > 0) {
      const firstRecord = data.results[0];
      console.log(`Properties count: ${Object.keys(firstRecord.properties || {}).length}`);
      console.log(`Has associations: ${!!firstRecord.associations}`);

      if (firstRecord.associations) {
        console.log(`Association types:`, Object.keys(firstRecord.associations));
      }
    }

    return data;

  } catch (error) {
    console.error(`ERROR fetching ${objectType}:`, error.message);
    return { error: error.message, results: [] };
  }
}

/**
 * Fetch available properties schema for an object
 */
async function fetchPropertiesSchema(objectType) {
  console.log(`\n=== Fetching ${objectType} properties schema ===`);

  const url = `${BASE_URL}/crm/v3/properties/${objectType}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`SUCCESS: Found ${data.results?.length || 0} properties for ${objectType}`);

    return data;

  } catch (error) {
    console.error(`ERROR fetching schema for ${objectType}:`, error.message);
    return { error: error.message, results: [] };
  }
}

/**
 * Fetch owners
 */
async function fetchOwners() {
  console.log(`\n=== Fetching owners ===`);

  const url = `${BASE_URL}/crm/v3/owners?limit=100`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`SUCCESS: Fetched ${data.results?.length || 0} owners`);

    return data;

  } catch (error) {
    console.error(`ERROR fetching owners:`, error.message);
    return { error: error.message, results: [] };
  }
}

/**
 * Test associations API - get associations for a specific record
 */
async function testAssociationsAPI(objectType, objectId, toObjectType) {
  console.log(`\n=== Testing associations: ${objectType}/${objectId} -> ${toObjectType} ===`);

  const url = `${BASE_URL}/crm/v4/objects/${objectType}/${objectId}/associations/${toObjectType}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`SUCCESS: Found ${data.results?.length || 0} associations`);

    return data;

  } catch (error) {
    console.error(`ERROR testing associations:`, error.message);
    return { error: error.message, results: [] };
  }
}

/**
 * Main function
 */
async function fetchAllData() {
  console.log('========================================');
  console.log('  HubSpot API Full Data Fetch (50 each)');
  console.log('========================================');

  const results = {};

  // 1. Fetch contacts with associations
  results.contacts = await fetchWithAssociations('contacts', ['deals', 'companies']);

  // 2. Fetch deals with associations
  results.deals = await fetchWithAssociations('deals', ['contacts', 'companies', 'line_items']);

  // 3. Fetch calls with associations
  results.calls = await fetchWithAssociations('calls', ['contacts', 'deals', 'companies']);

  // 4. Fetch companies
  results.companies = await fetchWithAssociations('companies', ['contacts', 'deals']);

  // 5. Fetch line_items (call activities)
  results.line_items = await fetchWithAssociations('line_items', ['deals']);

  // 6. Fetch owners
  results.owners = await fetchOwners();

  // 7. Fetch properties schemas
  console.log('\n========================================');
  console.log('  Fetching Properties Schemas');
  console.log('========================================');

  results.schemas = {
    contacts: await fetchPropertiesSchema('contacts'),
    deals: await fetchPropertiesSchema('deals'),
    calls: await fetchPropertiesSchema('calls'),
    companies: await fetchPropertiesSchema('companies')
  };

  // 8. Test associations API (if we have data)
  if (results.calls?.results?.length > 0) {
    const firstCallId = results.calls.results[0].id;
    console.log('\n========================================');
    console.log('  Testing Associations API');
    console.log('========================================');

    results.associationsTest = {
      callToContacts: await testAssociationsAPI('calls', firstCallId, 'contacts'),
      callToDeals: await testAssociationsAPI('calls', firstCallId, 'deals')
    };

    if (results.contacts?.results?.length > 0) {
      const firstContactId = results.contacts.results[0].id;
      results.associationsTest.contactToDeals = await testAssociationsAPI('contacts', firstContactId, 'deals');
    }
  }

  // Save results to JSON files
  const outputDir = `${__dirname}/test-data`;

  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  console.log('\n========================================');
  console.log('  Saving Results');
  console.log('========================================');

  // Save each object type separately
  Object.keys(results).forEach(key => {
    const filename = `${outputDir}/${key}.json`;
    writeFileSync(filename, JSON.stringify(results[key], null, 2));
    console.log(`Saved: ${filename}`);
  });

  // Save summary
  const summary = {
    fetchedAt: new Date().toISOString(),
    counts: {
      contacts: results.contacts?.results?.length || 0,
      deals: results.deals?.results?.length || 0,
      calls: results.calls?.results?.length || 0,
      companies: results.companies?.results?.length || 0,
      line_items: results.line_items?.results?.length || 0,
      owners: results.owners?.results?.length || 0
    },
    propertySchemas: {
      contacts: results.schemas?.contacts?.results?.length || 0,
      deals: results.schemas?.deals?.results?.length || 0,
      calls: results.schemas?.calls?.results?.length || 0,
      companies: results.schemas?.companies?.results?.length || 0
    },
    associations: results.associationsTest || {}
  };

  writeFileSync(`${outputDir}/SUMMARY.json`, JSON.stringify(summary, null, 2));
  console.log(`\nSaved: ${outputDir}/SUMMARY.json`);

  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n\nDONE! Check scripts/discovery/test-data/ for results');
}

fetchAllData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
