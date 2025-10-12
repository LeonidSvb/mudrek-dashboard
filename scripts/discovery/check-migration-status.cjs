require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkStatus() {
  console.log('🔍 Проверка статуса миграции...\n');

  // 1. Проверка что функция существует
  console.log('1. Проверка что get_all_metrics существует:');
  const { data: functions, error: err1 } = await supabase
    .from('pg_proc')
    .select('proname')
    .eq('proname', 'get_all_metrics');

  if (err1) {
    console.log('  ⚠️  Не могу проверить функции (это нормально для Supabase)');
  } else if (functions && functions.length > 0) {
    console.log('  ✅ Функция get_all_metrics найдена');
  }

  // 2. Проверка VIEW contact_call_stats
  console.log('\n2. Проверка VIEW contact_call_stats:');
  const { data: viewData, error: err2 } = await supabase
    .from('contact_call_stats')
    .select('contact_id')
    .limit(1);

  if (err2) {
    console.error('  ❌ VIEW не найден или ошибка:', err2.message);
    console.error('\n⚠️  Вероятно VIEW contact_call_stats НЕ создан!');
    console.error('Проверьте что вы запустили миграцию 009_create_phone_matching_views.sql');
  } else {
    console.log('  ✅ VIEW contact_call_stats работает');
  }

  // 3. Простой подсчет contacts
  console.log('\n3. Простой подсчет контактов:');
  const { count, error: err3 } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  if (err3) {
    console.error('  ❌ Ошибка:', err3.message);
  } else {
    console.log('  ✅ Всего контактов:', count);
  }

  // 4. Подсчет с date filter
  console.log('\n4. Подсчет с фильтром по createdate:');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: err4 } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .gte('createdate', thirtyDaysAgo);

  if (err4) {
    console.error('  ❌ Ошибка:', err4.message);
  } else {
    console.log('  ✅ Контактов за 30 дней:', recentCount);
    console.log('  ℹ️  Фильтр по дате работает');
  }

  console.log('\n📋 ДИАГНОЗ:');
  console.log('Если все проверки ✅ - значит проблема в производительности SQL функции.');
  console.log('Нужно оптимизировать contact_call_stats VIEW или добавить индексы.');
}

checkStatus();
