const https = require('https');

const HUBSPOT_API_KEY = 'pat-na1-0fcb5cbd-d2f6-43a9-88c1-cb3f5e3ff44e';

// Конвертация дат в миллисекунды для HubSpot API
const dateFrom = new Date('2025-10-15T00:00:00Z').getTime();
const dateTo = new Date('2025-10-21T23:59:59Z').getTime();

console.log('=== ПРОВЕРКА ЗВОНКОВ В HUBSPOT ===');
console.log('Период:', new Date(dateFrom).toISOString(), '-', new Date(dateTo).toISOString());
console.log();

async function getAllCalls() {
  let allCalls = [];
  let hasMore = true;
  let after = null;

  while (hasMore) {
    const path = after
      ? `/crm/v3/objects/calls?limit=100&after=${after}&properties=hs_timestamp,hs_call_duration,hs_call_from_number,hs_call_to_number,hubspot_owner_id,hs_call_status,hs_call_disposition`
      : '/crm/v3/objects/calls?limit=100&properties=hs_timestamp,hs_call_duration,hs_call_from_number,hs_call_to_number,hubspot_owner_id,hs_call_status,hs_call_disposition';

    const options = {
      hostname: 'api.hubapi.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    allCalls = allCalls.concat(response.results || []);

    console.log(`Получено: ${allCalls.length} звонков...`);

    if (response.paging && response.paging.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  return allCalls;
}

// Получить имена владельцев
async function getOwnerNames(ownerIds) {
  const uniqueIds = [...new Set(ownerIds.filter(id => id && id !== 'no_owner'))];

  if (uniqueIds.length === 0) return {};

  const options = {
    hostname: 'api.hubapi.com',
    path: '/crm/v3/owners/',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });

  const ownerMap = {};
  (response.results || []).forEach(owner => {
    ownerMap[owner.id] = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
  });

  return ownerMap;
}

(async () => {
  try {
    const allCalls = await getAllCalls();

    console.log();
    console.log(`Всего звонков в HubSpot: ${allCalls.length}`);
    console.log();

    // Фильтруем звонки по датам
    const filteredCalls = allCalls.filter(call => {
      const timestamp = call.properties.hs_timestamp;
      if (!timestamp) return false;
      const callTime = new Date(timestamp).getTime();
      return callTime >= dateFrom && callTime <= dateTo;
    });

    console.log(`Звонков за период 15-21 октября: ${filteredCalls.length}`);
    console.log();

    // Группируем по владельцам
    const byOwner = {};

    filteredCalls.forEach(call => {
      const ownerId = call.properties.hubspot_owner_id || 'no_owner';
      const duration = parseInt(call.properties.hs_call_duration) || 0;

      if (!byOwner[ownerId]) {
        byOwner[ownerId] = {
          total: 0,
          durations: [],
          firstCall: null,
          lastCall: null
        };
      }

      byOwner[ownerId].total++;
      byOwner[ownerId].durations.push(duration);

      const callTime = new Date(call.properties.hs_timestamp);
      if (!byOwner[ownerId].firstCall || callTime < byOwner[ownerId].firstCall) {
        byOwner[ownerId].firstCall = callTime;
      }
      if (!byOwner[ownerId].lastCall || callTime > byOwner[ownerId].lastCall) {
        byOwner[ownerId].lastCall = callTime;
      }
    });

    // Получаем имена владельцев
    const ownerIds = Object.keys(byOwner);
    const ownerNames = await getOwnerNames(ownerIds);

    console.log('РАСПРЕДЕЛЕНИЕ ПО ВЛАДЕЛЬЦАМ:');
    console.log();

    Object.keys(byOwner).sort((a, b) => byOwner[b].total - byOwner[a].total).forEach(ownerId => {
      const stats = byOwner[ownerId];
      const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.total;
      const ownerName = ownerNames[ownerId] || ownerId;

      console.log(`${ownerName} (${ownerId})`);
      console.log(`  Звонков: ${stats.total}`);
      console.log(`  Первый звонок: ${stats.firstCall.toISOString()}`);
      console.log(`  Последний звонок: ${stats.lastCall.toISOString()}`);
      console.log(`  Средняя длительность: ${(avgDuration / 1000 / 60).toFixed(2)} мин`);
      console.log();
    });

    // Покажем первые 5 звонков для проверки
    console.log('ПРИМЕРЫ ЗВОНКОВ (первые 5):');
    filteredCalls.slice(0, 5).forEach((call, i) => {
      console.log(`${i + 1}. ${new Date(call.properties.hs_timestamp).toISOString()}`);
      console.log(`   Owner: ${call.properties.hubspot_owner_id || 'нет'}`);
      console.log(`   Duration: ${call.properties.hs_call_duration}ms`);
      console.log(`   Status: ${call.properties.hs_call_status || 'нет'}`);
      console.log();
    });

  } catch (error) {
    console.error('Ошибка:', error.message);
    console.error(error.stack);
  }
})();
