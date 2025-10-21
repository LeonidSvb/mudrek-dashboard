require('dotenv').config();

async function getDispositionLabels() {
  const apiKey = process.env.HUBSPOT_API_KEY;

  console.log('🔍 Получаем human-readable названия для disposition UUID\n');

  try {
    // Попытка 1: Через properties API v1
    console.log('📡 Попытка 1: GET /properties/v1/calls/properties/named/hs_call_disposition\n');

    const url1 = 'https://api.hubapi.com/properties/v1/calls/properties/named/hs_call_disposition';
    const response1 = await fetch(url1, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Успех! Данные получены:\n');

      if (data1.options && data1.options.length > 0) {
        console.log('📋 Все доступные Call Outcomes:');
        console.table(data1.options.map(opt => ({
          UUID: opt.value,
          Label: opt.label,
          Description: opt.description || 'N/A',
          Hidden: opt.hidden || false,
          DisplayOrder: opt.displayOrder
        })));

        // Сопоставить с нашими UUID
        console.log('\n🎯 Сопоставление с UUID из БД:\n');
        const ourUUIDs = {
          'f240bbac-87c9-4f6e-bf70-924b57d47db7': { count: 214, avg: '246.7s' },
          '73a0d17f-1163-4015-bdd5-ec830791da20': { count: 264, avg: '38.9s' },
          'b2cf5968-551e-4856-9783-52b3da59a7d0': { count: 22, avg: '36.9s' }
        };

        Object.entries(ourUUIDs).forEach(([uuid, stats]) => {
          const match = data1.options.find(opt => opt.value === uuid);
          if (match) {
            console.log(`${uuid}`);
            console.log(`  → "${match.label}"`);
            console.log(`  → В БД: ${stats.count} звонков, avg ${stats.avg}`);
            console.log('');
          }
        });
      } else {
        console.log('⚠️  Options не найдены в v1 API');
      }
    } else {
      console.log(`❌ v1 API failed: ${response1.status}`);
    }

    // Попытка 2: Через properties API v3
    console.log('\n📡 Попытка 2: GET /crm/v3/properties/calls/hs_call_disposition\n');

    const url2 = 'https://api.hubapi.com/crm/v3/properties/calls/hs_call_disposition';
    const response2 = await fetch(url2, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ v3 API данные:');
      console.log(JSON.stringify(data2, null, 2));
    } else {
      console.log(`❌ v3 API failed: ${response2.status}`);
    }

    // Попытка 3: Через search в Supabase - найти реальные labels
    console.log('\n📡 Попытка 3: Анализ через логику длительности\n');

    console.log('По анализу 500 звонков из БД:');
    console.log('');
    console.log('UUID: f240bbac-87c9-4f6e-bf70-924b57d47db7');
    console.log('  → 214 звонков, avg 246.7s (4+ минуты)');
    console.log('  → Гипотеза: "Connected" или "Answered" ✅');
    console.log('');
    console.log('UUID: 73a0d17f-1163-4015-bdd5-ec830791da20');
    console.log('  → 264 звонка, avg 38.9s (~39 секунд)');
    console.log('  → Гипотеза: "No Answer" или "Busy" ❌');
    console.log('');
    console.log('UUID: b2cf5968-551e-4856-9783-52b3da59a7d0');
    console.log('  → 22 звонка, avg 36.9s (~37 секунд)');
    console.log('  → Гипотеза: "Left Voicemail" или "Failed" ❌');
    console.log('');

    console.log('\n💡 РЕКОМЕНДАЦИЯ:');
    console.log('Использовать UUID f240bbac для определения "connected" звонков');
    console.log('Это самый точный способ, т.к.:');
    console.log('  1. Avg duration 4+ минуты = явно реальный разговор');
    console.log('  2. Не зависит от произвольного threshold (30s, 60s и т.д.)');
    console.log('  3. Менеджеры/система правильно выставляют outcome');
    console.log('');
    console.log('SQL для Pickup Rate:');
    console.log("  pickup_rate = COUNT(*) FILTER (WHERE call_disposition = 'f240bbac-87c9-4f6e-bf70-924b57d47db7')");
    console.log("                / COUNT(*) * 100");
    console.log('');
    console.log('Ожидаемый результат: ~42.8% (214/500)');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

getDispositionLabels();
