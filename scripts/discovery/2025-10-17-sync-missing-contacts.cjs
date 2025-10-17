// SYNC MISSING CONTACTS FROM 17 OCTOBER 2025
// Syncs 11 contacts that were not picked up by incremental sync

const https = require('https');

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
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchContacts() {
  console.log('\n📡 Fetching contacts created since 2025-10-17T03:27:55Z...\n');

  const sinceTimestamp = new Date('2025-10-17T03:27:55.546Z').getTime();

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
            propertyName: 'createdate',
            operator: 'GTE',
            value: sinceTimestamp.toString()
          }
        ]
      }
    ],
    properties: [
      'email', 'phone', 'firstname', 'lastname', 'createdate',
      'lifecyclestage', 'contact_stage', 'sales_script_version',
      'vsl_watched', 'vsl_watch_duration', 'hubspot_owner_id'
    ],
    limit: 100
  });

  const response = await httpsPost(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      'Authorization': 'Bearer ' + HUBSPOT_API_KEY,
      'Content-Type': 'application/json'
    },
    searchPayload
  );

  const data = await response.json();

  if (!data.results) {
    console.error('Error:', data);
    return [];
  }

  console.log('✅ Found ' + data.results.length + ' contacts\n');
  return data.results;
}

async function syncToSupabase(contacts) {
  console.log('💾 Syncing ' + contacts.length + ' contacts to Supabase...\n');

  // Generate proper UUID for batch_id
  const crypto = require('crypto');
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
    console.log('✅ Successfully synced ' + contacts.length + ' contacts to Supabase\n');
    return true;
  } else {
    const error = await response.text();
    console.error('❌ Failed to sync: ' + error + '\n');
    return false;
  }
}

async function main() {
  const contacts = await fetchContacts();

  if (contacts.length > 0) {
    await syncToSupabase(contacts);
  } else {
    console.log('No new contacts to sync\n');
  }

  console.log('Done!');
}

main().catch(console.error);
