require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function inspectRawJson() {
  console.log('🔍 Инспекция raw_json структуры\n');
  console.log('═══════════════════════════════════════════════\n');

  // Возьмем контакт с email из HubSpot
  const { data } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, phone, raw_json')
    .eq('hubspot_id', '162944314788')
    .single();

  console.log('📊 Контакт ID:', data.hubspot_id);
  console.log('📧 Email колонка:', data.email || 'NULL');
  console.log('📱 Phone:', data.phone);
  console.log('');

  if (!data.raw_json || Object.keys(data.raw_json).length === 0) {
    console.log('❌ raw_json ПУСТОЙ!');
    console.log('');
    console.log('Это значит что при sync:');
    console.log('  1. Либо не запросили properties из HubSpot');
    console.log('  2. Либо сохранили только extractd поля');
    return;
  }

  const keys = Object.keys(data.raw_json);
  console.log('📦 raw_json содержит полей:', keys.length);
  console.log('');

  // Ищем все поля связанные с email
  console.log('🔍 Поиск email полей:\n');
  const emailKeys = keys.filter(k =>
    k.toLowerCase().includes('email') ||
    k.toLowerCase().includes('mail')
  );

  if (emailKeys.length === 0) {
    console.log('  ❌ НЕТ email полей в raw_json!');
  } else {
    emailKeys.forEach(key => {
      console.log(`  ✓ ${key}: ${data.raw_json[key]}`);
    });
  }

  console.log('');
  console.log('📋 Все поля в raw_json (первые 20):\n');
  keys.slice(0, 20).forEach(key => {
    const value = data.raw_json[key];
    const display = value === null ? 'NULL' :
                    typeof value === 'string' ? value.slice(0, 50) :
                    JSON.stringify(value).slice(0, 50);
    console.log(`  ${key}: ${display}`);
  });

  if (keys.length > 20) {
    console.log(`  ... и еще ${keys.length - 20} полей`);
  }

  console.log('\n═══════════════════════════════════════════════');
}

inspectRawJson().catch(console.error);
