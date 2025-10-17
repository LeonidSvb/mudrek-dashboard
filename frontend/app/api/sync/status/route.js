import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/sync/status
 * Получить последние синхронизации
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('id, object_type, batch_id, sync_started_at, sync_completed_at, duration_seconds, records_fetched, records_inserted, records_updated, records_failed, status, triggered_by')
      .order('sync_started_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('❌ Failed to fetch sync logs:', error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
