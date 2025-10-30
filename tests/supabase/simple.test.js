import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', SUPABASE_URL);
console.log('Key starts with:', SUPABASE_KEY?.substring(0, 20) + '...');

async function testSupabase() {
  try {
    // Test 1: Insert data into test table
    console.log('\n1. Creating test data...');
    const insertUrl = `${SUPABASE_URL}/rest/v1/test_table`;

    const insertResponse = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'Тестовый пользователь',
        email: 'test@example.com',
        description: 'Проверка MCP Supabase'
      })
    });

    console.log('Insert status:', insertResponse.status, insertResponse.statusText);

    if (insertResponse.ok) {
      const insertData = await insertResponse.json();
      console.log('Inserted:', insertData);
    } else {
      const errorText = await insertResponse.text();
      console.log('Insert error:', errorText);
    }

    // Test 2: Read data
    console.log('\n2. Reading data...');
    const selectUrl = `${SUPABASE_URL}/rest/v1/test_table?select=*&limit=5`;

    const selectResponse = await fetch(selectUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    console.log('Select status:', selectResponse.status, selectResponse.statusText);

    if (selectResponse.ok) {
      const selectData = await selectResponse.json();
      console.log('Data from table:');
      console.log(JSON.stringify(selectData, null, 2));
    } else {
      const errorText = await selectResponse.text();
      console.log('Select error:', errorText);
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

testSupabase();
