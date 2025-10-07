import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findCallAssociations() {
  console.log('\n=== SEARCHING FOR CALL ASSOCIATIONS ===\n');

  // Get full structure of 5 calls
  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('*')
    .limit(5);

  console.log('--- FULL CALL STRUCTURE ---');
  console.log('Table columns:', Object.keys(calls[0]));

  // Save full samples
  fs.writeFileSync(
    path.join(__dirname, 'calls-full-sample.json'),
    JSON.stringify(calls, null, 2)
  );
  console.log('\n✓ Saved 5 full calls to calls-full-sample.json');

  // Check if raw_json has any nested objects
  console.log('\n--- CHECKING RAW_JSON DEPTH ---');
  const firstCall = calls[0].raw_json;
  Object.keys(firstCall).forEach(key => {
    const value = firstCall[key];
    if (value && typeof value === 'object') {
      console.log(`\n${key} (object):`, JSON.stringify(value, null, 2));
    }
  });

  // Now check HubSpot API directly - do we fetch associations?
  console.log('\n--- CHECKING SYNC SCRIPTS ---');
  const syncFiles = [
    '../../scripts/sync-hubspot-calls.js',
    '../../scripts/sync-all.js',
    '../../scripts/fetch-hubspot-calls.js'
  ];

  for (const file of syncFiles) {
    const fullPath = path.resolve(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`\n✓ Found: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check if we fetch associations
      if (content.includes('associations')) {
        console.log('  → Contains "associations" keyword');
        const lines = content.split('\n').filter(l => l.includes('associations'));
        lines.slice(0, 3).forEach(l => console.log('    ' + l.trim()));
      } else {
        console.log('  → No associations fetched');
      }
    }
  }
}

findCallAssociations().catch(console.error);
