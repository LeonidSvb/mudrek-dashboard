/**
 * Check real column names in hubspot_deals_raw table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './frontend/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Fetching one record from hubspot_deals_raw...\n');

const { data, error } = await supabase
  .from('hubspot_deals_raw')
  .select('*')
  .eq('dealstage', 'closedwon')
  .limit(1);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('No data found');
  process.exit(0);
}

console.log('Available columns (' + Object.keys(data[0]).length + ' total):\n');

const columns = Object.keys(data[0]).sort();

// Group by category
const paymentRelated = columns.filter(c =>
  c.includes('payment') ||
  c.includes('installment') ||
  c.includes('amount')
);

const statusRelated = columns.filter(c =>
  c.includes('status') ||
  c.includes('stage') ||
  c.includes('qualified') ||
  c.includes('trial') ||
  c.includes('offer')
);

const dateRelated = columns.filter(c =>
  c.includes('date') ||
  c.includes('time')
);

console.log('=== PAYMENT/AMOUNT FIELDS ===');
paymentRelated.forEach(c => console.log('  ', c));

console.log('\n=== STATUS/STAGE FIELDS ===');
statusRelated.forEach(c => console.log('  ', c));

console.log('\n=== DATE/TIME FIELDS ===');
dateRelated.forEach(c => console.log('  ', c));

console.log('\n=== ALL COLUMNS (alphabetical) ===');
columns.forEach(c => console.log('  ', c));
