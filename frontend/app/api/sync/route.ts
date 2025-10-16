// Sync API Route - HubSpot → Supabase synchronization
// POST /api/sync

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchAllContacts,
  fetchAllDeals,
  fetchAllCalls,
  CONTACT_PROPERTIES,
  DEAL_PROPERTIES,
  CALL_PROPERTIES,
  CONTACT_ASSOCIATIONS,
  DEAL_ASSOCIATIONS,
  CALL_ASSOCIATIONS,
} from '@/lib/hubspot/api';
import { SyncLogger } from '@/lib/logger';
import type {
  HubSpotContact,
  HubSpotDeal,
  HubSpotCall,
  ContactRaw,
  DealRaw,
  CallRaw,
  SyncResult,
} from '@/types/hubspot';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function transformContact(contact: HubSpotContact): Omit<ContactRaw, 'synced_at' | 'updated_at'> {
  const props = contact.properties;

  return {
    hubspot_id: contact.id,
    email: props.email || null,
    phone: props.phone || null,
    firstname: props.firstname || null,
    lastname: props.lastname || null,
    createdate: props.createdate || null,
    lifecyclestage: props.lifecyclestage || null,
    sales_script_version: props.sales_script_version || null,
    vsl_watched: props.vsl_watched === 'true' || props.vsl_watched === '1' ? true : false,
    vsl_watch_duration: props.vsl_watch_duration ? parseInt(props.vsl_watch_duration) : null,
    raw_json: contact,
  };
}

function transformDeal(deal: HubSpotDeal): Omit<DealRaw, 'synced_at' | 'updated_at'> {
  const props = deal.properties;

  return {
    hubspot_id: deal.id,
    amount: props.amount ? parseFloat(props.amount) : null,
    dealstage: props.dealstage || null,
    createdate: props.createdate || null,
    closedate: props.closedate || null,
    qualified_status: props.qualified_status || null,
    trial_status: props.trial_status || null,
    payment_status: props.payment_status || null,
    number_of_installments__months: props.number_of_installments__months
      ? parseInt(props.number_of_installments__months)
      : null,
    cancellation_reason: props.cancellation_reason || null,
    is_refunded: props.is_refunded === 'true' || props.is_refunded === '1' ? true : false,
    installment_plan: props.installment_plan || null,
    upfront_payment: props.upfront_payment ? parseFloat(props.upfront_payment) : null,
    offer_given: props.offer_given === 'true' || props.offer_given === '1' ? true : false,
    offer_accepted: props.offer_accepted === 'true' || props.offer_accepted === '1' ? true : false,
    raw_json: deal,
  };
}

function transformCall(call: HubSpotCall): Omit<CallRaw, 'synced_at' | 'updated_at'> {
  const props = call.properties;

  return {
    hubspot_id: call.id,
    call_duration: props.hs_call_duration ? parseInt(props.hs_call_duration) : null,
    call_direction: props.hs_call_direction || null,
    call_to_number: props.hs_call_to_number || null,
    call_from_number: props.hs_call_from_number || null,
    call_timestamp: props.hs_timestamp || null,
    call_disposition: props.hs_call_disposition || null,
    raw_json: call,
  };
}

async function syncContacts(sessionBatchId: string): Promise<SyncResult> {
  const logger = new SyncLogger();
  const { batchId } = await logger.start('contacts', 'manual', sessionBatchId);

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📇 SYNCING CONTACTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const contacts = await fetchAllContacts(CONTACT_PROPERTIES, CONTACT_ASSOCIATIONS);
    const transformed = contacts.map((c) => ({
      ...transformContact(c),
      sync_batch_id: batchId,
    }));

    const BATCH_SIZE = 500;
    const inserted = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
      const batch = transformed.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('hubspot_contacts_raw')
        .upsert(batch, { onConflict: 'hubspot_id' })
        .select();

      if (error) {
        console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
        failed += batch.length;
      } else {
        // Determine inserts vs updates (simplified - count as updated if exists)
        updated += data.length;
        console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${data.length} records`);
      }
    }

    const result: SyncResult = {
      object_type: 'contacts',
      records_fetched: contacts.length,
      records_inserted: inserted,
      records_updated: updated,
      records_failed: failed,
      status: failed === 0 ? 'success' : failed < contacts.length ? 'partial' : 'failed',
      duration_seconds: 0, // Will be calculated by logger
    };

    await logger.complete(result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logger.error(errorMessage);
    throw error;
  }
}

async function syncDeals(sessionBatchId: string): Promise<SyncResult> {
  const logger = new SyncLogger();
  const { batchId } = await logger.start('deals', 'manual', sessionBatchId);

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💼 SYNCING DEALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deals = await fetchAllDeals(DEAL_PROPERTIES, DEAL_ASSOCIATIONS);
    const transformed = deals.map((d) => ({
      ...transformDeal(d),
      sync_batch_id: batchId,
    }));

    const BATCH_SIZE = 500;
    const inserted = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
      const batch = transformed.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('hubspot_deals_raw')
        .upsert(batch, { onConflict: 'hubspot_id' })
        .select();

      if (error) {
        console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
        failed += batch.length;
      } else {
        updated += data.length;
        console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${data.length} records`);
      }
    }

    const result: SyncResult = {
      object_type: 'deals',
      records_fetched: deals.length,
      records_inserted: inserted,
      records_updated: updated,
      records_failed: failed,
      status: failed === 0 ? 'success' : failed < deals.length ? 'partial' : 'failed',
      duration_seconds: 0,
    };

    await logger.complete(result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logger.error(errorMessage);
    throw error;
  }
}

async function syncCalls(sessionBatchId: string): Promise<SyncResult> {
  const logger = new SyncLogger();
  const { batchId } = await logger.start('calls', 'manual', sessionBatchId);

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📞 SYNCING CALLS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const calls = await fetchAllCalls(CALL_PROPERTIES, CALL_ASSOCIATIONS);
    const transformed = calls.map((c) => ({
      ...transformCall(c),
      sync_batch_id: batchId,
    }));

    const BATCH_SIZE = 500;
    const inserted = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
      const batch = transformed.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('hubspot_calls_raw')
        .upsert(batch, { onConflict: 'hubspot_id' })
        .select();

      if (error) {
        console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
        failed += batch.length;
      } else {
        updated += data.length;
        console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${data.length} records`);
      }
    }

    const result: SyncResult = {
      object_type: 'calls',
      records_fetched: calls.length,
      records_inserted: inserted,
      records_updated: updated,
      records_failed: failed,
      status: failed === 0 ? 'success' : failed < calls.length ? 'partial' : 'failed',
      duration_seconds: 0,
    };

    await logger.complete(result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logger.error(errorMessage);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Generate session-level batch ID (all sync logs in this session share this ID)
    const sessionBatchId = crypto.randomUUID();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║     HUBSPOT → SUPABASE SYNC STARTED      ║');
    console.log(`║     Session Batch: ${sessionBatchId.slice(0, 8)}...       ║`);
    console.log('╚═══════════════════════════════════════════╝\n');

    const [contactsResult, dealsResult, callsResult] = await Promise.allSettled([
      syncContacts(sessionBatchId),
      syncDeals(sessionBatchId),
      syncCalls(sessionBatchId),
    ]);

    const results = {
      contacts: contactsResult.status === 'fulfilled' ? contactsResult.value : null,
      deals: dealsResult.status === 'fulfilled' ? dealsResult.value : null,
      calls: callsResult.status === 'fulfilled' ? callsResult.value : null,
    };

    const totalDuration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║         SYNC COMPLETED SUCCESSFULLY       ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`\n⏱️  Total duration: ${totalDuration}s`);
    console.log(`\n📊 Summary:`);
    if (results.contacts) {
      console.log(`   Contacts: ${results.contacts.records_fetched} fetched, ${results.contacts.records_updated} synced`);
    }
    if (results.deals) {
      console.log(`   Deals: ${results.deals.records_fetched} fetched, ${results.deals.records_updated} synced`);
    }
    if (results.calls) {
      console.log(`   Calls: ${results.calls.records_fetched} fetched, ${results.calls.records_updated} synced`);
    }
    console.log('\n');

    return NextResponse.json({
      success: true,
      results,
      total_duration_seconds: totalDuration,
    });

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
