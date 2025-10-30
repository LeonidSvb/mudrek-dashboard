/**
 * HubSpot API Client
 *
 * Shared API functions for fetching data from HubSpot
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

async function makeHubSpotRequest(endpoint, options = {}, retryCount = 0) {
  const url = `https://api.hubapi.com${endpoint}`;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10000;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.warn(`⚠️  Rate limit hit. Waiting ${RETRY_DELAY_MS/1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return makeHubSpotRequest(endpoint, options, retryCount + 1);
      }
      const errorText = await response.text();
      throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`HubSpot API request failed: ${endpoint}`, error);
    throw error;
  }
}

// Incremental sync: search by date
async function searchContactsByDate(since, properties) {
  console.log(`📡 Searching contacts modified/created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [{
          propertyName: 'hs_lastmodifieddate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      },
      {
        filters: [{
          propertyName: 'createdate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      }
    ],
    properties,
    limit: 100,
  };

  let allContacts = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeHubSpotRequest(
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    allContacts = allContacts.concat(response.results);
    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allContacts.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allContacts.length} contacts\n`);
  return allContacts;
}

async function searchDealsByDate(since, properties) {
  console.log(`📡 Searching deals modified/created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [{
          propertyName: 'hs_lastmodifieddate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      },
      {
        filters: [{
          propertyName: 'createdate',
          operator: 'GTE',
          value: since.getTime().toString(),
        }]
      }
    ],
    properties,
    limit: 100,
  };

  let allDeals = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeHubSpotRequest(
      '/crm/v3/objects/deals/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    allDeals = allDeals.concat(response.results);
    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allDeals.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allDeals.length} deals\n`);
  return allDeals;
}

async function searchCallsByDate(since, properties) {
  console.log(`📡 Searching calls created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [{
      filters: [{
        propertyName: 'hs_timestamp',
        operator: 'GTE',
        value: since.getTime().toString(),
      }]
    }],
    properties,
    limit: 100,
  };

  let allCalls = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeHubSpotRequest(
      '/crm/v3/objects/calls/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    allCalls = allCalls.concat(response.results);
    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allCalls.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allCalls.length} calls\n`);
  return allCalls;
}

// Full sync: fetch all records
async function fetchAllContacts(properties) {
  console.log('📡 Fetching ALL contacts from HubSpot...');

  let allContacts = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/contacts?limit=100&archived=false&properties=${properties.join(',')}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeHubSpotRequest(endpoint);
    allContacts = allContacts.concat(response.results);

    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allContacts.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allContacts.length} contacts\n`);
  return allContacts;
}

async function fetchAllDeals(properties) {
  console.log('📡 Fetching ALL deals from HubSpot...');

  let allDeals = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/deals?limit=100&archived=false&properties=${properties.join(',')}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeHubSpotRequest(endpoint);
    allDeals = allDeals.concat(response.results);

    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allDeals.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allDeals.length} deals\n`);
  return allDeals;
}

async function fetchAllCalls(properties) {
  console.log('📡 Fetching ALL calls from HubSpot...');

  let allCalls = [];
  let after = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/calls?limit=100&archived=false&properties=${properties.join(',')}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeHubSpotRequest(endpoint);
    allCalls = allCalls.concat(response.results);

    console.log(`   Page ${pageCount}: +${response.results.length} (Total: ${allCalls.length})`);

    if (response.paging?.next) {
      after = response.paging.next.after;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allCalls.length} calls\n`);
  return allCalls;
}

module.exports = {
  makeHubSpotRequest,
  searchContactsByDate,
  searchDealsByDate,
  searchCallsByDate,
  fetchAllContacts,
  fetchAllDeals,
  fetchAllCalls,
};
