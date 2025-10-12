require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function auditSchema() {
  console.log('🔍 АУДИТ СТРУКТУРЫ БАЗЫ ДАННЫХ\n');
  console.log('═══════════════════════════════════════════════\n');

  // 1. CONTACTS
  console.log('📊 TABLE: hubspot_contacts_raw\n');

  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('*')
    .limit(1);

  if (contacts && contacts.length > 0) {
    const contact = contacts[0];
    const columns = Object.keys(contact).filter(k => k !== 'raw_json');

    console.log('Текущие колонки:');
    columns.forEach(col => {
      const value = contact[col];
      const type = value === null ? 'NULL' :
                   typeof value === 'number' ? 'number' :
                   typeof value === 'boolean' ? 'boolean' :
                   value instanceof Date ? 'timestamp' : 'text';
      console.log(`  ${col}: ${type}`);
    });

    // Проверим что в raw_json
    if (contact.raw_json?.properties) {
      const props = Object.keys(contact.raw_json.properties);
      console.log(`\nВ raw_json.properties полей: ${props.length}`);
    }
  }

  // 2. DEALS
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('💼 TABLE: hubspot_deals_raw\n');

  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('*')
    .limit(1);

  if (deals && deals.length > 0) {
    const deal = deals[0];
    const columns = Object.keys(deal).filter(k => k !== 'raw_json');

    console.log('Текущие колонки:');
    columns.forEach(col => {
      const value = deal[col];
      const type = value === null ? 'NULL' :
                   typeof value === 'number' ? 'number' :
                   typeof value === 'boolean' ? 'boolean' :
                   value instanceof Date ? 'timestamp' : 'text';
      console.log(`  ${col}: ${type}`);
    });

    if (deal.raw_json?.properties) {
      const props = Object.keys(deal.raw_json.properties);
      console.log(`\nВ raw_json.properties полей: ${props.length}`);
    }
  }

  // 3. CALLS
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('📞 TABLE: hubspot_calls_raw\n');

  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('*')
    .limit(1);

  if (calls && calls.length > 0) {
    const call = calls[0];
    const columns = Object.keys(call).filter(k => k !== 'raw_json');

    console.log('Текущие колонки:');
    columns.forEach(col => {
      const value = call[col];
      const type = value === null ? 'NULL' :
                   typeof value === 'number' ? 'number' :
                   typeof value === 'boolean' ? 'boolean' :
                   value instanceof Date ? 'timestamp' : 'text';
      console.log(`  ${col}: ${type}`);
    });

    if (call.raw_json) {
      const props = Object.keys(call.raw_json);
      console.log(`\nВ raw_json полей: ${props.length}`);
    }
  }

  // 4. Статистика использования колонок
  console.log('\n═══════════════════════════════════════════════');
  console.log('📈 СТАТИСТИКА ЗАПОЛНЕННОСТИ:\n');

  console.log('CONTACTS:');
  const contactStats = await getColumnStats('hubspot_contacts_raw');
  contactStats.forEach(({ column, filled, total, percent }) => {
    const icon = percent === 0 ? '❌' : percent < 50 ? '⚠️' : '✅';
    console.log(`  ${icon} ${column}: ${filled}/${total} (${percent}%)`);
  });

  console.log('\nDEALS:');
  const dealStats = await getColumnStats('hubspot_deals_raw');
  dealStats.forEach(({ column, filled, total, percent }) => {
    const icon = percent === 0 ? '❌' : percent < 50 ? '⚠️' : '✅';
    console.log(`  ${icon} ${column}: ${filled}/${total} (${percent}%)`);
  });

  console.log('\nCALLS:');
  const callStats = await getColumnStats('hubspot_calls_raw');
  callStats.forEach(({ column, filled, total, percent }) => {
    const icon = percent === 0 ? '❌' : percent < 50 ? '⚠️' : '✅';
    console.log(`  ${icon} ${column}: ${filled}/${total} (${percent}%)`);
  });

  console.log('\n═══════════════════════════════════════════════');
}

async function getColumnStats(tableName) {
  const { count: total } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  // Получим колонки
  const { data: sample } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (!sample || sample.length === 0) return [];

  const columns = Object.keys(sample[0]).filter(k =>
    k !== 'id' &&
    k !== 'raw_json' &&
    k !== 'synced_at' &&
    k !== 'updated_at'
  );

  const stats = [];

  for (const column of columns) {
    const { count: filled } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .not(column, 'is', null);

    stats.push({
      column,
      filled,
      total,
      percent: Math.round((filled / total) * 100)
    });
  }

  return stats;
}

auditSchema().catch(console.error);
