import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

// Test with first 5 call IDs
const testCallIds = [
  '46379611462',
  '46379630595',
  '46379630673',
  '46383251798',
  '46388876595'
];

async function testAssociationsAPI() {
  console.log('\n=== TESTING HUBSPOT ASSOCIATIONS API ===\n');

  for (const objectType of ['contacts', 'deals']) {
    console.log(`\n--- Testing ${objectType} associations ---`);

    const url = `${BASE_URL}/crm/v4/associations/calls/${objectType}/batch/read`;

    const body = {
      inputs: testCallIds.map(id => ({ id }))
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      console.log(`Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        continue;
      }

      const data = await response.json();
      console.log('\nResponse structure:', JSON.stringify(data, null, 2));

      // Show first result in detail
      if (data.results && data.results.length > 0) {
        console.log('\nFirst result example:');
        console.log(JSON.stringify(data.results[0], null, 2));
      }

    } catch (error) {
      console.error('Request failed:', error.message);
    }
  }
}

testAssociationsAPI();
