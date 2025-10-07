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

async function countNonNull(table, column) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .not(column, 'is', null);

  if (error) {
    console.error(`Error checking ${table}.${column}:`, error.message);
    return 0;
  }
  return count || 0;
}

async function checkDataAvailability() {
  console.log('\n=== CHECKING DATA AVAILABILITY ===\n');

  const checks = [
    ['hubspot_deals_raw', 'qualified_status'],
    ['hubspot_deals_raw', 'trial_status'],
    ['hubspot_deals_raw', 'payment_status'],
    ['hubspot_deals_raw', 'number_of_installments__months'],
    ['hubspot_deals_raw', 'cancellation_reason'],
    ['hubspot_deals_raw', 'is_refunded'],
    ['hubspot_deals_raw', 'upfront_payment'],
    ['hubspot_deals_raw', 'offer_given'],
    ['hubspot_deals_raw', 'offer_accepted'],
    ['hubspot_contacts_raw', 'lifecyclestage'],
    ['hubspot_contacts_raw', 'sales_script_version'],
    ['hubspot_contacts_raw', 'vsl_watched'],
    ['hubspot_contacts_raw', 'vsl_watch_duration'],
    ['hubspot_calls_raw', 'call_disposition'],
  ];

  for (const [table, column] of checks) {
    const count = await countNonNull(table, column);
    const status = count > 0 ? '✓' : '✗';
    console.log(`${status} ${table}.${column}: ${count} non-null records`);
  }
}

checkDataAvailability().catch(console.error);
