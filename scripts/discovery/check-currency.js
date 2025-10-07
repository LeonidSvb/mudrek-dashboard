import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCurrency() {
  console.log('Проверка валюты в сделках...\n');

  // Получить несколько сделок с amount
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, amount, dealstage, raw_json')
    .not('amount', 'is', null)
    .order('amount', { ascending: false })
    .limit(10);

  console.log('=== 10 самых больших сделок ===\n');
  deals?.forEach((deal, i) => {
    console.log(`${i + 1}. Amount: ${deal.amount} (Stage: ${deal.dealstage})`);

    // Проверить есть ли информация о валюте в raw_json
    if (deal.raw_json?.properties) {
      const props = deal.raw_json.properties;
      const currencyFields = Object.keys(props).filter(k =>
        k.toLowerCase().includes('currency') ||
        k.toLowerCase().includes('валюта')
      );
      if (currencyFields.length > 0) {
        console.log(`   Currency fields:`, currencyFields.map(f => `${f}=${props[f]}`));
      }
    }
  });

  // Статистика
  const { data: allDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('amount')
    .not('amount', 'is', null);

  const amounts = allDeals?.map(d => d.amount).sort((a, b) => a - b) || [];

  console.log('\n=== СТАТИСТИКА СУММ ===');
  console.log(`Total deals with amount: ${amounts.length}`);
  console.log(`Min: ${amounts[0]}`);
  console.log(`Max: ${amounts[amounts.length - 1]}`);
  console.log(`Median: ${amounts[Math.floor(amounts.length / 2)]}`);
  console.log(`Average: ${(amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(2)}`);

  console.log('\n=== ВЫВОД ===');
  console.log('Если суммы в районе 1000-5000, скорее всего это шекели (₪)');
  console.log('Если суммы в районе 100-500, скорее всего это доллары ($)');
  console.log('\nТребуется подтверждение от клиента какая валюта используется!');
}

checkCurrency().catch(console.error);
