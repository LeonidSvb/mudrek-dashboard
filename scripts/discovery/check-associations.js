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

async function checkAssociations() {
  console.log('\n=== CHECKING FOR ASSOCIATIONS ===\n');

  // Check if we have association tables
  const tables = ['hubspot_deal_associations', 'hubspot_contact_associations', 'call_associations', 'associations'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✓ Found table: ${table}`);
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // Check calls for any field that might contain deal/contact IDs
  console.log('\n--- Checking calls for ID patterns ---');
  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('raw_json')
    .limit(10);

  if (calls) {
    calls.forEach((call, i) => {
      const json = call.raw_json;
      const keys = Object.keys(json);

      // Look for any keys containing 'deal', 'contact', 'assoc', 'object'
      const relevantKeys = keys.filter(k =>
        k.toLowerCase().includes('deal') ||
        k.toLowerCase().includes('contact') ||
        k.toLowerCase().includes('assoc') ||
        k.toLowerCase().includes('object') ||
        k.toLowerCase().includes('to') ||
        k.toLowerCase().includes('from')
      );

      if (relevantKeys.length > 0) {
        console.log(`\nCall #${i + 1}:`);
        relevantKeys.forEach(key => {
          console.log(`  ${key}: ${json[key]}`);
        });
      }
    });
  }

  // Check disposition values
  console.log('\n--- Checking disposition values ---');
  const { data: dispositions } = await supabase
    .from('hubspot_calls_raw')
    .select('raw_json->hs_call_disposition')
    .not('raw_json->hs_call_disposition', 'is', null)
    .limit(20);

  if (dispositions) {
    const unique = [...new Set(dispositions.map(d => d.hs_call_disposition))];
    console.log('Unique dispositions:', unique);
  }
}

checkAssociations().catch(console.error);
