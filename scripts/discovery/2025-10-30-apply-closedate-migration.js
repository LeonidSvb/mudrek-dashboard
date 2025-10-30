// Apply closedate migration from CSV data
// Run: node scripts/apply-closedate-migration.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ncsyuddcnnmatzxyjgwp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSV data: email -> {first_payment_date, last_payment_date}
const CSV_DATES = [
  { email: 'Waelmak2@gmail.com', first: '2023-03-20', last: '2023-06-20' },
  { email: 'helana.fee48@icloud.com', first: '2023-03-20', last: '2023-06-20' },
  { email: 'samarqawasmi2019@gmail.com', first: '2023-03-20', last: '2023-06-20' },
  { email: 'julaniebrahim@gmail.com', first: '2023-04-01', last: '2023-04-01' },
  { email: 'b.haj873@gmail.com', first: '2023-04-26', last: '2023-04-26' },
  // ... ADD ALL 550+ RECORDS HERE FROM migrations/UPDATE_DEALS_FROM_CSV.sql
];

async function applyMigration() {
  console.log('\n==========================================');
  console.log('APPLYING CLOSEDATE MIGRATION');
  console.log('==========================================\n');

  try {
    // 1. Get all closedwon deals with their contact emails
    console.log('Step 1: Fetching closedwon deals...');
    const { data: deals, error: dealsError } = await supabase
      .from('hubspot_deals_raw')
      .select('hubspot_id, closedate, raw_json')
      .eq('dealstage', 'closedwon');

    if (dealsError) throw dealsError;
    console.log(`   Found ${deals.length} closedwon deals`);

    // 2. Get all contacts with emails
    console.log('\nStep 2: Fetching contacts...');
    const { data: contacts, error: contactsError } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, email');

    if (contactsError) throw contactsError;
    console.log(`   Found ${contacts.length} contacts`);

    // 3. Create email -> contact_id map
    const emailToContact = new Map();
    contacts.forEach(c => {
      if (c.email) {
        emailToContact.set(c.email.toLowerCase(), c.hubspot_id);
      }
    });

    // 4. Create email -> dates map from CSV
    const emailToDates = new Map();
    CSV_DATES.forEach(row => {
      emailToDates.set(row.email.toLowerCase(), {
        first: row.first,
        last: row.last
      });
    });

    // 5. Update deals
    console.log('\nStep 3: Updating deals with correct closedate...');
    let updated = 0;
    let notFound = 0;

    for (const deal of deals) {
      // Get contact ID from deal associations
      const contactId = deal.raw_json?.associations?.contacts?.results?.[0]?.id;
      if (!contactId) {
        notFound++;
        continue;
      }

      // Find contact email
      const contact = contacts.find(c => c.hubspot_id === contactId);
      if (!contact || !contact.email) {
        notFound++;
        continue;
      }

      // Find dates from CSV
      const dates = emailToDates.get(contact.email.toLowerCase());
      if (!dates) {
        notFound++;
        continue;
      }

      // Update deal
      const { error: updateError } = await supabase
        .from('hubspot_deals_raw')
        .update({
          createdate: dates.first,
          closedate: dates.last,
          updated_at: new Date().toISOString()
        })
        .eq('hubspot_id', deal.hubspot_id);

      if (updateError) {
        console.error(`   Error updating deal ${deal.hubspot_id}:`, updateError.message);
      } else {
        updated++;
        if (updated % 50 === 0) {
          console.log(`   Updated ${updated} deals...`);
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updated} deals`);
    console.log(`   Not found in CSV: ${notFound} deals`);
    console.log(`   Total closedwon: ${deals.length} deals`);

    // 6. Verify results
    console.log('\nStep 4: Verifying results...');
    const { data: verification, error: verifyError } = await supabase
      .from('hubspot_deals_raw')
      .select('closedate')
      .eq('dealstage', 'closedwon')
      .limit(1000);

    if (!verifyError && verification) {
      const uniqueDates = new Set(verification.map(d => d.closedate?.split('T')[0]));
      console.log(`   Unique closedate values: ${uniqueDates.size}`);

      const dates = verification
        .map(d => d.closedate ? new Date(d.closedate) : null)
        .filter(d => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length > 0) {
        console.log(`   Date range: ${dates[0].toISOString().split('T')[0]} to ${dates[dates.length - 1].toISOString().split('T')[0]}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
applyMigration().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
