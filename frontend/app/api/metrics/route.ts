import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBasicMetrics, getCallMetrics, getConversionMetrics } from '@/lib/db/metrics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('owner_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const supabase = await createClient();

    const filters = {
      ownerId: ownerId || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    };

    const [basicMetrics, callMetrics, conversionMetrics] = await Promise.all([
      getBasicMetrics(supabase, filters),
      getCallMetrics(supabase, filters),
      getConversionMetrics(supabase, filters),
    ]);

    return NextResponse.json({
      ...basicMetrics,
      ...callMetrics,
      ...conversionMetrics,
    });

  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
