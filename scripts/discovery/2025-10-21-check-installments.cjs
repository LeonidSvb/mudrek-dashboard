/**
 * Проверка данных number_of_installments__months в Supabase
 * Цель: выяснить почему Avg Installments показывает 0.00 на дашборде
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkInstallments() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      db: { schema: 'public' },
      auth: { persistSession: false }
    }
  );

  try {
    console.log('✅ Подключение к Supabase успешно\n');

    // 1. Получить ВСЕ closedwon сделки и посчитать статистику
    console.log('📊 Статистика по number_of_installments__months в closedwon сделках:\n');

    const { data: deals, error: dealsError } = await supabase
      .from('hubspot_deals_raw')
      .select('hubspot_id, dealname, number_of_installments__months, upfront_payment, amount, closedate')
      .eq('dealstage', 'closedwon');

    if (dealsError) throw dealsError;

    const total = deals.length;
    const hasInstallments = deals.filter(d => d.number_of_installments__months !== null).length;
    const hasInstallmentsGtZero = deals.filter(d => d.number_of_installments__months > 0).length;
    const installmentsValues = deals
      .filter(d => d.number_of_installments__months !== null)
      .map(d => d.number_of_installments__months);

    const min = installmentsValues.length > 0 ? Math.min(...installmentsValues) : null;
    const max = installmentsValues.length > 0 ? Math.max(...installmentsValues) : null;
    const avg = installmentsValues.length > 0
      ? (installmentsValues.reduce((a, b) => a + b, 0) / installmentsValues.length).toFixed(2)
      : null;

    console.table([{
      total_closedwon_deals: total,
      has_installments_field: hasInstallments,
      has_installments_gt_zero: hasInstallmentsGtZero,
      min_value: min,
      max_value: max,
      avg_value: avg
    }]);

    // 2. Примеры сделок с installments > 0
    console.log('\n📋 Примеры сделок с number_of_installments__months > 0:\n');
    const dealsWithInstallments = deals
      .filter(d => d.number_of_installments__months > 0)
      .slice(0, 10);

    if (dealsWithInstallments.length > 0) {
      console.table(dealsWithInstallments.map(d => ({
        hubspot_id: d.hubspot_id,
        dealname: d.dealname?.substring(0, 30),
        installments: d.number_of_installments__months,
        upfront: d.upfront_payment,
        amount: d.amount,
        closedate: d.closedate?.substring(0, 10)
      })));
    } else {
      console.log('❌ Нет сделок с number_of_installments__months > 0');
    }

    // 3. Проверка upfront_payment
    console.log('\n💰 Статистика по upfront_payment в closedwon сделках:\n');

    const hasUpfront = deals.filter(d => d.upfront_payment !== null).length;
    const hasUpfrontGtZero = deals.filter(d => d.upfront_payment > 0).length;
    const upfrontValues = deals
      .filter(d => d.upfront_payment !== null)
      .map(d => d.upfront_payment);

    const upfrontMin = upfrontValues.length > 0 ? Math.min(...upfrontValues) : null;
    const upfrontMax = upfrontValues.length > 0 ? Math.max(...upfrontValues) : null;
    const upfrontAvg = upfrontValues.length > 0
      ? (upfrontValues.reduce((a, b) => a + b, 0) / upfrontValues.length).toFixed(2)
      : null;

    console.table([{
      total_closedwon_deals: total,
      has_upfront_field: hasUpfront,
      has_upfront_gt_zero: hasUpfrontGtZero,
      min_value: upfrontMin,
      max_value: upfrontMax,
      avg_value: upfrontAvg
    }]);

    // 4. Проверка через get_payment_metrics RPC функцию
    console.log('\n🔍 Результат get_payment_metrics() (как на дашборде):\n');

    const { data: paymentMetrics, error: metricsError } = await supabase.rpc('get_payment_metrics', {
      p_owner_id: null,
      p_date_from: null,
      p_date_to: null
    });

    if (metricsError) {
      console.error('❌ Ошибка get_payment_metrics:', metricsError);
    } else {
      console.table([paymentMetrics]);
    }

  } catch (err) {
    console.error('❌ Ошибка:', err);
  }
}

checkInstallments();
