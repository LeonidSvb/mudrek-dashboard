require('dotenv').config();

async function checkHubSpotDispositions() {
  const apiKey = process.env.HUBSPOT_API_KEY;

  console.log('🔍 Проверяем HubSpot Call Disposition через API\n');

  try {
    // 1. Получить property metadata для hs_call_disposition
    const propUrl = 'https://api.hubapi.com/properties/v2/calls/properties/named/hs_call_disposition';
    const propResponse = await fetch(propUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!propResponse.ok) {
      throw new Error(`HubSpot API error: ${propResponse.status} ${propResponse.statusText}`);
    }

    const propData = await propResponse.json();

    console.log('📋 Информация о поле hs_call_disposition:\n');
    console.log('Название:', propData.label);
    console.log('Тип:', propData.type);
    console.log('Описание:', propData.description || 'N/A');

    if (propData.options && propData.options.length > 0) {
      console.log('\n✅ Возможные значения (options):');
      console.table(propData.options.map(opt => ({
        value: opt.value,
        label: opt.label,
        description: opt.description || 'N/A',
        displayOrder: opt.displayOrder
      })));

      // Сопоставить с нашими UUID
      console.log('\n🔗 Сопоставление с UUID из нашей БД:');
      const ourUUIDs = [
        { uuid: '73a0d17f-1163-4015-bdd5-ec830791da20', count: 588, percent: 58.8 },
        { uuid: 'f240bbac-87c9-4f6e-bf70-924b57d47db7', count: 378, percent: 37.8 },
        { uuid: 'b2cf5968-551e-4856-9783-52b3da59a7d0', count: 34, percent: 3.4 }
      ];

      ourUUIDs.forEach(item => {
        const match = propData.options.find(opt => opt.value === item.uuid);
        if (match) {
          console.log(`\n${item.uuid}`);
          console.log(`  → Label: "${match.label}"`);
          console.log(`  → В БД: ${item.count} звонков (${item.percent}%)`);
        }
      });

      // Определить что считать "connected"
      console.log('\n💡 РЕКОМЕНДАЦИЯ для Pickup Rate:');
      const connectedOptions = propData.options.filter(opt =>
        opt.label.toLowerCase().includes('connect') ||
        opt.label.toLowerCase().includes('answer') ||
        opt.label.toLowerCase().includes('complete')
      );

      if (connectedOptions.length > 0) {
        console.log('Считать "connected" (pickup):');
        connectedOptions.forEach(opt => {
          const ourData = ourUUIDs.find(u => u.uuid === opt.value);
          console.log(`  - "${opt.label}" (${opt.value})`);
          if (ourData) {
            console.log(`    В БД: ${ourData.count} звонков (${ourData.percent}%)`);
          }
        });
      }
    } else {
      console.log('\n⚠️  Нет доступных options для этого поля через API');
      console.log('Попробуем получить реальный звонок для анализа...\n');

      // Получить один звонок из HubSpot
      const callsUrl = 'https://api.hubapi.com/crm/v3/objects/calls?limit=1&properties=hs_call_disposition,hs_call_status,hs_call_title,hs_call_duration';
      const callsResponse = await fetch(callsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        console.log('📞 Пример звонка из HubSpot:');
        console.log(JSON.stringify(callsData.results[0], null, 2));
      }
    }

    // Альтернативный подход - через CRM Pipeline/Stages API
    console.log('\n\n🔄 Попытка 2: Проверяем через Pipelines API...');
    const pipelinesUrl = 'https://api.hubapi.com/crm/v3/pipelines/calls';
    const pipelinesResponse = await fetch(pipelinesUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (pipelinesResponse.ok) {
      const pipelinesData = await pipelinesResponse.json();
      console.log('Pipelines info:');
      console.log(JSON.stringify(pipelinesData, null, 2));
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
  }
}

checkHubSpotDispositions();
