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

async function inspectRawJson() {
  console.log('\n=== INSPECTING RAW_JSON STRUCTURE ===\n');

  // 1. Check deals raw_json
  console.log('--- DEALS RAW_JSON ---');
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, raw_json')
    .limit(3);

  if (deals && deals.length > 0) {
    console.log(`Sample deal #${deals[0].hubspot_id}:`);
    console.log(JSON.stringify(deals[0].raw_json, null, 2));

    // Save to file for detailed inspection
    fs.writeFileSync(
      path.join(__dirname, 'deal-sample.json'),
      JSON.stringify(deals[0].raw_json, null, 2)
    );
    console.log('\n✓ Saved to deal-sample.json');
  }

  // 2. Check contacts raw_json
  console.log('\n--- CONTACTS RAW_JSON ---');
  const { data: contacts } = await supabase
    .from('hubspot_contacts_raw')
    .select('hubspot_id, raw_json')
    .limit(3);

  if (contacts && contacts.length > 0) {
    console.log(`Sample contact #${contacts[0].hubspot_id}:`);
    console.log(JSON.stringify(contacts[0].raw_json, null, 2));

    fs.writeFileSync(
      path.join(__dirname, 'contact-sample.json'),
      JSON.stringify(contacts[0].raw_json, null, 2)
    );
    console.log('\n✓ Saved to contact-sample.json');
  }

  // 3. Check calls raw_json
  console.log('\n--- CALLS RAW_JSON ---');
  const { data: calls } = await supabase
    .from('hubspot_calls_raw')
    .select('hubspot_id, raw_json')
    .limit(3);

  if (calls && calls.length > 0) {
    console.log(`Sample call #${calls[0].hubspot_id}:`);
    console.log(JSON.stringify(calls[0].raw_json, null, 2));

    fs.writeFileSync(
      path.join(__dirname, 'call-sample.json'),
      JSON.stringify(calls[0].raw_json, null, 2)
    );
    console.log('\n✓ Saved to call-sample.json');
  }

  console.log('\n=== INSPECTION COMPLETE ===');
  console.log('Check scripts/discovery/ for *-sample.json files\n');
}

inspectRawJson().catch(console.error);
