require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRealEmail() {
  console.log('🔍 Ищем НАСТОЯЩИЕ emails в raw_json\n');

  const { data } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, email, raw_json')
    .not('email', 'is', null)
    .limit(10);

  console.log('Проверяем 10 контактов:\n');

  data.forEach((c, i) => {
    const column = c.email;
    const emailFromRaw = c.raw_json?.properties?.email;
    const hsFullName = c.raw_json?.properties?.hs_full_name_or_email;

    console.log(`${i+1}. ID ${c.hubspot_id}`);
    console.log(`   email (column): ${column}`);
    console.log(`   raw_json.properties.email: ${emailFromRaw || 'NULL'}`);
    console.log(`   raw_json.properties.hs_full_name_or_email: ${hsFullName}`);
    console.log('');
  });

  // Посчитаем сколько НАСТОЯЩИХ emails
  const realEmails = data.filter(c => c.raw_json?.properties?.email).length;
  console.log(`\n📊 Из 10 контактов:`);
  console.log(`  С настоящим email полем: ${realEmails}`);
  console.log(`  Только с именем: ${10 - realEmails}`);
}

checkRealEmail().catch(console.error);
