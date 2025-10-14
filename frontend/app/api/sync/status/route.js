import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/sync/status
 * Получить последние синхронизации
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(10);

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
