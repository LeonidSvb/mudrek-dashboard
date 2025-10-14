import { syncAllIncremental } from '../../../src/hubspot/sync-incremental.js';

/**
 * POST /api/sync
 * Ручной запуск инкрементальной синхронизации
 */
export async function POST(request) {
  try {
    console.log('🔄 Manual sync triggered from dashboard');

    const startTime = Date.now();
    const result = await syncAllIncremental();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return Response.json({
      success: true,
      duration: `${duration}s`,
      result
    });
  } catch (error) {
    console.error('❌ Sync failed:', error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
