import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/metrics/timeline
 *
 * Returns timeline data for Sales and Calls charts
 * with adaptive granularity (daily/weekly/monthly)
 *
 * Query params:
 *   - owner_id: HubSpot owner ID (optional)
 *   - date_from: Start date YYYY-MM-DD (required)
 *   - date_to: End date YYYY-MM-DD (required)
 *   - granularity: 'daily', 'weekly', or 'monthly' (optional, auto-calculated)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('owner_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    let granularity = searchParams.get('granularity');

    // Validate required parameters
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'date_from and date_to are required' },
        { status: 400 }
      );
    }

    // Auto-calculate granularity if not provided
    if (!granularity) {
      const days = Math.ceil(
        (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (days <= 31) {
        granularity = 'daily';
      } else if (days <= 90) {
        granularity = 'weekly';
      } else {
        granularity = 'monthly';
      }
    }

    // Validate granularity
    if (!['daily', 'weekly', 'monthly'].includes(granularity)) {
      return NextResponse.json(
        { error: 'granularity must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_metrics_timeline', {
      p_owner_id: ownerId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_granularity: granularity
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Timeline API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch timeline data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
