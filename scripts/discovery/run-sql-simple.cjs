const { readFileSync } = require('fs');
const { join } = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runSQL() {
  console.log('Reading SQL file...\n');

  const sql = readFileSync(
    join(__dirname, '../../migrations/005_create_metrics_function.sql'),
    'utf8'
  );

  console.log('Executing via Supabase...');

  // Используем Supabase postgREST напрямую
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/rpc/query`,
    {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('Error:', response.status, text);

    console.log('\n⚠️  Automatic update failed. Please run SQL manually:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Copy content of migrations/005_create_metrics_function.sql');
    console.log('3. Run it');
    process.exit(1);
  }

  console.log('✅ Function updated successfully!');
}

runSQL();
