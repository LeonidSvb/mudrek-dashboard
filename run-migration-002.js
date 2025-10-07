import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('Запуск миграции 002_add_owner_columns.sql...\n');

  try {
    // Read SQL file
    const sql = readFileSync('./migrations/002_add_owner_columns.sql', 'utf8');

    // Split by semicolon to execute statement by statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

    console.log(`Выполнение ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (statement.includes('SELECT') && statement.includes('FROM')) {
        // Skip verification queries
        continue;
      }

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { data, error } = await supabase.rpc('exec_sql', { query: statement });

      if (error) {
        // Try direct execution via PostgREST
        console.log('Trying alternative method...');

        // For ALTER TABLE and CREATE TABLE, we need to use Supabase Dashboard
        console.log('\n⚠️  Эту миграцию нужно выполнить в Supabase Dashboard:');
        console.log('1. Зайди: https://supabase.com/dashboard/project/ncsyuddcnnmatzxyjgwp/editor');
        console.log('2. Нажми "SQL Editor"');
        console.log('3. Вставь содержимое migrations/002_add_owner_columns.sql');
        console.log('4. Нажми "Run"');
        console.log('\nИли используй Supabase CLI:');
        console.log('   supabase db push');
        break;
      }
    }

  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

runMigration().catch(console.error);
