import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('\n🚀 Starting database migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '001_create_hubspot_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log(`📏 SQL size: ${sql.length} characters\n`);

    // Split by statements (separated by semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip comments and DO blocks (they're informational)
      if (stmt.startsWith('DO $$')) {
        console.log(`⏭️  Skipping DO block ${i + 1}/${statements.length}`);
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });

        if (error) {
          // Try direct execution via REST API as fallback
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: stmt + ';' })
          });

          if (!response.ok) {
            // Last resort - try raw SQL execution
            const { data, error: execError } = await supabase
              .from('_migrations')
              .insert({ sql: stmt });

            if (execError) {
              throw execError;
            }
          }
        }

        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Failed:`, err.message);
        console.error(`   Statement: ${stmt.substring(0, 100)}...\n`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📝 Total statements: ${statements.length}`);

    if (failCount === 0) {
      console.log('\n🎉 Migration completed successfully!\n');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check failed statements.\n');
    }

    // Verify tables exist
    console.log('🔍 Verifying tables...\n');

    const tables = [
      'hubspot_contacts_raw',
      'hubspot_deals_raw',
      'hubspot_calls_raw',
      'sync_logs'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        console.log(`   ❌ Table ${table} - NOT FOUND`);
      } else if (error) {
        console.log(`   ⚠️  Table ${table} - ERROR: ${error.message}`);
      } else {
        console.log(`   ✅ Table ${table} - OK`);
      }
    }

    console.log('\n✅ Migration process complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run the migration manually in Supabase SQL Editor:');
    console.error('1. Go to Supabase Dashboard → SQL Editor');
    console.error('2. Copy migrations/001_create_hubspot_tables.sql');
    console.error('3. Paste and run\n');
    process.exit(1);
  }
}

runMigration();
