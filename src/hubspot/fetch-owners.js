import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchOwners() {
  console.log('Получение списка owners из HubSpot...\n');

  try {
    // Fetch owners from HubSpot
    const response = await fetch(`${BASE_URL}/crm/v3/owners?limit=100`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();
    const owners = data.results;

    console.log(`Найдено ${owners.length} owners в HubSpot:\n`);

    // Transform для Supabase
    const transformedOwners = owners.map(owner => ({
      owner_id: owner.id,
      owner_name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email,
      owner_email: owner.email
    }));

    // Показать preview
    transformedOwners.forEach((owner, i) => {
      console.log(`${i + 1}. ${owner.owner_name} (${owner.owner_email}) - ID: ${owner.owner_id}`);
    });

    // Save to Supabase
    console.log('\nСохранение в Supabase...');

    const { data: savedData, error } = await supabase
      .from('hubspot_owners')
      .upsert(transformedOwners, {
        onConflict: 'owner_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Ошибка сохранения:', error.message);
      throw error;
    }

    console.log(`\n✅ Сохранено ${savedData.length} owners в Supabase!`);

    // Check which owners are used
    console.log('\n\nПроверка использования owners:\n');

    const { data: ownerStats } = await supabase
      .from('hubspot_deals_raw')
      .select('hubspot_owner_id')
      .not('hubspot_owner_id', 'is', null);

    const ownerCounts = {};
    ownerStats?.forEach(d => {
      ownerCounts[d.hubspot_owner_id] = (ownerCounts[d.hubspot_owner_id] || 0) + 1;
    });

    console.log('Deals per owner:');
    Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ownerId, count]) => {
        const owner = transformedOwners.find(o => o.owner_id === ownerId);
        console.log(`  ${owner?.owner_name || ownerId}: ${count} deals`);
      });

    console.log('\n\n📝 РЕДАКТИРОВАНИЕ ИМЕН:');
    console.log('Если хочешь изменить имена на русские:');
    console.log('1. Зайди в Supabase Dashboard');
    console.log('2. Открой таблицу hubspot_owners');
    console.log('3. Отредактируй поле owner_name (например: "John Smith" → "Иван Смирнов")');
    console.log('4. Дашборд автоматически покажет новые имена!');

  } catch (error) {
    console.error('\nОшибка:', error.message);
    throw error;
  }
}

fetchOwners().catch(console.error);
