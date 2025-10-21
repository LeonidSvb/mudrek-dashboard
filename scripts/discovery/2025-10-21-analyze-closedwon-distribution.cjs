require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('=== АНАЛИЗ CLOSEDWON СДЕЛОК ===\n');

  // 1. Всего closedwon сделок
  const { count: totalClosedwon } = await supabase
    .from('hubspot_deals_raw')
    .select('*', { count: 'exact', head: true })
    .eq('dealstage', 'closedwon')
    .not('closedate', 'is', null);

  console.log(`1. Всего closedwon сделок: ${totalClosedwon}`);

  // 2. Распределение по deal.hubspot_owner_id (владелец сделки)
  const { data: dealsByDealOwner } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_owner_id')
    .eq('dealstage', 'closedwon')
    .not('closedate', 'is', null);

  const dealOwnerMap = {};
  dealsByDealOwner.forEach(d => {
    const ownerId = d.hubspot_owner_id || 'NULL';
    dealOwnerMap[ownerId] = (dealOwnerMap[ownerId] || 0) + 1;
  });

  console.log(`\n2. Распределение по deal.hubspot_owner_id (владелец сделки):`);
  Object.entries(dealOwnerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([ownerId, count]) => {
      console.log(`   ${ownerId}: ${count} сделок`);
    });

  console.log(`\n3. Наши менеджеры (по deal.hubspot_owner_id):`);
  ['81280578', '726197388', '687247262'].forEach(id => {
    console.log(`   ${id}: ${dealOwnerMap[id] || 0} сделок`);
  });

  // 3. Сравнение: простая логика vs сложная логика
  console.log(`\n4. Проверка сложной логики (через звонки):`);
  console.log(`   Вызываем get_call_to_close_metrics()...`);

  const { data: callToCloseData, error } = await supabase
    .rpc('get_call_to_close_metrics');

  if (error) {
    console.error('   Ошибка:', error);
  } else {
    const sales = callToCloseData.filter(m =>
      ['81280578', '726197388', '687247262'].includes(m.owner_id)
    );

    console.log(`\n   Результаты сложной логики (через звонки):`);
    sales.forEach(m => {
      console.log(`   ${m.owner_name}: ${m.closed_won} won / ${m.total_calls} calls = ${m.call_to_close_rate}%`);
    });
  }

  console.log(`\n5. ВЫВОД:`);
  console.log(`   - Всего closedwon: ${totalClosedwon}`);
  console.log(`   - По deal.hubspot_owner_id наши менеджеры: ${dealOwnerMap['81280578'] || 0} + ${dealOwnerMap['726197388'] || 0} + ${dealOwnerMap['687247262'] || 0} = ${(dealOwnerMap['81280578'] || 0) + (dealOwnerMap['726197388'] || 0) + (dealOwnerMap['687247262'] || 0)}`);

  if (callToCloseData) {
    const sales = callToCloseData.filter(m =>
      ['81280578', '726197388', '687247262'].includes(m.owner_id)
    );
    const totalWonViaCall = sales.reduce((sum, m) => sum + m.closed_won, 0);
    console.log(`   - По звонкам (сложная логика): ${totalWonViaCall}`);
    console.log(`\n   ${totalWonViaCall < totalClosedwon ? '⚠️  Сложная логика находит МЕНЬШЕ сделок!' : '✓ Сложная логика работает правильно'}`);
  }
})();
