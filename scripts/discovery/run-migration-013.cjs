/**
 * Execute Migration 013: Materialize call_contact_matches
 *
 * This migration fixes the timeout issue by creating a Materialized View
 * for call_contact_matches and updating get_all_metrics() to use it.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../frontend/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('📦 Starting Migration 013...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../migrations/013_materialize_call_contact_matches.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log(`   Path: ${migrationPath}`);
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

    // Split SQL into statements (simple split by semicolon)
    // Note: This won't work for complex SQL with semicolons in strings
    // For complex migrations, execute the whole file at once or use a better parser
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      // Show progress
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement + ';'
        });

        if (error) {
          console.error(`   ✗ Error:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✓ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ✗ Exception:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✓ Success: ${successCount}`);
    console.log(`   ✗ Errors:  ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n✅ Migration 013 completed successfully!\n');

      // Verify the MV was created
      console.log('🔍 Verifying Materialized View...\n');

      const { data: mvCount, error: mvError } = await supabase
        .rpc('exec_sql', {
          query: 'SELECT COUNT(*) as count FROM call_contact_matches_mv;'
        });

      if (mvError) {
        console.error('✗ Verification failed:', mvError.message);
      } else {
        console.log(`✓ call_contact_matches_mv has ${mvCount?.[0]?.count || 'N/A'} records`);
      }
    } else {
      console.log('\n⚠️  Migration completed with errors. Check the output above.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Note: Supabase doesn't have exec_sql RPC by default
// This script won't work - need to execute SQL manually in Supabase SQL Editor
console.log('⚠️  Note: This script requires manual execution in Supabase SQL Editor');
console.log('📋 Steps:');
console.log('   1. Open Supabase Dashboard → SQL Editor');
console.log('   2. Create new query');
console.log('   3. Copy migrations/013_materialize_call_contact_matches.sql');
console.log('   4. Paste and Run\n');

console.log('❌ Automated migration not supported via Supabase JS client.');
console.log('   Use Supabase SQL Editor instead.\n');

process.exit(0);
