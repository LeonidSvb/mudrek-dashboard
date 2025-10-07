import 'dotenv/config';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function checkSyncStatus() {
  console.log('📊 Текущее состояние синхронизации в Supabase:\n');

  const tables = [
    { name: 'hubspot_contacts_raw', label: 'Контакты' },
    { name: 'hubspot_deals_raw', label: 'Сделки' },
    { name: 'hubspot_calls_raw', label: 'Звонки' }
  ];

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?select=count`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'count=exact'
        }
      });

      const range = res.headers.get('content-range');
      const count = range ? range.split('/')[1] : '0';
      console.log(`✅ ${table.label}: ${count} записей`);
    } catch (error) {
      console.log(`❌ ${table.label}: ошибка - ${error.message}`);
    }
  }

  console.log('\n📋 Последние синхронизации:');

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sync_logs?select=*&order=sync_started_at.desc&limit=5`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    const logs = await res.json();

    if (logs && logs.length > 0) {
      logs.forEach(log => {
        const status = log.status === 'success' ? '✅' : '❌';
        console.log(`\n${status} ${log.object_type}`);
        console.log(`   Время: ${new Date(log.sync_started_at).toLocaleString()}`);
        console.log(`   Получено: ${log.records_fetched || 0}`);
        console.log(`   Обновлено: ${log.records_updated || 0}`);
        console.log(`   Ошибок: ${log.records_failed || 0}`);
      });
    } else {
      console.log('Нет записей синхронизации');
    }
  } catch (error) {
    console.log(`Ошибка получения логов: ${error.message}`);
  }
}

checkSyncStatus().catch(console.error);
