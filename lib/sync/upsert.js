/**
 * Upsert Functions
 *
 * Insert/Update records in Supabase with JSONB merge
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function upsertWithMerge(tableName, records, runId = null) {
  if (records.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const BATCH_SIZE = 500;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  // Get existing records with their raw_json
  const allIds = records.map(r => r.hubspot_id);
  const { data: existingRecords } = await supabase
    .from(tableName)
    .select('hubspot_id, raw_json')
    .in('hubspot_id', allIds);

  const existingMap = new Map(
    (existingRecords || []).map(r => [r.hubspot_id, r.raw_json])
  );

  console.log(`   📊 Existing: ${existingMap.size}, New: ${allIds.length - existingMap.size}`);

  // Merge properties for existing records
  const mergedRecords = records.map(record => {
    const existing = existingMap.get(record.hubspot_id);

    if (existing && existing.properties) {
      // MERGE: старые properties + новые properties
      record.raw_json.properties = {
        ...existing.properties,           // старые поля (сохраняем!)
        ...record.raw_json.properties    // новые поля (перезаписывают старые)
      };
    }

    // Add sync_batch_id if runId is provided
    if (runId) {
      record.sync_batch_id = runId;
    }

    return record;
  });

  // Batch upsert
  for (let i = 0; i < mergedRecords.length; i += BATCH_SIZE) {
    const batch = mergedRecords.slice(i, i + BATCH_SIZE);

    const batchInserts = batch.filter(r => !existingMap.has(r.hubspot_id)).length;
    const batchUpdates = batch.length - batchInserts;

    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'hubspot_id' });

    if (error) {
      console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batchInserts;
      updated += batchUpdates;
      console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${batchInserts} new, ${batchUpdates} updated`);
    }
  }

  return { inserted, updated, failed };
}

async function insertNew(tableName, records, runId = null) {
  if (records.length === 0) return { inserted: 0, updated: 0, failed: 0 };

  const BATCH_SIZE = 500;
  let inserted = 0;
  let failed = 0;

  console.log(`   📊 Inserting ${records.length} new records (calls are immutable)`);

  // Add sync_batch_id if runId is provided
  const recordsWithBatchId = runId
    ? records.map(r => ({ ...r, sync_batch_id: runId }))
    : records;

  // Simple batch insert - calls never update
  for (let i = 0; i < recordsWithBatchId.length; i += BATCH_SIZE) {
    const batch = recordsWithBatchId.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'hubspot_id', ignoreDuplicates: true });

    if (error) {
      console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`   ✅ Batch ${i}-${i + BATCH_SIZE}: ${batch.length} inserted`);
    }
  }

  return { inserted, updated: 0, failed };
}

export {
  upsertWithMerge,
  insertNew,
};
