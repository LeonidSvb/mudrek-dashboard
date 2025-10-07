import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testPhoneMatchingAccuracy() {
  console.log('\n=== TESTING PHONE MATCHING ACCURACY ===\n');

  try {

    // 1. Total stats
    console.log('--- BASIC STATS ---');
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM hubspot_calls_raw) as total_calls,
        (SELECT COUNT(*) FROM hubspot_contacts_raw) as total_contacts,
        (SELECT COUNT(DISTINCT call_to_number) FROM hubspot_calls_raw WHERE call_to_number IS NOT NULL) as unique_call_numbers,
        (SELECT COUNT(DISTINCT phone) FROM hubspot_contacts_raw WHERE phone IS NOT NULL) as unique_contact_phones;
    `);
    console.log(stats.rows[0]);

    // 2. Phone format analysis
    console.log('\n--- PHONE FORMAT PATTERNS ---');
    const formats = await client.query(`
      SELECT
        'Calls with +972' as type,
        COUNT(*) as count
      FROM hubspot_calls_raw
      WHERE call_to_number LIKE '+972%'
      UNION ALL
      SELECT
        'Calls with 0' as type,
        COUNT(*) as count
      FROM hubspot_calls_raw
      WHERE call_to_number LIKE '0%' AND call_to_number NOT LIKE '+%'
      UNION ALL
      SELECT
        'Contacts with +972' as type,
        COUNT(*) as count
      FROM hubspot_contacts_raw
      WHERE phone LIKE '+972%'
      UNION ALL
      SELECT
        'Contacts with 0' as type,
        COUNT(*) as count
      FROM hubspot_contacts_raw
      WHERE phone LIKE '0%' AND phone NOT LIKE '+%';
    `);
    formats.rows.forEach(r => console.log(`${r.type}: ${r.count}`));

    // 3. Check for duplicate phones in contacts
    console.log('\n--- DUPLICATE PHONES IN CONTACTS ---');
    const duplicates = await client.query(`
      SELECT
        phone,
        COUNT(*) as contact_count
      FROM hubspot_contacts_raw
      WHERE phone IS NOT NULL
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY contact_count DESC
      LIMIT 10;
    `);
    console.log(`Total duplicate phones: ${duplicates.rowCount}`);
    if (duplicates.rows.length > 0) {
      console.log('Top duplicates:');
      duplicates.rows.forEach(r => console.log(`  ${r.phone}: ${r.contact_count} contacts`));
    }

    // 4. Test exact matching
    console.log('\n--- EXACT PHONE MATCHING ---');
    const exactMatch = await client.query(`
      SELECT COUNT(DISTINCT c.hubspot_id) as matched_calls
      FROM hubspot_calls_raw c
      INNER JOIN hubspot_contacts_raw ct ON c.call_to_number = ct.phone
      WHERE c.call_to_number IS NOT NULL AND ct.phone IS NOT NULL;
    `);
    const exactMatchRate = (exactMatch.rows[0].matched_calls / stats.rows[0].total_calls * 100).toFixed(2);
    console.log(`Matched calls (exact): ${exactMatch.rows[0].matched_calls} (${exactMatchRate}%)`);

    // 5. Test normalized matching (remove +, spaces, hyphens)
    console.log('\n--- NORMALIZED PHONE MATCHING ---');
    const normalizedMatch = await client.query(`
      SELECT COUNT(DISTINCT c.hubspot_id) as matched_calls
      FROM hubspot_calls_raw c
      INNER JOIN hubspot_contacts_raw ct ON
        REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g') =
        REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
      WHERE c.call_to_number IS NOT NULL AND ct.phone IS NOT NULL;
    `);
    const normalizedMatchRate = (normalizedMatch.rows[0].matched_calls / stats.rows[0].total_calls * 100).toFixed(2);
    console.log(`Matched calls (normalized): ${normalizedMatch.rows[0].matched_calls} (${normalizedMatchRate}%)`);

    // 6. Check calls without contact match
    console.log('\n--- UNMATCHED CALLS ---');
    const unmatched = await client.query(`
      SELECT COUNT(*) as unmatched_calls
      FROM hubspot_calls_raw c
      WHERE c.call_to_number IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM hubspot_contacts_raw ct
        WHERE REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g') =
              REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
      );
    `);
    console.log(`Calls without contact match: ${unmatched.rows[0].unmatched_calls}`);

    // 7. Sample matched data
    console.log('\n--- SAMPLE MATCHED DATA (first 5) ---');
    const samples = await client.query(`
      SELECT
        c.hubspot_id as call_id,
        c.call_to_number,
        ct.hubspot_id as contact_id,
        ct.phone as contact_phone,
        ct.firstname,
        ct.lastname
      FROM hubspot_calls_raw c
      INNER JOIN hubspot_contacts_raw ct ON
        REGEXP_REPLACE(c.call_to_number, '[^0-9]', '', 'g') =
        REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g')
      WHERE c.call_to_number IS NOT NULL
      LIMIT 5;
    `);
    samples.rows.forEach(r => {
      console.log(`\nCall ${r.call_id} → Contact ${r.contact_id}`);
      console.log(`  Call number: ${r.call_to_number}`);
      console.log(`  Contact phone: ${r.contact_phone}`);
      console.log(`  Name: ${r.firstname} ${r.lastname}`);
    });

    // 8. Summary
    console.log('\n=== ACCURACY SUMMARY ===');
    console.log(`Match Rate: ${normalizedMatchRate}%`);
    const improvement = (normalizedMatch.rows[0].matched_calls - exactMatch.rows[0].matched_calls);
    console.log(`Normalization improvement: +${improvement} calls`);

    if (duplicates.rowCount > 0) {
      console.log(`\n⚠️  Warning: ${duplicates.rowCount} duplicate phone numbers in contacts`);
      console.log('   → Multiple contacts may match same call');
    }

    if (parseFloat(normalizedMatchRate) >= 80) {
      console.log(`\n✅ Phone matching is RELIABLE (${normalizedMatchRate}% match rate)`);
    } else if (parseFloat(normalizedMatchRate) >= 60) {
      console.log(`\n⚠️  Phone matching is MODERATE (${normalizedMatchRate}% match rate)`);
    } else {
      console.log(`\n❌ Phone matching is UNRELIABLE (${normalizedMatchRate}% match rate)`);
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testPhoneMatchingAccuracy();
