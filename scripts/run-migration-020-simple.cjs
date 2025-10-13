require('dotenv').config({ path: './frontend/.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in frontend/.env.local');
  process.exit(1);
}

// Direct connection string (not pgbouncer)
const connectionString = process.env.DATABASE_URL
  .replace(':6543', ':5432')
  .replace('?pgbouncer=true', '');

const pool = new Pool({ connectionString });

async function runMigration() {
  console.log('=== MIGRATION 020: Fix Timeline Function Conflict ===\n');

  const client = await pool.connect();

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/020_fix_timeline_function_conflict.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration...\n');

    // Execute migration
    await client.query(sql);

    console.log('✓ Migration executed successfully!\n');

    // Verify
    console.log('=== VERIFICATION ===\n');

    const result = await client.query(`
      SELECT
        routine_name,
        parameter_name,
        data_type
      FROM information_schema.parameters
      WHERE specific_schema = 'public'
        AND routine_name = 'get_metrics_timeline'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length > 0) {
      console.log('Function signature:');
      console.log('get_metrics_timeline(');
      result.rows.forEach((p, i) => {
        const comma = i < result.rows.length - 1 ? ',' : '';
        console.log(`  ${p.parameter_name} ${p.data_type}${comma}`);
      });
      console.log(')');
    } else {
      console.log('⚠️ Function not found!');
    }

    console.log('\n✓ Done! Refresh dashboard to test.');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
