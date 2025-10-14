/**
 * DEALS BREAKDOWN API ENDPOINT
 *
 * GET /api/deals/breakdown
 *
 * Returns count of deals grouped by dealstage
 *
 * Query Parameters:
 * - owner_id: Filter by sales manager (optional)
 * - date_from: Start date filter (optional, ISO format)
 * - date_to: End date filter (optional, ISO format)
 *
 * Example:
 * GET /api/deals/breakdown?owner_id=682432124&date_from=2025-10-01&date_to=2025-10-08
 *
 * Response: Array of { stage: string, count: number, amount: number }
 */

/**
 * DEALS BREAKDOWN API - Supabase version
 * GET /api/deals/breakdown
 * Returns deals grouped by stage with counts and amounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLogger } from '@/lib/app-logger';

const logger = getLogger('deals-breakdown-api');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

    logger.info('Fetching deals breakdown', { filters });

    // OPTIMIZATION: Use SQL function for server-side aggregation
    // This avoids Supabase 1000 record limit and groups on server
    const { data: breakdown, error } = await supabase.rpc('get_deals_breakdown', {
      p_owner_id: ownerId || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    logger.info('Deals breakdown fetched successfully', {
      stagesCount: breakdown.length,
      totalDeals: breakdown.reduce((sum: number, item: { stage: string; count: number; amount: number }) => sum + Number(item.count), 0),
    });

    return NextResponse.json(breakdown);
  } catch (error) {
    logger.error('Deals breakdown API error', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch deals breakdown',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
