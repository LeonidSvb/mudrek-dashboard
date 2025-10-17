/**
 * SALES FUNNEL API ENDPOINT
 *
 * GET /api/sales-funnel
 *
 * Returns sales funnel metrics:
 * - Contacts by stage
 * - Deals by stage
 * - Conversion rates
 *
 * Query Parameters:
 * - owner_id: Filter by sales manager (optional)
 * - date_from: Start date filter (optional, ISO format)
 * - date_to: End date filter (optional, ISO format)
 *
 * Example:
 * GET /api/sales-funnel?owner_id=682432124&date_from=2025-10-01&date_to=2025-10-16
 *
 * Response: JSON object with sales funnel metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalesFunnelMetrics } from '@/lib/db/sales-funnel';
import { getLogger } from '@/lib/app-logger';

const logger = getLogger('sales-funnel-api');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('owner_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    logger.info('Fetching sales funnel', { ownerId, dateFrom, dateTo });

    const metrics = await getSalesFunnelMetrics(ownerId, dateFrom, dateTo);

    logger.info('Sales funnel fetched successfully', {
      contacts_total: metrics.contacts.total,
      deals_total: metrics.deals.total,
      ownerId: ownerId || 'all',
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Sales funnel API error', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch sales funnel metrics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
