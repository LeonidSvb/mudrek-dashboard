#!/usr/bin/env node
/**
 * Calls Sync Script
 *
 * Modular script that syncs ONLY calls from HubSpot to Supabase
 * Calls are immutable - always incremental (no full sync needed)
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { createRun, updateRun } = require('../lib/cron-logger');
const { SyncLogger } = require('../lib/sync/logger');
const { parseArgs } = require('../lib/sync/cli');
const { CALL_PROPERTIES } = require('../lib/sync/properties');
const { searchCallsByDate, fetchAllCalls } = require('../lib/sync/api');
const { transformCall } = require('../lib/sync/transform');
const { insertNew } = require('../lib/sync/upsert');

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

  const oldScriptNames = ['calls', 'hubspot-incremental-sync'];
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

  console.log('⚠️  No previous sync found. Using fallback: 7 days ago');
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

async function main() {
  const options = parseArgs();
  const startTime = Date.now();

  const run = await createRun(
    'sync-calls',
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    process.env.GITHUB_ACTIONS ? 'github-actions' : 'manual'
  );

  const logger = new SyncLogger(run.id, SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const timeoutHandle = setTimeout(async () => {
    await logger.error('TIMEOUT', 'Calls sync exceeded 30 minutes');
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error_message: 'Timeout: exceeded 30 minutes'
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  }, 30 * 60 * 1000);

  try {
    await logger.info('START', `Calls sync started with options: ${JSON.stringify(options)}`);

    let calls;
    if (options.all) {
      await logger.info('FETCH', 'Full sync: fetching ALL calls');
      calls = await fetchAllCalls(CALL_PROPERTIES);
    } else {
      const since = options.from || await getLastSuccessfulSyncTime('sync-calls');
      await logger.info('FETCH', `Incremental sync: fetching calls since ${since.toISOString()}`);
      calls = await searchCallsByDate(since, CALL_PROPERTIES);
    }

    const batchId = crypto.randomUUID();
    const transformed = calls.map(c => transformCall(c, batchId));
    const { inserted, failed } = await insertNew('hubspot_calls_raw', transformed);

    clearTimeout(timeoutHandle);

    const duration = Date.now() - startTime;
    await logger.info('END', `Calls sync completed: ${calls.length} fetched, ${inserted} new`);

    await updateRun(run.id, {
      status: 'success',
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      records_fetched: calls.length,
      records_inserted: inserted,
      records_updated: 0,
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
