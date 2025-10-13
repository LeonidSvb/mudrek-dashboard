require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClosedateRange() {
  console.log('=== ПРОВЕРКА CLOSEDATE У DEALS ===\n');

  // 1. MIN/MAX closedate
  const { data: range } = await supabase
    .from('hubspot_deals_raw')
    .select('closedate')
    .eq('dealstage', 'closedwon')
    .order('closedate', { ascending: true })
    .limit(1);

  const { data: rangeMax } = await supabase
    .from('hubspot_deals_raw')
    .select('closedate')
    .eq('dealstage', 'closedwon')
    .order('closedate', { ascending: false })
    .limit(1);

  console.log('Диапазон closedate:');
  console.log(`  MIN: ${range?.[0]?.closedate || 'NULL'}`);
  console.log(`  MAX: ${rangeMax?.[0]?.closedate || 'NULL'}`);
  console.log('');

  // 2. Сколько deals в разных диапазонах
  const { data: total } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon');

  console.log(`Всего closedwon deals: ${total?.length || 0}`);
  console.log('');

  // 3. По месяцам
  const { data: byMonth } = await supabase.rpc('run_sql', {
    query: `
      SELECT
        DATE_TRUNC('month', closedate) as month,
        COUNT(*) as deals_count,
        SUM(amount) as total_amount
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
        AND closedate IS NOT NULL
      GROUP BY DATE_TRUNC('month', closedate)
      ORDER BY month DESC
      LIMIT 12
    `
  });

  if (byMonth) {
    console.log('Deals по месяцам:');
    byMonth.forEach(row => {
      console.log(`  ${row.month}: ${row.deals_count} deals, $${parseFloat(row.total_amount).toLocaleString()}`);
    });
  }

  console.log('');

  // 4. Deals в диапазоне 2025-09-13 to 2025-10-13
  const { data: inRange, count } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, amount, closedate', { count: 'exact' })
    .eq('dealstage', 'closedwon')
    .gte('closedate', '2025-09-13')
    .lte('closedate', '2025-10-13')
    .order('closedate', { ascending: false })
    .limit(10);

  console.log(`Deals в диапазоне 2025-09-13 to 2025-10-13: ${count || 0}`);
  if (inRange && inRange.length > 0) {
    console.log('Примеры:');
    inRange.forEach(d => {
      console.log(`  ${d.closedate}: ${d.dealname} - $${d.amount}`);
    });
  } else {
    console.log('  ❌ НЕТ DEALS В ЭТОМ ДИАПАЗОНЕ!');
  }

  console.log('');

  // 5. Deals за последние 90 дней
  const { data: recent, count: recentCount } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .gte('closedate', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  console.log(`Deals за последние 90 дней: ${recentCount || 0}`);

  // 6. Deals без closedate
  const { data: noDate, count: noDateCount } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .is('closedate', null);

  console.log(`Deals без closedate: ${noDateCount || 0}`);
}

checkClosedateRange().catch(console.error);
