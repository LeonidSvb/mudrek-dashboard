require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Email validation regex (простой)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function analyzeEmailQuality() {
  console.log('🔍 Анализ качества email данных\n');
  console.log('═══════════════════════════════════════════════\n');

  // Получить все email (не NULL)
  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, phone, raw_json')
    .not('email', 'is', null)
    .limit(1000);  // Sample 1000 для анализа

  console.log(`📊 Проверяем sample: ${contacts.length} контактов\n`);

  let validEmails = 0;
  let invalidEmails = 0;
  let probablyNames = 0;

  const examples = {
    validEmails: [],
    invalidEmails: [],
    probablyNames: []
  };

  contacts.forEach(contact => {
    const email = contact.email;

    if (EMAIL_REGEX.test(email)) {
      validEmails++;
      if (examples.validEmails.length < 5) {
        examples.validEmails.push(email);
      }
    } else {
      invalidEmails++;

      // Проверим: это имя или что-то другое?
      const hasSpace = email.includes(' ');
      const hasNoAt = !email.includes('@');

      if (hasSpace || hasNoAt) {
        probablyNames++;
        if (examples.probablyNames.length < 5) {
          examples.probablyNames.push(email);
        }
      } else {
        if (examples.invalidEmails.length < 5) {
          examples.invalidEmails.push(email);
        }
      }
    }
  });

  console.log('📈 РЕЗУЛЬТАТЫ:\n');
  console.log(`Всего в sample: ${contacts.length}`);
  console.log(`✅ Валидные emails: ${validEmails} (${(validEmails/contacts.length*100).toFixed(1)}%)`);
  console.log(`❌ Невалидные: ${invalidEmails} (${(invalidEmails/contacts.length*100).toFixed(1)}%)`);
  console.log(`   └─ Из них вероятно имена: ${probablyNames} (${(probablyNames/contacts.length*100).toFixed(1)}%)`);

  console.log('\n📝 ПРИМЕРЫ:\n');

  console.log('✅ Валидные emails (first 5):');
  examples.validEmails.forEach(e => console.log(`  - ${e}`));

  console.log('\n❌ Вероятно имена (first 5):');
  examples.probablyNames.forEach(e => console.log(`  - ${e}`));

  if (examples.invalidEmails.length > 0) {
    console.log('\n⚠️  Другие невалидные (first 5):');
    examples.invalidEmails.forEach(e => console.log(`  - ${e}`));
  }

  // Экстраполируем на весь dataset
  const { count: totalWithEmail } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null);

  const estimatedValid = Math.round((validEmails / contacts.length) * totalWithEmail);
  const estimatedInvalid = Math.round((invalidEmails / contacts.length) * totalWithEmail);

  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 ОЦЕНКА НА ВЕСЬ DATASET:\n');
  console.log(`Всего контактов с email колонкой: ${totalWithEmail}`);
  console.log(`Оценка валидных emails: ~${estimatedValid} (${(validEmails/contacts.length*100).toFixed(1)}%)`);
  console.log(`Оценка невалидных: ~${estimatedInvalid} (${(invalidEmails/contacts.length*100).toFixed(1)}%)`);

  console.log('\n═══════════════════════════════════════════════');
  console.log('🎯 ЧТО ЭТО ЗНАЧИТ:\n');

  if (validEmails / contacts.length > 0.9) {
    console.log('✅ ХОРОШО: >90% данных = валидные emails');
    console.log('   Можно использовать колонку как есть.');
  } else if (validEmails / contacts.length > 0.7) {
    console.log('⚠️  СРЕДНЕ: 70-90% валидные');
    console.log('   Рекомендую: добавить validation при использовании.');
  } else {
    console.log('❌ ПЛОХО: <70% валидные');
    console.log('   Рекомендую: очистить колонку или переименовать.');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('💡 РЕКОМЕНДАЦИИ:\n');

  const validPercent = validEmails / contacts.length;

  if (validPercent < 0.7) {
    console.log('1. SQL для очистки невалидных:');
    console.log('   UPDATE hubspot_contacts_raw');
    console.log("   SET email = NULL");
    console.log("   WHERE email !~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';");
    console.log('');
    console.log('2. Или переименовать колонку:');
    console.log('   ALTER TABLE hubspot_contacts_raw');
    console.log('   RENAME COLUMN email TO email_or_name;');
  } else {
    console.log('Email колонка в порядке. Можно использовать.');
  }

  console.log('\n═══════════════════════════════════════════════');
}

analyzeEmailQuality().catch(console.error);
