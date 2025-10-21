#!/usr/bin/env node
/**
 * Full Sync Script for GitHub Actions
 *
 * Syncs ALL records from HubSpot to Supabase
 * Auto-detects new custom fields created by Jason
 * Uses JSONB merge to preserve old fields
 * Runs weekly via GitHub Actions
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!HUBSPOT_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ===== AUTO-DETECT CUSTOM FIELDS =====

async function makeHubSpotRequest(endpoint, options = {}) {
  const url = `https://api.hubapi.com${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getCustomContactProperties() {
  console.log('🔍 Auto-detecting custom contact properties...');

  const data = await makeHubSpotRequest('/crm/v3/properties/contacts');

  // Filter out garbage fields
  const custom = data.results
    .filter(prop => !prop.name.startsWith('hs_') && !prop.hubspotDefined)
    .filter(prop => {
      const name = prop.name.toLowerCase();
      // Exclude lead form questions (мусор)
      if (name.includes('lead_ad_prop')) return false;
      // Exclude legacy fields
      if (name.includes('legacy') || name.startsWith('notes')) return false;
      // Exclude test fields
      if (name.includes('quick_test') || name.includes('meme')) return false;
      return true;
    })
    .map(prop => prop.name);

  console.log(`✅ Found ${custom.length} useful custom properties`);
  console.log(`   Including: ${custom.slice(0, 5).join(', ')}...`);

  return custom;
}

// Base properties (always include)
const BASE_CONTACT_PROPERTIES = [
  'email',
  'phone',
  'firstname',
  'lastname',
  'createdate',
  'lifecyclestage',
  'hubspot_owner_id',
  'lastmodifieddate',
  'hs_object_id',
];

const DEAL_PROPERTIES = [
  'amount',
  'dealstage',
  'dealname',
  'createdate',
  'closedate',
  'qualified_status',
  'trial_status',
  'payment_status',
  'number_of_installments__months',
  'cancellation_reason',
  'is_refunded',
  'installment_plan',
  'upfront_payment',
  'offer_given',
  'offer_accepted',
  'hubspot_owner_id',
  'lastmodifieddate',
];

const CALL_PROPERTIES = [
  'hs_call_duration',
  'hs_call_direction',
  'hs_call_to_number',
  'hs_call_from_number',
  'hs_timestamp',
  'hs_call_disposition',
  'hs_call_status',
];

// ===== FETCH FUNCTIONS =====

async function fetchAllContacts(properties) {
  console.log('📡 Fetching ALL contacts from HubSpot...');

  let allContacts = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/contacts?limit=100&archived=false&properties=${properties.join(',')}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeHubSpotRequest(endpoint);
    allContacts = allContacts.concat(response.results);

    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allContacts.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allContacts.length} contacts\n`);
  return allContacts;
}

async function fetchAllDeals(properties) {
  console.log('📡 Fetching ALL deals from HubSpot...');

  let allDeals = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/deals?limit=100&archived=false&properties=${properties.join(',')}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeHubSpotRequest(endpoint);
    allDeals = allDeals.concat(response.results);

    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allDeals.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allDeals.length} deals\n`);
  return allDeals;
}

async function fetchAllCalls(properties) {
  console.log('📡 Fetching ALL calls from HubSpot...');

  let allCalls = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/calls?limit=100&archived=false&properties=${properties.join(',')}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeHubSpotRequest(endpoint);
    allCalls = allCalls.concat(response.results);

    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allCalls.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allCalls.length} calls\n`);
  return allCalls;
}

// ===== TRANSFORM FUNCTIONS =====

function transformContact(contact, batchId) {
  const props = contact.properties;

  return {
    hubspot_id: contact.id,
    email: props.email || null,
    phone: props.phone || null,
    firstname: props.firstname || null,
    lastname: props.lastname || null,
    createdate: props.createdate || null,
    lifecyclestage: props.lifecyclestage || null,
    sales_script_version: props.sales_script_version || null,
    vsl_watched: props.vsl_watched === 'true' || props.vsl_watched === '1',
    vsl_watch_duration: props.vsl_watch_duration ? parseInt(props.vsl_watch_duration) : null,
    hubspot_owner_id: props.hubspot_owner_id || null,
    contact_stage: props.contact_stage || null,
    raw_json: contact,
    sync_batch_id: batchId,
  };
}

function transformDeal(deal, batchId) {
  const props = deal.properties;

  return {
    hubspot_id: deal.id,
    amount: props.amount ? parseFloat(props.amount) : null,
    dealstage: props.dealstage || null,
    dealname: props.dealname || null,
    createdate: props.createdate || null,
    closedate: props.closedate || null,
    qualified_status: props.qualified_status || null,
    trial_status: props.trial_status || null,
    payment_status: props.payment_status || null,
    number_of_installments__months: props.number_of_installments__months ? parseInt(props.number_of_installments__months) : null,
    cancellation_reason: props.cancellation_reason || null,
    is_refunded: props.is_refunded === 'true' || props.is_refunded === '1',
    installment_plan: props.installment_plan || null,
    upfront_payment: props.upfront_payment ? parseFloat(props.upfront_payment) : null,
    offer_given: props.offer_given === 'true' || props.offer_given === '1',
    offer_accepted: props.offer_accepted === 'true' || props.offer_accepted === '1',
    hubspot_owner_id: props.hubspot_owner_id || null,
    raw_json: deal,
    sync_batch_id: batchId,
  };
}

function transformCall(call, batchId) {
  const props = call.properties;

  return {
    hubspot_id: call.id,
    call_duration: props.hs_call_duration ? parseInt(props.hs_call_duration) : null,
    call_direction: props.hs_call_direction || null,
    call_to_number: props.hs_call_to_number || null,
    call_from_number: props.hs_call_from_number || null,
    call_timestamp: props.hs_timestamp || null,
    call_disposition: props.hs_call_disposition || null,
    raw_json: call,
    sync_batch_id: batchId,
  };
}

// ===== JSONB MERGE UPSERT =====

async function upsertWithMerge(tableName, records) {
  if (records.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const BATCH_SIZE = 500;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  // Get existing records
  const allIds = records.map(r => r.hubspot_id);
  const { data: existingRecords } = await supabase
    .from(tableName)
    .select('hubspot_id, raw_json')
    .in('hubspot_id', allIds);

  const existingMap = new Map(
    (existingRecords || []).map(r => [r.hubspot_id, r.raw_json])
  );

  console.log(`   📊 Existing: ${existingMap.size}, New: ${allIds.length - existingMap.size}`);

  // Merge properties
  const mergedRecords = records.map(record => {
    const existing = existingMap.get(record.hubspot_id);

    if (existing && existing.properties) {
      // MERGE: сохраняем старые поля + добавляем новые
      record.raw_json.properties = {
        ...existing.properties,
        ...record.raw_json.properties
      };
    }

    return record;
  });

  // Batch upsert
  for (let i = 0; i < mergedRecords.length; i += BATCH_SIZE) {
    const batch = mergedRecords.slice(i, i + BATCH_SIZE);

    const batchInserts = batch.filter(r => !existingMap.has(r.hubspot_id)).length;
    const batchUpdates = batch.length - batchInserts;

    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'hubspot_id' });

    if (error) {
      console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batchInserts;
      updated += batchUpdates;
      console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${batchInserts} new, ${batchUpdates} updated`);
    }
  }

  return { inserted, updated, failed };
}

// ===== SYNC FUNCTIONS =====

async function syncContacts(sessionBatchId, contactProperties) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📇 SYNCING CONTACTS (FULL)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  const { data: logData } = await supabase
    .from('sync_logs')
    .insert({
      object_type: 'contacts',
      triggered_by: 'github_action_weekly',
      batch_id: batchId,
      sync_batch_id: sessionBatchId,
      sync_started_at: new Date().toISOString(),
      metadata: { sync_mode: 'full', properties_count: contactProperties.length }
    })
    .select()
    .single();

  try {
    const contacts = await fetchAllContacts(contactProperties);
    const transformed = contacts.map(c => transformContact(c, batchId));
    const { inserted, updated, failed } = await upsertWithMerge('hubspot_contacts_raw', transformed);

    const duration = Math.round((Date.now() - startTime) / 1000);

    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        duration_seconds: duration,
        records_fetched: contacts.length,
        records_inserted: inserted,
        records_updated: updated,
        records_failed: failed,
        status: failed === 0 ? 'success' : 'partial',
      })
      .eq('id', logData.id);

    console.log(`✅ Contacts: ${contacts.length} fetched, ${inserted} new, ${updated} updated (${duration}s)`);

    return { success: failed === 0 };

  } catch (error) {
    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', logData.id);

    throw error;
  }
}

async function syncDeals(sessionBatchId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💼 SYNCING DEALS (FULL)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  const { data: logData } = await supabase
    .from('sync_logs')
    .insert({
      object_type: 'deals',
      triggered_by: 'github_action_weekly',
      batch_id: batchId,
      sync_batch_id: sessionBatchId,
      sync_started_at: new Date().toISOString(),
      metadata: { sync_mode: 'full' }
    })
    .select()
    .single();

  try {
    const deals = await fetchAllDeals(DEAL_PROPERTIES);
    const transformed = deals.map(d => transformDeal(d, batchId));
    const { inserted, updated, failed } = await upsertWithMerge('hubspot_deals_raw', transformed);

    const duration = Math.round((Date.now() - startTime) / 1000);

    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        duration_seconds: duration,
        records_fetched: deals.length,
        records_inserted: inserted,
        records_updated: updated,
        records_failed: failed,
        status: failed === 0 ? 'success' : 'partial',
      })
      .eq('id', logData.id);

    console.log(`✅ Deals: ${deals.length} fetched, ${inserted} new, ${updated} updated (${duration}s)`);

    return { success: failed === 0 };

  } catch (error) {
    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', logData.id);

    throw error;
  }
}

async function syncCalls(sessionBatchId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📞 SYNCING CALLS (FULL)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  const { data: logData } = await supabase
    .from('sync_logs')
    .insert({
      object_type: 'calls',
      triggered_by: 'github_action_weekly',
      batch_id: batchId,
      sync_batch_id: sessionBatchId,
      sync_started_at: new Date().toISOString(),
      metadata: { sync_mode: 'full' }
    })
    .select()
    .single();

  try {
    const calls = await fetchAllCalls(CALL_PROPERTIES);
    const transformed = calls.map(c => transformCall(c, batchId));
    const { inserted, updated, failed } = await upsertWithMerge('hubspot_calls_raw', transformed);

    const duration = Math.round((Date.now() - startTime) / 1000);

    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        duration_seconds: duration,
        records_fetched: calls.length,
        records_inserted: inserted,
        records_updated: updated,
        records_failed: failed,
        status: failed === 0 ? 'success' : 'partial',
      })
      .eq('id', logData.id);

    console.log(`✅ Calls: ${calls.length} fetched, ${inserted} new, ${updated} updated (${duration}s)`);

    return { success: failed === 0 };

  } catch (error) {
    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', logData.id);

    throw error;
  }
}

// ===== MAIN =====

async function main() {
  const sessionBatchId = crypto.randomUUID();

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║     HUBSPOT → SUPABASE FULL SYNC          ║');
  console.log(`║     Session: ${sessionBatchId.slice(0, 8)}...             ║`);
  console.log('╚═══════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const errors = [];

  // Auto-detect custom contact properties
  let customProperties = [];
  try {
    customProperties = await getCustomContactProperties();
  } catch (error) {
    console.warn('⚠️  Failed to auto-detect custom properties, using base set only');
    console.warn(error.message);
  }

  const contactProperties = [...BASE_CONTACT_PROPERTIES, ...customProperties];
  console.log(`📋 Syncing ${contactProperties.length} contact properties (${BASE_CONTACT_PROPERTIES.length} base + ${customProperties.length} custom)\n`);

  // Sequential sync
  try {
    await syncContacts(sessionBatchId, contactProperties);
  } catch (error) {
    console.error('❌ Contacts sync failed:', error.message);
    errors.push(`Contacts: ${error.message}`);
  }

  try {
    await syncDeals(sessionBatchId);
  } catch (error) {
    console.error('❌ Deals sync failed:', error.message);
    errors.push(`Deals: ${error.message}`);
  }

  try {
    await syncCalls(sessionBatchId);
  } catch (error) {
    console.error('❌ Calls sync failed:', error.message);
    errors.push(`Calls: ${error.message}`);
  }

  // Refresh materialized views
  console.log('\n🔄 Refreshing materialized views...');
  try {
    await supabase.rpc('refresh_materialized_views');
    console.log('   ✅ Materialized views refreshed');
  } catch (error) {
    console.warn('   ⚠️  Failed to refresh materialized views:', error.message);
  }

  const totalDuration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n╔═══════════════════════════════════════════╗');
  if (errors.length === 0) {
    console.log('║         SYNC COMPLETED SUCCESSFULLY       ║');
  } else if (errors.length < 3) {
    console.log('║         SYNC COMPLETED PARTIALLY          ║');
  } else {
    console.log('║            SYNC FAILED                    ║');
  }
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`\n⏱️  Total duration: ${totalDuration}s`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors (${errors.length}):`);
    errors.forEach(err => console.log(`   - ${err}`));
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ SYNC FAILED:', error);
  process.exit(1);
});
