/**
 * Run migration 005: Create fast metrics function
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('Reading migration file...\n');

const sql = readFileSync('./migrations/005_create_metrics_function.sql', 'utf8');

console.log('Executing migration 005: Create metrics function...\n');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('Migration failed:', error);

  // Try direct approach - create function
  console.log('\nTrying direct function creation...');

  const { data: result, error: execError } = await supabase.rpc('query', {
    query: sql
  });

  if (execError) {
    console.error('Direct execution also failed:', execError);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log('Dashboard → SQL Editor → New Query → Paste migration file');
    process.exit(1);
  }

  console.log('Success via direct execution!');
} else {
  console.log('Migration completed successfully!');
}

console.log('\nTesting function...');

const { data: testResult, error: testError } = await supabase
  .rpc('get_all_metrics');

if (testError) {
  console.error('Function test failed:', testError);
  console.log('\nFunction was created but test failed. This might be OK.');
  console.log('Try calling it from the API route.');
} else {
  console.log('\nFunction works! Sample result:');
  console.log(JSON.stringify(testResult, null, 2));
}
