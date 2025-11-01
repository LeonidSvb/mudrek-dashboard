#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { createRun, updateRun } = require('../lib/cron-logger');
const { SyncLogger } = require('../lib/sync/logger');
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !HUBSPOT_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchOwnersFromHubSpot() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.hubapi.com',
      path: '/crm/v3/owners',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const startTime = Date.now();

  const run = await createRun(
    'sync-owners',
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    process.env.GITHUB_ACTIONS ? 'github-actions' : 'manual'
  );

  const logger = new SyncLogger(run.id, SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const timeoutHandle = setTimeout(async () => {
    await logger.error('TIMEOUT', 'Owners sync exceeded 5 minutes');
    await updateRun(run.id, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      error_message: 'Timeout: exceeded 5 minutes'
    }, SUPABASE_URL, SUPABASE_SERVICE_KEY);
    process.exit(1);
  }, 5 * 60 * 1000);

  try {
    await logger.info('START', 'Owners sync started');

    await logger.info('FETCH', 'Fetching owners from HubSpot API');
    const owners = await fetchOwnersFromHubSpot();
    await logger.info('PARSE', `Received ${owners.length} owners from HubSpot`);

    await logger.info('UPSERT', 'Upserting owners to hubspot_owners table');

    let inserted = 0;
    let updated = 0;

    for (const owner of owners) {
      const { data: existing } = await supabase
        .from('hubspot_owners')
        .select('owner_id')
        .eq('owner_id', owner.id)
        .single();

      const ownerData = {
        owner_id: owner.id,
        owner_name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
        owner_email: owner.email,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        const { error } = await supabase
          .from('hubspot_owners')
          .update(ownerData)
          .eq('owner_id', owner.id);

        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase
          .from('hubspot_owners')
          .insert({ ...ownerData, created_at: new Date().toISOString() });

        if (error) throw error;
        inserted++;
      }
    }

    await logger.info('RESULT', `Upsert complete: ${inserted} inserted, ${updated} updated`);

    await logger.info('PHONE_SYNC', 'Syncing phone numbers from calls');
    const { data: phoneUpdates, error: phoneError } = await supabase
      .rpc('sync_owner_phone_numbers');

    if (phoneError) {
      await logger.error('PHONE_SYNC_ERROR', `Failed to sync phone numbers: ${phoneError.message}`);
    } else {
      const phoneCount = phoneUpdates?.length || 0;
      await logger.info('PHONE_SYNC_RESULT', `Updated phone numbers for ${phoneCount} owners`);
    }

    clearTimeout(timeoutHandle);

    const duration = Date.now() - startTime;
    await logger.info('END', `Owners sync completed: ${owners.length} fetched, ${inserted} new, ${updated} updated, ${phoneUpdates?.length || 0} phone updates`);

    await updateRun(run.id, {
      status: 'success',
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      records_fetched: owners.length,
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
