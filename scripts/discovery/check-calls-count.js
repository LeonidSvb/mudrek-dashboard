import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

async function countCalls() {
  console.log('Проверяю общее количество calls в HubSpot...\n');

  let totalCalls = 0;
  let after = null;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let url = `${BASE_URL}/crm/v3/objects/calls?limit=100&archived=false`;

    if (after) {
      url += `&after=${after}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      totalCalls += data.results.length;

      console.log(`Page ${pageCount}: +${data.results.length} calls (Total: ${totalCalls})`);

      if (data.paging?.next) {
        after = data.paging.next.after;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error:', error.message);
      break;
    }
  }

  console.log(`\n=== РЕЗУЛЬТАТ ===`);
  console.log(`Всего calls в HubSpot: ${totalCalls}`);
  console.log(`Страниц обработано: ${pageCount}`);

  return totalCalls;
}

countCalls();
