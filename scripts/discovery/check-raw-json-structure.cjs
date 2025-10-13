require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRawJsonStructure() {
  console.log('=== ПРОВЕРКА СТРУКТУРЫ raw_json ===\n');

  // Взять несколько примеров с разными суммами
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('dealname, amount, raw_json')
    .limit(10);

  deals.forEach(deal => {
    const props = deal.raw_json?.properties || {};
    const availableFields = Object.keys(props).filter(k =>
      k.includes('amount') ||
      k.includes('payment') ||
      k.includes('installment') ||
      k.includes('upfront') ||
      k.includes('cash')
    );

    console.log(`\n${deal.dealname}:`);
    console.log(`  DB amount: ${deal.amount}`);
    console.log(`  Доступные поля в raw_json.properties:`);

    if (availableFields.length > 0) {
      availableFields.forEach(field => {
        console.log(`    ${field}: ${props[field]}`);
      });
    } else {
      console.log(`    ❌ Нет полей с amount/payment/installment`);
    }

    // Проверить все свойства
    console.log(`  Всего свойств в raw_json: ${Object.keys(props).length}`);
  });

  // Получить список ВСЕХ уникальных свойств
  console.log('\n\n=== ВСЕ УНИКАЛЬНЫЕ СВОЙСТВА (с amount/payment) ===\n');

  const { data: allDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('raw_json')
    .limit(100);

  const allFields = new Set();
  allDeals.forEach(d => {
    const props = d.raw_json?.properties || {};
    Object.keys(props).forEach(k => {
      if (k.includes('amount') ||
          k.includes('payment') ||
          k.includes('installment') ||
          k.includes('upfront') ||
          k.includes('cash') ||
          k.includes('total')) {
        allFields.add(k);
      }
    });
  });

  console.log('Найденные поля:');
  Array.from(allFields).sort().forEach(field => {
    console.log(`  - ${field}`);
  });

  // Примеры значений
  console.log('\n\n=== ПРИМЕРЫ ЗНАЧЕНИЙ ===\n');
  const sampleDeal = allDeals.find(d => d.raw_json?.properties);
  if (sampleDeal) {
    const props = sampleDeal.raw_json.properties;
    Array.from(allFields).forEach(field => {
      if (props[field]) {
        console.log(`${field}: ${props[field]}`);
      }
    });
  }
}

checkRawJsonStructure().catch(console.error);
