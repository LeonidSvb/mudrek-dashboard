import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

/**
 * Анализируем текущие dealstages в HubSpot
 */
async function analyzeDealStages() {
  console.log('=== АНАЛИЗ DEAL STAGES В HUBSPOT ===\n');

  // 1. Получаем все pipelines и их stages
  console.log('📊 Получаем pipelines и stages...\n');

  const pipelinesResponse = await fetch(
    `${BASE_URL}/crm/v3/pipelines/deals`,
    {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const pipelinesData = await pipelinesResponse.json();

  console.log(`✓ Найдено ${pipelinesData.results.length} pipeline(s)\n`);

  pipelinesData.results.forEach(pipeline => {
    console.log(`═══════════════════════════════════════`);
    console.log(`PIPELINE: ${pipeline.label} (ID: ${pipeline.id})`);
    console.log(`═══════════════════════════════════════\n`);

    console.log(`Stages (${pipeline.stages.length} total):\n`);

    pipeline.stages.forEach((stage, index) => {
      console.log(`${index + 1}. ${stage.label}`);
      console.log(`   ID: ${stage.id}`);
      console.log(`   Display order: ${stage.displayOrder}`);
      console.log(`   Metadata:`, stage.metadata);
      console.log();
    });
  });

  // 2. Получаем 100 deals и смотрим какие stages используются
  console.log('\n═══════════════════════════════════════');
  console.log('   СТАТИСТИКА ПО РЕАЛЬНЫМ DEALS        ');
  console.log('═══════════════════════════════════════\n');

  let allDeals = [];
  let after = null;

  while (allDeals.length < 100) {
    let url = `${BASE_URL}/crm/v3/objects/deals?limit=100&properties=dealstage,dealname,amount,pipeline`;
    if (after) url += `&after=${after}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    allDeals = allDeals.concat(data.results);

    if (data.paging?.next && allDeals.length < 100) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  allDeals = allDeals.slice(0, 100);

  console.log(`📊 Проанализировано ${allDeals.length} deals\n`);

  // Подсчет по stages
  const stageCounts = {};
  allDeals.forEach(deal => {
    const stage = deal.properties.dealstage || 'unknown';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  });

  // Сортируем по количеству
  const sortedStages = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('Текущие stages (по частоте использования):\n');
  sortedStages.forEach(([stage, count]) => {
    const percent = (count / allDeals.length * 100).toFixed(1);
    console.log(`  ${stage.padEnd(30)} ${count.toString().padStart(3)} deals (${percent}%)`);
  });

  // 3. Требования клиента
  console.log('\n\n═══════════════════════════════════════');
  console.log('     ТРЕБОВАНИЯ КЛИЕНТА (SHADI)        ');
  console.log('═══════════════════════════════════════\n');

  const clientRequirements = {
    contacts: [
      'New leads (pending to be contacted)',
      'No answer',
      'Wrong number',
      'Disqualified'
    ],
    deals: [
      '1. Qualified to Buy',
      '2. High interest',
      '3. Offer received (pending payment)',
      '4. Closed won (anyone that paid something)',
      '5. Closed lost (not customers, deals cancelled)'
    ],
    retention: [
      'Payment status: Active',
      'Payment status: Paused',
      'Payment status: Stopped',
      'Payment status: Refunded',
      'Payment status: Completed'
    ]
  };

  console.log('🔹 КОНТАКТЫ (должны оставаться в Contacts):');
  clientRequirements.contacts.forEach((stage, i) => {
    console.log(`   ${i + 1}. ${stage}`);
  });

  console.log('\n🔹 СДЕЛКИ (Deal stages):');
  clientRequirements.deals.forEach(stage => {
    console.log(`   ${stage}`);
  });

  console.log('\n🔹 RETENTION (custom properties для Closed Won):');
  clientRequirements.retention.forEach(stage => {
    console.log(`   ${stage}`);
  });

  // 4. Сравнение
  console.log('\n\n═══════════════════════════════════════');
  console.log('           СРАВНЕНИЕ & ВЫВОДЫ          ');
  console.log('═══════════════════════════════════════\n');

  console.log('📋 ЧТО НУЖНО СДЕЛАТЬ:\n');

  console.log('1. ✅ ОСТАВИТЬ в текущем виде:');
  console.log('   - closedwon (→ Closed won)');
  console.log('   - closedlost (→ Closed lost)');
  console.log();

  console.log('2. ➕ ДОБАВИТЬ новые stages:');
  console.log('   - qualified_to_buy (Qualified to Buy)');
  console.log('   - high_interest (High interest)');
  console.log('   - offer_received (Offer received)');
  console.log();

  console.log('3. 🔧 ДОБАВИТЬ custom properties для Retention:');
  console.log('   - payment_status (dropdown):');
  console.log('     * Active');
  console.log('     * Paused');
  console.log('     * Stopped');
  console.log('     * Refunded');
  console.log('     * Completed');
  console.log();

  console.log('4. ℹ️  КОНТАКТЫ (не трогаем, уже правильно):');
  console.log('   - Stages для "New leads", "No answer", "Wrong number", "Disqualified"');
  console.log('   - Остаются в Contacts, не переходят в Deals');
  console.log();

  console.log('📊 ИТОГОВАЯ СТРУКТУРА DEAL PIPELINE:\n');
  console.log('   1. qualified_to_buy      → Qualified to Buy');
  console.log('   2. high_interest         → High interest');
  console.log('   3. offer_received        → Offer received (pending payment)');
  console.log('   4. closedwon             → Closed won');
  console.log('      └─ payment_status field: Active/Paused/Stopped/Refunded/Completed');
  console.log('   5. closedlost            → Closed lost');
  console.log();
}

analyzeDealStages().catch(console.error);
