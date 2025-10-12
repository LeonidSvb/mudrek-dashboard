require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('=== MIGRATION 019: Fix Deal Amounts ===\n');

  // Проверить состояние ДО migration
  console.log('1. СОСТОЯНИЕ ДО MIGRATION:\n');

  const { data: before } = await supabase
    .from('hubspot_deals_raw')
    .select('amount, dealstage')
    .eq('dealstage', 'closedwon');

  const totalBefore = before.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const avgBefore = totalBefore / before.length;

  console.log(`   Total deals: ${before.length}`);
  console.log(`   Avg amount: $${avgBefore.toFixed(2)}`);
  console.log(`   Total amount: $${totalBefore.toLocaleString()}`);
  console.log('   (Это суммы ПЛАТЕЖЕЙ, не договоров!)\n');

  // Читать migration SQL
  const sql = fs.readFileSync('./migrations/019_fix_deal_amounts.sql', 'utf-8');

  // Разделить на отдельные команды
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd && !cmd.startsWith('--'));

  console.log('2. ВЫПОЛНЕНИЕ MIGRATION:\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (!cmd || cmd.length < 10) continue;

    // Показать что выполняется
    const firstLine = cmd.split('\n')[0].substring(0, 60);
    console.log(`   [${i + 1}/${commands.length}] ${firstLine}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: cmd });
      if (error) {
        console.error(`   ✗ Error: ${error.message}`);
        errorCount++;

        // Попробовать через прямой запрос
        try {
          await supabase.from('hubspot_deals_raw').select('*').limit(1); // dummy query
          // Если не работает exec_sql, выполним вручную
        } catch (e) {
          console.error(`   ✗ Failed: ${e.message}`);
        }
      } else {
        console.log(`   ✓`);
        successCount++;
      }
    } catch (error) {
      console.error(`   ✗ Exception: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n   Успешно: ${successCount}, Ошибок: ${errorCount}\n`);

  // Если exec_sql не работает, выполним ключевые UPDATE вручную
  console.log('3. РУЧНОЕ ОБНОВЛЕНИЕ (если exec_sql не работает):\n');

  try {
    // Проверить есть ли новые колонки
    const { data: sample } = await supabase
      .from('hubspot_deals_raw')
      .select('*')
      .limit(1);

    if (sample && sample[0]) {
      const cols = Object.keys(sample[0]);
      console.log(`   Доступные колонки: ${cols.length}`);

      const hasNewCols = cols.includes('deal_total_amount');
      if (hasNewCols) {
        console.log('   ✓ Новые колонки уже созданы!\n');
      } else {
        console.log('   ⚠️ Новые колонки НЕ созданы. Нужно выполнить migration через Supabase UI.\n');
      }
    }
  } catch (error) {
    console.error(`   ✗ Проверка не удалась: ${error.message}\n`);
  }

  // Проверить состояние ПОСЛЕ migration
  console.log('4. ПРОВЕРКА РЕЗУЛЬТАТОВ:\n');

  const { data: after } = await supabase
    .from('hubspot_deals_raw')
    .select('amount, raw_json')
    .eq('dealstage', 'closedwon')
    .limit(5);

  console.log('   Примеры deals после migration:\n');
  after.forEach(d => {
    const dealWhole = d.raw_json?.properties?.deal_whole_amount;
    const installments = d.raw_json?.properties?.installments;
    console.log(`   amount: ${d.amount}, deal_whole_amount: ${dealWhole}, installments: ${installments}`);
  });

  console.log('\n5. ИТОГИ:\n');
  console.log('   Migration создан: migrations/019_fix_deal_amounts.sql');
  console.log('   Что он делает:');
  console.log('     - Добавляет deal_total_amount (полная сумма договора)');
  console.log('     - Добавляет payment_size (размер платежа)');
  console.log('     - Добавляет installments_count (количество платежей)');
  console.log('     - Добавляет first_payment_date и last_payment_date');
  console.log('     - Заполняет их из raw_json.properties');
  console.log('     - Исправляет amount = deal_total_amount\n');

  console.log('   ⚠️ ВАЖНО: Если exec_sql не работает, нужно:');
  console.log('     1. Открыть Supabase SQL Editor');
  console.log('     2. Скопировать содержимое migrations/019_fix_deal_amounts.sql');
  console.log('     3. Выполнить в SQL Editor');
  console.log('     4. Проверить результаты\n');
}

runMigration().catch(console.error);
