#!/usr/bin/env node
/**
 * Incremental Sync Script for GitHub Actions
 *
 * Syncs only modified/new records from HubSpot to Supabase
 * Uses JSONB merge to preserve old fields
 * Runs hourly via GitHub Actions
 */

// Load environment variables from .env file (for local testing)
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { createRun, Logger, updateRun } = require('../lib/cron-logger');

// Environment variables
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!HUBSPOT_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: HUBSPOT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ===== CONTACT PROPERTIES =====
// Оптимизированный список: 35 полей вместо 421 (экономия 91% места)
const CONTACT_PROPERTIES = [
  // Standard HubSpot fields (11)
  'email',
  'phone',
  'firstname',
  'lastname',
  'createdate',
  'lifecyclestage',
  'hubspot_owner_id',
  'lastmodifieddate',
  'hs_object_id',

  // Custom Critical (9) - ОБЯЗАТЕЛЬНО для бизнес-логики
  'sold_by_',              // КТО ПРОДАЛ (критично!)
  'contact_stage',         // стадия контакта
  'sales_script_version',  // версия скрипта продаж
  'qualified',             // квалифицирован ли
  'status',                // текущий статус
  'stage',                 // этап воронки
  'hot_lead',              // горячий лид
  'contact_source',        // источник контакта
  'lost_reason',           // причина потери

  // Custom Useful (15) - полезные для аналитики
  'first_contact_within_30min',
  'offer_sent',
  'deal_amount',
  'monthly_payment',
  'number_of_installments',
  'first_payment_date',
  'last_payment',
  'video_attended',
  'vsl_watched',
  'vsl_watch_duration',
  'lead_score',
  'campaign',
  'ad',
  'source',
  'payment_method',
  'quiz'
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
  'deal_whole_amount',
  'the_left_amount',
  'installment_monthly_amount',
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

// ===== HELPER FUNCTIONS =====

async function makeHubSpotRequest(endpoint, options = {}, retryCount = 0) {
  const url = `https://api.hubapi.com${endpoint}`;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10000;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.warn(`⚠️  Rate limit hit. Waiting ${RETRY_DELAY_MS/1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return makeHubSpotRequest(endpoint, options, retryCount + 1);
      }
      const errorText = await response.text();
      throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`HubSpot API request failed: ${endpoint}`, error);
    throw error;
  }
}

async function getLastSuccessfulSyncTime() {
  const { data, error } = await supabase
    .from('runs')
    .select('finished_at')
    .eq('script_name', 'hubspot-incremental-sync')
    .eq('status', 'success')
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.finished_at);
}

async function searchContactsByDate(since, properties) {
  console.log(`📡 Searching contacts modified/created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [{
          propertyName: 'hs_lastmodifieddate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      },
      {
        filters: [{
          propertyName: 'createdate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      }
    ],
    properties,
    limit: 100,
  };

  let allContacts = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeHubSpotRequest(
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    allContacts = allContacts.concat(response.results);
    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allContacts.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allContacts.length} contacts\n`);
  return allContacts;
}

async function searchDealsByDate(since, properties) {
  console.log(`📡 Searching deals modified/created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [{
          propertyName: 'hs_lastmodifieddate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      },
      {
        filters: [{
          propertyName: 'createdate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      }
    ],
    properties,
    limit: 100,
  };

  let allDeals = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeHubSpotRequest(
      '/crm/v3/objects/deals/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    allDeals = allDeals.concat(response.results);
    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allDeals.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allDeals.length} deals\n`);
  return allDeals;
}

async function searchCallsByDate(since, properties) {
  console.log(`📡 Searching calls created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [{
      filters: [{
        propertyName: 'hs_timestamp',
        operator: 'GTE',
        value: since.getTime().toString(),
      }]
    }],
    properties,
    limit: 100,
  };

  let allCalls = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeHubSpotRequest(
      '/crm/v3/objects/calls/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    allCalls = allCalls.concat(response.results);
    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allCalls.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allCalls.length} calls\n`);
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
    deal_whole_amount: props.deal_whole_amount ? parseFloat(props.deal_whole_amount) : null,
    the_left_amount: props.the_left_amount ? parseFloat(props.the_left_amount) : null,
    installment_monthly_amount: props.installment_monthly_amount ? parseFloat(props.installment_monthly_amount) : null,
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

// ===== UPSERT FUNCTIONS =====

async function upsertWithMerge(tableName, records) {
  if (records.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const BATCH_SIZE = 500;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  // Get existing records with their raw_json
  const allIds = records.map(r => r.hubspot_id);
  const { data: existingRecords } = await supabase
    .from(tableName)
    .select('hubspot_id, raw_json')
    .in('hubspot_id', allIds);

  const existingMap = new Map(
    (existingRecords || []).map(r => [r.hubspot_id, r.raw_json])
  );

  console.log(`   📊 Existing: ${existingMap.size}, New: ${allIds.length - existingMap.size}`);

  // Merge properties for existing records
  const mergedRecords = records.map(record => {
    const existing = existingMap.get(record.hubspot_id);

    if (existing && existing.properties) {
      // MERGE: старые properties + новые properties
      record.raw_json.properties = {
        ...existing.properties,           // старые поля (сохраняем!)
        ...record.raw_json.properties    // новые поля (перезаписывают старые)
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

async function insertNew(tableName, records) {
  if (records.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const BATCH_SIZE = 500;
  let inserted = 0;
  let failed = 0;

  console.log(`   📊 Inserting ${records.length} new records (calls are immutable)`);

  // Simple batch insert - calls never update
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'hubspot_id', ignoreDuplicates: true });

    if (error) {
      console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${batch.length} inserted`);
    }
  }

  return { inserted, updated: 0, failed };
}

// ===== SYNC FUNCTIONS =====

async function syncContacts(sessionBatchId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📇 SYNCING CONTACTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  const lastSyncTime = await getLastSuccessfulSyncTime();

  if (!lastSyncTime) {
    console.log('⚠️  No previous sync found. Use sync-full.js for first sync.');
    throw new Error('First sync must be full sync');
  }

  console.log(`🔄 Incremental sync: fetching contacts modified since ${lastSyncTime.toISOString()}`);
  const contacts = await searchContactsByDate(lastSyncTime, CONTACT_PROPERTIES);

  const transformed = contacts.map(c => transformContact(c, batchId));
  const { inserted, updated, failed } = await upsertWithMerge('hubspot_contacts_raw', transformed);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`✅ Contacts: ${contacts.length} fetched, ${inserted} new, ${updated} updated (${duration}s)`);

  return { success: failed === 0, records: contacts.length, inserted, updated };
}

async function syncDeals(sessionBatchId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💼 SYNCING DEALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  const lastSyncTime = await getLastSuccessfulSyncTime();

  if (!lastSyncTime) {
    console.log('⚠️  No previous sync found. Use sync-full.js for first sync.');
    throw new Error('First sync must be full sync');
  }

  console.log(`🔄 Incremental sync: fetching deals modified since ${lastSyncTime.toISOString()}`);
  const deals = await searchDealsByDate(lastSyncTime, DEAL_PROPERTIES);

  const transformed = deals.map(d => transformDeal(d, batchId));
  const { inserted, updated, failed } = await upsertWithMerge('hubspot_deals_raw', transformed);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`✅ Deals: ${deals.length} fetched, ${inserted} new, ${updated} updated (${duration}s)`);

  return { success: failed === 0, records: deals.length, inserted, updated };
}

async function syncCalls(sessionBatchId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📞 SYNCING CALLS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  const lastSyncTime = await getLastSuccessfulSyncTime();

  if (!lastSyncTime) {
    console.log('⚠️  No previous sync found. Use sync-full.js for first sync.');
    throw new Error('First sync must be full sync');
  }

  console.log(`🔄 Incremental sync: fetching calls created since ${lastSyncTime.toISOString()}`);
  const calls = await searchCallsByDate(lastSyncTime, CALL_PROPERTIES);

  const transformed = calls.map(c => transformCall(c, batchId));
  const { inserted, updated, failed } = await insertNew('hubspot_calls_raw', transformed);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`✅ Calls: ${calls.length} fetched, ${inserted} new, ${updated} updated (${duration}s)`);

  return { success: failed === 0, records: calls.length, inserted, updated };
}

// ===== MAIN =====

async function main() {
  const sessionBatchId = crypto.randomUUID();

  // Create run and logger
  const run = await createRun(
    'hubspot-incremental-sync',
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    process.env.GITHUB_ACTIONS ? 'github-actions' : 'manual'
  );

  const logger = new Logger(run.id, SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const startTime = Date.now();

  // Timeout protection: fail if sync takes longer than 30 minutes
  const SYNC_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (incremental should be faster)
  const timeoutHandle = setTimeout(async () => {
    await logger.error('TIMEOUT', 'Incremental sync exceeded 30 minutes, terminating');
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error_message: 'Timeout: sync exceeded 30 minutes'
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  }, SYNC_TIMEOUT_MS);

  await logger.info('START', `Starting incremental sync (session: ${sessionBatchId.slice(0, 8)}...)`);
  const errors = [];
  const stats = {
    contacts: { fetched: 0, inserted: 0, updated: 0 },
    deals: { fetched: 0, inserted: 0, updated: 0 },
  };

  // Sequential sync to avoid HubSpot API rate limits
  try {
    await logger.info('SYNC_CONTACTS', 'Starting contacts sync');
    const result = await syncContacts(sessionBatchId);
    stats.contacts = { fetched: result.records, inserted: result.inserted, updated: result.updated };
    await logger.info('SYNC_CONTACTS', `Contacts synced: ${result.records} fetched, ${result.inserted} new, ${result.updated} updated`);
  } catch (error) {
    await logger.error('SYNC_CONTACTS', `Contacts sync failed: ${error.message}`, { error: error.message, stack: error.stack });
    errors.push(`Contacts: ${error.message}`);
  }

  try {
    await logger.info('SYNC_DEALS', 'Starting deals sync');
    const result = await syncDeals(sessionBatchId);
    stats.deals = { fetched: result.records, inserted: result.inserted, updated: result.updated };
    await logger.info('SYNC_DEALS', `Deals synced: ${result.records} fetched, ${result.inserted} new, ${result.updated} updated`);
  } catch (error) {
    await logger.error('SYNC_DEALS', `Deals sync failed: ${error.message}`, { error: error.message, stack: error.stack });
    errors.push(`Deals: ${error.message}`);
  }

  // Refresh materialized views
  try {
    await logger.info('REFRESH_VIEWS', 'Refreshing materialized views');
    await supabase.rpc('refresh_materialized_views');
    await logger.info('REFRESH_VIEWS', 'Materialized views refreshed');
  } catch (error) {
    await logger.warning('REFRESH_VIEWS', `Failed to refresh materialized views: ${error.message}`);
  }

  const totalDuration = Math.round((Date.now() - startTime) / 1000);
  const durationMs = Date.now() - startTime;

  // Calculate totals
  const totalFetched = stats.contacts.fetched + stats.deals.fetched;
  const totalInserted = stats.contacts.inserted + stats.deals.inserted;
  const totalUpdated = stats.contacts.updated + stats.deals.updated;

  // Clear timeout (sync completed before timeout)
  clearTimeout(timeoutHandle);

  // Update run status
  if (errors.length === 0) {
    await logger.info('END', `Sync completed successfully in ${totalDuration}s`, { stats });
    await updateRun(run.id, {
      status: 'success',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      records_fetched: totalFetched,
      records_inserted: totalInserted,
      records_updated: totalUpdated,
      metadata: { session_batch_id: sessionBatchId, stats }
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(0);
  } else if (errors.length < 2) {
    await logger.warning('END', `Sync completed with ${errors.length} errors in ${totalDuration}s`, { errors, stats });
    await updateRun(run.id, {
      status: 'partial',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      records_fetched: totalFetched,
      records_inserted: totalInserted,
      records_updated: totalUpdated,
      error_message: errors.join('; '),
      metadata: { session_batch_id: sessionBatchId, errors, stats }
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  } else {
    await logger.error('END', `Sync failed with ${errors.length} errors in ${totalDuration}s`, { errors });
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      error_message: errors.join('; '),
      metadata: { session_batch_id: sessionBatchId, errors }
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error('\n❌ SYNC FAILED:', error);
  // Try to log error if logger is available
  try {
    const run = await createRun('hubspot-incremental-sync', SUPABASE_URL, SUPABASE_SERVICE_KEY, 'manual');
    const logger = new Logger(run.id, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await logger.error('FATAL', `Sync crashed: ${error.message}`, { error: error.message, stack: error.stack });
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: error.message
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
  process.exit(1);
});
