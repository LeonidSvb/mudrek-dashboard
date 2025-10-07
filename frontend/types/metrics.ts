// Metrics Types for Dashboard

export interface Metric {
  id: string;
  label: string;
  value: number | string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  trend?: MetricTrend;
  subtitle?: string;
}

export interface MetricTrend {
  direction: 'up' | 'down' | 'neutral';
  value: number;
  period: string;
}

export interface DashboardFilters {
  ownerId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
}

// API Response types
export interface MetricsResponse {
  totalSales: number;
  avgDealSize: number;
  totalDeals: number;
  conversionRate: number;
  avgCallTime: number;
  totalCallTime: number;
  qualifiedRate: number;
  trialRate: number;
}

export interface OwnerMetric {
  ownerId: string;
  ownerName: string;
  totalSales: number;
  totalDeals: number;
  avgDealSize: number;
}
