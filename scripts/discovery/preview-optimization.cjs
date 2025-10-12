require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function previewOptimization() {
  console.log('🔍 PREVIEW: Что будет удалено/изменено\n');
  console.log('═══════════════════════════════════════════════\n');

  // CONTACTS
  console.log('📊 TABLE: hubspot_contacts_raw\n');

  const contactChanges = [
    { column: 'firstname', action: '🗑️ УДАЛИТЬ', reason: '51% данных, не нужен для метрик' },
    { column: 'lastname', action: '🗑️ УДАЛИТЬ', reason: '0% данных, не используется' },
    { column: 'vsl_watch_duration', action: '🗑️ УДАЛИТЬ', reason: '0% данных, не используется' },
    { column: 'email', action: '✏️ ОБНОВИТЬ', reason: 'Извлечь из raw_json.hs_full_name_or_email' }
  ];

  console.log('Изменения:');
  contactChanges.forEach(({ column, action, reason }) => {
    console.log(`  ${action} ${column}`);
    console.log(`    → ${reason}`);
  });

  // Проверим сколько email извлечётся
  const { data: emailSample } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN raw_json->'properties'->>'hs_full_name_or_email' IS NOT NULL THEN 1 END) as with_email
        FROM hubspot_contacts_raw
      `
    })
    .single();

  if (emailSample) {
    console.log(`\n  ℹ️ Email stats:`);
    console.log(`    Сейчас: 0 (0%)`);
    console.log(`    После: ${emailSample.with_email} (${Math.round(emailSample.with_email / emailSample.total * 100)}%)`);
  }

  console.log('\n  ✅ Останется 11 колонок (было 14)');

  // DEALS
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('💼 TABLE: hubspot_deals_raw\n');

  const dealChanges = [
    { column: 'dealname', action: '🗑️ УДАЛИТЬ', reason: 'Не нужен для метрик' },
    { column: 'pipeline', action: '🗑️ УДАЛИТЬ', reason: 'Не используется' },
    { column: 'payment_status', action: '🗑️ УДАЛИТЬ', reason: '0% данных, не используется' },
    { column: 'cancellation_reason', action: '🗑️ УДАЛИТЬ', reason: '0% данных, не используется' },
    { column: 'is_refunded', action: '🗑️ УДАЛИТЬ', reason: 'Не используется' },
    { column: 'installment_plan', action: '🗑️ УДАЛИТЬ', reason: '0% данных, не используется' }
  ];

  console.log('Изменения:');
  dealChanges.forEach(({ column, action, reason }) => {
    console.log(`  ${action} ${column}`);
    console.log(`    → ${reason}`);
  });

  console.log('\n  ✅ Останется 14 колонок (было 20)');

  // CALLS
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('📞 TABLE: hubspot_calls_raw\n');

  const callChanges = [
    { column: 'call_direction', action: '🗑️ УДАЛИТЬ', reason: 'Не используется' },
    { column: 'call_from_number', action: '🗑️ УДАЛИТЬ', reason: 'Не используется' }
  ];

  console.log('Изменения:');
  callChanges.forEach(({ column, action, reason }) => {
    console.log(`  ${action} ${column}`);
    console.log(`    → ${reason}`);
  });

  console.log('\n  ✅ Останется 7 колонок (было 9)');

  // SUMMARY
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 SUMMARY:\n');

  console.log('Колонок:');
  console.log('  Contacts: 14 → 11 (-3)');
  console.log('  Deals:    20 → 14 (-6)');
  console.log('  Calls:     9 → 7  (-2)');
  console.log('  ВСЕГО:    43 → 32 (-11 колонок, -26%)');

  console.log('\n⚠️ ВАЖНО:');
  console.log('  • Все удалённые данные остаются в raw_json');
  console.log('  • Можно восстановить любую колонку за 5 секунд');
  console.log('  • Backup ОБЯЗАТЕЛЕН перед migration');

  console.log('\n═══════════════════════════════════════════════');
  console.log('📝 NEXT STEPS:\n');

  console.log('1. Сделать backup в Supabase:');
  console.log('   Dashboard → Database → Backups → Create backup\n');

  console.log('2. Запустить migrations (в этом порядке):');
  console.log('   migrations/013_optimize_contacts_table.sql');
  console.log('   migrations/014_optimize_deals_table.sql');
  console.log('   migrations/015_optimize_calls_table.sql\n');

  console.log('3. Проверить dashboard:');
  console.log('   http://localhost:3006/dashboard\n');

  console.log('4. Если что-то не так → rollback из backup');

  console.log('\n═══════════════════════════════════════════════');
}

previewOptimization().catch(console.error);
