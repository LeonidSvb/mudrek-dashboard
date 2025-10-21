/**
 * Centralized metric definitions with explanations
 * Used for tooltips and documentation
 */

export interface MetricDefinition {
  description: string;
  source: string;
  interpretation?: string;
  ifZero?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ============================================================
  // SALES METRICS (5)
  // ============================================================
  totalSales: {
    description: "Total revenue from closed deals",
    source: "HubSpot Deals → 'Amount' field (dealstage = closedwon)",
    interpretation: "Higher is better. Shows overall business performance.",
  },

  avgDealSize: {
    description: "Average revenue per closed deal",
    source: "HubSpot Deals → Sum of 'Amount' / Count of closedwon deals",
    interpretation: "Higher is better. Shows deal quality and pricing effectiveness.",
  },

  totalDeals: {
    description: "Total number of closed won deals",
    source: "HubSpot Deals → Count where dealstage = closedwon",
    interpretation: "Higher is better. Shows sales volume.",
  },

  conversionRate: {
    description: "Percentage of contacts who became paying customers",
    source: "HubSpot Contacts created → Deals closedwon ratio",
    interpretation: "Good rate: 5-15%. Shows overall funnel effectiveness.",
  },

  totalContactsCreated: {
    description: "New contacts added in selected period",
    source: "HubSpot Contacts → 'Created date' field",
    interpretation: "Shows lead generation performance. More contacts = more opportunities.",
  },

  // ============================================================
  // CALL METRICS (5)
  // ============================================================
  totalCalls: {
    description: "Total calls made in selected period",
    source: "HubSpot Calls → All logged call activities",
    interpretation: "Higher call volume = more engagement. Track alongside conversion metrics.",
  },

  avgCallTime: {
    description: "Average duration of calls in minutes",
    source: "HubSpot Calls → 'Duration' field average",
    interpretation: "Longer calls (2-5 min) often indicate more engaged conversations.",
  },

  totalCallTime: {
    description: "Total time spent on calls in hours",
    source: "HubSpot Calls → Sum of all 'Duration' fields",
    interpretation: "Shows team effort. Combine with conversion rate to measure efficiency.",
  },

  pickupRate: {
    description: "Percentage of calls where contact answered and had real conversation",
    source: "HubSpot Calls → 'Call outcome' property (Connected status with 4+ min duration)",
    interpretation: "Good rate: 40-50%. Lower rate may indicate bad timing or wrong numbers.",
  },

  fiveMinReachedRate: {
    description: "Percentage of calls lasting 5 minutes or longer",
    source: "HubSpot Calls → 'Duration' >= 5 minutes",
    interpretation: "Quality indicator. High-value conversations typically last 5+ minutes.",
  },

  // ============================================================
  // CONVERSION METRICS (3)
  // ============================================================
  qualifiedRate: {
    description: "Percentage of deals marked as qualified to buy",
    source: "HubSpot Deals → 'Qualified status' custom field",
    interpretation: "Shows lead quality. Good rate: 30-60%.",
    ifZero: "Fill 'qualified_status' field in HubSpot deals to see data.",
  },

  trialRate: {
    description: "Percentage of deals that entered trial stage",
    source: "HubSpot Deals → 'Trial status' custom field",
    interpretation: "Shows trial conversion. Track trial-to-paid separately.",
    ifZero: "Fill 'trial_status' field in HubSpot deals to see data.",
  },

  cancellationRate: {
    description: "Percentage of deals that were cancelled or lost",
    source: "HubSpot Deals → dealstage = 'closedlost' or cancelled",
    interpretation: "Lower is better. High rate (>40%) indicates pricing or qualification issues.",
  },

  // ============================================================
  // PAYMENT METRICS (2)
  // ============================================================
  upfrontCashCollected: {
    description: "Total upfront payments collected from customers",
    source: "HubSpot Deals → 'Upfront payment' custom field (closedwon deals)",
    interpretation: "Shows immediate cash flow. Higher is better for business liquidity.",
    ifZero: "Fill 'upfront_payment' field in HubSpot deals to see data.",
  },

  avgInstallments: {
    description: "Average payment plan length in months",
    source: "HubSpot Deals → 'Number of installments' custom field",
    interpretation: "Shows typical payment terms. Longer plans may indicate affordability focus.",
    ifZero: "Fill 'number_of_installments__months' field in HubSpot deals to see data.",
  },

  // ============================================================
  // FOLLOWUP METRICS (3)
  // ============================================================
  followupRate: {
    description: "Percentage of contacts with follow-up calls",
    source: "HubSpot Contacts → Calls count > 1",
    interpretation: "Good rate: 60-80%. Shows persistence in outreach.",
  },

  avgFollowups: {
    description: "Average number of calls per contact",
    source: "HubSpot Contacts → Average calls count",
    interpretation: "Typical: 2-4 calls. Too high (>6) may indicate poor targeting.",
  },

  timeToFirstContact: {
    description: "Average days from contact creation to first call",
    source: "HubSpot Contacts 'Created date' → First call timestamp",
    interpretation: "Lower is better. Fast response (< 1 day) improves conversion.",
  },

  // ============================================================
  // OFFER METRICS (2)
  // ============================================================
  offersGivenRate: {
    description: "Percentage of deals where offer was presented",
    source: "HubSpot Deals → 'Offer given' custom field or deal stage",
    interpretation: "Shows how many leads reach offer stage. Good rate: 50-70%.",
    ifZero: "Set up 'offer given' tracking in HubSpot deals or use deal stages.",
  },

  offerCloseRate: {
    description: "Percentage of offers that converted to closed won",
    source: "HubSpot Deals → Offers given → Closedwon ratio",
    interpretation: "Good rate: 20-40%. Low rate indicates pricing or objection handling issues.",
    ifZero: "Set up 'offer given' tracking in HubSpot deals.",
  },

  // ============================================================
  // TIME METRICS (1)
  // ============================================================
  timeToSale: {
    description: "Average days from contact creation to closed deal",
    source: "HubSpot Contacts 'Created date' → Associated deal 'Close date'",
    interpretation: "Lower is better. Shows sales cycle speed. Typical: 7-30 days.",
  },

  // ============================================================
  // CALL-TO-CLOSE METRICS (1)
  // ============================================================
  callToCloseRate: {
    description: "Percentage of calls that resulted in closed won deals",
    source: "HubSpot Calls → Associated contacts → Deals (closedwon) / Total calls",
    interpretation: "Good rate: 1-3%. Shows conversion efficiency from calls to sales.",
    ifZero: "May indicate: no closed deals yet, or contacts not properly associated with calls.",
  },

  // ============================================================
  // A/B TESTING METRICS (2)
  // ============================================================
  salesScriptVersion: {
    description: "Conversion rates by different sales script versions",
    source: "HubSpot Contacts → 'Sales script version' custom field",
    interpretation: "Compare conversion rates to find best performing script.",
    ifZero: "Fill 'sales_script_version' field in HubSpot contacts for A/B testing.",
  },

  vslWatched: {
    description: "Conversion rates by VSL video watch status",
    source: "HubSpot Contacts → 'VSL watched' custom field (4min/18min markers)",
    interpretation: "Compare conversion rates to measure VSL effectiveness.",
    ifZero: "Fill 'vsl_watched' field in HubSpot contacts for tracking.",
  },
};

/**
 * Format metric definition into tooltip text
 */
export function formatMetricHelp(definition: MetricDefinition): string {
  let help = `${definition.description}\n\nSource: ${definition.source}`;

  if (definition.interpretation) {
    help += `\n\n${definition.interpretation}`;
  }

  if (definition.ifZero) {
    help += `\n\n⚠️ ${definition.ifZero}`;
  }

  return help;
}

/**
 * Get metric definition by key
 */
export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[key];
}
