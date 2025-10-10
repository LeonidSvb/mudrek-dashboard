import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('\n=== RUNNING MIGRATION 003 ===\n');

  // Read SQL file
  const sqlPath = path.join(__dirname, '../migrations/003_create_call_associations.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📝 Executing SQL migration...\n');

  try {
    // Execute SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If RPC doesn't exist, try direct query
      console.log('⚠️  RPC not available, using direct query...');

      const { error: directError } = await supabase.from('_migrations').insert({
        name: '003_create_call_associations',
        executed_at: new Date().toISOString()
      });

      if (directError && directError.code !== '42P01') {
        throw directError;
      }

      // Execute raw SQL
      const pg = await import('pg');
      const client = new pg.default.Client({
        connectionString: process.env.DATABASE_URL
      });

      await client.connect();
      await client.query(sql);
      await client.end();

      console.log('✓ Migration executed via direct connection\n');
    } else {
      console.log('✓ Migration executed successfully\n');
    }

    // Verify table created
    const { data: tables, error: checkError } = await supabase
      .from('call_associations')
      .select('*')
      .limit(0);

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error('Table verification failed: ' + checkError.message);
    }

    console.log('✓ Table call_associations verified\n');
    console.log('=== MIGRATION COMPLETE ===\n');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
