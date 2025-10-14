'use client';

import { useState, useEffect } from 'react';
import { subDays } from 'date-fns';
import { MetricCard } from '@/components/MetricCard';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DealsBreakdown } from '@/components/dashboard/DealsBreakdown';
import { TimelineCharts } from '@/components/dashboard/TimelineCharts';
import { SyncControls } from '@/components/SyncControls';
import type { AllMetrics } from '@/lib/db/metrics-fast';

interface DateRange {
  from: Date;
  to: Date;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<AllMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 90), // Changed from 30 to 90 days to include all data
    to: new Date(),
  });

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (ownerId && ownerId !== 'all') {
          params.set('owner_id', ownerId);
        }

        // Format dates as YYYY-MM-DD
        params.set('date_from', dateRange.from.toISOString().split('T')[0]);
        params.set('date_to', dateRange.to.toISOString().split('T')[0]);

        const url = `/api/metrics${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`Failed to fetch metrics: ${res.status}`);
        }

        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [ownerId, dateRange]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h3 className="text-lg font-semibold text-red-900">Error loading metrics</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !metrics) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="mt-2 text-gray-600">Track your sales performance and metrics</p>
        </header>

        <FilterPanel
          selectedOwner={ownerId}
          dateRange={dateRange}
          onOwnerChange={setOwnerId}
          onDateRangeChange={setDateRange}
        />

        {/* Sync Controls */}
        <div className="mb-6">
          <SyncControls />
        </div>

        {/* Deals Breakdown by Stage */}
        <DealsBreakdown
          ownerId={ownerId === 'all' ? null : ownerId}
          dateFrom={dateRange.from.toISOString().split('T')[0]}
          dateTo={dateRange.to.toISOString().split('T')[0]}
        />

        {/* Timeline Charts */}
        <TimelineCharts
          ownerId={ownerId === 'all' ? null : ownerId}
          dateFrom={dateRange.from.toISOString().split('T')[0]}
          dateTo={dateRange.to.toISOString().split('T')[0]}
        />

        {/* Top 4 KPIs */}
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Key Metrics</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Call Performance</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Conversion</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Payments</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">Followup</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="mb-2 h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-6 w-96 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Filter skeleton */}
        <div className="mb-6 flex gap-4">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Top 4 KPIs skeleton */}
        <div className="mb-8">
          <div className="mb-4 h-8 w-72 animate-pulse rounded-lg bg-gray-200" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
                <div className="mb-2 h-8 w-32 rounded bg-gray-200" />
                <div className="h-3 w-28 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Additional sections skeleton */}
        {[1, 2, 3, 4, 5].map((section) => (
          <div key={section} className="mb-8">
            <div className="mb-4 h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg bg-white shadow-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
