const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv/config');

async function runMigration() {
  console.log('Running migration: 005_create_metrics_function.sql\n');

  const sql = readFileSync(
    join(__dirname, '../../migrations/005_create_metrics_function.sql'),
    'utf8'
  );

  // Use Supabase connection string
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not found in .env');
    process.exit(1);
  }

  try {
    // Import pg dynamically
    const { Client } = await import('pg');
    const client = new Client({ connectionString });

    await client.connect();
    console.log('✓ Connected to database');

    await client.query(sql);
    console.log('✓ Migration executed successfully!');

    await client.end();
    console.log('\n✅ Function updated!');
    console.log('   Now totalContacts will be filtered by createdate');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

runMigration();
