/**
 * ONE-TIME SYNC: Fetch ALL properties from HubSpot
 *
 * Purpose: Re-sync last 3 months of data with FULL raw_json (100+ fields)
 *
 * Usage:
 *   node src/hubspot/sync-full-properties.js
 *
 * This will:
 * 1. Fetch contacts/deals created in last 3 months
 * 2. Request ALL properties (not just 12-15)
 * 3. Save full raw_json to Supabase
 * 4. Preserve all calls (no re-sync needed)
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
 * Fetch records from HubSpot WITH ALL PROPERTIES
 */
async function fetchRecentRecords(objectType, monthsBack = 3) {
  console.log(`📡 Fetching ${objectType} from last ${monthsBack} months with ALL properties...`);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - monthsBack);
  const cutoffTimestamp = threeMonthsAgo.getTime();

  // HubSpot Search API для фильтрации по дате
  const searchBody = {
    filterGroups: [{
      filters: [{
        propertyName: 'createdate',
        operator: 'GTE',
        value: cutoffTimestamp
      }]
    }],
    // ✅ НЕ указываем properties - HubSpot вернёт ВСЕ дефолтные
    limit: 100
  };

  let allRecords = [];
  let after = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
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

    console.log(`  → Page ${pageCount}: fetched ${data.results.length} (total: ${allRecords.length})`);

    if (data.paging?.next) {
      after = data.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✓ Total ${objectType} fetched: ${allRecords.length}`);
  console.log(`✓ Properties per record: ${Object.keys(allRecords[0]?.properties || {}).length}\n`);

  return allRecords;
}

/**
 * Save to Supabase
 */
async function saveToSupabase(tableName, records, transformFn) {
  if (records.length === 0) {
    console.log(`⚠️  No records to save`);
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
 * Sync contacts (last 3 months, all properties)
 */
async function syncContactsFull() {
  const contacts = await fetchRecentRecords('contacts', 3);

  return await saveToSupabase('hubspot_contacts_raw', contacts, (contact) => ({
    hubspot_id: contact.id,
    email: contact.properties.email,
    firstname: contact.properties.firstname,
    lastname: contact.properties.lastname,
    phone: contact.properties.phone,
    createdate: contact.properties.createdate,
    lifecyclestage: contact.properties.lifecyclestage,
    sales_script_version: contact.properties.sales_script_version,
    vsl_watched: contact.properties.vsl_watched === 'true',
    vsl_watch_duration: contact.properties.vsl_watch_duration ? parseInt(contact.properties.vsl_watch_duration) : null,
    hubspot_owner_id: contact.properties.hubspot_owner_id || null,
    // ✅ FULL raw_json с ВСЕМИ properties (100+)
    raw_json: contact.properties,
    synced_at: new Date().toISOString()
  }));
}

/**
 * Sync deals (last 3 months, all properties)
 */
async function syncDealsFull() {
  const deals = await fetchRecentRecords('deals', 3);

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
    // ✅ FULL raw_json
    raw_json: deal.properties,
    synced_at: new Date().toISOString()
  }));
}

/**
 * Main sync
 */
async function syncAll() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  FULL PROPERTIES SYNC (Last 3 Months)   ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    const [contactsResult, dealsResult] = await Promise.allSettled([
      syncContactsFull(),
      syncDealsFull()
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('╔═══════════════════════════════════════════╗');
    console.log('║             SYNC RESULTS                  ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    console.log('📊 CONTACTS:', contactsResult.status === 'fulfilled' ? '✅' : '❌');
    if (contactsResult.status === 'fulfilled') {
      const { success, errors } = contactsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    }

    console.log('\n💼 DEALS:', dealsResult.status === 'fulfilled' ? '✅' : '❌');
    if (dealsResult.status === 'fulfilled') {
      const { success, errors } = dealsResult.value;
      console.log(`   Success: ${success}, Errors: ${errors}`);
    }

    console.log(`\n⏱️  Total duration: ${duration}s`);
    console.log('\n✅ Full properties sync completed!');
    console.log('\nℹ️  Calls NOT re-synced (using existing phone matching)');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

syncAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
