import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/(.+?)\.supabase\.co/)[1];

async function executeMigration() {
  console.log('\n🚀 Executing database migration via Supabase REST API...\n');

  try {
    // Read migration file
    const sqlPath = path.join(process.cwd(), 'migrations', '001_create_hubspot_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('✅ Migration file loaded');
    console.log(`📏 Size: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // Supabase SQL API endpoint
    const endpoint = `${SUPABASE_URL}/rest/v1/rpc`;

    console.log('📡 Attempting to execute SQL via Supabase API...\n');

    // Try to execute via REST API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify tables
    await verifyTables();

  } catch (error) {
    console.error('\n❌ Automatic migration failed:', error.message);
    console.log('\n📋 Fallback: Ручной запуск через Supabase Dashboard');
    console.log('━'.repeat(60));
    console.log('\n1. Открой: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('2. Скопируй файл: migrations/001_create_hubspot_tables.sql');
    console.log('3. Вставь в SQL Editor');
    console.log('4. Нажми RUN\n');
    console.log('━'.repeat(60));
    console.log('\nИли скопируй прямо сейчас:\n');

    const sqlContent = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '001_create_hubspot_tables.sql'),
      'utf-8'
    );

    console.log('```sql');
    console.log(sqlContent);
    console.log('```\n');
  }
}

async function verifyTables() {
  console.log('🔍 Verifying tables created...\n');

  const tables = [
    'hubspot_contacts_raw',
    'hubspot_deals_raw',
    'hubspot_calls_raw',
    'sync_logs'
  ];

  for (const table of tables) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        }
      );

      if (response.ok) {
        console.log(`   ✅ ${table} - EXISTS`);
      } else if (response.status === 404 || response.status === 406) {
        console.log(`   ❌ ${table} - NOT FOUND`);
      } else {
        console.log(`   ⚠️  ${table} - UNKNOWN (${response.status})`);
      }
    } catch (err) {
      console.log(`   ❌ ${table} - ERROR: ${err.message}`);
    }
  }

  console.log('\n✅ Verification complete!\n');
}

executeMigration();
