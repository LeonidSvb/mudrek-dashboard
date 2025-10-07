import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

export async function getBasicMetrics(
  filters: MetricsFilters = {}
): Promise<BasicMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  let query = supabase
    .from('hubspot_deals_raw')
    .select('amount, closedate')
    .eq('dealstage', 'closedwon');

  if (ownerId) {
    query = query.eq('hubspot_owner_id', ownerId);
  }

  if (dateFrom && dateTo) {
    query = query.gte('closedate', dateFrom).lte('closedate', dateTo);
  }

  const { data: deals, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch deals: ${error.message}`);
  }

  let contactQuery = supabase.from('hubspot_contacts_raw').select('*', { count: 'exact', head: true });

  if (ownerId) {
    contactQuery = contactQuery.eq('hubspot_owner_id', ownerId);
  }

  const { count: totalContacts, error: contactError } = await contactQuery;

  if (contactError) {
    throw new Error(`Failed to count contacts: ${contactError.message}`);
  }

  const totalSales = deals?.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0) || 0;
  const dealsWithAmount = deals?.filter(deal => deal.amount && Number(deal.amount) > 0) || [];
  const avgDealSize = dealsWithAmount.length > 0
    ? dealsWithAmount.reduce((sum, deal) => sum + Number(deal.amount), 0) / dealsWithAmount.length
    : 0;
  const totalDeals = deals?.length || 0;
  const conversionRate = (totalContacts || 0) > 0 ? (totalDeals / (totalContacts || 1)) * 100 : 0;

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

  let query = supabase.from('hubspot_calls_raw').select('call_duration');

  if (dateFrom && dateTo) {
    query = query.gte('call_timestamp', dateFrom).lte('call_timestamp', dateTo);
  }

  const { data: calls, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch calls: ${error.message}`);
  }

  const totalCalls = calls?.length || 0;
  const validCalls = calls?.filter(call => call.call_duration && call.call_duration > 0) || [];
  const totalDuration = validCalls.reduce((sum, call) => sum + (call.call_duration || 0), 0);

  const fiveMinCalls = calls?.filter(call => call.call_duration && call.call_duration >= 300000) || [];
  const fiveMinReachedRate = totalCalls > 0 ? (fiveMinCalls.length / totalCalls) * 100 : 0;

  const avgCallTime = validCalls.length > 0 ? totalDuration / validCalls.length / 60000 : 0;
  const totalCallTime = totalDuration / 3600000;

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

  let query = supabase.from('hubspot_deals_raw').select('qualified_status, trial_status');

  if (ownerId) {
    query = query.eq('hubspot_owner_id', ownerId);
  }

  const { data: deals, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch conversion metrics: ${error.message}`);
  }

  const total = deals?.length || 0;
  const qualified = deals?.filter(d => d.qualified_status === 'yes').length || 0;
  const trial = deals?.filter(d => d.trial_status === 'yes').length || 0;

  return {
    qualifiedRate: total > 0 ? Math.round((qualified / total) * 100 * 100) / 100 : 0,
    trialRate: total > 0 ? Math.round((trial / total) * 100 * 100) / 100 : 0,
  };
}

export async function getInstallmentMetrics(
  filters: MetricsFilters = {}
): Promise<InstallmentMetrics> {
  const { ownerId } = filters;

  let query = supabase
    .from('hubspot_deals_raw')
    .select('number_of_installments__months')
    .not('number_of_installments__months', 'is', null)
    .gt('number_of_installments__months', 0);

  if (ownerId) {
    query = query.eq('hubspot_owner_id', ownerId);
  }

  const { data: deals, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch installment metrics: ${error.message}`);
  }

  const avgInstallments =
    (deals?.length || 0) > 0
      ? deals!.reduce((sum, d) => sum + (d.number_of_installments__months || 0), 0) / deals!.length
      : 0;

  return {
    avgInstallments: Math.round(avgInstallments * 10) / 10,
  };
}
