/**
 * FAST METRICS - Using SQL Function
 *
 * Replaces slow fetchAllRecords approach with direct SQL aggregations
 * Execution time: 2-3 seconds instead of 30+ seconds
 */

import { createClient } from '@supabase/supabase-js';
import { getLogger } from '@/lib/app-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-node',
      },
      fetch: (url, options = {}) => {
        // Увеличиваем timeout до 120 секунд
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(120000),
        });
      },
    },
    auth: {
      persistSession: false,
    },
  }
);

const logger = getLogger('metrics-fast');

export interface MetricsFilters {
  ownerId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface AllMetrics {
  // Sales (4)
  totalSales: number;
  avgDealSize: number;
  totalDeals: number;
  conversionRate: number;

  // Calls (4)
  totalCalls: number;
  avgCallTime: number;
  totalCallTime: number;
  fiveMinReachedRate: number;

  // Conversion (3)
  qualifiedRate: number;
  trialRate: number;
  cancellationRate: number;

  // Payment (2)
  upfrontCashCollected: number;
  avgInstallments: number;

  // Followup (3)
  followupRate: number;
  avgFollowups: number;
  timeToFirstContact: number;

  // Offers (2)
  offersGivenRate: number;
  offerCloseRate: number;

  // Time (1)
  timeToSale: number;

  // A/B Testing (2)
  salesScriptStats: Array<{
    version: string;
    totalContacts: number;
    conversions: number;
    conversionRate: number;
  }>;
  vslWatchStats: Array<{
    watched: string;
    totalContacts: number;
    conversions: number;
    conversionRate: number;
  }>;

  // Metadata
  totalContacts: number;
}

/**
 * Get dashboard overview using 8 modular SQL functions (MODULAR & TESTABLE!)
 * Each metric category can be tested and debugged independently
 * Calls all 8 functions in parallel for optimal performance
 */
export async function getDashboardOverview(
  ownerId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null
): Promise<Partial<AllMetrics>> {
  logger.info('Fetching dashboard overview from 8 modular functions', { ownerId, dateFrom, dateTo });

  const startTime = Date.now();

  try {
    // Call all 8 functions in parallel
    const [
      salesResult,
      callsResult,
      conversionResult,
      paymentResult,
      followupResult,
      offersResult,
      timeResult,
      abTestingResult
    ] = await Promise.all([
      supabase.rpc('get_sales_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_call_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_conversion_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_payment_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_followup_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_offer_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_time_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
      supabase.rpc('get_ab_testing_metrics', {
        p_owner_id: ownerId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      }),
    ]);

    // Check for errors in any of the results
    const errors = [
      salesResult.error,
      callsResult.error,
      conversionResult.error,
      paymentResult.error,
      followupResult.error,
      offersResult.error,
      timeResult.error,
      abTestingResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      logger.error('One or more metric functions failed', { errors });
      throw new Error(`Failed to fetch metrics: ${errors.map(e => e?.message).join(', ')}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Dashboard overview fetched successfully from 8 functions', {
      duration_ms: duration,
      functions_called: 8,
    });

    // Combine all results into single object
    return {
      // Sales metrics (4)
      totalSales: salesResult.data?.totalSales || 0,
      totalDeals: salesResult.data?.totalDeals || 0,
      avgDealSize: salesResult.data?.avgDealSize || 0,
      conversionRate: salesResult.data?.conversionRate || 0,

      // Call metrics (4)
      totalCalls: callsResult.data?.totalCalls || 0,
      avgCallTime: callsResult.data?.avgCallTime || 0,
      totalCallTime: callsResult.data?.totalCallTime || 0,
      fiveMinReachedRate: callsResult.data?.fiveMinReachedRate || 0,

      // Conversion metrics (3)
      qualifiedRate: conversionResult.data?.qualifiedRate || 0,
      trialRate: conversionResult.data?.trialRate || 0,
      cancellationRate: conversionResult.data?.cancellationRate || 0,

      // Payment metrics (2)
      upfrontCashCollected: paymentResult.data?.upfrontCashCollected || 0,
      avgInstallments: paymentResult.data?.avgInstallments || 0,

      // Followup metrics (3)
      followupRate: followupResult.data?.followupRate || 0,
      avgFollowups: followupResult.data?.avgFollowups || 0,
      timeToFirstContact: followupResult.data?.timeToFirstContact || 0,

      // Offer metrics (2)
      offersGivenRate: offersResult.data?.offersGivenRate || 0,
      offerCloseRate: offersResult.data?.offerCloseRate || 0,

      // Time metrics (1)
      timeToSale: timeResult.data?.timeToSale || 0,

      // A/B testing metrics (2)
      salesScriptStats: abTestingResult.data?.salesScriptStats || [],
      vslWatchStats: abTestingResult.data?.vslWatchStats || [],

      // Metadata (calculated from sales data which includes contact count)
      totalContacts: 0, // Not available in modular functions (would need separate query)
    };
  } catch (error) {
    logger.error('Failed to fetch dashboard overview', { error });
    throw error;
  }
}

/**
 * Get all metrics using SQL function (with filters)
 * Use this when owner_id or other filters are specified
 */
export async function getAllMetrics(
  filters: MetricsFilters = {}
): Promise<AllMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  logger.info('Fetching all metrics via SQL function', { filters });

  const startTime = Date.now();

  try {
    // Call SQL function - returns all metrics in one query
    const { data, error } = await supabase.rpc('get_all_metrics', {
      p_owner_id: ownerId || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });

    if (error) {
      logger.error('SQL function error', { error });
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Metrics fetched successfully', {
      duration_ms: duration,
      totalSales: data?.totalSales,
      totalDeals: data?.totalDeals,
    });

    return data as AllMetrics;

  } catch (error) {
    logger.error('Failed to fetch metrics', { error });
    throw error;
  }
}
