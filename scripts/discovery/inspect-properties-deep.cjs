require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function inspectPropertiesDeep() {
  console.log('🔬 Глубокая инспекция raw_json.properties\n');
  console.log('═══════════════════════════════════════════════\n');

  const { data } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, raw_json')
    .eq('hubspot_id', '162944314788')
    .single();

  console.log('📊 Контакт ID:', data.hubspot_id);
  console.log('📧 Email (column):', data.email || 'NULL');
  console.log('');

  // raw_json верхний уровень
  console.log('📦 raw_json (верхний уровень):');
  Object.keys(data.raw_json).forEach(key => {
    console.log(`  ${key}: ${typeof data.raw_json[key]}`);
  });

  console.log('');

  // Копаемся в properties
  if (data.raw_json.properties) {
    const props = data.raw_json.properties;
    const propKeys = Object.keys(props);

    console.log('📦 raw_json.properties содержит полей:', propKeys.length);
    console.log('');

    // Ищем email
    console.log('🔍 Email поля в properties:\n');
    const emailKeys = propKeys.filter(k =>
      k.toLowerCase().includes('email') ||
      k.toLowerCase().includes('mail')
    );

    if (emailKeys.length === 0) {
      console.log('  ❌ НЕТ email полей!\n');
    } else {
      emailKeys.forEach(key => {
        console.log(`  ✓ ${key}: ${props[key]}`);
      });
      console.log('');
    }

    // Покажем все поля
    console.log('📋 Все поля в properties (первые 30):\n');
    propKeys.slice(0, 30).forEach(key => {
      const value = props[key];
      const display = value === null ? 'NULL' :
                      value === undefined ? 'undefined' :
                      typeof value === 'string' ? value.slice(0, 60) :
                      JSON.stringify(value).slice(0, 60);
      console.log(`  ${key}: ${display}`);
    });

    if (propKeys.length > 30) {
      console.log(`  ... и еще ${propKeys.length - 30} полей`);
    }
  } else {
    console.log('❌ raw_json.properties НЕ СУЩЕСТВУЕТ!');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('🎓 ЧТО ЭТО ЗНАЧИТ:\n');
  console.log('Структура HubSpot API response:');
  console.log('');
  console.log('  {');
  console.log('    id: "162944314788",');
  console.log('    properties: {');
  console.log('      email: "yasmeen@hotmail.com",  ← ТУТ EMAIL!');
  console.log('      phone: "+972...",');
  console.log('      firstname: "...",');
  console.log('      ...');
  console.log('    }');
  console.log('  }');
  console.log('');
  console.log('Наш sync script:');
  console.log('  1. Сохраняет весь response в raw_json');
  console.log('  2. Извлекает contact.properties.email → column email');
  console.log('');
  console.log('Проблема:');
  console.log('  → Если email НЕ был запрошен в properties,');
  console.log('    то его НЕТ ни в raw_json, ни в column');
  console.log('═══════════════════════════════════════════════');
}

inspectPropertiesDeep().catch(console.error);
