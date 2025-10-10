/**
 * UPLOAD TEST SAMPLE: Load test data from JSON files into Supabase
 *
 * Strategy:
 * 1. Read JSON files from data/test-sample/
 * 2. Transform HubSpot data to database schema
 * 3. Insert into Supabase tables (contacts, deals ONLY)
 * 4. SKIP calls - already have 118k calls in DB
 * 5. Log sync statistics
 *
 * Usage:
 *   node src/hubspot/upload-test-sample.js
 *
 * Prerequisites:
 *   1. Run migration: migrations/007_clean_for_test_data.sql
 *   2. Run fetch: node src/hubspot/fetch-test-sample.js
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  // Supabase Settings
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // Input directory
  INPUT_DIR: join(__dirname, '../../data/test-sample'),

  // Batch Settings
  BATCH_SIZE: 500  // Supabase recommended batch size
};

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

// ========================================
// FIELD MAPPING FUNCTIONS
// ========================================

/**
 * Transform HubSpot contact to database row
 */
function transformContact(hubspotContact) {
  const props = hubspotContact.properties || {};

  return {
    hubspot_id: hubspotContact.id,
    email: props.email || null,
    phone: props.phone || null,
    firstname: props.firstname || null,
    lastname: props.lastname || null,
    createdate: props.createdate ? new Date(props.createdate) : null,
    lifecyclestage: props.lifecyclestage || null,
    hubspot_owner_id: props.hubspot_owner_id || null,

    // Custom fields (if exist in schema)
    sales_script_version: props.sales_script_version || null,
    vsl_watched: props.vsl_watched === 'true' || props.vsl_watched === true,
    vsl_watch_duration: props.vsl_watch_duration ? parseInt(props.vsl_watch_duration) : null,

    // Store ALL data in raw_json
    raw_json: hubspotContact,

    synced_at: new Date(),
    updated_at: new Date()
  };
}

/**
 * Transform HubSpot deal to database row
 */
function transformDeal(hubspotDeal) {
  const props = hubspotDeal.properties || {};

  return {
    hubspot_id: hubspotDeal.id,
    amount: props.amount ? parseFloat(props.amount) : null,
    dealstage: props.dealstage || null,
    dealname: props.dealname || null,
    pipeline: props.pipeline || null,
    createdate: props.createdate ? new Date(props.createdate) : null,
    closedate: props.closedate ? new Date(props.closedate) : null,
    hubspot_owner_id: props.hubspot_owner_id || null,

    // Custom fields for metrics (if exist in schema)
    qualified_status: props.qualified_status || null,
    trial_status: props.trial_status || null,
    payment_status: props.payment_status || null,
    number_of_installments__months: props.number_of_installments__months ?
      parseInt(props.number_of_installments__months) : null,
    cancellation_reason: props.cancellation_reason || null,
    is_refunded: props.is_refunded === 'true' || props.is_refunded === true,
    installment_plan: props.installment_plan || null,
    upfront_payment: props.upfront_payment ? parseFloat(props.upfront_payment) : null,
    offer_given: props.offer_given === 'true' || props.offer_given === true,
    offer_accepted: props.offer_accepted === 'true' || props.offer_accepted === true,

    // Store ALL data in raw_json (including associations)
    raw_json: hubspotDeal,

    synced_at: new Date(),
    updated_at: new Date()
  };
}

/**
 * Transform HubSpot call to database row
 */
function transformCall(hubspotCall) {
  const props = hubspotCall.properties || {};

  return {
    hubspot_id: hubspotCall.id,
    call_duration: props.hs_call_duration ? parseInt(props.hs_call_duration) : null,
    call_direction: props.hs_call_direction || null,
    call_to_number: props.hs_call_to_number || null,
    call_from_number: props.hs_call_from_number || null,
    call_timestamp: props.hs_timestamp ? new Date(props.hs_timestamp) : null,
    call_disposition: props.hs_call_disposition || null,

    // Store ALL data in raw_json
    raw_json: hubspotCall,

    synced_at: new Date(),
    updated_at: new Date()
  };
}

// ========================================
// UPLOAD FUNCTIONS
// ========================================

/**
 * Upload records to Supabase in batches
 */
async function uploadBatch(tableName, records, transformFn) {
  console.log(`\n📤 Uploading ${records.length} records to ${tableName}...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
    const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
    const transformedBatch = batch.map(transformFn);

    const { data, error } = await supabase
      .from(tableName)
      .upsert(transformedBatch, {
        onConflict: 'hubspot_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`✗ Batch ${i}-${i + batch.length} failed:`, error.message);
      errorCount += batch.length;
    } else {
      console.log(`  ✓ Batch ${i}-${i + batch.length}: Uploaded successfully`);
      successCount += batch.length;
    }
  }

  console.log(`\n✓ ${tableName}: ${successCount} success, ${errorCount} errors`);

  return { successCount, errorCount };
}

/**
 * Log sync to sync_logs table
 */
async function logSync(objectType, stats, duration) {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      sync_started_at: new Date(Date.now() - duration * 1000),
      sync_completed_at: new Date(),
      duration_seconds: Math.round(duration),
      object_type: objectType,
      records_fetched: stats.total,
      records_inserted: stats.successCount,
      records_updated: 0,
      records_failed: stats.errorCount,
      status: stats.errorCount === 0 ? 'success' : 'partial',
      error_message: stats.errorCount > 0 ? `${stats.errorCount} records failed` : null,
      triggered_by: 'manual',
      metadata: { source: 'test-sample' }
    });

  if (error) {
    console.error('✗ Failed to log sync:', error.message);
  }
}

// ========================================
// MAIN FUNCTION
// ========================================
async function uploadTestSample() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     UPLOAD TEST SAMPLE TO SUPABASE       ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const stats = {
    contacts: { total: 0, successCount: 0, errorCount: 0 },
    deals: { total: 0, successCount: 0, errorCount: 0 },
    calls: { total: 0, successCount: 0, errorCount: 0 }
  };

  try {
    // ========================================
    // 1. LOAD JSON FILES
    // ========================================
    console.log('📂 Loading JSON files...\n');

    const contactsPath = join(CONFIG.INPUT_DIR, 'contacts.json');
    const dealsPath = join(CONFIG.INPUT_DIR, 'deals.json');
    // SKIP calls - already have 118k in DB

    const contacts = JSON.parse(readFileSync(contactsPath, 'utf8'));
    const deals = JSON.parse(readFileSync(dealsPath, 'utf8'));
    // No calls.json to load

    console.log(`✓ Loaded ${contacts.length} contacts`);
    console.log(`✓ Loaded ${deals.length} deals`);
    console.log(`⏩ SKIPPED calls (using existing 118k in DB)`);

    stats.contacts.total = contacts.length;
    stats.deals.total = deals.length;
    stats.calls.total = 0; // Not uploading

    // ========================================
    // 2. UPLOAD CONTACTS
    // ========================================
    console.log('\n═══ 1/3: UPLOADING CONTACTS ═══');

    const contactsResult = await uploadBatch('hubspot_contacts_raw', contacts, transformContact);
    stats.contacts.successCount = contactsResult.successCount;
    stats.contacts.errorCount = contactsResult.errorCount;

    await logSync('contacts', stats.contacts, (Date.now() - startTime) / 1000);

    // ========================================
    // 3. UPLOAD DEALS
    // ========================================
    console.log('\n═══ 2/3: UPLOADING DEALS ═══');

    const dealsResult = await uploadBatch('hubspot_deals_raw', deals, transformDeal);
    stats.deals.successCount = dealsResult.successCount;
    stats.deals.errorCount = dealsResult.errorCount;

    await logSync('deals', stats.deals, (Date.now() - startTime) / 1000);

    // ========================================
    // 4. SKIP CALLS (already have 118k in DB)
    // ========================================
    console.log('\n═══ 3/3: CALLS (SKIPPED) ═══');
    console.log('⏩ SKIPPED calls upload (using existing 118,931 calls in database)');
    console.log('   Phone matching will connect new contacts to existing calls\n');

    // No upload or logging for calls
    stats.calls.successCount = 0;
    stats.calls.errorCount = 0;

    // ========================================
    // SUMMARY
    // ========================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║               SUMMARY                      ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    console.log(`✓ CONTACTS: ${stats.contacts.successCount}/${stats.contacts.total} uploaded`);
    console.log(`✓ DEALS: ${stats.deals.successCount}/${stats.deals.total} uploaded`);
    console.log(`⏩ CALLS: SKIPPED (using existing 118,931 calls in DB)`);

    const totalSuccess = stats.contacts.successCount + stats.deals.successCount + stats.calls.successCount;
    const totalErrors = stats.contacts.errorCount + stats.deals.errorCount + stats.calls.errorCount;

    console.log(`\n📊 Total: ${totalSuccess} success, ${totalErrors} errors`);
    console.log(`⏱️  Duration: ${duration}s`);

    if (totalErrors === 0) {
      console.log(`\n✅ Upload complete! All test data loaded successfully.`);
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Check Supabase tables`);
      console.log(`   2. Test views and materialized views`);
      console.log(`   3. Build dashboard with test data`);
    } else {
      console.log(`\n⚠️  Upload completed with errors. Check logs above.`);
    }

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    throw error;
  }
}

// Run
uploadTestSample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
