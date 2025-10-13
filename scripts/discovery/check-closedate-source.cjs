require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClosedateSource() {
  console.log('=== ОТКУДА БЕРЕТСЯ CLOSEDATE? ===\n');

  // Получить 10 примеров deals
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, closedate, raw_json')
    .eq('dealstage', 'closedwon')
    .limit(10);

  deals.forEach(deal => {
    const props = deal.raw_json?.properties || {};

    console.log(`${deal.dealname}:`);
    console.log(`  DB closedate: ${deal.closedate}`);
    console.log(`  raw_json.properties.closedate: ${props.closedate || 'NULL'}`);
    console.log(`  raw_json.properties.hs_lastmodifieddate: ${props.hs_lastmodifieddate || 'NULL'}`);
    console.log(`  raw_json.properties.createdate: ${props.createdate || 'NULL'}`);
    console.log('');
  });

  console.log('\n=== АНАЛИЗ ===\n');

  // Проверить сколько deals имеют closedate в raw_json
  const { data: allDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('closedate, raw_json')
    .eq('dealstage', 'closedwon')
    .limit(1000);

  let hasRawClosedate = 0;
  let rawClosedateValues = new Set();

  allDeals.forEach(d => {
    const rawClosedate = d.raw_json?.properties?.closedate;
    if (rawClosedate) {
      hasRawClosedate++;
      rawClosedateValues.add(rawClosedate);
    }
  });

  console.log(`Deals с closedate в raw_json: ${hasRawClosedate}/${allDeals.length}`);
  console.log(`Уникальных значений closedate в raw_json: ${rawClosedateValues.size}`);

  if (rawClosedateValues.size <= 20) {
    console.log('\nВсе уникальные closedate:');
    Array.from(rawClosedateValues).sort().forEach(d => {
      console.log(`  ${d}`);
    });
  }

  console.log('\n=== ВЫВОД ===\n');

  if (hasRawClosedate === 0) {
    console.log('❌ ПРОБЛЕМА: closedate НЕТ в raw_json.properties!');
    console.log('   Это значит что HubSpot не вернул closedate для этих deals.');
    console.log('   DB closedate = дата синхронизации, а не реальная дата закрытия!');
  } else if (rawClosedateValues.size === 1) {
    console.log('❌ ПРОБЛЕМА: ВСЕ deals имеют одинаковый closedate!');
    console.log('   Это неправильно - deals должны иметь разные даты закрытия.');
  } else {
    console.log('✓ closedate присутствует в raw_json');
    console.log(`  Уникальных дат: ${rawClosedateValues.size}`);
    console.log('\n  Но DB closedate все равно = 2025-09-09!');
    console.log('  Нужно обновить closedate column из raw_json!');
  }
}

checkClosedateSource().catch(console.error);
