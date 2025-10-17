/**
 * SALES FUNNEL METRICS
 *
 * Fetches sales funnel data:
 * - Contacts by stage (new_leads, no_answer, wrong_number, disqualified)
 * - Deals by stage (qualified_to_buy, high_interest, offer_received, closed_won, closed_lost)
 * - Conversion rates (contact → deal, deal → won)
 */

import { createClient } from '@/lib/supabase/server';
import { getLogger } from '@/lib/app-logger';

const logger = getLogger('sales-funnel');

export interface SalesFunnelMetrics {
  contacts: {
    total: number;
    new_leads: number;
    no_answer: number;
    wrong_number: number;
    disqualified: number;
  };
  deals: {
    total: number;
    qualified_to_buy: number;
    high_interest: number;
    closed_won: number;
    closed_lost: number;
  };
  conversion_rates: {
    contact_to_deal: number;
    deal_to_won: number;
  };
}

export async function getSalesFunnelMetrics(
  ownerId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null
): Promise<SalesFunnelMetrics> {
  const supabase = await createClient();

  logger.info('Fetching sales funnel metrics', { ownerId, dateFrom, dateTo });

  const { data, error } = await supabase.rpc('get_sales_funnel_metrics', {
    p_owner_id: ownerId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) {
    logger.error('Failed to fetch sales funnel metrics', error);
    throw new Error(`Failed to fetch sales funnel metrics: ${error.message}`);
  }

  if (!data) {
    logger.warning('No data returned from get_sales_funnel_metrics');
    return {
      contacts: {
        total: 0,
        new_leads: 0,
        no_answer: 0,
        wrong_number: 0,
        disqualified: 0,
      },
      deals: {
        total: 0,
        qualified_to_buy: 0,
        high_interest: 0,
        closed_won: 0,
        closed_lost: 0,
      },
      conversion_rates: {
        contact_to_deal: 0,
        deal_to_won: 0,
      },
    };
  }

  logger.info('Sales funnel metrics fetched successfully', {
    contacts_total: data.contacts.total,
    deals_total: data.deals.total,
    contact_to_deal_rate: data.conversion_rates.contact_to_deal,
  });

  return data;
}
