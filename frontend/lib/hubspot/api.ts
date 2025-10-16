// HubSpot API Client for TypeScript

import type {
  HubSpotContact,
  HubSpotDeal,
  HubSpotCall,
  HubSpotPaginatedResponse,
  ObjectType,
} from '@/types/hubspot';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

if (!HUBSPOT_API_KEY) {
  throw new Error('HUBSPOT_API_KEY is not defined in environment variables');
}

async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  const requestOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`HubSpot API request failed: ${endpoint}`, error);
    throw error;
  }
}

export async function fetchAllContacts(
  properties: string[] = [],
  includeAssociations: string[] = []
): Promise<HubSpotContact[]> {
  let allContacts: HubSpotContact[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;

  console.log('📡 Fetching contacts from HubSpot...');

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/contacts?limit=100&archived=false`;

    if (properties.length > 0) {
      endpoint += `&properties=${properties.join(',')}`;
    }

    if (includeAssociations.length > 0) {
      endpoint += `&associations=${includeAssociations.join(',')}`;
    }

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeRequest<HubSpotPaginatedResponse<HubSpotContact>>(endpoint);
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

export async function fetchAllDeals(
  properties: string[] = [],
  includeAssociations: string[] = []
): Promise<HubSpotDeal[]> {
  let allDeals: HubSpotDeal[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;

  console.log('📡 Fetching deals from HubSpot...');

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/deals?limit=100&archived=false`;

    if (properties.length > 0) {
      endpoint += `&properties=${properties.join(',')}`;
    }

    if (includeAssociations.length > 0) {
      endpoint += `&associations=${includeAssociations.join(',')}`;
    }

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeRequest<HubSpotPaginatedResponse<HubSpotDeal>>(endpoint);
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

export async function fetchAllCalls(
  properties: string[] = [],
  includeAssociations: string[] = []
): Promise<HubSpotCall[]> {
  let allCalls: HubSpotCall[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;

  console.log('📡 Fetching calls from HubSpot...');

  while (hasMore) {
    pageCount++;
    let endpoint = `/crm/v3/objects/calls?limit=100&archived=false`;

    if (properties.length > 0) {
      endpoint += `&properties=${properties.join(',')}`;
    }

    if (includeAssociations.length > 0) {
      endpoint += `&associations=${includeAssociations.join(',')}`;
    }

    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await makeRequest<HubSpotPaginatedResponse<HubSpotCall>>(endpoint);
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

// Properties to fetch for each object type
export const CONTACT_PROPERTIES = [
  'email',
  'phone',
  'firstname',
  'lastname',
  'createdate',
  'lifecyclestage',
  'sales_script_version',
  'vsl_watched',
  'vsl_watch_duration',
  'hubspot_owner_id',
];

export const DEAL_PROPERTIES = [
  'amount',
  'dealstage',
  'dealname',
  'createdate',
  'closedate',
  'qualified_status',
  'trial_status',
  'payment_status',
  'number_of_installments__months',
  'cancellation_reason',
  'is_refunded',
  'installment_plan',
  'upfront_payment',
  'offer_given',
  'offer_accepted',
  'hubspot_owner_id',
];

export const CALL_PROPERTIES = [
  'hs_call_duration',
  'hs_call_direction',
  'hs_call_to_number',
  'hs_call_from_number',
  'hs_timestamp',
  'hs_call_disposition',
  'hs_call_status',
];

// Associations to include
export const CONTACT_ASSOCIATIONS = ['deals', 'calls'];
export const DEAL_ASSOCIATIONS = ['contacts'];
export const CALL_ASSOCIATIONS = []; // Calls don't have associations in API

/**
 * Search API: Fetch contacts modified since a specific date (incremental sync)
 * Uses HubSpot Search API with hs_lastmodifieddate filter
 */
export async function searchContactsByDate(
  since: Date,
  properties: string[] = CONTACT_PROPERTIES
): Promise<HubSpotContact[]> {
  console.log(`📡 Searching contacts modified since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'hs_lastmodifieddate',
            operator: 'GTE',
            value: since.getTime().toString(), // Unix timestamp in milliseconds
          },
        ],
      },
    ],
    properties,
    limit: 100,
  };

  let allContacts: HubSpotContact[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeRequest<HubSpotPaginatedResponse<HubSpotContact>>(
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

  console.log(`✅ Found ${allContacts.length} contacts modified since ${since.toISOString()}\n`);
  return allContacts;
}

/**
 * Search API: Fetch deals modified since a specific date (incremental sync)
 * Uses HubSpot Search API with hs_lastmodifieddate filter
 */
export async function searchDealsByDate(
  since: Date,
  properties: string[] = DEAL_PROPERTIES
): Promise<HubSpotDeal[]> {
  console.log(`📡 Searching deals modified since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'hs_lastmodifieddate',
            operator: 'GTE',
            value: since.getTime().toString(),
          },
        ],
      },
    ],
    properties,
    limit: 100,
  };

  let allDeals: HubSpotDeal[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeRequest<HubSpotPaginatedResponse<HubSpotDeal>>(
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

  console.log(`✅ Found ${allDeals.length} deals modified since ${since.toISOString()}\n`);
  return allDeals;
}

/**
 * Search API: Fetch calls created since a specific date (incremental sync)
 * Note: Calls use hs_timestamp (creation date) instead of hs_lastmodifieddate
 */
export async function searchCallsByDate(
  since: Date,
  properties: string[] = CALL_PROPERTIES
): Promise<HubSpotCall[]> {
  console.log(`📡 Searching calls created since ${since.toISOString()}...`);

  const searchPayload = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'hs_timestamp',
            operator: 'GTE',
            value: since.getTime().toString(),
          },
        ],
      },
    ],
    properties,
    limit: 100,
  };

  let allCalls: HubSpotCall[] = [];
  let after: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const payload = after ? { ...searchPayload, after } : searchPayload;

    const response = await makeRequest<HubSpotPaginatedResponse<HubSpotCall>>(
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

  console.log(`✅ Found ${allCalls.length} calls created since ${since.toISOString()}\n`);
  return allCalls;
}
