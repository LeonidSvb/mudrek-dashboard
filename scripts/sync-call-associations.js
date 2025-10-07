import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch associations for a batch of calls
 * Uses HubSpot Associations API v4
 */
async function fetchCallAssociationsBatch(callIds, toObjectType) {
  const url = `${BASE_URL}/crm/v4/associations/calls/${toObjectType}/batch/read`;

  const body = {
    inputs: callIds.map(id => ({ id: String(id) }))
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Failed to fetch ${toObjectType} associations:`, error.message);
    return [];
  }
}

/**
 * Transform associations to database format
 */
function transformAssociations(callId, objectType, associations) {
  if (!associations || associations.length === 0) return [];

  return associations.map(assoc => ({
    call_id: callId,
    object_type: objectType,
    object_id: assoc.toObjectId,
    association_type: assoc.associationTypes?.[0]?.label || `call_to_${objectType}`,
    synced_at: new Date().toISOString()
  }));
}

/**
 * Save associations to Supabase
 */
async function saveAssociations(associations) {
  if (associations.length === 0) return { success: 0, errors: 0 };

  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < associations.length; i += BATCH_SIZE) {
    const batch = associations.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('call_associations')
      .upsert(batch, {
        onConflict: 'call_id,object_type,object_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`  ✗ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      errorCount += batch.length;
    } else {
      console.log(`  ✓ Saved ${batch.length} associations`);
      successCount += batch.length;
    }
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Main sync function
 */
async function syncCallAssociations() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   SYNC CALL ASSOCIATIONS → SUPABASE   ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Step 1: Get all call IDs from Supabase with pagination
  console.log('📋 Fetching call IDs from Supabase...');

  let allCalls = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('hubspot_calls_raw')
      .select('hubspot_id')
      .order('hubspot_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('✗ Failed to fetch calls:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      allCalls = allCalls.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
      console.log(`  → Loaded ${allCalls.length} calls...`);
    } else {
      hasMore = false;
    }
  }

  const callIds = allCalls.map(c => c.hubspot_id);
  console.log(`✓ Found ${callIds.length} calls\n`);

  // Step 2: Fetch associations in batches (HubSpot limit = 100 per request)
  const BATCH_SIZE = 100;
  const allAssociations = [];

  console.log('📡 Fetching associations from HubSpot...');

  for (let i = 0; i < callIds.length; i += BATCH_SIZE) {
    const batch = callIds.slice(i, i + BATCH_SIZE);
    const progress = Math.round((i / callIds.length) * 100);
    console.log(`  → Progress: ${progress}% (${i}/${callIds.length})`);

    // Fetch both contacts and deals associations
    const [contactAssocs, dealAssocs] = await Promise.all([
      fetchCallAssociationsBatch(batch, 'contacts'),
      fetchCallAssociationsBatch(batch, 'deals')
    ]);

    // Transform to database format
    contactAssocs.forEach(result => {
      if (result.from?.id && result.to?.length > 0) {
        const transformed = transformAssociations(result.from.id, 'contact', result.to);
        allAssociations.push(...transformed);
      }
    });

    dealAssocs.forEach(result => {
      if (result.from?.id && result.to?.length > 0) {
        const transformed = transformAssociations(result.from.id, 'deal', result.to);
        allAssociations.push(...transformed);
      }
    });

    // Rate limiting - wait 100ms between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✓ Fetched ${allAssociations.length} total associations`);
  console.log(`  - Contacts: ${allAssociations.filter(a => a.object_type === 'contact').length}`);
  console.log(`  - Deals: ${allAssociations.filter(a => a.object_type === 'deal').length}\n`);

  // Step 3: Save to Supabase
  console.log('💾 Saving associations to Supabase...');
  const result = await saveAssociations(allAssociations);

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            SYNC COMPLETE               ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`✓ Success: ${result.success}`);
  console.log(`✗ Errors: ${result.errors}\n`);
}

// Run
syncCallAssociations().catch(error => {
  console.error('\n✗ Sync failed:', error);
  process.exit(1);
});
