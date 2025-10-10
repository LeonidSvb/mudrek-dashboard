/**
 * FULL SYNC: Fetch ALL 422 properties from HubSpot
 *
 * This script requests ALL available properties using propertiesWithHistory=all
 *
 * Usage:
 *   node src/hubspot/sync-all-properties.js
 *
 * Features:
 * - Contacts: ALL 422 properties
 * - Deals: ALL 215 properties
 * - Calls: ALL 97 properties
 * - Associations: contacts ↔ deals (included in response)
 * - Parallel sync for maximum speed
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get list of ALL property names for an object type
 */
async function getAllPropertyNames(objectType) {
  console.log(`🔍 Fetching property schema for ${objectType}...`);

  const url = `${BASE_URL}/crm/v3/properties/${objectType}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
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
 * Fetch ALL properties from HubSpot by explicitly requesting each property
 */
async function fetchAllProperties(objectType, associations = []) {
  // First, get ALL property names
  const propertyNames = await getAllPropertyNames(objectType);
  let allRecords = [];
  let after = null;
  let hasMore = true;
  let pageCount = 0;

  console.log(`📡 Fetching ${objectType} with ALL properties...`);

  while (hasMore) {
    pageCount++;

    // Build URL with ALL properties explicitly
    let url = `${BASE_URL}/crm/v3/objects/${objectType}?limit=100&archived=false`;

    // Add ALL properties explicitly
    const propsParam = propertyNames.map(p => `properties=${p}`).join('&');
    url += `&${propsParam}`;

    // Add associations if specified
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
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.results);

      // Show progress
      const propertiesCount = data.results[0]?.properties ? Object.keys(data.results[0].properties).length : 0;
      console.log(`  → Page ${pageCount}: ${data.results.length} records (${propertiesCount} properties each, total: ${allRecords.length})`);

      if (data.paging?.next) {
        after = data.paging.next.after;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`✗ Failed to fetch ${objectType} page ${pageCount}:`, error.message);
      throw error;
    }
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
 * Save to Supabase in batches
 */
async function saveToSupabase(tableName, records, transformFn) {
  if (records.length === 0) {
    console.log(`⚠️  No records to save to ${tableName}`);
    return { success: 0, errors: 0 };
  }

  console.log(`💾 Saving ${records.length} records to ${tableName}...`);

  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const transformedBatch = batch.map(transformFn);

    const { error } = await supabase
      .from(tableName)
      .upsert(transformedBatch, {
        onConflict: 'hubspot_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`  ✗ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      errorCount += batch.length;
    } else {
      console.log(`  ✓ Batch ${i}-${i + BATCH_SIZE} saved`);
      successCount += batch.length;
    }
  }

  console.log(`✓ ${tableName}: ${successCount} success, ${errorCount} errors\n`);
  return { success: successCount, errors: errorCount };
}

/**
 * Sync contacts with ALL 422 properties
 */
async function syncContactsAll() {
  const contacts = await fetchAllProperties('contacts', ['deals', 'companies']);

  return await saveToSupabase('hubspot_contacts_raw', contacts, (contact) => ({
    hubspot_id: contact.id,
    email: contact.properties.email,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    phone: contact.properties.phone || contact.properties.mobilephone || null,
    createdate: contact.properties.createdate,
    lifecyclestage: contact.properties.lifecyclestage,
    sales_script_version: contact.properties.sales_script_version,
    vsl_watched: contact.properties.vsl_watched === 'true',
    vsl_watch_duration: contact.properties.vsl_watch_duration ? parseInt(contact.properties.vsl_watch_duration) : null,
    hubspot_owner_id: contact.properties.hubspot_owner_id || null,
    // ✅ FULL raw_json with ALL 422 properties!
    raw_json: {
      ...contact.properties,
      // Include associations in raw_json
      associations: contact.associations || {}
    },
    synced_at: new Date().toISOString()
  }));
}

/**
 * Sync deals with ALL 215 properties
 */
async function syncDealsAll() {
  const deals = await fetchAllProperties('deals', ['contacts', 'companies', 'line_items']);

  return await saveToSupabase('hubspot_deals_raw', deals, (deal) => ({
    hubspot_id: deal.id,
    amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
    dealstage: deal.properties.dealstage,
    createdate: deal.properties.createdate,
    closedate: deal.properties.closedate,
    hubspot_owner_id: deal.properties.hubspot_owner_id || null,
    qualified_status: deal.properties.qualified_status,
    trial_status: deal.properties.trial_status,
    payment_status: deal.properties.payment_status,
    number_of_installments__months: deal.properties.number_of_installments__months
      ? parseInt(deal.properties.number_of_installments__months)
      : null,
    cancellation_reason: deal.properties.cancellation_reason,
    is_refunded: deal.properties.is_refunded === 'true',
    installment_plan: deal.properties.installment_plan,
    upfront_payment: deal.properties.upfront_payment ? parseFloat(deal.properties.upfront_payment) : null,
    offer_given: deal.properties.offer_given === 'true',
    offer_accepted: deal.properties.offer_accepted === 'true',
    // ✅ FULL raw_json with ALL 215 properties!
    raw_json: {
      ...deal.properties,
      associations: deal.associations || {}
    },
    synced_at: new Date().toISOString()
  }));
}

/**
 * Sync calls with ALL 97 properties
 */
async function syncCallsAll() {
  const calls = await fetchAllProperties('calls', ['contacts', 'deals', 'companies']);

  return await saveToSupabase('hubspot_calls_raw', calls, (call) => ({
    hubspot_id: call.id,
    call_duration: call.properties.hs_call_duration ? parseInt(call.properties.hs_call_duration) : null,
    call_direction: call.properties.hs_call_direction,
    call_to_number: call.properties.hs_call_to_number,
    call_from_number: call.properties.hs_call_from_number,
    call_timestamp: call.properties.hs_timestamp,
    call_disposition: call.properties.hs_call_disposition,
    // ✅ FULL raw_json with ALL 97 properties!
    raw_json: {
      ...call.properties,
      associations: call.associations || {}
    },
    synced_at: new Date().toISOString()
  }));
}

/**
 * Refresh materialized views
 */
async function refreshMaterializedViews() {
  console.log('\n🔄 Refreshing materialized views...');

  try {
    const { error } = await supabase.rpc('refresh_contact_call_stats');

    if (error) {
      console.error('✗ Failed to refresh materialized view:', error.message);
      throw error;
    }

    console.log('✓ Materialized views refreshed successfully');
  } catch (error) {
    console.error('✗ Materialized view refresh error:', error.message);
  }
}

/**
 * Main sync - ALL properties
 */
async function syncAll() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  FULL SYNC: ALL 422/215/97 Properties   ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Run ALL syncs in parallel
    const [contactsResult, dealsResult, callsResult] = await Promise.allSettled([
      syncContactsAll(),
      syncDealsAll(),
      syncCallsAll()
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Results
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║               SYNC RESULTS                 ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    console.log('📊 CONTACTS:', contactsResult.status === 'fulfilled' ? '✅' : '❌');
    if (contactsResult.status === 'fulfilled') {
      const { success, errors } = contactsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    } else {
      console.error(`   Error:`, contactsResult.reason);
    }

    console.log('\n💼 DEALS:', dealsResult.status === 'fulfilled' ? '✅' : '❌');
    if (dealsResult.status === 'fulfilled') {
      const { success, errors } = dealsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    } else {
      console.error(`   Error:`, dealsResult.reason);
    }

    console.log('\n📞 CALLS:', callsResult.status === 'fulfilled' ? '✅' : '❌');
    if (callsResult.status === 'fulfilled') {
      const { success, errors } = callsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    } else {
      console.error(`   Error:`, callsResult.reason);
    }

    console.log(`\n⏱️  Total duration: ${duration}s`);
    console.log('\n✅ Full sync completed!');

    // Refresh views
    await refreshMaterializedViews();

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

syncAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
