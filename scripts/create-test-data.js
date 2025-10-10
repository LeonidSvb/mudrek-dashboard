import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${error}`);
  }

  return response.json();
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createTestContacts(count = 20) {
  console.log(`\nСоздаю ${count} тестовых контактов...`);
  const contacts = [];

  for (let i = 1; i <= count; i++) {
    const vslWatched = randomChoice(['not_watched', 'started', '4min', '18min', 'completed']);
    const salesScriptVersion = randomChoice(['v1_0', 'v1_1', 'v2_0', 'v2_1', 'custom']);

    const contactData = {
      properties: {
        firstname: `[TEST] Contact`,
        lastname: `#${i}`,
        email: `test-contact-${i}-${Date.now()}@example.com`,
        phone: `+972-555-${String(i).padStart(4, '0')}`,
        vsl_watched: vslWatched,
        sales_script_version: salesScriptVersion
      }
    };

    try {
      const result = await makeRequest('/crm/v3/objects/contacts', 'POST', contactData);
      contacts.push(result);
      console.log(`  ✓ Контакт ${i}/${count}: ${result.id} (VSL: ${vslWatched}, Script: ${salesScriptVersion})`);
    } catch (error) {
      console.error(`  ✗ Ошибка создания контакта ${i}:`, error.message);
    }
  }

  return contacts;
}

async function createTestDeals(contacts, count = 10) {
  console.log(`\nСоздаю ${count} тестовых сделок...`);
  const deals = [];

  for (let i = 1; i <= count; i++) {
    const contact = randomChoice(contacts);
    const isWon = Math.random() > 0.3;
    const dealstage = isWon ? 'closedwon' : 'closedlost';
    const qualifiedStatus = randomChoice(['not_qualified', 'qualified', 'highly_qualified']);
    const trialStatus = randomChoice(['no_trial', 'trial_given', 'trial_converted', 'trial_expired']);
    const offerGiven = randomChoice(['yes', 'no']);
    const offerAccepted = offerGiven === 'yes' ? randomChoice(['yes', 'no']) : 'no';
    const amount = randomInt(5000, 25000);
    const installments = isWon ? randomInt(3, 12) : 0;

    const dealData = {
      properties: {
        dealname: `[TEST] Deal #${i}`,
        dealstage: dealstage,
        amount: amount,
        qualified_status: qualifiedStatus,
        trial_status: trialStatus,
        offer_given: offerGiven,
        offer_accepted: offerAccepted,
        number_of_installments__months: installments,
        pipeline: 'default'
      },
      associations: [
        {
          to: { id: contact.id },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 3
            }
          ]
        }
      ]
    };

    try {
      const result = await makeRequest('/crm/v3/objects/deals', 'POST', dealData);
      deals.push(result);
      console.log(`  ✓ Сделка ${i}/${count}: ${result.id} (₪${amount}, ${dealstage}, ${qualifiedStatus})`);
      deals.push(result);
    } catch (error) {
      console.error(`  ✗ Ошибка создания сделки ${i}:`, error.message);
    }
  }

  return deals;
}

async function main() {
  console.log('=== СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ В HUBSPOT ===\n');
  console.log('ВНИМАНИЕ: Это создаст тестовые данные с префиксом [TEST]');
  console.log('Их можно будет удалить через HubSpot UI фильтром по имени\n');

  try {
    const contacts = await createTestContacts(20);
    console.log(`\n✓ Создано контактов: ${contacts.length}`);

    let deals = [];
    if (contacts.length > 0) {
      deals = await createTestDeals(contacts, 10);
      console.log(`\n✓ Создано сделок: ${deals.length}`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total Contacts: ${contacts.length}`);
    console.log(`Total Deals: ${deals.length}`);
    console.log('\nЧтобы удалить тестовые данные:');
    console.log('1. Зайти в HubSpot → Contacts');
    console.log('2. Фильтр: "First name contains [TEST]"');
    console.log('3. Выбрать все → Delete');
    console.log('4. То же самое для Deals');

  } catch (error) {
    console.error('\n✗ Ошибка:', error.message);
    process.exit(1);
  }
}

main();
