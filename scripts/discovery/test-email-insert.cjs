require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testEmailInsert() {
  console.log('🧪 Тестирование вставки email в Supabase...\n');

  // 1. Проверим схему таблицы
  console.log('📋 Проверка схемы таблицы hubspot_contacts_raw...');

  const { data: tableInfo, error: schemaError } = await supabase
    .from('hubspot_contacts_raw')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.error('❌ Schema error:', schemaError.message);
    return;
  }

  if (tableInfo.length > 0) {
    console.log('Колонки в таблице:', Object.keys(tableInfo[0]).join(', '));
  }

  // 2. Попробуем вставить тестовую запись с email
  console.log('\n🔧 Попытка вставить тестовую запись с email...');

  const testRecord = {
    hubspot_id: 'test_email_12345',
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    phone: '+972501234567',
    createdate: new Date().toISOString(),
    raw_json: { test: true },
    synced_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase
    .from('hubspot_contacts_raw')
    .insert([testRecord])
    .select();

  if (insertError) {
    console.error('❌ Insert error:', insertError.message);
    console.error('   Code:', insertError.code);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
  } else {
    console.log('✅ Тестовая запись вставлена успешно!');
    console.log('   Email:', insertData[0].email);

    // Удалим тестовую запись
    await supabase
      .from('hubspot_contacts_raw')
      .delete()
      .eq('hubspot_id', 'test_email_12345');
    console.log('   (тестовая запись удалена)');
  }

  // 3. Проверим реальный контакт из HubSpot, который должен иметь email
  console.log('\n🔍 Проверка реального контакта ID=75055 (должен иметь email)...');

  const { data: realContact, error: selectError } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, firstname, phone')
    .eq('hubspot_id', '75055')
    .single();

  if (selectError) {
    console.log('   Контакт не найден в БД (возможно не синхронизирован)');
  } else {
    console.log('   ID:', realContact.hubspot_id);
    console.log('   Email:', realContact.email || 'NULL ❌');
    console.log('   Name:', realContact.firstname);
    console.log('   Phone:', realContact.phone);
  }

  // 4. ДИАГНОЗ
  console.log('\n═══════════════════════════════════════════════');
  console.log('ДИАГНОЗ:');
  console.log('═══════════════════════════════════════════════\n');

  if (!insertError) {
    console.log('✅ Таблица МОЖЕТ принимать email');
    console.log('❌ Проблема в sync script:');
    console.log('');
    console.log('   Возможные причины:');
    console.log('   1. Sync script НЕ запрашивает email из HubSpot');
    console.log('   2. Sync script запрашивает, но НЕ сохраняет');
    console.log('   3. Email извлекается из неправильного поля');
    console.log('');
    console.log('📝 Решение:');
    console.log('   1. Проверить src/hubspot/sync-parallel.js строка ~129');
    console.log('   2. Убедиться что email в списке properties (строка ~117)');
    console.log('   3. Re-sync контактов: node src/hubspot/sync-parallel.js');
  } else {
    console.log('❌ Таблица НЕ МОЖЕТ принимать email');
    console.log('   Нужно исправить схему БД');
  }

  console.log('═══════════════════════════════════════════════');
}

testEmailInsert().catch(console.error);
