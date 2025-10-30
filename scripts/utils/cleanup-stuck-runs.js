#!/usr/bin/env node
/**
 * Cleanup Stuck Runs Utility
 *
 * Marks runs that are stuck in 'running' state for more than 2 hours as 'failed'
 * This prevents database pollution and fixes incremental sync issues
 *
 * Usage:
 *   node scripts/utils/cleanup-stuck-runs.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupStuckRuns() {
  console.log('🔍 Searching for stuck runs...\n');

  // Mark runs as failed if they've been running for more than 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('runs')
    .update({
      status: 'failed',
      error_message: 'Stuck: exceeded 2 hour timeout (auto-cleaned)',
      finished_at: new Date().toISOString(),
      duration_ms: 2 * 60 * 60 * 1000,
    })
    .eq('status', 'running')
    .lt('started_at', twoHoursAgo)
    .select();

  if (error) {
    console.error('❌ Error cleaning up runs:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('✅ No stuck runs found. Database is clean!');
    return;
  }

  console.log(`✅ Cleaned up ${data.length} stuck run(s):\n`);
  data.forEach((run) => {
    const startedAt = new Date(run.started_at).toLocaleString('ru-RU');
    console.log(`  - ${run.script_name}`);
    console.log(`    Started: ${startedAt}`);
    console.log(`    Run ID: ${run.id.substring(0, 8)}...`);
    console.log('');
  });

  console.log('💡 Tip: These runs exceeded the timeout and were automatically marked as failed.');
}

cleanupStuckRuns()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
