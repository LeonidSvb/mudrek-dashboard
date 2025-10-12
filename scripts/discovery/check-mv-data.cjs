require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkData() {
  console.log('🔍 Проверка данных в Materialized View...\n');

  // 1. Всего звонков в базе
  const { count: totalCalls } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Всего звонков в базе:', totalCalls);

  // 2. Звонков с телефонами
  const { count: callsWithPhone } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true })
    .not('call_to_number', 'is', null);

  console.log('📞 Звонков с телефонами:', callsWithPhone);

  // 3. Всего контактов
  const { count: totalContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  console.log('👥 Всего контактов:', totalContacts);

  // 4. Контактов с телефонами
  const { count: contactsWithPhone } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);

  console.log('📱 Контактов с телефонами:', contactsWithPhone);

  // 5. Записей в call_contact_matches VIEW
  const { count: matchedCalls } = await supabase
    .from('call_contact_matches')
    .select('*', { count: 'exact', head: true });

  console.log('\n🔗 Matched calls (VIEW call_contact_matches):', matchedCalls);

  // 6. Записей в contact_call_stats_mv
  const { count: mvRecords } = await supabase
    .from('contact_call_stats_mv')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Контактов в Materialized View:', mvRecords);

  // 7. Пример данных из MV
  const { data: sampleMV } = await supabase
    .from('contact_call_stats_mv')
    .select('contact_id, total_calls, followup_count')
    .order('total_calls', { ascending: false })
    .limit(5);

  console.log('\n📝 Топ-5 контактов по звонкам:');
  sampleMV.forEach(c => {
    console.log(`  Contact ${c.contact_id}: ${c.total_calls} calls (${c.followup_count} followups)`);
  });

  // 8. Общая статистика из MV
  const { data: stats } = await supabase
    .from('contact_call_stats_mv')
    .select('total_calls')
    .limit(10000);

  if (stats && stats.length > 0) {
    const totalCallsFromMV = stats.reduce((sum, row) => sum + (row.total_calls || 0), 0);
    console.log('\n📈 Сумма звонков из MV:', totalCallsFromMV);
    console.log('   (Должно быть примерно равно matched calls:', matchedCalls + ')');
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════');
  console.log('ДИАГНОЗ:');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('Materialized View показывает КОНТАКТЫ (не звонки)!');
  console.log('');
  console.log('- hubspot_calls_raw = ' + totalCalls + ' звонков ВСЕГО');
  console.log('- call_contact_matches = ' + matchedCalls + ' звонков matched с контактами');
  console.log('- contact_call_stats_mv = ' + mvRecords + ' УНИКАЛЬНЫХ контактов');
  console.log('');
  console.log('Каждая строка в MV = 1 контакт + его aggregated call stats.');
  console.log('Это нормально! VIEW group by contact_id.');
  console.log('');
  console.log('Если ' + mvRecords + ' < ' + contactsWithPhone + ' - значит не все контакты');
  console.log('имеют matched calls (некоторые звонки не matched по телефону).');
  console.log('═══════════════════════════════════════════════');
}

checkData();
