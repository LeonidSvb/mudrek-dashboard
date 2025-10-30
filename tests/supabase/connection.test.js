import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function testSupabase() {
  console.log('Testing Supabase connection...\n');

  // Create test table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS test_mcp_table (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    // Execute SQL to create table
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ query: createTableSQL })
    });

    console.log('Table creation response:', createResponse.status);

    // Insert test data
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/test_mcp_table`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([
        { name: 'Иван Петров', email: 'ivan@example.com' },
        { name: 'Мария Сидорова', email: 'maria@example.com' },
        { name: 'Алексей Смирнов', email: 'alexey@example.com' }
      ])
    });

    const insertData = await insertResponse.json();
    console.log('\nInserted data:', JSON.stringify(insertData, null, 2));

    // Read data back
    const selectResponse = await fetch(`${SUPABASE_URL}/rest/v1/test_mcp_table?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const selectData = await selectResponse.json();
    console.log('\nAll data from table:');
    console.log(JSON.stringify(selectData, null, 2));

    console.log('\n✓ Supabase connection test successful!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSupabase();
