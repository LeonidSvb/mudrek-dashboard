import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get last successful sync time from sync_logs
 */
async function getLastSyncTime(objectType) {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('sync_completed_at')
    .eq('object_type', objectType)
    .eq('status', 'success')
    .order('sync_completed_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log(`No previous sync found for ${objectType}, using full sync`);
    return null;
  }

  return data.sync_completed_at;
}

/**
 * Fetch only modified records from HubSpot since lastSyncTime
 */
async function fetchModifiedFromHubSpot(objectType, properties = [], lastSyncTime = null) {
  console.log(`📡 Fetching modified ${objectType} from HubSpot...`);

  if (lastSyncTime) {
    const since = new Date(lastSyncTime).getTime();
    console.log(`   → Only records modified after: ${new Date(lastSyncTime).toLocaleString()}`);

    // Use HubSpot Search API with filter
    const searchBody = {
      filterGroups: [{
        filters: [{
          propertyName: 'hs_lastmodifieddate',
          operator: 'GTE',
          value: since
        }]
      }],
      properties: properties,
      limit: 100
    };

    let allRecords = [];
    let after = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`${BASE_URL}/crm/v3/objects/${objectType}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...searchBody, after })
      });

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.results);

      console.log(`   → Fetched ${data.results.length} modified records (total: ${allRecords.length})`);

      if (data.paging?.next) {
        after = data.paging.next.after;
      } else {
        hasMore = false;
      }
    }

    console.log(`✓ Total modified ${objectType}: ${allRecords.length}\n`);
    return allRecords;
  } else {
    // First sync - use regular pagination
    console.log(`   → First sync, fetching all records...`);
    return fetchAllFromHubSpot(objectType, properties);
  }
}

/**
 * Fallback: fetch ALL if no lastSyncTime
 */
async function fetchAllFromHubSpot(objectType, properties = []) {
  let allRecords = [];
  let after = null;
  let hasMore = true;

  while (hasMore) {
    let url = `${BASE_URL}/crm/v3/objects/${objectType}?limit=100&archived=false`;

    if (properties.length > 0) {
      const propsParam = properties.map(p => `properties=${p}`).join('&');
      url += `&${propsParam}`;
    }

    if (after) {
      url += `&after=${after}`;
    }

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
    allRecords = allRecords.concat(data.results);

    if (data.paging?.next) {
      after = data.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✓ Total fetched: ${allRecords.length}\n`);
  return allRecords;
}

/**
 * Save to Supabase with UPSERT
 */
async function saveToSupabase(tableName, records, transformFn) {
  if (records.length === 0) {
    console.log(`   → No new/modified records for ${tableName}\n`);
    return { success: 0, errors: 0 };
  }

  console.log(`💾 Saving ${records.length} records to ${tableName}...`);

  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const transformedBatch = batch.map(transformFn);

    const { data, error } = await supabase
      .from(tableName)
      .upsert(transformedBatch, {
        onConflict: 'hubspot_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`  ✗ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
    }
  }

  console.log(`✓ ${tableName}: ${successCount} success, ${errorCount} errors\n`);
  return { success: successCount, errors: errorCount };
}

/**
 * Log sync to sync_logs table
 */
async function logSync(objectType, fetchedCount, syncedCount, errors, duration) {
  await supabase.from('sync_logs').insert({
    object_type: objectType,
    sync_started_at: new Date(Date.now() - duration).toISOString(),
    sync_completed_at: new Date().toISOString(),
    duration_seconds: Math.round(duration / 1000),
    records_fetched: fetchedCount,
    records_inserted: 0,
    records_updated: syncedCount,
    records_failed: errors,
    status: errors === 0 ? 'success' : 'partial',
    triggered_by: 'manual'
  });
}

/**
 * Incremental sync for Contacts
 */
async function syncContactsIncremental() {
  const startTime = Date.now();
  console.log('📇 INCREMENTAL SYNC: Contacts\n');

  const properties = [
    'email', 'firstname', 'lastname', 'phone', 'company',
    'createdate', 'lastmodifieddate', 'lifecyclestage',
    'hs_lead_status', 'hubspot_owner_id', 'vsl_watched',
    'sales_script_version'
  ];

  const lastSync = await getLastSyncTime('contacts');
  const contacts = await fetchModifiedFromHubSpot('contacts', properties, lastSync);

  const result = await saveToSupabase('hubspot_contacts_raw', contacts, (contact) => ({
    hubspot_id: contact.id,
    email: contact.properties.email,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    phone: contact.properties.phone,
    createdate: contact.properties.createdate,
    lifecyclestage: contact.properties.lifecyclestage,
    sales_script_version: contact.properties.sales_script_version,
    vsl_watched: contact.properties.vsl_watched === 'true',
    raw_json: contact.properties,
    synced_at: new Date().toISOString()
  }));

  const duration = Date.now() - startTime;
  await logSync('contacts', contacts.length, result.success, result.errors, duration);

  return result;
}

/**
 * Incremental sync for Deals
 */
async function syncDealsIncremental() {
  const startTime = Date.now();
  console.log('💼 INCREMENTAL SYNC: Deals\n');

  const properties = [
    'amount', 'dealstage', 'dealname', 'pipeline', 'createdate',
    'closedate', 'hs_lastmodifieddate', 'qualified_status',
    'trial_status', 'number_of_installments__months',
    'payment_method', 'payment_type', 'payment_status',
    'deal_whole_amount', 'the_left_amount', 'hubspot_owner_id'
  ];

  const lastSync = await getLastSyncTime('deals');
  const deals = await fetchModifiedFromHubSpot('deals', properties, lastSync);

  const result = await saveToSupabase('hubspot_deals_raw', deals, (deal) => ({
    hubspot_id: deal.id,
    amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
    dealstage: deal.properties.dealstage,
    createdate: deal.properties.createdate,
    closedate: deal.properties.closedate,
    qualified_status: deal.properties.qualified_status,
    trial_status: deal.properties.trial_status,
    payment_status: deal.properties.payment_status,
    number_of_installments__months: deal.properties.number_of_installments__months
      ? parseInt(deal.properties.number_of_installments__months)
      : null,
    raw_json: deal.properties,
    synced_at: new Date().toISOString()
  }));

  const duration = Date.now() - startTime;
  await logSync('deals', deals.length, result.success, result.errors, duration);

  return result;
}

/**
 * Incremental sync for Calls
 */
async function syncCallsIncremental() {
  const startTime = Date.now();
  console.log('📞 INCREMENTAL SYNC: Calls\n');

  const properties = [
    'hs_call_duration', 'hs_call_direction', 'hs_call_disposition',
    'hs_call_body', 'hs_timestamp', 'hs_call_recording_url',
    'hs_call_from_number', 'hs_call_to_number', 'hs_call_status',
    'hs_createdate', 'hs_lastmodifieddate'
  ];

  const lastSync = await getLastSyncTime('calls');
  const calls = await fetchModifiedFromHubSpot('calls', properties, lastSync);

  const result = await saveToSupabase('hubspot_calls_raw', calls, (call) => ({
    hubspot_id: call.id,
    call_duration: call.properties.hs_call_duration
      ? parseInt(call.properties.hs_call_duration)
      : null,
    call_direction: call.properties.hs_call_direction,
    call_to_number: call.properties.hs_call_to_number,
    call_from_number: call.properties.hs_call_from_number,
    call_timestamp: call.properties.hs_timestamp,
    call_disposition: call.properties.hs_call_disposition,
    raw_json: call.properties,
    synced_at: new Date().toISOString()
  }));

  const duration = Date.now() - startTime;
  await logSync('calls', calls.length, result.success, result.errors, duration);

  return result;
}

/**
 * Main incremental sync - runs all in parallel
 */
async function syncAllIncremental() {
  console.log('╔════════════════════════════════════╗');
  console.log('║  INCREMENTAL SYNC START (2hr gap) ║');
  console.log('╚════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    const [contactsResult, dealsResult, callsResult] = await Promise.allSettled([
      syncContactsIncremental(),
      syncDealsIncremental(),
      syncCallsIncremental()
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('╔════════════════════════════════════╗');
    console.log('║       INCREMENTAL SYNC RESULTS     ║');
    console.log('╚════════════════════════════════════╝\n');

    console.log('📊 CONTACTS:', contactsResult.status === 'fulfilled' ? '✅' : '❌');
    if (contactsResult.status === 'fulfilled') {
      const { success, errors } = contactsResult.value;
      console.log(`   Updated: ${success}, Errors: ${errors}`);
    }

    console.log('\n💼 DEALS:', dealsResult.status === 'fulfilled' ? '✅' : '❌');
    if (dealsResult.status === 'fulfilled') {
      const { success, errors } = dealsResult.value;
      console.log(`   Updated: ${success}, Errors: ${errors}`);
    }

    console.log('\n📞 CALLS:', callsResult.status === 'fulfilled' ? '✅' : '❌');
    if (callsResult.status === 'fulfilled') {
      const { success, errors } = callsResult.value;
      console.log(`   Updated: ${success}, Errors: ${errors}`);
    }

    console.log(`\n⏱️  Total duration: ${duration}s`);
    console.log('✅ Incremental sync completed!\n');

  } catch (error) {
    console.error('\n❌ Incremental sync failed:', error.message);
    throw error;
  }
}

syncAllIncremental().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
