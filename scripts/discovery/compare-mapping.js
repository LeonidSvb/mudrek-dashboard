#!/usr/bin/env node
/**
 * Compare HubSpot API data with Supabase mapping
 *
 * PURPOSE: Verify that all fields from HubSpot are correctly mapped to Supabase
 *
 * USAGE:
 *   cd "C:\Users\79818\Desktop\Shadi - new"
 *   node scripts/discovery/compare-mapping.js
 *
 * OUTPUT:
 *   scripts/discovery/mapping-comparison.json
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchFromHubSpot(objectType, id) {
  const url = `${BASE_URL}/crm/v3/objects/${objectType}/${id}?associations=contacts,deals,calls`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HubSpot API error: ${response.status}`);
  }

  return await response.json();
}

async function compareDeal(dealId) {
  console.log(`\n🔍 Comparing Deal ${dealId}...`);

  // Get from Supabase
  const { data: supabaseData } = await supabase
    .from('hubspot_deals_raw')
    .select('*')
    .eq('hubspot_id', dealId)
    .single();

  // Get from HubSpot
  const hubspotData = await fetchFromHubSpot('deals', dealId);

  const comparison = {
    deal_id: dealId,
    supabase: {
      extracted_fields: Object.keys(supabaseData).filter(k => k !== 'raw_json' && k !== 'synced_at' && k !== 'updated_at'),
      raw_json_keys: Object.keys(supabaseData.raw_json || {}),
      has_associations: !!supabaseData.raw_json?.associations
    },
    hubspot: {
      properties: Object.keys(hubspotData.properties || {}),
      has_associations: !!hubspotData.associations,
      associations_types: hubspotData.associations ? Object.keys(hubspotData.associations) : []
    },
    missing_in_supabase: {
      properties: [],
      associations: hubspotData.associations ? Object.keys(hubspotData.associations) : []
    }
  };

  // Find missing properties
  const hubspotProps = new Set(Object.keys(hubspotData.properties || {}));
  const supabaseProps = new Set(Object.keys(supabaseData.raw_json || {}));

  comparison.missing_in_supabase.properties = [...hubspotProps].filter(p => !supabaseProps.has(p));

  console.log(`  ✓ HubSpot properties: ${comparison.hubspot.properties.length}`);
  console.log(`  ✓ Supabase raw_json keys: ${comparison.supabase.raw_json_keys.length}`);
  console.log(`  ${comparison.missing_in_supabase.properties.length === 0 ? '✅' : '⚠️'} Missing properties: ${comparison.missing_in_supabase.properties.length}`);
  console.log(`  ${comparison.supabase.has_associations ? '✅' : '❌'} Associations in Supabase: ${comparison.supabase.has_associations}`);
  console.log(`  ${comparison.hubspot.has_associations ? '✅' : '❌'} Associations in HubSpot: ${comparison.hubspot.has_associations}`);

  return { deal: comparison, hubspot_full: hubspotData, supabase_full: supabaseData };
}

async function compareContact(contactId) {
  console.log(`\n🔍 Comparing Contact ${contactId}...`);

  const { data: supabaseData } = await supabase
    .from('hubspot_contacts_raw')
    .select('*')
    .eq('hubspot_id', contactId)
    .single();

  const hubspotData = await fetchFromHubSpot('contacts', contactId);

  const comparison = {
    contact_id: contactId,
    supabase: {
      extracted_fields: Object.keys(supabaseData).filter(k => k !== 'raw_json' && k !== 'synced_at' && k !== 'updated_at'),
      raw_json_keys: Object.keys(supabaseData.raw_json || {}),
      has_associations: !!supabaseData.raw_json?.associations
    },
    hubspot: {
      properties: Object.keys(hubspotData.properties || {}),
      has_associations: !!hubspotData.associations,
      associations_types: hubspotData.associations ? Object.keys(hubspotData.associations) : []
    },
    missing_in_supabase: {
      properties: [],
      associations: hubspotData.associations ? Object.keys(hubspotData.associations) : []
    }
  };

  const hubspotProps = new Set(Object.keys(hubspotData.properties || {}));
  const supabaseProps = new Set(Object.keys(supabaseData.raw_json || {}));

  comparison.missing_in_supabase.properties = [...hubspotProps].filter(p => !supabaseProps.has(p));

  console.log(`  ✓ HubSpot properties: ${comparison.hubspot.properties.length}`);
  console.log(`  ✓ Supabase raw_json keys: ${comparison.supabase.raw_json_keys.length}`);
  console.log(`  ${comparison.missing_in_supabase.properties.length === 0 ? '✅' : '⚠️'} Missing properties: ${comparison.missing_in_supabase.properties.length}`);
  console.log(`  ${comparison.supabase.has_associations ? '✅' : '❌'} Associations in Supabase: ${comparison.supabase.has_associations}`);

  return { contact: comparison, hubspot_full: hubspotData, supabase_full: supabaseData };
}

async function compareCall(callId) {
  console.log(`\n🔍 Comparing Call ${callId}...`);

  const { data: supabaseData } = await supabase
    .from('hubspot_calls_raw')
    .select('*')
    .eq('hubspot_id', callId)
    .single();

  const hubspotData = await fetchFromHubSpot('calls', callId);

  const comparison = {
    call_id: callId,
    supabase: {
      extracted_fields: Object.keys(supabaseData).filter(k => k !== 'raw_json' && k !== 'synced_at' && k !== 'updated_at'),
      raw_json_keys: Object.keys(supabaseData.raw_json || {}),
      has_associations: !!supabaseData.raw_json?.associations
    },
    hubspot: {
      properties: Object.keys(hubspotData.properties || {}),
      has_associations: !!hubspotData.associations,
      associations_types: hubspotData.associations ? Object.keys(hubspotData.associations) : []
    },
    missing_in_supabase: {
      properties: [],
      associations: hubspotData.associations ? Object.keys(hubspotData.associations) : []
    }
  };

  const hubspotProps = new Set(Object.keys(hubspotData.properties || {}));
  const supabaseProps = new Set(Object.keys(supabaseData.raw_json || {}));

  comparison.missing_in_supabase.properties = [...hubspotProps].filter(p => !supabaseProps.has(p));

  console.log(`  ✓ HubSpot properties: ${comparison.hubspot.properties.length}`);
  console.log(`  ✓ Supabase raw_json keys: ${comparison.supabase.raw_json_keys.length}`);
  console.log(`  ${comparison.missing_in_supabase.properties.length === 0 ? '✅' : '⚠️'} Missing properties: ${comparison.missing_in_supabase.properties.length}`);
  console.log(`  ${comparison.supabase.has_associations ? '✅' : '❌'} Associations in Supabase: ${comparison.supabase.has_associations}`);

  return { call: comparison, hubspot_full: hubspotData, supabase_full: supabaseData };
}

async function main() {
  console.log('=== HUBSPOT ↔ SUPABASE MAPPING COMPARISON ===\n');

  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tested: 0,
      properties_match: 0,
      properties_missing: 0,
      associations_missing: 0
    },
    deals: [],
    contacts: [],
    calls: [],
    full_data: []
  };

  try {
    // Test 2 deals
    const dealIds = ['43489795363', '43504183139'];
    for (const id of dealIds) {
      const result = await compareDeal(id);
      results.deals.push(result.deal);
      results.full_data.push({ type: 'deal', id, hubspot: result.hubspot_full, supabase: result.supabase_full });
      results.summary.total_tested++;
      if (result.deal.missing_in_supabase.properties.length === 0) {
        results.summary.properties_match++;
      } else {
        results.summary.properties_missing++;
      }
      if (result.deal.missing_in_supabase.associations.length > 0) {
        results.summary.associations_missing++;
      }
    }

    // Test 2 contacts
    const contactIds = ['75060', '75061'];
    for (const id of contactIds) {
      const result = await compareContact(id);
      results.contacts.push(result.contact);
      results.full_data.push({ type: 'contact', id, hubspot: result.hubspot_full, supabase: result.supabase_full });
      results.summary.total_tested++;
      if (result.contact.missing_in_supabase.properties.length === 0) {
        results.summary.properties_match++;
      } else {
        results.summary.properties_missing++;
      }
      if (result.contact.missing_in_supabase.associations.length > 0) {
        results.summary.associations_missing++;
      }
    }

    // Test 1 call
    const callIds = ['53840595375'];
    for (const id of callIds) {
      const result = await compareCall(id);
      results.calls.push(result.call);
      results.full_data.push({ type: 'call', id, hubspot: result.hubspot_full, supabase: result.supabase_full });
      results.summary.total_tested++;
      if (result.call.missing_in_supabase.properties.length === 0) {
        results.summary.properties_match++;
      } else {
        results.summary.properties_missing++;
      }
      if (result.call.missing_in_supabase.associations.length > 0) {
        results.summary.associations_missing++;
      }
    }

    // Save results
    const outputPath = join(process.cwd(), 'scripts', 'discovery', 'mapping-comparison.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log('\n\n=== SUMMARY ===');
    console.log(`Total tested: ${results.summary.total_tested}`);
    console.log(`Properties match: ${results.summary.properties_match}`);
    console.log(`Properties missing: ${results.summary.properties_missing}`);
    console.log(`Associations missing: ${results.summary.associations_missing}`);
    console.log(`\n💾 Report saved: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
