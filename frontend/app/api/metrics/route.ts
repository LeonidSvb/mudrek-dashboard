import { NextRequest, NextResponse } from 'next/server';
import {
  getBasicMetrics,
  getCallMetrics,
  getConversionMetrics,
  getInstallmentMetrics,
} from '@/lib/db/metrics';
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

    logger.info('Fetching metrics', { filters, DATABASE_URL_present: !!process.env.DATABASE_URL });

    // Fetch all metrics in parallel with Prisma
    const [basicMetrics, callMetrics, conversionMetrics, installmentMetrics] = await Promise.all([
      getBasicMetrics(filters),
      getCallMetrics(filters),
      getConversionMetrics(filters),
      getInstallmentMetrics(filters),
    ]);

    logger.info('Metrics fetched successfully', {
      totalDeals: basicMetrics.totalDeals,
      totalCalls: callMetrics.totalCalls
    });

    return NextResponse.json({
      ...basicMetrics,
      ...callMetrics,
      ...conversionMetrics,
      ...installmentMetrics,
    });
  } catch (error) {
    logger.error('Metrics API error', error, {
      DATABASE_URL: process.env.DATABASE_URL?.substring(0, 50) + '...'
    });
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
