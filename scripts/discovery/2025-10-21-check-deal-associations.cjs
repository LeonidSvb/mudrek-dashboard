require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('Checking Deal → Contact associations...\n');

  // Get sample deals
  const { data: deals } = await supabase
    .from('hubspot_deals_raw')
    .select('hubspot_id, dealname, dealstage, raw_json')
    .eq('dealstage', 'closedwon')
    .limit(10);

  console.log('Sample closed won deals:\n');

  deals.forEach((d, i) => {
    console.log(`${i+1}. ${d.dealname}`);
    console.log(`   Deal ID: ${d.hubspot_id}`);

    if (d.raw_json && d.raw_json.associations) {
      console.log('   Has associations:', Object.keys(d.raw_json.associations).join(', '));

      if (d.raw_json.associations.contacts && d.raw_json.associations.contacts.results) {
        const contactIds = d.raw_json.associations.contacts.results.map(c => c.id);
        console.log(`   Associated Contacts (${contactIds.length}):`, contactIds.slice(0, 3));
      } else {
        console.log('   NO contact associations');
      }
    } else {
      console.log('   NO associations in raw_json');
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\nNow checking if we can get contact owner from associations...\n');

  // Pick first deal with contacts
  const dealWithContacts = deals.find(d =>
    d.raw_json?.associations?.contacts?.results?.length > 0
  );

  if (dealWithContacts) {
    const contactId = dealWithContacts.raw_json.associations.contacts.results[0].id;

    console.log(`Deal: ${dealWithContacts.dealname}`);
    console.log(`First associated contact ID: ${contactId}`);

    // Get contact owner
    const { data: contact } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, firstname, lastname, hubspot_owner_id')
      .eq('hubspot_id', contactId)
      .single();

    if (contact) {
      console.log(`Contact: ${contact.firstname} ${contact.lastname}`);
      console.log(`Contact Owner ID: ${contact.hubspot_owner_id}`);

      // Get owner name
      const ownerMap = {
        '81280578': 'Abd alslam Sharqawi',
        '726197388': 'Mothanna Alawneh',
        '687247262': "Wala' M Hassan",
        '83618074': 'Bisan Jaffari'
      };

      console.log(`Owner: ${ownerMap[contact.hubspot_owner_id] || 'Unknown'}`);
      console.log('\n✅ YES! We can track deals by contact owner!');
    } else {
      console.log('❌ Contact not found in database');
    }
  } else {
    console.log('❌ No deals with contact associations found');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 SOLUTION:');
  console.log('1. Use Deal → Contact association (from raw_json)');
  console.log('2. Get Contact owner_id');
  console.log('3. Calculate metrics by Contact owner, not Deal owner');
  console.log('4. NO custom field needed!');
})();
