require('dotenv/config');

async function checkHubSpotEmail() {
  console.log('🔍 Проверка email в HubSpot API...\n');

  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

  // Запросить 5 контактов с email полем
  const url = 'https://api.hubapi.com/crm/v3/objects/contacts?limit=5&properties=email,firstname,lastname,phone';

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();

    console.log(`Получено контактов: ${data.results.length}\n`);

    data.results.forEach((contact, i) => {
      console.log(`Contact ${i + 1}:`);
      console.log(`  ID: ${contact.id}`);
      console.log(`  Email: ${contact.properties.email || 'NULL'}`);
      console.log(`  Name: ${contact.properties.firstname || '?'} ${contact.properties.lastname || '?'}`);
      console.log(`  Phone: ${contact.properties.phone || 'NULL'}`);
      console.log('');
    });

    // Статистика
    const withEmail = data.results.filter(c => c.properties.email).length;
    console.log(`\nСтатистика из sample:`);
    console.log(`  С email: ${withEmail}/${data.results.length} (${(withEmail/data.results.length*100).toFixed(0)}%)`);

    if (withEmail === 0) {
      console.log('\n⚠️  ПРОБЛЕМА: Email не возвращается из HubSpot API!');
      console.log('   Возможные причины:');
      console.log('   1. Email не заполнен в HubSpot (клиенты вводят только телефон)');
      console.log('   2. API токен не имеет прав на чтение email');
      console.log('   3. Email скрыт privacy настройками');
    } else {
      console.log('\n✅ Email возвращается из HubSpot API');
      console.log('   Проблема в sync script или Supabase');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkHubSpotEmail();
