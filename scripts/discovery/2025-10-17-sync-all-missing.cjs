// UNIVERSAL SYNC SCRIPT - Sync all missing objects (contacts, deals, calls)
// Run this when incremental sync misses data due to HubSpot Search API indexing delay

const https = require('https');
const crypto = require('crypto');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || 'YOUR_HUBSPOT_API_KEY';
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===== HUBSPOT FETCH FUNCTIONS =====

async function fetchHubSpotObjects(objectType, sinceTimestamp, properties) {
  console.log(`\n📡 Fetching ${objectType} since ${new Date(sinceTimestamp).toISOString()}...\n`);

  let propertyName;
  if (objectType === 'calls') {
    propertyName = 'hs_timestamp'; // Calls use hs_timestamp
  } else {
    propertyName = 'createdate'; // Contacts & Deals use createdate
  }

  const searchPayload = JSON.stringify({
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'hs_lastmodifieddate',
            operator: 'GTE',
            value: sinceTimestamp.toString()
          }
        ]
      },
      {
        filters: [
          {
            propertyName: propertyName,
            operator: 'GTE',
            value: sinceTimestamp.toString()
          }
        ]
      }
    ],
    properties: properties,
    limit: 100
  });

  let allResults = [];
  let after = undefined;
  let pageCount = 0;

  while (true) {
    pageCount++;
    const payload = after ? JSON.parse(searchPayload) : JSON.parse(searchPayload);
    if (after) payload.after = after;

    const response = await httpsPost(
      `https://api.hubapi.com/crm/v3/objects/${objectType}/search`,
      {
        'Authorization': 'Bearer ' + HUBSPOT_API_KEY,
        'Content-Type': 'application/json'
      },
      JSON.stringify(payload)
    );

    const data = await response.json();

    if (!data.results) {
      console.error('Error:', data);
      break;
    }

    allResults = allResults.concat(data.results);
    console.log(`   Page ${pageCount}: +${data.results.length} (Total: ${allResults.length})`);

    if (data.paging && data.paging.next) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  console.log(`✅ Found ${allResults.length} ${objectType}\n`);
  return allResults;
}

// ===== SUPABASE SYNC FUNCTIONS =====

async function syncContactsToSupabase(contacts) {
  if (contacts.length === 0) return true;

  console.log(`💾 Syncing ${contacts.length} contacts to Supabase...\n`);

  const batchId = crypto.randomUUID();

  const transformed = contacts.map(c => ({
    hubspot_id: c.id,
    email: c.properties.email || null,
    phone: c.properties.phone || null,
    firstname: c.properties.firstname || null,
    lastname: c.properties.lastname || null,
    createdate: c.properties.createdate || null,
    lifecyclestage: c.properties.lifecyclestage || null,
    contact_stage: c.properties.contact_stage || null,
    sales_script_version: c.properties.sales_script_version || null,
    vsl_watched: c.properties.vsl_watched === 'true' || c.properties.vsl_watched === '1',
    vsl_watch_duration: c.properties.vsl_watch_duration ? parseInt(c.properties.vsl_watch_duration) : null,
    hubspot_owner_id: c.properties.hubspot_owner_id || null,
    sync_batch_id: batchId,
    raw_json: c
  }));

  const response = await httpsPost(
    SUPABASE_URL + '/rest/v1/hubspot_contacts_raw?on_conflict=hubspot_id',
    {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    JSON.stringify(transformed)
  );

  if (response.ok) {
    console.log(`✅ Synced ${contacts.length} contacts\n`);
    return true;
  } else {
    const error = await response.text();
    console.error(`❌ Failed: ${error}\n`);
    return false;
  }
}

async function syncDealsToSupabase(deals) {
  if (deals.length === 0) return true;

  console.log(`💾 Syncing ${deals.length} deals to Supabase...\n`);

  const batchId = crypto.randomUUID();

  const transformed = deals.map(d => ({
    hubspot_id: d.id,
    amount: d.properties.amount ? parseFloat(d.properties.amount) : null,
    dealstage: d.properties.dealstage || null,
    dealname: d.properties.dealname || null,
    createdate: d.properties.createdate || null,
    closedate: d.properties.closedate || null,
    qualified_status: d.properties.qualified_status || null,
    trial_status: d.properties.trial_status || null,
    payment_status: d.properties.payment_status || null,
    number_of_installments__months: d.properties.number_of_installments__months ? parseInt(d.properties.number_of_installments__months) : null,
    cancellation_reason: d.properties.cancellation_reason || null,
    is_refunded: d.properties.is_refunded === 'true' || d.properties.is_refunded === '1',
    installment_plan: d.properties.installment_plan || null,
    upfront_payment: d.properties.upfront_payment ? parseFloat(d.properties.upfront_payment) : null,
    offer_given: d.properties.offer_given === 'true' || d.properties.offer_given === '1',
    offer_accepted: d.properties.offer_accepted === 'true' || d.properties.offer_accepted === '1',
    hubspot_owner_id: d.properties.hubspot_owner_id || null,
    sync_batch_id: batchId,
    raw_json: d
  }));

  const response = await httpsPost(
    SUPABASE_URL + '/rest/v1/hubspot_deals_raw?on_conflict=hubspot_id',
    {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    JSON.stringify(transformed)
  );

  if (response.ok) {
    console.log(`✅ Synced ${deals.length} deals\n`);
    return true;
  } else {
    const error = await response.text();
    console.error(`❌ Failed: ${error}\n`);
    return false;
  }
}

async function syncCallsToSupabase(calls) {
  if (calls.length === 0) return true;

  console.log(`💾 Syncing ${calls.length} calls to Supabase...\n`);

  const batchId = crypto.randomUUID();

  const transformed = calls.map(c => ({
    hubspot_id: c.id,
    call_duration: c.properties.hs_call_duration ? parseInt(c.properties.hs_call_duration) : null,
    call_direction: c.properties.hs_call_direction || null,
    call_to_number: c.properties.hs_call_to_number || null,
    call_from_number: c.properties.hs_call_from_number || null,
    call_timestamp: c.properties.hs_timestamp || null,
    call_disposition: c.properties.hs_call_disposition || null,
    sync_batch_id: batchId,
    raw_json: c
  }));

  const response = await httpsPost(
    SUPABASE_URL + '/rest/v1/hubspot_calls_raw?on_conflict=hubspot_id',
    {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    JSON.stringify(transformed)
  );

  if (response.ok) {
    console.log(`✅ Synced ${calls.length} calls\n`);
    return true;
  } else {
    const error = await response.text();
    console.error(`❌ Failed: ${error}\n`);
    return false;
  }
}

// ===== MAIN =====

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   UNIVERSAL SYNC - All Missing Data   ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Sync from last successful sync (03:27)
  const sinceTimestamp = new Date('2025-10-17T03:27:55.546Z').getTime();

  // 1. Contacts
  const contacts = await fetchHubSpotObjects(
    'contacts',
    sinceTimestamp,
    ['email', 'phone', 'firstname', 'lastname', 'createdate', 'lifecyclestage', 'contact_stage', 'sales_script_version', 'vsl_watched', 'vsl_watch_duration', 'hubspot_owner_id']
  );
  await syncContactsToSupabase(contacts);

  // 2. Deals
  const deals = await fetchHubSpotObjects(
    'deals',
    sinceTimestamp,
    ['amount', 'dealstage', 'dealname', 'createdate', 'closedate', 'qualified_status', 'trial_status', 'payment_status', 'number_of_installments__months', 'cancellation_reason', 'is_refunded', 'installment_plan', 'upfront_payment', 'offer_given', 'offer_accepted', 'hubspot_owner_id']
  );
  await syncDealsToSupabase(deals);

  // 3. Calls
  const calls = await fetchHubSpotObjects(
    'calls',
    sinceTimestamp,
    ['hs_call_duration', 'hs_call_direction', 'hs_call_to_number', 'hs_call_from_number', 'hs_timestamp', 'hs_call_disposition']
  );
  await syncCallsToSupabase(calls);

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          SYNC COMPLETED! ✅            ║');
  console.log('╚════════════════════════════════════════╝\n');
}

main().catch(console.error);
