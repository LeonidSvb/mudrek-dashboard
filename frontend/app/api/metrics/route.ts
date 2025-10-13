/**
 * METRICS API ENDPOINT
 *
 * GET /api/metrics
 *
 * Returns all 21 dashboard metrics (22nd pending disposition mapping)
 *
 * Query Parameters:
 * - owner_id: Filter by sales manager (optional)
 * - date_from: Start date filter (optional, ISO format)
 * - date_to: End date filter (optional, ISO format)
 *
 * Example:
 * GET /api/metrics?owner_id=682432124&date_from=2025-10-01&date_to=2025-10-08
 *
 * Response: JSON object with all metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllMetrics } from '@/lib/db/metrics-fast';
import { getLogger } from '@/lib/app-logger';

const logger = getLogger('metrics-api');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('owner_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const filters = {
      ownerId: ownerId || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    };

    logger.info('Fetching all metrics via SQL function', { filters });

    // Используем Supabase REST API (быстрее чем PG если MV работает)
    const metrics = await getAllMetrics(filters);

    logger.info('Metrics fetched successfully', {
      hasData: !!metrics,
      metricsCount: Object.keys(metrics).length,
      totalSales: metrics.totalSales,
      totalDeals: metrics.totalDeals,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Metrics API error', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
