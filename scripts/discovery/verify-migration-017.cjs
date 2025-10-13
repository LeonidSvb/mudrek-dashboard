require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration017() {
  console.log('=== ПРОВЕРКА MIGRATION 017 ===\n');

  // 1. Общая статистика
  const { data: stats, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE hubspot_owner_id IS NOT NULL) as with_owner_in_column,
        COUNT(*) FILTER (WHERE raw_json->'properties'->>'hubspot_owner_id' IS NOT NULL) as with_owner_in_json,
        COUNT(*) FILTER (
          WHERE hubspot_owner_id IS NULL
          AND raw_json->'properties'->>'hubspot_owner_id' IS NOT NULL
        ) as missing_extraction,
        ROUND(
          COUNT(*) FILTER (WHERE hubspot_owner_id IS NOT NULL)::numeric / COUNT(*) * 100,
          1
        ) as percent_with_owner
      FROM hubspot_contacts_raw
    `
  });

  if (error) {
    // Попробуем через прямой запрос
    const { count: total } = await supabase
      .from('hubspot_contacts_raw')
      .select('*', { count: 'exact', head: true });

    const { count: withOwner } = await supabase
      .from('hubspot_contacts_raw')
      .select('*', { count: 'exact', head: true })
      .not('hubspot_owner_id', 'is', null);

    console.log('Статистика owner_id:');
    console.log(`  Всего контактов: ${total}`);
    console.log(`  С owner_id в колонке: ${withOwner} (${(withOwner/total*100).toFixed(1)}%)`);
    console.log(`  БЕЗ owner_id: ${total - withOwner} (${((total-withOwner)/total*100).toFixed(1)}%)\n`);

    // Проверить несколько примеров
    const { data: samples } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, firstname, lastname, hubspot_owner_id, raw_json')
      .is('hubspot_owner_id', null)
      .limit(5);

    console.log('Примеры контактов БЕЗ owner_id в колонке:\n');
    samples.forEach((contact, i) => {
      const ownerInJson = contact.raw_json?.properties?.hubspot_owner_id;
      console.log(`${i + 1}. ${contact.firstname || ''} ${contact.lastname || ''}`);
      console.log(`   hubspot_id: ${contact.hubspot_id}`);
      console.log(`   hubspot_owner_id (column): ${contact.hubspot_owner_id}`);
      console.log(`   hubspot_owner_id (json): ${ownerInJson || 'NULL'}`);

      if (ownerInJson) {
        console.log(`   ❌ ПРОБЛЕМА: owner_id есть в JSON, но НЕ извлечен в колонку!`);
      } else {
        console.log(`   ✓ OK: owner_id действительно отсутствует`);
      }
      console.log('');
    });

    return;
  }

  console.log('Результаты после Migration 017:\n');
  console.log(stats);
}

verifyMigration017();
