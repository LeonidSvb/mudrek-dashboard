// Sync Logger for HubSpot → Supabase synchronization
// Logs to Supabase sync_logs table

import { createClient } from '@supabase/supabase-js';
import type { ObjectType, SyncLog } from '@/types/hubspot';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface SyncLogData {
  object_type: ObjectType;
  records_fetched?: number;
  records_inserted?: number;
  records_updated?: number;
  records_failed?: number;
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
  triggered_by?: 'cron' | 'manual' | 'api';
  metadata?: Record<string, any>;
}

export class SyncLogger {
  private logId: number | null = null;
  private batchId: string | null = null;
  private startTime: number = 0;

  async start(
    objectType: ObjectType,
    triggeredBy: 'cron' | 'manual' | 'api' = 'manual',
    batchId?: string
  ): Promise<{ logId: number; batchId: string }> {
    this.startTime = Date.now();

    const insertData: any = {
      object_type: objectType,
      status: 'success',
      triggered_by: triggeredBy,
      sync_started_at: new Date().toISOString(),
    };

    // Explicitly set batch_id if provided (important: must be set explicitly, not via spread)
    if (batchId) {
      insertData.batch_id = batchId;
    }

    const { data, error } = await supabase
      .from('sync_logs')
      .insert(insertData)
      .select('id, batch_id')
      .single();

    if (error) {
      console.error('Failed to create sync log:', error);
      throw error;
    }

    this.logId = data.id;
    this.batchId = data.batch_id;
    console.log(`\n🚀 Sync started: ${objectType} (log_id: ${this.logId}, batch: ${this.batchId?.slice(0, 8)}...)`);

    if (!this.logId || !this.batchId) {
      throw new Error('Failed to create sync log: missing id or batch_id');
    }

    return { logId: this.logId, batchId: this.batchId };
  }

  getBatchId(): string | null {
    return this.batchId;
  }

  async complete(data: Omit<SyncLogData, 'object_type'>): Promise<void> {
    if (!this.logId) {
      console.error('Cannot complete sync: no log ID');
      return;
    }

    const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const { error } = await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        records_fetched: data.records_fetched || 0,
        records_inserted: data.records_inserted || 0,
        records_updated: data.records_updated || 0,
        records_failed: data.records_failed || 0,
        status: data.status,
        error_message: data.error_message || null,
        metadata: data.metadata || null,
      })
      .eq('id', this.logId);

    if (error) {
      console.error('Failed to update sync log:', error);
      return;
    }

    const statusEmoji = data.status === 'success' ? '✅' : data.status === 'partial' ? '⚠️' : '❌';

    console.log(`\n${statusEmoji} Sync completed (${durationSeconds}s):`);
    console.log(`   Fetched: ${data.records_fetched || 0}`);
    console.log(`   Inserted: ${data.records_inserted || 0}`);
    console.log(`   Updated: ${data.records_updated || 0}`);
    console.log(`   Failed: ${data.records_failed || 0}`);
    if (data.error_message) {
      console.log(`   Error: ${data.error_message}`);
    }
  }

  async error(errorMessage: string): Promise<void> {
    if (!this.logId) {
      console.error('Cannot log error: no log ID');
      return;
    }

    const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

    await supabase
      .from('sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', this.logId);

    console.error(`\n❌ Sync failed (${durationSeconds}s): ${errorMessage}`);
  }
}

// Utility functions

export async function getRecentSyncLogs(limit = 10): Promise<SyncLog[]> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('sync_started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch sync logs:', error);
    return [];
  }

  return data || [];
}

export async function getSyncStats(objectType?: ObjectType) {
  let query = supabase
    .from('sync_logs')
    .select('*')
    .order('sync_started_at', { ascending: false });

  if (objectType) {
    query = query.eq('object_type', objectType);
  }

  const { data, error } = await query.limit(100);

  if (error || !data) {
    return null;
  }

  const total = data.length;
  const successful = data.filter(log => log.status === 'success').length;
  const failed = data.filter(log => log.status === 'failed').length;
  const partial = data.filter(log => log.status === 'partial').length;

  const avgDuration = data.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / total;

  const totalFetched = data.reduce((sum, log) => sum + (log.records_fetched || 0), 0);
  const totalInserted = data.reduce((sum, log) => sum + (log.records_inserted || 0), 0);
  const totalUpdated = data.reduce((sum, log) => sum + (log.records_updated || 0), 0);
  const totalFailed = data.reduce((sum, log) => sum + (log.records_failed || 0), 0);

  return {
    total_syncs: total,
    successful,
    failed,
    partial,
    success_rate: (successful / total) * 100,
    avg_duration_seconds: Math.round(avgDuration),
    total_records_fetched: totalFetched,
    total_records_inserted: totalInserted,
    total_records_updated: totalUpdated,
    total_records_failed: totalFailed,
    last_sync: data[0]?.sync_started_at,
  };
}
