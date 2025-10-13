require('dotenv').config({ path: './frontend/.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in frontend/.env.local');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL
  .replace(':6543', ':5432')
  .replace('?pgbouncer=true', '');

const pool = new Pool({ connectionString });

async function runMigrations() {
  console.log('=== MATERIALIZED VIEW MIGRATIONS ===\n');

  const client = await pool.connect();

  try {
    console.log('Step 1: Creating materialized view (daily_metrics_mv)...\n');

    const migration021 = fs.readFileSync(
      path.join(__dirname, '../migrations/021_create_daily_metrics_view.sql'),
      'utf-8'
    );

    await client.query(migration021);
    console.log('✓ Materialized view created!\n');

    console.log('Step 2: Replacing get_all_metrics() function...\n');

    const migration022 = fs.readFileSync(
      path.join(__dirname, '../migrations/022_fast_metrics_from_view.sql'),
      'utf-8'
    );

    await client.query(migration022);
    console.log('✓ Function replaced!\n');

    console.log('=== VERIFICATION ===\n');

    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_total_relation_size('daily_metrics_mv')) as size;
    `);
    console.log(`View size: ${sizeResult.rows[0].size}`);

    const countResult = await client.query(`
      SELECT COUNT(*) as rows FROM daily_metrics_mv;
    `);
    console.log(`View rows: ${countResult.rows[0].rows}`);

    console.log('\n=== SPEED TEST ===\n');
    console.log('Testing new function speed...\n');

    const start = Date.now();
    await client.query(`SELECT * FROM get_all_metrics()`);
    const duration = Date.now() - start;

    console.log(`✓ Function executed in ${duration}ms`);

    if (duration > 500) {
      console.log('⚠️  Still slow - might need to REFRESH view');
    } else {
      console.log('✓ FAST! (goal: <100ms)');
    }

    console.log('\n=== SUCCESS ===\n');
    console.log('✓ Materialized view created');
    console.log('✓ Function updated');
    console.log('✓ Dashboard should now load in <1 second!');
    console.log('\n💡 After loading new data from HubSpot, run:');
    console.log('   REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;\n');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
