require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('📦 Applying migration 037: Fix Timeline Timeout\n');

  const sql = fs.readFileSync('migrations/037_fix_timeline_timeout.sql', 'utf8');

  // Remove comments and split by statements
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*') && !line.trim().startsWith('*'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
      console.log(`Executing: CREATE OR REPLACE FUNCTION get_metrics_timeline...`);

      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        console.error('❌ Error:', error.message);
        console.log('\nTrying alternative method...');

        // Just read and log for manual application
        console.log('\n⚠️  Please apply this SQL manually in Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/' + process.env.SUPABASE_URL.split('.')[0].replace('https://', '') + '/sql\n');
        console.log(sql);
        return;
      }

      console.log('✅ Function updated successfully');
    } else if (stmt.includes('COMMENT')) {
      console.log(`Executing: COMMENT...`);
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (!error) {
        console.log('✅ Comment added');
      }
    }
  }

  console.log('\n✅ Migration 037 applied successfully!');
  console.log('\n🧪 Testing timeline function...');

  const { data, error } = await supabase.rpc('get_metrics_timeline', {
    p_owner_id: null,
    p_date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_date_to: new Date().toISOString(),
    p_granularity: 'daily'
  });

  if (error) {
    console.error('❌ Test failed:', error.message);
  } else {
    console.log('✅ Timeline function works!');
    console.log(`   Sales points: ${data.sales?.length || 0}`);
    console.log(`   Calls points: ${data.calls?.length || 0}`);
  }
})();
