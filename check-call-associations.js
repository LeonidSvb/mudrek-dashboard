import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCallAssociations() {
  console.log('=== АНАЛИЗ ЗВОНКОВ И СДЕЛОК ===\n');

  // 1. Проверить звонки - к чему привязаны
  console.log('1. ЗВОНКИ - Связи\n');
  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('hubspot_id, call_to_number, call_from_number, call_timestamp, call_duration, raw_json')
    .limit(5);

  calls?.forEach((call, i) => {
    console.log(`Call ${i + 1}:`);
    console.log(`  Duration: ${call.call_duration ? (call.call_duration / 1000).toFixed(0) : 0}s`);
    console.log(`  To: ${call.call_to_number}`);
    console.log(`  From: ${call.call_from_number}`);

    if (call.raw_json?.associations) {
      console.log(`  Associations:`, Object.keys(call.raw_json.associations));
    } else {
      console.log(`  Associations: НЕТ`);
    }
    console.log('');
  });

  // 2. Проверить стадии сделок
  console.log('\n2. СТАДИИ СДЕЛОК (Deal Stages)\n');
  const { data: stages } = await supabase
    .from('hubspot_deals_raw')
    .select('dealstage')
    .not('dealstage', 'is', null);

  const stageCount = {};
  stages?.forEach(d => {
    stageCount[d.dealstage] = (stageCount[d.dealstage] || 0) + 1;
  });

  console.log('Статистика по стадиям:');
  Object.entries(stageCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([stage, count]) => {
      console.log(`  ${stage}: ${count}`);
    });

  // 3. Проверить payment поля
  console.log('\n\n3. PAYMENT ПОЛЯ В СДЕЛКАХ\n');
  const { data: dealSample } = await supabase
    .from('hubspot_deals_raw')
    .select('*')
    .not('amount', 'is', null)
    .limit(5);

  console.log('Пример сделки:');
  if (dealSample && dealSample.length > 0) {
    const deal = dealSample[0];
    console.log(`  Amount: ₪${deal.amount}`);
    console.log(`  Stage: ${deal.dealstage}`);
    console.log(`  Payment Status: ${deal.payment_status || 'N/A'}`);
    console.log(`  Upfront Payment: ${deal.upfront_payment || 'N/A'}`);
    console.log(`  Installment Plan: ${deal.installment_plan || 'N/A'}`);
    console.log(`  Installments: ${deal.number_of_installments__months || 'N/A'}`);
    console.log(`  Is Refunded: ${deal.is_refunded || false}`);

    // Проверить raw_json для дополнительных полей
    if (deal.raw_json?.properties) {
      const props = deal.raw_json.properties;
      const paymentFields = Object.keys(props).filter(k =>
        k.includes('payment') ||
        k.includes('upfront') ||
        k.includes('installment') ||
        k.includes('paid') ||
        k.includes('balance')
      );
      console.log('\n  Доп. payment поля в raw_json:', paymentFields);
    }
  }

  // 4. Анализ "настоящих" сделок
  console.log('\n\n4. АНАЛИЗ "НАСТОЯЩИХ" СДЕЛОК\n');

  // Сколько closedwon
  const { count: closedwonCount } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon');

  console.log(`Deals со stage "closedwon": ${closedwonCount}`);

  // Сколько с upfront payment
  const { data: upfrontDeals } = await supabase
    .from('hubspot_deals_raw')
    .select('upfront_payment, amount, payment_status')
    .not('upfront_payment', 'is', null);

  console.log(`Deals с upfront_payment: ${upfrontDeals?.length || 0}`);

  if (upfrontDeals && upfrontDeals.length > 0) {
    const sample = upfrontDeals.slice(0, 3);
    console.log('\nПримеры:');
    sample.forEach((d, i) => {
      console.log(`  ${i + 1}. Upfront: ₪${d.upfront_payment} / Total: ₪${d.amount} (${d.payment_status})`);
    });
  }

  // 5. Рекомендации
  console.log('\n\n=== ИНДУСТРИАЛЬНЫЕ СТАНДАРТЫ (EdTech / Online Courses) ===\n');
  console.log('Для онлайн-курсов с рассрочкой обычно считают:');
  console.log('');
  console.log('📊 МЕТРИКИ ПРОДАЖ:');
  console.log('  1. "Booking" / "Commitment" - когда клиент согласился (signed deal)');
  console.log('     → Stage: appointmentscheduled, contract sent, etc.');
  console.log('     → Используется для forecast');
  console.log('');
  console.log('  2. "Cash Collected" / "Revenue Recognized" - когда деньги пришли');
  console.log('     → Upfront payment (первый платеж)');
  console.log('     → Используется для реальной выручки');
  console.log('');
  console.log('  3. "Closed Won" - когда клиент оплатил хотя бы первый платеж');
  console.log('     → Stage: closedwon');
  console.log('     → payment_status: "paid" или "partial"');
  console.log('');
  console.log('📞 МЕТРИКИ ЗВОНКОВ:');
  console.log('  - Pre-sale calls: звонки ДО того как deal стал closedwon');
  console.log('  - Onboarding calls: звонки ПОСЛЕ closedwon (customer success)');
  console.log('  - Связь через call.timestamp vs deal.closedate');
  console.log('');
  console.log('💰 РЕКОМЕНДАЦИЯ ДЛЯ ТВОЕГО ДАШБОРДА:');
  console.log('  1. Total Sales = SUM(amount) WHERE dealstage = "closedwon"');
  console.log('     (полная сумма сделки, включая будущие платежи)');
  console.log('');
  console.log('  2. Cash Collected = SUM(upfront_payment) WHERE upfront_payment IS NOT NULL');
  console.log('     (реально собранные деньги)');
  console.log('');
  console.log('  3. Если upfront_payment = NULL, используй amount (значит полная оплата)');
  console.log('');
  console.log('  4. Для звонков:');
  console.log('     - "Sales Calls" = calls where contact.lifecyclestage != "customer"');
  console.log('     - "Customer Success Calls" = calls where contact.lifecyclestage = "customer"');
  console.log('');
  console.log('🎯 КЛЮЧЕВОЙ ВОПРОС ДЛЯ КЛИЕНТА:');
  console.log('  Какая метрика важнее для вас?');
  console.log('  A) Total Sales (полная сумма контрактов) - для forecast');
  console.log('  B) Cash Collected (реально собранные деньги) - для cashflow');
  console.log('');
  console.log('  Обычно показывают ОБЕ метрики!');
}

checkCallAssociations().catch(console.error);
