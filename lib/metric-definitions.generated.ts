/**
 * Centralized metric definitions with explanations
 *
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from: docs/metrics-schema.yaml
 * Run: npm run docs:generate
 */

export interface MetricDefinition {
  description: string;
  source: string;
  interpretation?: string;
  ifZero?: string;
  sql?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ============================================================
  // SALES METRICS
  // ============================================================
  totalSales: {
    description: "Total revenue from closed deals",
    source: "HubSpot Deals → 'Amount' field (dealstage = closedwon)",
    sql: "SELECT SUM(amount) AS total_sales\nFROM deals\nWHERE dealstage = 'closedwon'\n  AND closedate BETWEEN :date_from AND :date_to",
    interpretation: "Higher is better. Shows overall business performance.",
  },

  avgDealSize: {
    description: "Average revenue per closed deal",
    source: "HubSpot Deals → Sum of 'Amount' / Count of closedwon deals",
    sql: "SELECT AVG(amount) AS avg_deal_size\nFROM deals\nWHERE dealstage = 'closedwon'\n  AND closedate BETWEEN :date_from AND :date_to",
    interpretation: "Higher is better. Shows deal quality and pricing effectiveness.",
  },

  totalDeals: {
    description: "Total number of closed won deals",
    source: "HubSpot Deals → Count where dealstage = closedwon",
    sql: "SELECT COUNT(*) AS total_deals\nFROM deals\nWHERE dealstage = 'closedwon'\n  AND closedate BETWEEN :date_from AND :date_to",
    interpretation: "Higher is better. Shows sales volume.",
  },

  conversionRate: {
    description: "Percentage of contacts who became paying customers",
    source: "HubSpot Contacts created → Deals closedwon ratio",
    sql: "SELECT\n  COUNT(DISTINCT d.contact_id)::float /\n  NULLIF(COUNT(DISTINCT c.id), 0) * 100 AS conversion_rate\nFROM contacts c\nLEFT JOIN deals d ON d.contact_id = c.id AND d.dealstage = 'closedwon'\nWHERE c.createdate BETWEEN :date_from AND :date_to",
    interpretation: "Good rate: 5-15%. Shows overall funnel effectiveness.",
  },

  totalContactsCreated: {
    description: "New contacts added in selected period",
    source: "HubSpot Contacts → 'Created date' field",
    sql: "SELECT COUNT(*) AS total_contacts\nFROM contacts\nWHERE createdate BETWEEN :date_from AND :date_to",
    interpretation: "Shows lead generation performance. More contacts = more opportunities.",
  },

  // ============================================================
  // CALL PERFORMANCE METRICS
  // ============================================================
  totalCalls: {
    description: "Total calls made in selected period",
    source: "HubSpot Calls → All logged call activities",
    sql: "SELECT COUNT(*) AS total_calls\nFROM calls\nWHERE call_date BETWEEN :date_from AND :date_to",
    interpretation: "Higher call volume = more engagement. Track alongside conversion metrics.",
  },

  avgCallTime: {
    description: "Average duration of calls in minutes",
    source: "HubSpot Calls → 'Duration' field average",
    sql: "SELECT AVG(duration_minutes) AS avg_call_time\nFROM calls\nWHERE call_date BETWEEN :date_from AND :date_to",
    interpretation: "Longer calls (2-5 min) often indicate more engaged conversations.",
  },

  totalCallTime: {
    description: "Total time spent on calls in hours",
    source: "HubSpot Calls → Sum of all 'Duration' fields",
    sql: "SELECT SUM(duration_minutes) / 60.0 AS total_call_hours\nFROM calls\nWHERE call_date BETWEEN :date_from AND :date_to",
    interpretation: "Shows team effort. Combine with conversion rate to measure efficiency.",
  },

  pickupRate: {
    description: "Percentage of calls where contact answered and had real conversation",
    source: "HubSpot Calls → 'Call outcome' property (Connected status with 4+ min duration)",
    sql: "SELECT\n  COUNT(*) FILTER (WHERE outcome = 'CONNECTED' AND duration_minutes >= 4)::float /\n  NULLIF(COUNT(*), 0) * 100 AS pickup_rate\nFROM calls\nWHERE call_date BETWEEN :date_from AND :date_to",
    interpretation: "Good rate: 40-50%. Lower rate may indicate bad timing or wrong numbers.",
  },

  fiveMinReachedRate: {
    description: "Percentage of calls lasting 5 minutes or longer",
    source: "HubSpot Calls → 'Duration' >= 5 minutes",
    sql: "SELECT\n  COUNT(*) FILTER (WHERE duration_minutes >= 5)::float /\n  NULLIF(COUNT(*), 0) * 100 AS five_min_rate\nFROM calls\nWHERE call_date BETWEEN :date_from AND :date_to",
    interpretation: "Quality indicator. High-value conversations typically last 5+ minutes.",
  },

  // ============================================================
  // CONVERSION METRICS
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
    sql: "SELECT\n  COUNT(*) FILTER (WHERE dealstage = 'closedlost')::float /\n  NULLIF(COUNT(*), 0) * 100 AS cancellation_rate\nFROM deals\nWHERE createdate BETWEEN :date_from AND :date_to",
    interpretation: "Lower is better. High rate (>40%) indicates pricing or qualification issues.",
  },

  // ============================================================
  // PAYMENT METRICS
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
  // FOLLOWUP METRICS
  // ============================================================
  followupRate: {
    description: "Percentage of contacts with follow-up calls",
    source: "HubSpot Contacts → Calls count > 1",
    sql: "SELECT\n  COUNT(DISTINCT contact_id) FILTER (WHERE call_count > 1)::float /\n  NULLIF(COUNT(DISTINCT contact_id), 0) * 100 AS followup_rate\nFROM (\n  SELECT contact_id, COUNT(*) as call_count\n  FROM calls\n  GROUP BY contact_id\n) subquery",
    interpretation: "Good rate: 60-80%. Shows persistence in outreach.",
  },

  avgFollowups: {
    description: "Average number of calls per contact",
    source: "HubSpot Contacts → Average calls count",
    sql: "SELECT AVG(call_count) AS avg_followups\nFROM (\n  SELECT contact_id, COUNT(*) as call_count\n  FROM calls\n  GROUP BY contact_id\n) subquery",
    interpretation: "Typical: 2-4 calls. Too high (>6) may indicate poor targeting.",
  },

  timeToFirstContact: {
    description: "Average days from contact creation to first call",
    source: "HubSpot Contacts 'Created date' → First call timestamp",
    sql: "SELECT AVG(first_call_days) AS avg_time_to_first_contact\nFROM (\n  SELECT\n    c.id,\n    MIN(call_date) - c.createdate AS first_call_days\n  FROM contacts c\n  JOIN calls ON calls.contact_id = c.id\n  WHERE c.createdate BETWEEN :date_from AND :date_to\n  GROUP BY c.id\n) subquery",
    interpretation: "Lower is better. Fast response (< 1 day) improves conversion.",
  },

  // ============================================================
  // OFFER METRICS
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
  // TIME METRICS
  // ============================================================
  timeToSale: {
    description: "Average days from contact creation to closed deal",
    source: "HubSpot Contacts 'Created date' → Associated deal 'Close date'",
    sql: "SELECT AVG(close_date - createdate) AS avg_time_to_sale\nFROM contacts c\nJOIN deals d ON d.contact_id = c.id\nWHERE d.dealstage = 'closedwon'\n  AND d.closedate BETWEEN :date_from AND :date_to",
    interpretation: "Lower is better. Shows sales cycle speed. Typical: 7-30 days.",
  },

  // ============================================================
  // CALL-TO-CLOSE METRICS
  // ============================================================
  callToCloseRate: {
    description: "Percentage of calls that resulted in closed won deals",
    source: "HubSpot Calls → Associated contacts → Deals (closedwon) / Total calls",
    interpretation: "Good rate: 1-3%. Shows conversion efficiency from calls to sales.",
    ifZero: "May indicate: no closed deals yet, or contacts not properly associated with calls.",
  },

  // ============================================================
  // A/B TESTING METRICS
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
