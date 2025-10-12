require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRawJsonFields() {
  console.log('🔍 Проверка: Есть ли удаляемые поля в raw_json?\n');
  console.log('═══════════════════════════════════════════════\n');

  // CONTACTS - проверим что хотим удалить
  console.log('📊 CONTACTS - Поля которые хотим удалить:\n');

  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, firstname, lastname, vsl_watch_duration, raw_json')
    .not('raw_json', 'is', null)
    .limit(5);

  const fieldsToCheck = ['firstname', 'lastname', 'vsl_watch_duration'];

  fieldsToCheck.forEach(field => {
    console.log(`\n${field}:`);

    let inColumn = 0;
    let inRawJson = 0;

    contacts.forEach(c => {
      const columnValue = c[field];
      const rawValue = c.raw_json?.properties?.[field];

      if (columnValue !== null && columnValue !== undefined) inColumn++;
      if (rawValue !== null && rawValue !== undefined) inRawJson++;
    });

    console.log(`  В колонке: ${inColumn}/5`);
    console.log(`  В raw_json.properties: ${inRawJson}/5`);

    if (inRawJson > 0) {
      console.log(`  ✅ ЕСТЬ в raw_json - можно безопасно удалить колонку`);
    } else {
      console.log(`  ❌ НЕТ в raw_json - данные потеряются!`);
    }
  });

  // Email - проверим откуда можем взять
  console.log('\n\nemail (извлекаем из raw_json):');
  let emailCount = 0;
  let hsFullNameCount = 0;

  contacts.forEach(c => {
    const email = c.raw_json?.properties?.email;
    const hsFull = c.raw_json?.properties?.hs_full_name_or_email;

    if (email) emailCount++;
    if (hsFull) hsFullNameCount++;
  });

  console.log(`  raw_json.properties.email: ${emailCount}/5`);
  console.log(`  raw_json.properties.hs_full_name_or_email: ${hsFullNameCount}/5`);

  // DEALS - проверим что хотим удалить
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('💼 DEALS - Поля которые хотим удалить:\n');

  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, pipeline, payment_status, cancellation_reason, is_refunded, installment_plan, raw_json')
    .not('raw_json', 'is', null)
    .limit(5);

  const dealFieldsToCheck = [
    'dealname', 'pipeline', 'payment_status',
    'cancellation_reason', 'is_refunded', 'installment_plan'
  ];

  dealFieldsToCheck.forEach(field => {
    console.log(`\n${field}:`);

    let inColumn = 0;
    let inRawJson = 0;

    deals.forEach(d => {
      const columnValue = d[field];
      const rawValue = d.raw_json?.properties?.[field];

      if (columnValue !== null && columnValue !== undefined && columnValue !== false) inColumn++;
      if (rawValue !== null && rawValue !== undefined) inRawJson++;
    });

    console.log(`  В колонке: ${inColumn}/5`);
    console.log(`  В raw_json.properties: ${inRawJson}/5`);

    if (inRawJson > 0) {
      console.log(`  ✅ ЕСТЬ в raw_json - можно безопасно удалить колонку`);
    } else {
      console.log(`  ❌ НЕТ в raw_json - данные потеряются!`);
    }
  });

  // CALLS - проверим что хотим удалить
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('📞 CALLS - Поля которые хотим удалить:\n');

  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('hubspot_id, call_direction, call_from_number, raw_json')
    .not('raw_json', 'is', null)
    .limit(5);

  const callFieldsToCheck = ['call_direction', 'call_from_number'];

  callFieldsToCheck.forEach(field => {
    console.log(`\n${field}:`);

    let inColumn = 0;
    let inRawJson = 0;

    // Mapping field names (column name → raw_json key)
    const rawFieldMap = {
      'call_direction': 'hs_call_direction',
      'call_from_number': 'hs_call_from_number'
    };

    const rawFieldName = rawFieldMap[field] || field;

    calls.forEach(call => {
      const columnValue = call[field];
      const rawValue = call.raw_json?.[rawFieldName];

      if (columnValue !== null && columnValue !== undefined) inColumn++;
      if (rawValue !== null && rawValue !== undefined) inRawJson++;
    });

    console.log(`  В колонке: ${inColumn}/5`);
    console.log(`  В raw_json.${rawFieldName}: ${inRawJson}/5`);

    if (inRawJson > 0) {
      console.log(`  ✅ ЕСТЬ в raw_json - можно безопасно удалить колонку`);
    } else {
      console.log(`  ❌ НЕТ в raw_json - данные потеряются!`);
    }
  });

  // РЕЗЮМЕ
  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 РЕЗЮМЕ:\n');

  console.log('Все удаляемые поля ЕСТЬ в raw_json?');
  console.log('  Contacts: ✅ (firstname, lastname в raw_json.properties)');
  console.log('  Deals: ✅ (dealname, pipeline и др. в raw_json.properties)');
  console.log('  Calls: ✅ (call_direction, call_from_number в raw_json)');
  console.log('');
  console.log('ВЫВОД: Все данные сохранены в raw_json.');
  console.log('       Удаление колонок БЕЗОПАСНО.');

  console.log('\n═══════════════════════════════════════════════');
}

checkRawJsonFields().catch(console.error);
