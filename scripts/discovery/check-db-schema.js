import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('\n=== CHECKING DATABASE SCHEMA ===\n');

  const tables = ['hubspot_deals_raw', 'hubspot_contacts_raw', 'hubspot_calls_raw'];

  for (const table of tables) {
    console.log(`\n--- ${table.toUpperCase()} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      console.error(`Error: ${error.message}`);
    } else if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`Total columns: ${columns.length}`);
      console.log('Columns:', columns.join(', '));

      console.log('\nSample values:');
      const sample = data[0];
      for (const [key, value] of Object.entries(sample)) {
        const displayValue = value === null ? 'NULL' : String(value).substring(0, 50);
        console.log(`  ${key}: ${displayValue}`);
      }
    } else {
      console.log('No data found');
    }
  }
}

checkSchema().catch(console.error);
