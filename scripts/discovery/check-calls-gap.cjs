require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCallsGap() {
  console.log('=== ПРОВЕРКА РАЗНИЦЫ В ЗВОНКАХ ===\n');

  // 1. Всего звонков в raw
  const { count: totalRaw } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true });

  console.log(`1. hubspot_calls_raw: ${totalRaw} звонков`);

  // 2. Звонки с телефонами
  const { count: withPhone } = await supabase
    .from('hubspot_calls_raw')
    .select('*', { count: 'exact', head: true })
    .not('call_to_number', 'is', null);

  console.log(`2. Звонки с телефонами: ${withPhone}`);
  console.log(`   Без телефонов: ${totalRaw - withPhone}\n`);

  // 3. Matched в MV
  const { count: matched } = await supabase
    .from('call_contact_matches_mv')
    .select('*', { count: 'exact', head: true });

  console.log(`3. call_contact_matches_mv: ${matched} matched`);
  console.log(`   Потеряно: ${withPhone - matched}\n`);

  // 4. Контакты с телефонами
  const { count: contactsWithPhone } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);

  console.log(`4. Контакты с телефонами: ${contactsWithPhone}\n`);

  // 5. Проверка owner_id у Shadi
  const { data: shadiCalls } = await supabase
    .from('call_contact_matches_mv')
    .select('*')
    .eq('hubspot_owner_id', '682432124')
    .limit(5);

  console.log(`5. У Shadi в MV: ${shadiCalls?.length || 0} примеров`);
  if (shadiCalls && shadiCalls.length > 0) {
    console.log('   Пример:', {
      call_id: shadiCalls[0].call_id,
      contact_id: shadiCalls[0].contact_id,
      owner: shadiCalls[0].hubspot_owner_id
    });
  }

  // 6. Контакты Shadi
  const { count: shadiContacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .eq('hubspot_owner_id', '682432124');

  console.log(`\n6. У Shadi контактов: ${shadiContacts}`);

  console.log('\n=== ВЫВОДЫ ===');
  console.log(`- RAW звонки: ${totalRaw}`);
  console.log(`- Matched в MV: ${matched} (${Math.round(matched/totalRaw*100)}%)`);
  console.log(`- Gap: ${totalRaw - matched} звонков не matched`);
  console.log('\nПричина gap: Не все телефоны звонков есть в контактах');
}

checkCallsGap();
