import { SupabaseClient } from '@supabase/supabase-js';

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
}

export interface ConversionMetrics {
  qualifiedRate: number;
  trialRate: number;
}

export async function getBasicMetrics(
  supabase: SupabaseClient,
  filters: MetricsFilters = {}
): Promise<BasicMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  let dealsQuery = supabase
    .from('hubspot_deals_raw')
    .select('amount, closedate')
    .eq('dealstage', 'closedwon');

  if (ownerId) {
    dealsQuery = dealsQuery.eq('hubspot_owner_id', ownerId);
  }

  if (dateFrom && dateTo) {
    dealsQuery = dealsQuery.gte('closedate', dateFrom).lte('closedate', dateTo);
  }

  const { data: deals, error: dealsError } = await dealsQuery;

  if (dealsError) {
    throw new Error(`Failed to fetch deals: ${dealsError.message}`);
  }

  let contactsQuery = supabase
    .from('hubspot_contacts_raw')
    .select('*', { count: 'exact', head: true });

  if (ownerId) {
    contactsQuery = contactsQuery.eq('hubspot_owner_id', ownerId);
  }

  const { count: totalContacts, error: contactsError } = await contactsQuery;

  if (contactsError) {
    throw new Error(`Failed to count contacts: ${contactsError.message}`);
  }

  const totalSales = deals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
  const dealsWithAmount = deals?.filter((deal) => deal.amount > 0) || [];
  const avgDealSize =
    dealsWithAmount.length > 0
      ? dealsWithAmount.reduce((sum, deal) => sum + deal.amount, 0) / dealsWithAmount.length
      : 0;
  const totalDeals = deals?.length || 0;
  const conversionRate =
    totalContacts && totalContacts > 0 ? (totalDeals / totalContacts) * 100 : 0;

  return {
    totalSales: Math.round(totalSales),
    avgDealSize: Math.round(avgDealSize * 100) / 100,
    totalDeals,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

export async function getCallMetrics(
  supabase: SupabaseClient,
  filters: MetricsFilters = {}
): Promise<CallMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  let callsQuery = supabase
    .from('hubspot_calls_raw')
    .select('call_duration, call_timestamp');

  if (dateFrom && dateTo) {
    callsQuery = callsQuery.gte('call_timestamp', dateFrom).lte('call_timestamp', dateTo);
  }

  const { data: calls, error } = await callsQuery;

  if (error) {
    throw new Error(`Failed to fetch calls: ${error.message}`);
  }

  const validCalls = calls?.filter((call) => call.call_duration > 0) || [];
  const totalDuration = validCalls.reduce((sum, call) => sum + (call.call_duration || 0), 0);

  const avgCallTime = validCalls.length > 0 ? totalDuration / validCalls.length / 60000 : 0;
  const totalCallTime = totalDuration / 3600000;

  return {
    avgCallTime: Math.round(avgCallTime * 100) / 100,
    totalCallTime: Math.round(totalCallTime * 100) / 100,
  };
}

export async function getConversionMetrics(
  supabase: SupabaseClient,
  filters: MetricsFilters = {}
): Promise<ConversionMetrics> {
  const { ownerId } = filters;

  // FIXED: qualified_status и trial_status находятся в deals, НЕ в contacts!
  let dealsQuery = supabase
    .from('hubspot_deals_raw')
    .select('qualified_status, trial_status');

  if (ownerId) {
    dealsQuery = dealsQuery.eq('hubspot_owner_id', ownerId);
  }

  const { data: deals, error } = await dealsQuery;

  if (error) {
    throw new Error(`Failed to fetch deals: ${error.message}`);
  }

  const total = deals?.length || 0;
  const qualified = deals?.filter((d) => d.qualified_status === 'yes').length || 0;
  const trial = deals?.filter((d) => d.trial_status === 'yes').length || 0;

  return {
    qualifiedRate: total > 0 ? Math.round((qualified / total) * 100 * 100) / 100 : 0,
    trialRate: total > 0 ? Math.round((trial / total) * 100 * 100) / 100 : 0,
  };
}
