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
 * Get dashboard overview using materialized view (INSTANT!)
 * Works with or without owner_id filter!
 */
export async function getDashboardOverview(
  ownerId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null
): Promise<Partial<AllMetrics>> {
  logger.info('Fetching dashboard overview from materialized view', { ownerId, dateFrom, dateTo });

  const startTime = Date.now();

  try {
    const { data, error } = await supabase.rpc('get_dashboard_overview', {
      p_owner_id: ownerId || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });

    if (error) {
      logger.error('Dashboard overview error', { error });
      throw new Error(`Failed to fetch dashboard overview: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Dashboard overview fetched successfully', {
      duration_ms: duration,
      data_source: data?.data_source,
      is_cached: data?.is_cached,
    });

    // Map from snake_case to camelCase
    return {
      totalSales: data.total_sales || 0,
      totalDeals: data.deals_won || 0,
      avgDealSize: data.average_deal_size || 0,
      qualifiedRate: data.qualified_leads || 0,
      trialRate: data.trials_given || 0,
      cancellationRate: data.deals_lost || 0,
      upfrontCashCollected: data.upfront_cash_collected || 0,
      avgInstallments: data.average_installments || 0,
      offersGivenRate: data.offers_given || 0,
      offerCloseRate: data.offer_close_rate || 0,
      timeToSale: data.average_time_to_sale || 0,
      // Add empty arrays for A/B testing (not in materialized view)
      salesScriptStats: [],
      vslWatchStats: [],
      // Placeholder for other metrics (will show 0 until we add them)
      totalCalls: 0,
      avgCallTime: 0,
      totalCallTime: 0,
      fiveMinReachedRate: 0,
      conversionRate: 0,
      followupRate: 0,
      avgFollowups: 0,
      timeToFirstContact: 0,
      totalContacts: 0,
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
