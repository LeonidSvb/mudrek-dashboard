import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkWrappers() {
  console.log('🔍 Проверяем наличие Supabase Wrappers...\n');

  // Проверка 1: Есть ли extension wrappers?
  const { data: extensions, error: extError } = await supabase
    .from('pg_available_extensions')
    .select('*')
    .eq('name', 'wrappers');

  if (extError) {
    console.log('⚠️  Не удалось проверить extensions:', extError.message);
  } else {
    console.log('📦 Доступные wrappers extensions:', extensions);
  }

  // Проверка 2: Есть ли уже foreign servers?
  const { data: servers, error: serverError } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT
        srvname as server_name,
        fdw.fdwname as fdw_name,
        srvoptions as options
      FROM pg_foreign_server srv
      JOIN pg_foreign_data_wrapper fdw ON srv.srvfdw = fdw.oid
      WHERE srvname LIKE '%hubspot%' OR fdwname LIKE '%wasm%';
    `
  });

  if (serverError) {
    console.log('⚠️  Не удалось проверить foreign servers:', serverError.message);
    console.log('   (Это нормально если RPC функция не создана)\n');
  } else {
    console.log('🌐 HubSpot foreign servers:', servers);
  }

  // Проверка 3: Есть ли foreign tables?
  const { data: tables, error: tablesError } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        foreign_table_catalog,
        foreign_table_schema
      FROM pg_foreign_tables
      WHERE schemaname = 'hubspot' OR tablename LIKE '%hubspot%';
    `
  });

  if (tablesError) {
    console.log('⚠️  Не удалось проверить foreign tables:', tablesError.message);
  } else {
    console.log('📊 HubSpot foreign tables:', tables);
  }

  console.log('\n✅ Проверка завершена');
}

checkWrappers().catch(console.error);
