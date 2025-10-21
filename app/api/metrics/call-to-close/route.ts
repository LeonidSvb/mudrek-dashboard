/**
 * CALL-TO-CLOSE METRICS API ENDPOINT
 *
 * GET /api/metrics/call-to-close
 *
 * Returns call-to-close conversion metrics for sales managers
 * Automatically determines closing manager from last call before deal close
 *
 * Query Parameters:
 * - owner_id: Filter by specific sales manager (optional)
 * - date_from: Start date filter (optional, ISO format)
 * - date_to: End date filter (optional, ISO format)
 *
 * Example:
 * GET /api/metrics/call-to-close?owner_id=687247262
 * GET /api/metrics/call-to-close?date_from=2025-09-01&date_to=2025-09-30
 *
 * Response: Array of metrics per owner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCallToCloseMetrics } from '@/lib/db/metrics-fast';
import { getLogger } from '@/lib/app-logger';

const logger = getLogger('call-to-close-api');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('owner_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    logger.info('Fetching call-to-close metrics', { ownerId, dateFrom, dateTo });

    const metrics = await getCallToCloseMetrics(ownerId, dateFrom, dateTo);

    logger.info('Call-to-close metrics fetched', {
      count: metrics.length,
      ownerId: ownerId || 'all',
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Call-to-close API error', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch call-to-close metrics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
