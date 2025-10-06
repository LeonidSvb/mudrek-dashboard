import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('=== ТЕСТ ПОДКЛЮЧЕНИЯ К SUPABASE ===\n');

  // Шаг 1: Создание таблицы через SQL
  console.log('Шаг 1: Создание тестовой таблицы...');
  const { data: createData, error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS mcp_test_users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  });

  if (createError) {
    console.log('Таблица уже существует или создана вручную');
  } else {
    console.log('✓ Таблица создана успешно');
  }

  // Шаг 2: Добавление тестовых данных
  console.log('\nШаг 2: Добавление тестовых данных...');
  const testUsers = [
    { name: 'Иван Петров', email: 'ivan.petrov@example.com', role: 'Developer' },
    { name: 'Мария Смирнова', email: 'maria.smirnova@example.com', role: 'Designer' },
    { name: 'Алексей Козлов', email: 'alexey.kozlov@example.com', role: 'Manager' }
  ];

  const { data: insertData, error: insertError } = await supabase
    .from('mcp_test_users')
    .insert(testUsers)
    .select();

  if (insertError) {
    console.error('Ошибка при добавлении:', insertError.message);
  } else {
    console.log('✓ Добавлено записей:', insertData.length);
    console.log(JSON.stringify(insertData, null, 2));
  }

  // Шаг 3: Чтение всех данных
  console.log('\nШаг 3: Чтение всех данных из таблицы...');
  const { data: selectData, error: selectError } = await supabase
    .from('mcp_test_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (selectError) {
    console.error('Ошибка при чтении:', selectError.message);
  } else {
    console.log('✓ Найдено записей:', selectData.length);
    console.log('\nВсе данные в таблице:');
    console.log(JSON.stringify(selectData, null, 2));
  }

  // Шаг 4: Обновление записи
  console.log('\nШаг 4: Обновление первой записи...');
  if (selectData && selectData.length > 0) {
    const { data: updateData, error: updateError } = await supabase
      .from('mcp_test_users')
      .update({ role: 'Senior Developer' })
      .eq('id', selectData[0].id)
      .select();

    if (updateError) {
      console.error('Ошибка при обновлении:', updateError.message);
    } else {
      console.log('✓ Запись обновлена:', updateData);
    }
  }

  console.log('\n=== ТЕСТ ЗАВЕРШЕН УСПЕШНО ===');
  console.log('\nТеперь можно проверить таблицу "mcp_test_users" в Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/pimcijqzezvlhicurbkq/editor');
}

testSupabase().catch(console.error);
