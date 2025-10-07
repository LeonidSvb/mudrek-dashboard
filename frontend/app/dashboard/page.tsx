import { Suspense } from 'react';
import { MetricCard } from '@/components/MetricCard';

async function getMetrics() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006';
  const res = await fetch(`${baseUrl}/api/metrics`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Failed to fetch metrics:', error);
    throw new Error('Failed to fetch metrics');
  }

  return res.json();
}

export default async function DashboardPage() {
  const metrics = await getMetrics();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="mt-2 text-gray-600">Track your sales performance and metrics</p>
        </header>

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
