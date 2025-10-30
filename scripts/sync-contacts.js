#!/usr/bin/env node
/**
 * Contacts Sync Script
 *
 * Modular script that syncs ONLY contacts from HubSpot to Supabase
 * Supports flexible CLI options: --all, --from, --to, --last, --rollback
 *
 * Usage:
 *   node scripts/sync-contacts.js           (incremental, default)
 *   node scripts/sync-contacts.js --all     (full sync)
 *   node scripts/sync-contacts.js --last=7d (last 7 days)
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { createRun, updateRun } = require('../lib/cron-logger');
const { SyncLogger } = require('../lib/sync/logger');
const { parseArgs } = require('../lib/sync/cli');
const { CONTACT_PROPERTIES } = require('../lib/sync/properties');
const { searchContactsByDate, fetchAllContacts } = require('../lib/sync/api');
const { transformContact } = require('../lib/sync/transform');
const { upsertWithMerge } = require('../lib/sync/upsert');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getLastSuccessfulSyncTime(scriptName) {
  let { data } = await supabase
    .from('runs')
    .select('finished_at')
    .eq('script_name', scriptName)
    .eq('status', 'success')
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return new Date(data[0].finished_at);
  }

  // Fallback: старые скрипты
  const oldScriptNames = ['contacts', 'hubspot-incremental-sync'];
  for (const oldName of oldScriptNames) {
    const { data: oldData } = await supabase
      .from('runs')
      .select('finished_at')
      .eq('script_name', oldName)
      .eq('status', 'success')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1);

    if (oldData && oldData.length > 0) {
      console.log(`✅ Found last sync from old script: ${oldName}`);
      return new Date(oldData[0].finished_at);
    }
  }

  // Fallback 2: 7 days ago
  console.log('⚠️  No previous sync found. Using fallback: 7 days ago');
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

async function main() {
  const options = parseArgs();
  const startTime = Date.now();

  const run = await createRun(
    'sync-contacts',
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    process.env.GITHUB_ACTIONS ? 'github-actions' : 'manual'
  );

  const logger = new SyncLogger(run.id, SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Timeout protection: 30 minutes
  const timeoutHandle = setTimeout(async () => {
    await logger.error('TIMEOUT', 'Contacts sync exceeded 30 minutes');
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error_message: 'Timeout: exceeded 30 minutes'
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  }, 30 * 60 * 1000);

  try {
    await logger.info('START', `Contacts sync started with options: ${JSON.stringify(options)}`);

    // Fetch contacts based on options
    let contacts;
    if (options.all) {
      await logger.info('FETCH', 'Full sync: fetching ALL contacts');
      contacts = await fetchAllContacts(CONTACT_PROPERTIES);
    } else {
      const since = options.from || await getLastSuccessfulSyncTime('sync-contacts');
      await logger.info('FETCH', `Incremental sync: fetching contacts since ${since.toISOString()}`);
      contacts = await searchContactsByDate(since, CONTACT_PROPERTIES);
    }

    await logger.info('PARSE', `Received ${contacts.length} contacts from HubSpot API`);

    // Transform & upsert
    const batchId = crypto.randomUUID();
    const transformed = contacts.map(c => transformContact(c, batchId));
    await logger.info('TRANSFORM', `Transformed ${transformed.length} contacts (batch_id: ${batchId})`);

    await logger.info('UPSERT', `Starting upsert to hubspot_contacts_raw table`);
    const { inserted, updated, failed } = await upsertWithMerge('hubspot_contacts_raw', transformed);
    await logger.info('RESULT', `Upsert complete: ${inserted} inserted, ${updated} updated, ${failed} failed`);

    clearTimeout(timeoutHandle);

    const duration = Date.now() - startTime;
    await logger.info('END', `Contacts sync completed: ${contacts.length} fetched, ${inserted} new, ${updated} updated`);

    await updateRun(run.id, {
      status: 'success',
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      records_fetched: contacts.length,
      records_inserted: inserted,
      records_updated: updated,
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);

    process.exit(0);
  } catch (error) {
    clearTimeout(timeoutHandle);
    await logger.error('FATAL', `Sync failed: ${error.message}`, { stack: error.stack });
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error_message: error.message
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  }
}

main();
