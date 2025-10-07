import { createClient } from '@supabase/supabase-js';
import { getLogger } from '@/lib/app-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const logger = getLogger('metrics-db');

export interface MetricsFilters {
  ownerId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface BasicMetrics {
  totalSales: number;
  avgDealSize: number;
  totalDeals: number;
  conversionRate: number;
}

export interface CallMetrics {
  avgCallTime: number;
  totalCallTime: number;
  totalCalls: number;
  fiveMinReachedRate: number;
}

export interface ConversionMetrics {
  qualifiedRate: number;
  trialRate: number;
}

export interface InstallmentMetrics {
  avgInstallments: number;
}

export interface TimeToSaleMetrics {
  timeToSale: number; // days
}

export async function getBasicMetrics(
  filters: MetricsFilters = {}
): Promise<BasicMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  // Get ALL deals with pagination
  let allDeals: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('hubspot_deals_raw')
      .select('amount, closedate')
      .eq('dealstage', 'closedwon')
      .range(from, from + pageSize - 1);

    if (ownerId) {
      query = query.eq('hubspot_owner_id', ownerId);
    }

    if (dateFrom && dateTo) {
      query = query.gte('closedate', dateFrom).lte('closedate', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch deals', error);
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }

    if (data && data.length > 0) {
      allDeals = allDeals.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  logger.info('Deals fetched', { count: allDeals.length, sample: allDeals[0] });

  let contactQuery = supabase.from('hubspot_contacts_raw').select('*', { count: 'exact', head: true });

  if (ownerId) {
    contactQuery = contactQuery.eq('hubspot_owner_id', ownerId);
  }

  const { count: totalContacts, error: contactError } = await contactQuery;

  if (contactError) {
    logger.error('Failed to count contacts', contactError);
    throw new Error(`Failed to count contacts: ${contactError.message}`);
  }

  logger.info('Contacts counted', { totalContacts });

  const totalSales = allDeals.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);
  const dealsWithAmount = allDeals.filter(deal => deal.amount && Number(deal.amount) > 0);
  const avgDealSize = dealsWithAmount.length > 0
    ? dealsWithAmount.reduce((sum, deal) => sum + Number(deal.amount), 0) / dealsWithAmount.length
    : 0;
  const totalDeals = allDeals.length;
  const conversionRate = (totalContacts || 0) > 0 ? (totalDeals / (totalContacts || 1)) * 100 : 0;

  logger.info('Basic metrics calculated', {
    totalSales,
    avgDealSize,
    totalDeals,
    conversionRate,
    totalContacts,
    dealsWithAmountCount: dealsWithAmount.length
  });

  return {
    totalSales: Math.round(totalSales),
    avgDealSize: Math.round(avgDealSize * 100) / 100,
    totalDeals,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

export async function getCallMetrics(
  filters: MetricsFilters = {}
): Promise<CallMetrics> {
  const { dateFrom, dateTo } = filters;

  // Get ALL calls with pagination
  let allCalls: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('hubspot_calls_raw')
      .select('call_duration')
      .range(from, from + pageSize - 1);

    if (dateFrom && dateTo) {
      query = query.gte('call_timestamp', dateFrom).lte('call_timestamp', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch calls', error);
      throw new Error(`Failed to fetch calls: ${error.message}`);
    }

    if (data && data.length > 0) {
      allCalls = allCalls.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const totalCalls = allCalls.length;
  const validCalls = allCalls.filter(call => call.call_duration && call.call_duration > 0);
  const totalDuration = validCalls.reduce((sum, call) => sum + (call.call_duration || 0), 0);

  const fiveMinCalls = allCalls.filter(call => call.call_duration && call.call_duration >= 300000);
  const fiveMinReachedRate = totalCalls > 0 ? (fiveMinCalls.length / totalCalls) * 100 : 0;

  const avgCallTime = validCalls.length > 0 ? totalDuration / validCalls.length / 60000 : 0;
  const totalCallTime = totalDuration / 3600000;

  logger.info('Call metrics calculated', {
    totalCalls,
    validCallsCount: validCalls.length,
    avgCallTime,
    totalCallTime,
    fiveMinReachedRate,
    sampleDuration: allCalls[0]?.call_duration
  });

  return {
    avgCallTime: Math.round(avgCallTime * 100) / 100,
    totalCallTime: Math.round(totalCallTime * 100) / 100,
    totalCalls,
    fiveMinReachedRate: Math.round(fiveMinReachedRate * 100) / 100,
  };
}

export async function getConversionMetrics(
  filters: MetricsFilters = {}
): Promise<ConversionMetrics> {
  const { ownerId } = filters;

  // Get ALL deals with pagination
  let allDeals: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('hubspot_deals_raw')
      .select('qualified_status, trial_status')
      .range(from, from + pageSize - 1);

    if (ownerId) {
      query = query.eq('hubspot_owner_id', ownerId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch conversion metrics: ${error.message}`);
    }

    if (data && data.length > 0) {
      allDeals = allDeals.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const total = allDeals.length;
  const qualified = allDeals.filter(d => d.qualified_status === 'yes').length;
  const trial = allDeals.filter(d => d.trial_status === 'yes').length;

  return {
    qualifiedRate: total > 0 ? Math.round((qualified / total) * 100 * 100) / 100 : 0,
    trialRate: total > 0 ? Math.round((trial / total) * 100 * 100) / 100 : 0,
  };
}

export async function getInstallmentMetrics(
  filters: MetricsFilters = {}
): Promise<InstallmentMetrics> {
  const { ownerId } = filters;

  // Get ALL deals with pagination
  let allDeals: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('hubspot_deals_raw')
      .select('number_of_installments__months')
      .not('number_of_installments__months', 'is', null)
      .gt('number_of_installments__months', 0)
      .range(from, from + pageSize - 1);

    if (ownerId) {
      query = query.eq('hubspot_owner_id', ownerId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch installment metrics: ${error.message}`);
    }

    if (data && data.length > 0) {
      allDeals = allDeals.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const avgInstallments =
    allDeals.length > 0
      ? allDeals.reduce((sum, d) => sum + (d.number_of_installments__months || 0), 0) / allDeals.length
      : 0;

  return {
    avgInstallments: Math.round(avgInstallments * 10) / 10,
  };
}

export async function getTimeToSale(
  filters: MetricsFilters = {}
): Promise<TimeToSaleMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  // Get ALL closed deals with pagination
  let allDeals: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('hubspot_deals_raw')
      .select('createdate, closedate')
      .eq('dealstage', 'closedwon')
      .not('createdate', 'is', null)
      .not('closedate', 'is', null)
      .range(from, from + pageSize - 1);

    if (ownerId) {
      query = query.eq('hubspot_owner_id', ownerId);
    }

    if (dateFrom && dateTo) {
      query = query.gte('closedate', dateFrom).lte('closedate', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch time to sale metrics: ${error.message}`);
    }

    if (data && data.length > 0) {
      allDeals = allDeals.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  // Calculate average days from create to close
  const daysToSale = allDeals.map(deal => {
    const created = new Date(deal.createdate);
    const closed = new Date(deal.closedate);
    return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });

  const avgTimeToSale = daysToSale.length > 0
    ? daysToSale.reduce((sum, days) => sum + days, 0) / daysToSale.length
    : 0;

  return {
    timeToSale: Math.round(avgTimeToSale * 10) / 10,
  };
}

export interface FollowupMetrics {
  followupRate: number;
  avgFollowups: number;
  timeToFirstContact: number;
}

export async function getFollowupMetrics(
  filters: MetricsFilters = {}
): Promise<FollowupMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  let allStats: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('contact_call_stats')
      .select('contact_id, total_calls, first_call_date')
      .gt('total_calls', 0)
      .range(from, from + pageSize - 1);

    if (ownerId) {
      query = query.eq('hubspot_owner_id', ownerId);
    }

    if (dateFrom && dateTo) {
      query = query.gte('first_call_date', dateFrom).lte('first_call_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch followup metrics', error);
      throw new Error(`Failed to fetch followup metrics: ${error.message}`);
    }

    if (data && data.length > 0) {
      allStats = allStats.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const totalContactsWithCalls = allStats.length;
  const contactsWithFollowups = allStats.filter(s => s.total_calls > 1).length;
  const followupRate = totalContactsWithCalls > 0
    ? (contactsWithFollowups / totalContactsWithCalls) * 100
    : 0;

  const totalFollowups = allStats
    .filter(s => s.total_calls > 1)
    .reduce((sum, s) => sum + (s.total_calls - 1), 0);
  const avgFollowups = contactsWithFollowups > 0
    ? totalFollowups / contactsWithFollowups
    : 0;

  let contactIds = allStats.map(s => s.contact_id);
  let allContacts: any[] = [];
  from = 0;
  hasMore = true;

  while (hasMore && contactIds.length > 0) {
    const batchIds = contactIds.slice(from, from + 1000);
    if (batchIds.length === 0) break;

    const { data, error } = await supabase
      .from('hubspot_contacts_raw')
      .select('hubspot_id, createdate')
      .in('hubspot_id', batchIds);

    if (error) {
      logger.error('Failed to fetch contacts for time to first contact', error);
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }

    if (data && data.length > 0) {
      allContacts = allContacts.concat(data);
      from += 1000;
    } else {
      break;
    }

    if (batchIds.length < 1000) {
      hasMore = false;
    }
  }

  const contactMap = new Map(allContacts.map(c => [c.hubspot_id, c.createdate]));

  const timesToFirstContact = allStats
    .filter(s => s.first_call_date && contactMap.has(s.contact_id))
    .map(s => {
      const createDate = new Date(contactMap.get(s.contact_id)!);
      const firstCallDate = new Date(s.first_call_date);
      return (firstCallDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter(days => days >= 0);

  const avgTimeToFirstContact = timesToFirstContact.length > 0
    ? timesToFirstContact.reduce((sum, days) => sum + days, 0) / timesToFirstContact.length
    : 0;

  logger.info('Followup metrics calculated', {
    totalContactsWithCalls,
    contactsWithFollowups,
    followupRate,
    avgFollowups,
    avgTimeToFirstContact,
  });

  return {
    followupRate: Math.round(followupRate * 100) / 100,
    avgFollowups: Math.round(avgFollowups * 10) / 10,
    timeToFirstContact: Math.round(avgTimeToFirstContact * 10) / 10,
  };
}
