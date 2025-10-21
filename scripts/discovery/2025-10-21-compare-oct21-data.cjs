require('dotenv').config();
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function searchCallsHubSpot(dateFrom, dateTo) {
  const requestBody = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'hs_timestamp',
            operator: 'GTE',
            value: new Date(dateFrom).getTime().toString()
          },
          {
            propertyName: 'hs_timestamp',
            operator: 'LTE',
            value: new Date(dateTo).getTime().toString()
          }
        ]
      }
    ],
    properties: ['hs_timestamp', 'hs_call_duration', 'hubspot_owner_id', 'hs_call_status'],
    limit: 100
  };

  let allCalls = [];
  let hasMore = true;
  let after = 0;

  while (hasMore) {
    const body = { ...requestBody };
    if (after > 0) {
      body.after = after;
    }

    const options = {
      hostname: 'api.hubapi.com',
      path: '/crm/v3/objects/calls/search',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(body))
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
      req.write(JSON.stringify(body));
      req.end();
    });

    allCalls = allCalls.concat(response.results || []);

    if (response.paging && response.paging.next && response.paging.next.after) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  return allCalls;
}

async function getOwnerNames() {
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
    ownerMap[owner.id] = {
      name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
      email: owner.email
    };
  });

  return ownerMap;
}

function groupByOwner(calls, ownerNames) {
  const byOwner = {};

  calls.forEach(call => {
    const ownerId = call.properties.hubspot_owner_id || 'no_owner';
    const duration = parseInt(call.properties.hs_call_duration) || 0;

    if (!byOwner[ownerId]) {
      byOwner[ownerId] = {
        total: 0,
        durations: []
      };
    }

    byOwner[ownerId].total++;
    byOwner[ownerId].durations.push(duration);
  });

  return Object.keys(byOwner).sort((a, b) => byOwner[b].total - byOwner[a].total).map(ownerId => {
    const stats = byOwner[ownerId];
    const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.total;
    const owner = ownerNames[ownerId];

    return {
      id: ownerId,
      name: owner ? owner.name : 'Unknown',
      email: owner ? owner.email : '',
      calls: stats.total,
      avgMinutes: (avgDuration / 1000 / 60).toFixed(2)
    };
  });
}

(async () => {
  try {
    console.log('=== СРАВНЕНИЕ ДАННЫХ ЗА 21 ОКТЯБРЯ И 21 СЕНТЯБРЯ ===\n');

    const ownerNames = await getOwnerNames();

    // 1. Проверка HubSpot за 21 октября
    console.log('1. HUBSPOT - 21 ОКТЯБРЯ 2025 (00:00 - 23:59)');
    const oct21Calls = await searchCallsHubSpot('2025-10-21T00:00:00Z', '2025-10-21T23:59:59Z');
    console.log(`Всего звонков: ${oct21Calls.length}\n`);

    const oct21Grouped = groupByOwner(oct21Calls, ownerNames);
    oct21Grouped.forEach(owner => {
      console.log(`${owner.name} (${owner.id}): ${owner.calls} звонков, avg ${owner.avgMinutes} мин`);
    });

    // 2. Проверка нашей базы за 21 октября
    console.log('\n2. НАША БАЗА (call_contact_matches_mv) - 21 ОКТЯБРЯ 2025');
    const { data: oct21DB, error: oct21Error } = await supabase
      .from('call_contact_matches_mv')
      .select('call_id, hubspot_owner_id, call_duration, call_timestamp')
      .gte('call_timestamp', '2025-10-21T00:00:00Z')
      .lt('call_timestamp', '2025-10-22T00:00:00Z');

    if (oct21Error) {
      console.error('Ошибка:', oct21Error);
    } else {
      console.log(`Всего звонков: ${oct21DB.length}\n`);

      const oct21DBGrouped = {};
      oct21DB.forEach(call => {
        const ownerId = call.hubspot_owner_id || 'no_owner';
        if (!oct21DBGrouped[ownerId]) {
          oct21DBGrouped[ownerId] = { total: 0, durations: [] };
        }
        oct21DBGrouped[ownerId].total++;
        oct21DBGrouped[ownerId].durations.push(call.call_duration);
      });

      Object.keys(oct21DBGrouped).sort((a, b) => oct21DBGrouped[b].total - oct21DBGrouped[a].total).forEach(ownerId => {
        const stats = oct21DBGrouped[ownerId];
        const owner = ownerNames[ownerId];
        const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.total;
        console.log(`${owner ? owner.name : 'Unknown'} (${ownerId}): ${stats.total} звонков, avg ${(avgDuration / 1000 / 60).toFixed(2)} мин`);
      });
    }

    // 3. Проверка HubSpot за 21 сентября
    console.log('\n3. HUBSPOT - 21 СЕНТЯБРЯ 2025 (00:00 - 23:59)');
    const sept21Calls = await searchCallsHubSpot('2025-09-21T00:00:00Z', '2025-09-21T23:59:59Z');
    console.log(`Всего звонков: ${sept21Calls.length}\n`);

    const sept21Grouped = groupByOwner(sept21Calls, ownerNames);
    sept21Grouped.forEach(owner => {
      console.log(`${owner.name} (${owner.id}): ${owner.calls} звонков, avg ${owner.avgMinutes} мин`);
    });

    // 4. Проверка нашей базы за 21 сентября
    console.log('\n4. НАША БАЗА (call_contact_matches_mv) - 21 СЕНТЯБРЯ 2025');
    const { data: sept21DB, error: sept21Error } = await supabase
      .from('call_contact_matches_mv')
      .select('call_id, hubspot_owner_id, call_duration, call_timestamp')
      .gte('call_timestamp', '2025-09-21T00:00:00Z')
      .lt('call_timestamp', '2025-09-22T00:00:00Z');

    if (sept21Error) {
      console.error('Ошибка:', sept21Error);
    } else {
      console.log(`Всего звонков: ${sept21DB.length}\n`);

      const sept21DBGrouped = {};
      sept21DB.forEach(call => {
        const ownerId = call.hubspot_owner_id || 'no_owner';
        if (!sept21DBGrouped[ownerId]) {
          sept21DBGrouped[ownerId] = { total: 0, durations: [] };
        }
        sept21DBGrouped[ownerId].total++;
        sept21DBGrouped[ownerId].durations.push(call.call_duration);
      });

      Object.keys(sept21DBGrouped).sort((a, b) => sept21DBGrouped[b].total - sept21DBGrouped[a].total).forEach(ownerId => {
        const stats = sept21DBGrouped[ownerId];
        const owner = ownerNames[ownerId];
        const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.total;
        console.log(`${owner ? owner.name : 'Unknown'} (${ownerId}): ${stats.total} звонков, avg ${(avgDuration / 1000 / 60).toFixed(2)} мин`);
      });
    }

    // 5. Проверка hubspot_calls_raw за 21 октября
    console.log('\n5. НАША БАЗА (hubspot_calls_raw) - 21 ОКТЯБРЯ 2025');
    const { data: oct21Raw, error: oct21RawError } = await supabase
      .from('hubspot_calls_raw')
      .select('hubspot_id, call_timestamp, call_duration')
      .gte('call_timestamp', '2025-10-21T00:00:00Z')
      .lt('call_timestamp', '2025-10-22T00:00:00Z');

    if (oct21RawError) {
      console.error('Ошибка:', oct21RawError);
    } else {
      console.log(`Всего звонков в hubspot_calls_raw: ${oct21Raw.length}`);
    }

    // ИТОГОВОЕ СРАВНЕНИЕ
    console.log('\n=== ИТОГОВОЕ СРАВНЕНИЕ ===\n');
    console.log('21 ОКТЯБРЯ:');
    console.log(`  HubSpot API: ${oct21Calls.length} звонков`);
    console.log(`  Наша база (call_contact_matches_mv): ${oct21DB ? oct21DB.length : 0} звонков`);
    console.log(`  Наша база (hubspot_calls_raw): ${oct21Raw ? oct21Raw.length : 0} звонков`);
    console.log(`  Погрешность (API vs matches_mv): ${oct21DB ? ((1 - oct21DB.length / oct21Calls.length) * 100).toFixed(1) : 0}%`);
    console.log(`  Погрешность (API vs raw): ${oct21Raw ? ((1 - oct21Raw.length / oct21Calls.length) * 100).toFixed(1) : 0}%`);

    console.log('\n21 СЕНТЯБРЯ:');
    console.log(`  HubSpot API: ${sept21Calls.length} звонков`);
    console.log(`  Наша база (call_contact_matches_mv): ${sept21DB ? sept21DB.length : 0} звонков`);
    console.log(`  Погрешность: ${sept21DB ? ((1 - sept21DB.length / sept21Calls.length) * 100).toFixed(1) : 0}%`);

  } catch (error) {
    console.error('Ошибка:', error.message);
    console.error(error.stack);
  }
})();
