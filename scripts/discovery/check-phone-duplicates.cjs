require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDuplicates() {
  console.log('🔍 Проверка дубликатов телефонов...\n');

  // SQL для поиска дубликатов
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        REGEXP_REPLACE(phone, '[^0-9]', '', 'g') as normalized_phone,
        COUNT(*) as contact_count,
        array_agg(hubspot_id) as contact_ids
      FROM hubspot_contacts_raw
      WHERE phone IS NOT NULL
      GROUP BY normalized_phone
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10;
    `
  });

  if (error) {
    console.error('Не могу выполнить через RPC, пробую прямой запрос...');

    // Альтернативный подход - получить все телефоны и анализировать в JS
    const { data: phones } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, phone')
      .not('phone', 'is', null)
      .limit(10000);

    if (phones) {
      const phoneMap = new Map();

      phones.forEach(contact => {
        const normalized = contact.phone.replace(/[^0-9]/g, '');
        if (!phoneMap.has(normalized)) {
          phoneMap.set(normalized, []);
        }
        phoneMap.get(normalized).push(contact.hubspot_id);
      });

      const duplicates = Array.from(phoneMap.entries())
        .filter(([phone, ids]) => ids.length > 1)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10);

      console.log('📊 ТОП-10 дубликатов телефонов:\n');
      duplicates.forEach(([phone, ids], i) => {
        console.log(`${i + 1}. Phone: ${phone}`);
        console.log(`   Контактов: ${ids.length}`);
        console.log(`   IDs: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}\n`);
      });

      console.log('═══════════════════════════════════════════════');
      console.log('ИТОГО:');
      console.log(`- Всего уникальных телефонов: ${phoneMap.size}`);
      console.log(`- Телефонов с дубликатами: ${duplicates.length}`);
      console.log(`- Максимум контактов на 1 номер: ${duplicates[0] ? duplicates[0][1].length : 0}`);
      console.log('═══════════════════════════════════════════════');

      if (duplicates.length > 0) {
        console.log('\n⚠️  ПРОБЛЕМА НАЙДЕНА!');
        console.log('Дубликаты телефонов создают картезианское произведение в JOIN!');
        console.log('\nРЕШЕНИЕ: Использовать DISTINCT ON в VIEW или фильтровать дубликаты.');
      }
    }
  } else {
    console.log('Результат:', data);
  }
}

checkDuplicates();
