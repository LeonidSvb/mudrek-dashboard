require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkOwnerId() {
  console.log('🔍 Проверка owner_id в contacts\n');
  console.log('═══════════════════════════════════════════════\n');

  // Получить все контакты
  const { count: total } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  // Owner_id в колонке (не NULL)
  const { count: inColumn } = await supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true })
    .not('hubspot_owner_id', 'is', null);

  // Получить sample для проверки raw_json
  const { data: sample } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, hubspot_owner_id, raw_json')
    .limit(1000);

  let inRawJson = 0;
  let canExtract = 0;

  sample.forEach(contact => {
    const ownerInRaw = contact.raw_json?.properties?.hubspot_owner_id;
    if (ownerInRaw !== null && ownerInRaw !== undefined) {
      inRawJson++;

      // Если в колонке NULL, но в raw_json есть
      if (!contact.hubspot_owner_id) {
        canExtract++;
      }
    }
  });

  // Экстраполируем на весь dataset
  const percentInRaw = (inRawJson / sample.length) * 100;
  const estimatedTotal = Math.round((inRawJson / sample.length) * total);
  const estimatedCanExtract = Math.round((canExtract / sample.length) * total);

  console.log('📊 RESULTS:\n');
  console.log(`Всего контактов: ${total}`);
  console.log('');
  console.log(`Owner_id в колонке: ${inColumn} (${(inColumn/total*100).toFixed(1)}%)`);
  console.log(`Owner_id в raw_json (estimate): ${estimatedTotal} (${percentInRaw.toFixed(1)}%)`);
  console.log('');

  if (estimatedCanExtract > 0) {
    console.log(`⚠️  Можно извлечь: ~${estimatedCanExtract} owner_id из raw_json!\n`);
    console.log('SQL для извлечения:');
    console.log('');
    console.log('UPDATE hubspot_contacts_raw');
    console.log("SET hubspot_owner_id = raw_json->'properties'->>'hubspot_owner_id'");
    console.log('WHERE hubspot_owner_id IS NULL');
    console.log("  AND raw_json->'properties'->>'hubspot_owner_id' IS NOT NULL;");
  } else {
    console.log('✅ Все owner_id уже извлечены из raw_json.');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('📝 ПРИМЕРЫ (first 10):\n');

  const { data: examples } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, hubspot_owner_id, phone, raw_json')
    .limit(10);

  examples.forEach((c, i) => {
    const ownerColumn = c.hubspot_owner_id || 'NULL';
    const ownerRaw = c.raw_json?.properties?.hubspot_owner_id || 'NULL';

    const match = ownerColumn === ownerRaw ? '✅' : '❌';

    console.log(`${i + 1}. ID ${c.hubspot_id}`);
    console.log(`   Column: ${ownerColumn}`);
    console.log(`   Raw_json: ${ownerRaw}`);
    console.log(`   Match: ${match}`);
    console.log('');
  });
}

checkOwnerId().catch(console.error);
