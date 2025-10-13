require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('=== MIGRATION 020: Fix Timeline Function Conflict ===\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../migrations/020_fix_timeline_function_conflict.sql');
  let sql = fs.readFileSync(migrationPath, 'utf-8');

  // Remove comments for execution
  sql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  console.log('Step 1: Dropping old function versions...\n');

  // Execute DROP statements first
  const dropStatements = [
    "DROP FUNCTION IF EXISTS get_metrics_timeline(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) CASCADE",
    "DROP FUNCTION IF EXISTS get_metrics_timeline(TEXT, TIMESTAMP, TIMESTAMP, TEXT) CASCADE",
    "DROP FUNCTION IF EXISTS get_metrics_timeline CASCADE"
  ];

  for (const dropSQL of dropStatements) {
    try {
      await supabase.rpc('exec', { sql: dropSQL });
      console.log(`✓ ${dropSQL.substring(0, 60)}...`);
    } catch (e) {
      // Ignore errors (function might not exist)
      console.log(`  (skipped - function may not exist)`);
    }
  }

  console.log('\nStep 2: Creating new function...\n');

  // Extract CREATE FUNCTION part
  const createMatch = sql.match(/CREATE FUNCTION get_metrics_timeline[\s\S]*?END;\s*\$\$/);

  if (!createMatch) {
    console.error('✗ Could not find CREATE FUNCTION statement in migration');
    return;
  }

  const createSQL = createMatch[0];

  console.log('Executing CREATE FUNCTION via Supabase SQL Editor...\n');
  console.log('⚠️  This migration needs to be run manually via Supabase SQL Editor');
  console.log('    because Supabase RPC doesn\'t support complex DDL.\n');

  console.log('📋 COPY THIS SQL AND RUN IN SUPABASE SQL EDITOR:\n');
  console.log('=' .repeat(70));
  console.log(sql);
  console.log('=' .repeat(70));

  console.log('\n\n✅ ПОСЛЕ ВЫПОЛНЕНИЯ:');
  console.log('1. Открой Supabase Dashboard → SQL Editor');
  console.log('2. Вставь SQL выше');
  console.log('3. Нажми Run');
  console.log('4. Обнови dashboard (F5)');
  console.log('5. Timeline graphs должны заработать!');
}

runMigration().catch(console.error);
