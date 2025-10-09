import { Suspense } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { getAllMetrics } from '@/lib/db/metrics-fast';

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getMetrics(params: { owner_id?: string; range?: string }) {
  const filters: {
    ownerId?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  } = {
    ownerId: null,
    dateFrom: null,
    dateTo: null,
  };

  if (params.owner_id && params.owner_id !== 'all') {
    filters.ownerId = params.owner_id;
  }

  if (params.range) {
    const now = new Date();
    const days = params.range === '7d' ? 7 : params.range === '30d' ? 30 : 90;
    const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    filters.dateFrom = dateFrom.toISOString().split('T')[0];
    filters.dateTo = now.toISOString().split('T')[0];
  }

  return await getAllMetrics(filters);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const owner_id = typeof params.owner_id === 'string' ? params.owner_id : undefined;
  // Default to 30 days if not specified - aligned with SQL function filters
  const range = typeof params.range === 'string' ? params.range : '30d';

  const metrics = await getMetrics({ owner_id, range });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="mt-2 text-gray-600">Track your sales performance and metrics</p>
        </header>

        <FilterPanel />

        {/* Top 4 KPIs */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Sales"
              value={metrics.totalSales}
              format="currency"
              subtitle="Closed won deals"
            />

            <MetricCard
              title="Average Deal Size"
              value={metrics.avgDealSize}
              format="currency"
              subtitle="Per closed deal"
            />

            <MetricCard
              title="Total Deals"
              value={metrics.totalDeals}
              format="number"
              subtitle="Closed won"
            />

            <MetricCard
              title="Conversion Rate"
              value={metrics.conversionRate}
              format="percentage"
              subtitle="Contacts to customers"
            />
          </div>
        </div>

        {/* Call Metrics */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Call Performance</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Calls"
              value={metrics.totalCalls}
              format="number"
              subtitle="All calls made"
            />

            <MetricCard
              title="Average Call Time"
              value={metrics.avgCallTime}
              format="decimal"
              subtitle="Minutes per call"
            />

            <MetricCard
              title="Total Call Time"
              value={metrics.totalCallTime}
              format="decimal"
              subtitle="Hours total"
            />

            <MetricCard
              title="5min Reached Rate"
              value={metrics.fiveMinReachedRate}
              format="percentage"
              subtitle="Calls over 5 minutes"
            />
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Conversion & Quality</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Qualified Rate"
              value={metrics.qualifiedRate}
              format="percentage"
              subtitle="Qualified leads"
            />

            <MetricCard
              title="Trial Rate"
              value={metrics.trialRate}
              format="percentage"
              subtitle="Trial signups"
            />

            <MetricCard
              title="Cancellation Rate"
              value={metrics.cancellationRate}
              format="percentage"
              subtitle="Closed lost deals"
            />
          </div>
        </div>

        {/* Payment Metrics */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Payment & Installments</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Upfront Cash Collected"
              value={metrics.upfrontCashCollected}
              format="currency"
              subtitle="Total first payments"
            />

            <MetricCard
              title="Avg Installments"
              value={metrics.avgInstallments}
              format="decimal"
              subtitle="Payment plan months"
            />
          </div>
        </div>

        {/* Followup Metrics */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Followup Activity</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Followup Rate"
              value={metrics.followupRate}
              format="percentage"
              subtitle="Contacts with multiple calls"
            />

            <MetricCard
              title="Avg Followups"
              value={metrics.avgFollowups}
              format="decimal"
              subtitle="Followup calls per contact"
            />

            <MetricCard
              title="Time to First Contact"
              value={metrics.timeToFirstContact}
              format="decimal"
              subtitle="Days to first call"
            />
          </div>
        </div>

        {/* Time Metrics */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Time Performance</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Time to Sale"
              value={metrics.timeToSale}
              format="decimal"
              subtitle="Days from create to close"
            />

            <MetricCard
              title="Time to First Contact"
              value={metrics.timeToFirstContact}
              format="decimal"
              subtitle="Days to first call"
            />
          </div>
        </div>

        {/* Offer Metrics */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Offer & Proposal</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Offers Given Rate"
              value={metrics.offersGivenRate}
              format="percentage"
              subtitle="Deals with offers sent"
            />

            <MetricCard
              title="Offer → Close Rate"
              value={metrics.offerCloseRate}
              format="percentage"
              subtitle="Offers that closed won"
            />
          </div>
        </div>

        {/* A/B Testing Metrics */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-700">A/B Testing</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Sales Script Performance</h3>
              {metrics.salesScriptStats && metrics.salesScriptStats.length > 0 ? (
                <div className="space-y-3">
                  {metrics.salesScriptStats.map((stat) => (
                    <div key={stat.version} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium text-gray-900">{stat.version}</p>
                        <p className="text-sm text-gray-500">
                          {stat.conversions} / {stat.totalContacts} contacts
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{stat.conversionRate.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">VSL Watch Impact</h3>
              {metrics.vslWatchStats && metrics.vslWatchStats.length > 0 ? (
                <div className="space-y-3">
                  {metrics.vslWatchStats.map((stat) => (
                    <div key={stat.watched} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {stat.watched === 'yes' ? 'Watched VSL' : stat.watched === 'no' ? 'Did not watch' : 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {stat.conversions} / {stat.totalContacts} contacts
                        </p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{stat.conversionRate.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 h-12 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
