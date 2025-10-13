require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('=== RUNNING MIGRATION 020: Fix Timeline Function Conflict ===\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../../migrations/020_fix_timeline_function_conflict.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Migration SQL:');
  console.log(sql.substring(0, 500) + '...\n');

  // Execute migration
  console.log('Executing migration...\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle();

  if (error) {
    console.error('✗ Migration failed:', error);
    return;
  }

  console.log('✓ Migration executed successfully!\n');

  // Verify only one version exists
  console.log('=== VERIFICATION ===\n');

  const verifySQL = `
    SELECT
      routine_name,
      parameter_name,
      data_type,
      dtd_identifier
    FROM information_schema.parameters
    WHERE specific_schema = 'public'
      AND routine_name = 'get_metrics_timeline'
    ORDER BY ordinal_position;
  `;

  const { data: params } = await supabase.rpc('exec_sql', { sql_query: verifySQL });

  if (params && params.length > 0) {
    console.log('Function parameters:');
    params.forEach(p => {
      console.log(`  ${p.parameter_name}: ${p.data_type} (${p.dtd_identifier})`);
    });
  } else {
    console.log('No function found or verification failed');
  }

  console.log('\n✓ Done! Timeline function conflict should be resolved.');
}

runMigration().catch(console.error);
