import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testFilters() {
  console.log('\n=== ТЕСТ 1: Проверка closedate у deals ===\n');

  const { data: deals, error } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, closedate, amount, dealstage, hubspot_owner_id')
    .eq('dealstage', 'closedwon')
    .order('closedate', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  console.log('Последние 10 closedwon deals:');
  deals.forEach(d => {
    console.log(`  ${d.closedate} - ₪${d.amount} - owner: ${d.hubspot_owner_id}`);
  });

  // Проверка диапазонов дат
  const now = new Date();
  const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  console.log(`\n=== ТЕСТ 2: Сколько deals за последние 7 дней? ===`);
  console.log(`Диапазон: ${last7days.toISOString().split('T')[0]} - ${now.toISOString().split('T')[0]}`);

  const { count: count7d } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .gte('closedate', last7days.toISOString())
    .lte('closedate', now.toISOString());

  console.log(`Deals за 7 дней: ${count7d}`);

  console.log(`\n=== ТЕСТ 3: Сколько deals за последние 30 дней? ===`);
  console.log(`Диапазон: ${last30days.toISOString().split('T')[0]} - ${now.toISOString().split('T')[0]}`);

  const { count: count30d } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .gte('closedate', last30days.toISOString())
    .lte('closedate', now.toISOString());

  console.log(`Deals за 30 дней: ${count30d}`);

  console.log(`\n=== ТЕСТ 4: Все closedwon deals (без фильтра) ===`);

  const { count: totalCount } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon');

  console.log(`Всего closedwon deals: ${totalCount}`);

  console.log(`\n=== ТЕСТ 5: Проверка owners ===`);

  const { data: owners } = await supabase
    .from('hubspot_owners')
    .select('*')
    .order('owner_name');

  console.log(`Всего owners: ${owners?.length || 0}`);
  if (owners) {
    owners.forEach(o => {
      console.log(`  ${o.owner_name} (${o.owner_id})`);
    });
  }

  console.log(`\n=== ТЕСТ 6: Deals по owner ===`);

  const { data: dealsByOwner } = await supabase.rpc('sql', {
    query: `
      SELECT hubspot_owner_id, COUNT(*) as count, SUM(amount) as total
      FROM hubspot_deals_raw
      WHERE dealstage = 'closedwon'
      GROUP BY hubspot_owner_id
      ORDER BY count DESC
      LIMIT 10
    `
  });

  console.log('Top owners:');
  if (dealsByOwner) {
    dealsByOwner.forEach(o => {
      console.log(`  Owner ${o.hubspot_owner_id}: ${o.count} deals, ₪${o.total}`);
    });
  }

  console.log('\n=== ВЫВОД ===\n');

  if (count7d === 0 && count30d === 0 && totalCount > 0) {
    console.log('❌ ПРОБЛЕМА: Все deals имеют closedate СТАРШЕ 30 дней!');
    console.log('   Фильтры работают правильно, но данные устарели.');
    console.log('   РЕШЕНИЕ: Использовать более широкий диапазон дат (например, 1 год)');
  } else if (totalCount === 0) {
    console.log('❌ ПРОБЛЕМА: Вообще нет closedwon deals в базе!');
  } else {
    console.log('✅ Deals есть в диапазоне, фильтры должны работать.');
  }
}

testFilters().catch(console.error);
