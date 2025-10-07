import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch all records from HubSpot with pagination
 */
async function fetchAllFromHubSpot(objectType, properties = []) {
  let allRecords = [];
  let after = null;
  let hasMore = true;
  let pageCount = 0;

  console.log(`📡 Fetching ${objectType} from HubSpot...`);

  while (hasMore) {
    pageCount++;
    let url = `${BASE_URL}/crm/v3/objects/${objectType}?limit=100&archived=false`;

    // Добавляем properties
    if (properties.length > 0) {
      const propsParam = properties.map(p => `properties=${p}`).join('&');
      url += `&${propsParam}`;
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
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.results);

      console.log(`  → Page ${pageCount}: fetched ${data.results.length} records (total: ${allRecords.length})`);

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

  console.log(`✓ Total ${objectType} fetched: ${allRecords.length}\n`);
  return allRecords;
}

/**
 * Save records to Supabase in batches
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
      console.log(`  ✓ Batch ${i}-${i + BATCH_SIZE} saved`);
      successCount += batch.length;
    }
  }

  console.log(`✓ ${tableName}: ${successCount} success, ${errorCount} errors\n`);
  return { success: successCount, errors: errorCount };
}

/**
 * Sync contacts
 */
async function syncContacts() {
  const properties = [
    'email', 'firstname', 'lastname', 'phone', 'company',
    'createdate', 'lastmodifieddate', 'lifecyclestage',
    'hs_lead_status', 'hubspot_owner_id', 'vsl_watched',
    'sales_script_version'
  ];

  const contacts = await fetchAllFromHubSpot('contacts', properties);

  return await saveToSupabase('hubspot_contacts_raw', contacts, (contact) => ({
    hubspot_id: contact.id,
    email: contact.properties.email,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    phone: contact.properties.phone,
    createdate: contact.properties.createdate,
    raw_json: contact.properties,
    synced_at: new Date().toISOString()
  }));
}

/**
 * Sync deals
 */
async function syncDeals() {
  const properties = [
    'amount', 'dealstage', 'dealname', 'pipeline', 'createdate',
    'closedate', 'hs_lastmodifieddate', 'qualified_status',
    'trial_status', 'number_of_installments__months',
    'payment_method', 'payment_type', 'payment_status',
    'deal_whole_amount', 'the_left_amount', 'hubspot_owner_id'
  ];

  const deals = await fetchAllFromHubSpot('deals', properties);

  return await saveToSupabase('hubspot_deals_raw', deals, (deal) => ({
    hubspot_id: deal.id,
    amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
    dealstage: deal.properties.dealstage,
    createdate: deal.properties.createdate,
    closedate: deal.properties.closedate,
    qualified_status: deal.properties.qualified_status,
    trial_status: deal.properties.trial_status,
    raw_json: deal.properties,
    synced_at: new Date().toISOString()
  }));
}

/**
 * Sync calls
 */
async function syncCalls() {
  const properties = [
    'hs_call_duration', 'hs_call_direction', 'hs_call_disposition',
    'hs_call_body', 'hs_timestamp', 'hs_call_recording_url',
    'hs_call_from_number', 'hs_call_to_number', 'hs_call_status',
    'hs_createdate', 'hs_lastmodifieddate'
  ];

  const calls = await fetchAllFromHubSpot('calls', properties);

  return await saveToSupabase('hubspot_calls_raw', calls, (call) => ({
    hubspot_id: call.id,
    call_duration: call.properties.hs_call_duration ? parseInt(call.properties.hs_call_duration) : null,
    call_direction: call.properties.hs_call_direction,
    call_to_number: call.properties.hs_call_to_number,
    call_from_number: call.properties.hs_call_from_number,
    call_timestamp: call.properties.hs_timestamp,
    call_disposition: call.properties.hs_call_disposition,
    raw_json: call.properties,
    synced_at: new Date().toISOString()
  }));
}

/**
 * Main sync function - runs all in parallel
 */
async function syncAll() {
  console.log('╔════════════════════════════════════╗');
  console.log('║   HUBSPOT → SUPABASE SYNC START   ║');
  console.log('╚════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Запускаем ВСЕ синхронизации ПАРАЛЛЕЛЬНО
    const [contactsResult, dealsResult, callsResult] = await Promise.allSettled([
      syncContacts(),
      syncDeals(),
      syncCalls()
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Выводим итоговые результаты
    console.log('╔════════════════════════════════════╗');
    console.log('║          SYNC RESULTS              ║');
    console.log('╚════════════════════════════════════╝\n');

    console.log('📊 CONTACTS:', contactsResult.status === 'fulfilled' ? '✅ Success' : '❌ Failed');
    if (contactsResult.status === 'fulfilled') {
      const { success, errors } = contactsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    } else {
      console.error(`   Error:`, contactsResult.reason);
    }

    console.log('\n💼 DEALS:', dealsResult.status === 'fulfilled' ? '✅ Success' : '❌ Failed');
    if (dealsResult.status === 'fulfilled') {
      const { success, errors } = dealsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    } else {
      console.error(`   Error:`, dealsResult.reason);
    }

    console.log('\n📞 CALLS:', callsResult.status === 'fulfilled' ? '✅ Success' : '❌ Failed');
    if (callsResult.status === 'fulfilled') {
      const { success, errors } = callsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    } else {
      console.error(`   Error:`, callsResult.reason);
    }

    console.log(`\n⏱️  Total duration: ${duration}s`);
    console.log('\n✅ Sync completed!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

// Запускаем синхронизацию
syncAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
