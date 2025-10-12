require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPaymentFields() {
  console.log('=== ПРОВЕРКА PAYMENT ПОЛЕЙ В DEALS ===\n');

  // 1. Получить несколько closedwon deals с raw_json
  const { data: deals, error } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, amount, raw_json')
    .eq('dealstage', 'closedwon')
    .not('amount', 'is', null)
    .order('amount', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  console.log(`Проверяем ${deals.length} сделок с самой большой суммой:\n`);

  // 2. Собрать все уникальные ключи из properties
  const allKeys = new Set();
  const paymentRelatedKeys = new Set();

  deals.forEach(deal => {
    if (deal.raw_json?.properties) {
      Object.keys(deal.raw_json.properties).forEach(key => {
        allKeys.add(key);

        // Искать payment-related поля
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('payment') ||
          lowerKey.includes('installment') ||
          lowerKey.includes('paid') ||
          lowerKey.includes('upfront') ||
          lowerKey.includes('cash') ||
          lowerKey.includes('balance') ||
          lowerKey.includes('outstanding') ||
          lowerKey.includes('remaining')
        ) {
          paymentRelatedKeys.add(key);
        }
      });
    }
  });

  console.log('=== PAYMENT-RELATED ПОЛЯ ===\n');
  if (paymentRelatedKeys.size > 0) {
    console.log(`Найдено ${paymentRelatedKeys.size} payment-related полей:\n`);
    Array.from(paymentRelatedKeys).sort().forEach(key => {
      console.log(`  - ${key}`);
    });
  } else {
    console.log('⚠️ НЕ найдено payment-related полей!');
    console.log('Возможно используются другие названия.\n');
  }

  // 3. Показать примеры значений
  console.log('\n=== ПРИМЕРЫ ЗНАЧЕНИЙ ===\n');
  deals.forEach((deal, i) => {
    console.log(`${i + 1}. Deal: ${deal.dealname || deal.hubspot_id}`);
    console.log(`   Amount: $${deal.amount}`);

    if (paymentRelatedKeys.size > 0) {
      paymentRelatedKeys.forEach(key => {
        const value = deal.raw_json.properties[key];
        if (value !== null && value !== undefined && value !== '') {
          console.log(`   ${key}: ${value}`);
        }
      });
    }
    console.log('');
  });

  // 4. Проверить существующие колонки в таблице
  console.log('=== ТЕКУЩИЕ PAYMENT КОЛОНКИ В ТАБЛИЦЕ ===\n');

  const { data: sample, error: sampleError } = await supabase
    .from('hubspot_deals_raw')
    .select('upfront_payment, number_of_installments__months')
    .limit(1000);

  if (!sampleError && sample) {
    const withUpfront = sample.filter(d => d.upfront_payment !== null && d.upfront_payment > 0).length;
    const withInstallments = sample.filter(d => d.number_of_installments__months !== null && d.number_of_installments__months > 0).length;

    console.log(`Проверено ${sample.length} deals:`);
    console.log(`  upfront_payment заполнено: ${withUpfront} (${(withUpfront/sample.length*100).toFixed(1)}%)`);
    console.log(`  number_of_installments__months заполнено: ${withInstallments} (${(withInstallments/sample.length*100).toFixed(1)}%)`);
  }

  // 5. Список всех полей (для справки)
  console.log(`\n=== ВСЕГО ПОЛЕЙ В DEALS: ${allKeys.size} ===\n`);
  console.log('Первые 50 полей (алфавитный порядок):\n');
  Array.from(allKeys).sort().slice(0, 50).forEach((key, i) => {
    console.log(`${i + 1}. ${key}`);
  });

  if (allKeys.size > 50) {
    console.log(`\n... и еще ${allKeys.size - 50} полей`);
  }
}

checkPaymentFields();
