import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

/**
 * Анализируем 200 calls - к чему они привязаны
 */
async function analyzeCallsAssociations() {
  console.log('=== АНАЛИЗ 200 CALLS - К ЧЕМУ ПРИВЯЗАНЫ ===\n');

  let allCalls = [];
  let after = null;
  let pageCount = 0;

  // Получаем 200 calls с associations
  while (allCalls.length < 200) {
    pageCount++;
    let url = `${BASE_URL}/crm/v3/objects/calls?limit=100&associations=contacts,deals`;
    if (after) url += `&after=${after}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    allCalls = allCalls.concat(data.results);

    console.log(`→ Page ${pageCount}: fetched ${data.results.length} calls (total: ${allCalls.length})`);

    if (data.paging?.next && allCalls.length < 200) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  // Обрезаем до 200
  allCalls = allCalls.slice(0, 200);

  console.log(`\n✓ Всего calls для анализа: ${allCalls.length}\n`);

  // Анализируем associations
  let stats = {
    total: allCalls.length,
    hasContacts: 0,
    hasDeals: 0,
    hasBoth: 0,
    hasNone: 0,
    contactsOnly: 0,
    dealsOnly: 0
  };

  const samples = {
    contactsOnly: [],
    dealsOnly: [],
    both: [],
    none: []
  };

  allCalls.forEach(call => {
    const hasContacts = call.associations?.contacts?.results?.length > 0;
    const hasDeals = call.associations?.deals?.results?.length > 0;

    if (hasContacts) stats.hasContacts++;
    if (hasDeals) stats.hasDeals++;

    if (hasContacts && hasDeals) {
      stats.hasBoth++;
      if (samples.both.length < 3) samples.both.push(call);
    } else if (hasContacts && !hasDeals) {
      stats.contactsOnly++;
      if (samples.contactsOnly.length < 3) samples.contactsOnly.push(call);
    } else if (!hasContacts && hasDeals) {
      stats.dealsOnly++;
      if (samples.dealsOnly.length < 3) samples.dealsOnly.push(call);
    } else {
      stats.hasNone++;
      if (samples.none.length < 3) samples.none.push(call);
    }
  });

  // Выводим статистику
  console.log('═══════════════════════════════════════');
  console.log('           СТАТИСТИКА CALLS            ');
  console.log('═══════════════════════════════════════\n');

  console.log(`📊 Всего calls: ${stats.total}\n`);

  console.log('Привязка к objects:');
  console.log(`  📇 Привязаны к CONTACTS: ${stats.hasContacts} (${(stats.hasContacts/stats.total*100).toFixed(1)}%)`);
  console.log(`  💼 Привязаны к DEALS:    ${stats.hasDeals} (${(stats.hasDeals/stats.total*100).toFixed(1)}%)`);
  console.log();

  console.log('Детальная разбивка:');
  console.log(`  📇 Только к CONTACTS:    ${stats.contactsOnly} (${(stats.contactsOnly/stats.total*100).toFixed(1)}%)`);
  console.log(`  💼 Только к DEALS:       ${stats.dealsOnly} (${(stats.dealsOnly/stats.total*100).toFixed(1)}%)`);
  console.log(`  🔗 К ОБОИМ (contacts+deals): ${stats.hasBoth} (${(stats.hasBoth/stats.total*100).toFixed(1)}%)`);
  console.log(`  ❌ НИ К ЧЕМУ:            ${stats.hasNone} (${(stats.hasNone/stats.total*100).toFixed(1)}%)`);

  console.log('\n═══════════════════════════════════════');
  console.log('              ПРИМЕРЫ                  ');
  console.log('═══════════════════════════════════════\n');

  if (samples.contactsOnly.length > 0) {
    console.log('📇 ПРИМЕР: Call привязан только к CONTACT\n');
    const call = samples.contactsOnly[0];
    console.log(`Call ID: ${call.id}`);
    console.log(`Contacts: ${call.associations.contacts.results.length} контакт(ов)`);
    console.log(`Contact IDs: ${call.associations.contacts.results.map(c => c.id).join(', ')}`);
    console.log(`Deals: НЕТ\n`);
  }

  if (samples.dealsOnly.length > 0) {
    console.log('💼 ПРИМЕР: Call привязан только к DEAL\n');
    const call = samples.dealsOnly[0];
    console.log(`Call ID: ${call.id}`);
    console.log(`Contacts: НЕТ`);
    console.log(`Deals: ${call.associations.deals.results.length} сделок`);
    console.log(`Deal IDs: ${call.associations.deals.results.map(d => d.id).join(', ')}\n`);
  }

  if (samples.both.length > 0) {
    console.log('🔗 ПРИМЕР: Call привязан к ОБОИМ (contact + deal)\n');
    const call = samples.both[0];
    console.log(`Call ID: ${call.id}`);
    console.log(`Contacts: ${call.associations.contacts.results.length} контакт(ов)`);
    console.log(`Contact IDs: ${call.associations.contacts.results.map(c => c.id).join(', ')}`);
    console.log(`Deals: ${call.associations.deals.results.length} сделок`);
    console.log(`Deal IDs: ${call.associations.deals.results.map(d => d.id).join(', ')}\n`);
  }

  if (samples.none.length > 0) {
    console.log('❌ ПРИМЕР: Call НЕ привязан ни к чему\n');
    const call = samples.none[0];
    console.log(`Call ID: ${call.id}`);
    console.log(`Associations: НЕТ\n`);
  }

  console.log('═══════════════════════════════════════');
  console.log('              ВЫВОДЫ                   ');
  console.log('═══════════════════════════════════════\n');

  if (stats.hasContacts > stats.total * 0.9) {
    console.log('✅ ВЫВОД: Почти все calls привязаны к CONTACTS');
    console.log('   Рекомендация: Хранить связь call → contact\n');
  }

  if (stats.hasDeals > stats.total * 0.5) {
    console.log('⚠️  ВНИМАНИЕ: Больше 50% calls также привязаны к DEALS');
    console.log('   Рекомендация: Хранить обе связи (call → contact, call → deal)\n');
  }

  if (stats.hasBoth > stats.total * 0.3) {
    console.log('🔗 ВАЖНО: Много calls привязаны к ОБОИМ объектам');
    console.log('   Рекомендация: Использовать JSONB для хранения всех associations\n');
  }

  console.log('\n💡 РЕКОМЕНДАЦИЯ ПО СТРУКТУРЕ ТАБЛИЦЫ:\n');
  console.log('CREATE TABLE hubspot_calls_raw (');
  console.log('    hubspot_id TEXT PRIMARY KEY,');
  console.log('    call_duration INTEGER,');
  console.log('    call_direction TEXT,');
  console.log('    call_timestamp TIMESTAMP,');
  console.log('    raw_json JSONB NOT NULL,  -- содержит associations к contacts И deals');
  console.log('    synced_at TIMESTAMP');
  console.log(');\n');

  console.log('-- Потом можем извлечь связи через SQL:');
  console.log('SELECT ');
  console.log('  hubspot_id,');
  console.log('  raw_json->\'associations\'->\'contacts\'->\'results\'->0->>\'id\' as contact_id,');
  console.log('  raw_json->\'associations\'->\'deals\'->\'results\'->0->>\'id\' as deal_id');
  console.log('FROM hubspot_calls_raw;\n');
}

analyzeCallsAssociations().catch(console.error);
