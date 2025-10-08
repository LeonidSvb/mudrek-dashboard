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
  process.env.SUPABASE_SERVICE_KEY!
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
 * Get all metrics using SQL function (FAST!)
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
