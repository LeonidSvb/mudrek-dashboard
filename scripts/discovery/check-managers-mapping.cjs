require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '').slice(-10);
}

async function checkManagersMapping() {
  console.log('=== ПРОВЕРКА MANAGERS MAPPING ===\n');

  // Загрузить CSV
  const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const csvRecords = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  console.log(`CSV records: ${csvRecords.length}\n`);

  // Получить все deals из DB
  const { data: dbDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, hubspot_owner_id, raw_json');

  console.log(`DB deals: ${dbDeals.length}\n`);

  // Создать индекс по phone
  const dbByPhone = {};
  dbDeals.forEach(d => {
    const phone = d.raw_json?.properties?.phone_number;
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        dbByPhone[normalized] = d;
      }
    }
  });

  console.log(`Deals с телефонами в DB: ${Object.keys(dbByPhone).length}\n`);

  // Сопоставить по phone и собрать статистику managers
  const managerStats = {};
  let matchedCount = 0;
  let unmatchedCount = 0;

  csvRecords.forEach(csvDeal => {
    const phone = normalizePhone(csvDeal.phone);
    if (!phone) {
      unmatchedCount++;
      return;
    }

    const dbDeal = dbByPhone[phone];
    if (dbDeal) {
      matchedCount++;

      // CSV manager name
      const csvManager = (csvDeal.sales || 'No Manager').trim();

      // DB owner_id
      const ownerID = dbDeal.hubspot_owner_id || 'No Owner';

      // Создать mapping
      if (!managerStats[csvManager]) {
        managerStats[csvManager] = {
          count: 0,
          ownerIDs: {}
        };
      }
      managerStats[csvManager].count++;

      if (!managerStats[csvManager].ownerIDs[ownerID]) {
        managerStats[csvManager].ownerIDs[ownerID] = 0;
      }
      managerStats[csvManager].ownerIDs[ownerID]++;
    } else {
      unmatchedCount++;
    }
  });

  console.log(`✓ Matched by phone: ${matchedCount}`);
  console.log(`✗ Unmatched: ${unmatchedCount}\n`);

  // Вывести mapping
  console.log('=== CSV MANAGER → HUBSPOT OWNER_ID MAPPING ===\n');

  const sortedManagers = Object.entries(managerStats)
    .sort((a, b) => b[1].count - a[1].count);

  sortedManagers.forEach(([manager, stats]) => {
    console.log(`${manager}: ${stats.count} deals`);

    const sortedOwners = Object.entries(stats.ownerIDs)
      .sort((a, b) => b[1] - a[1]);

    sortedOwners.forEach(([ownerID, count]) => {
      const percent = ((count / stats.count) * 100).toFixed(1);
      console.log(`  → ${ownerID}: ${count} (${percent}%)`);
    });
    console.log('');
  });

  // Проверить consistency
  console.log('=== CONSISTENCY CHECK ===\n');

  const inconsistentManagers = [];
  sortedManagers.forEach(([manager, stats]) => {
    const ownerIDs = Object.keys(stats.ownerIDs);
    if (ownerIDs.length > 1) {
      inconsistentManagers.push({
        manager,
        ownerIDs,
        mainOwner: Object.entries(stats.ownerIDs).sort((a, b) => b[1] - a[1])[0][0]
      });
    }
  });

  if (inconsistentManagers.length > 0) {
    console.log('⚠️ Managers с несколькими owner_id:');
    inconsistentManagers.forEach(m => {
      console.log(`  ${m.manager}:`);
      console.log(`    owner_ids: ${m.ownerIDs.join(', ')}`);
      console.log(`    Рекомендуемый: ${m.mainOwner} (самый частый)`);
    });
  } else {
    console.log('✓ Все managers имеют только один owner_id!');
  }

  // Проверить % совпадения по phone
  console.log('\n=== PHONE MATCHING QUALITY ===\n');

  const matchPercent = ((matchedCount / csvRecords.length) * 100).toFixed(1);
  console.log(`Совпадение по телефону: ${matchedCount}/${csvRecords.length} (${matchPercent}%)`);

  if (matchPercent >= 95) {
    console.log('✓ Отличное качество! Можно использовать phone для mapping.');
  } else if (matchPercent >= 80) {
    console.log('⚠️ Хорошее качество, но есть пропуски.');
  } else {
    console.log('✗ Плохое качество. Нужен дополнительный способ matching (email?).');
  }

  // Проверить email matching для unmatch
  console.log('\n=== EMAIL MATCHING (для unmatched) ===\n');

  const dbByEmail = {};
  dbDeals.forEach(d => {
    const email = d.raw_json?.properties?.email;
    if (email) {
      dbByEmail[email.toLowerCase()] = d;
    }
  });

  let emailMatched = 0;
  csvRecords.forEach(csvDeal => {
    const phone = normalizePhone(csvDeal.phone);
    if (phone && dbByPhone[phone]) {
      return; // уже matched по phone
    }

    const email = csvDeal.email?.toLowerCase();
    if (email && dbByEmail[email]) {
      emailMatched++;
    }
  });

  console.log(`Дополнительно matched по email: ${emailMatched}`);
  console.log(`Итого: ${matchedCount + emailMatched} / ${csvRecords.length} (${((matchedCount + emailMatched)/csvRecords.length*100).toFixed(1)}%)`);
}

checkManagersMapping().catch(console.error);
