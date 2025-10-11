'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface TimelineDataPoint {
  date: string;
  value: number;
}

interface TimelineData {
  sales: TimelineDataPoint[];
  calls: TimelineDataPoint[];
}

interface TimelineChartsProps {
  ownerId: string | null;
  dateFrom: string;
  dateTo: string;
}

export function TimelineCharts({ ownerId, dateFrom, dateTo }: TimelineChartsProps) {
  const [data, setData] = useState<TimelineData>({ sales: [], calls: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          date_from: dateFrom,
          date_to: dateTo
        });

        if (ownerId) {
          params.set('owner_id', ownerId);
        }

        const res = await fetch(`/api/metrics/timeline?${params}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch timeline: ${res.status}`);
        }

        const timeline = await res.json();
        setData({
          sales: timeline.sales || [],
          calls: timeline.calls || []
        });
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
        setError(err instanceof Error ? err.message : 'Failed to load charts');
      } finally {
        setLoading(false);
      }
    }

    fetchTimeline();
  }, [ownerId, dateFrom, dateTo]);

  if (loading) {
    return <ChartsSkeleton />;
  }

  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">Failed to load charts: {error}</p>
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Sales Revenue Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Sales Revenue Timeline
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.sales}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                try {
                  return format(new Date(date), 'MMM d');
                } catch {
                  return date;
                }
              }}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `₪${(value / 1000).toFixed(0)}k`;
                }
                return `₪${value}`;
              }}
            />
            <Tooltip
              formatter={(value: number) => [`₪${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(date) => {
                try {
                  return format(new Date(date), 'MMM d, yyyy');
                } catch {
                  return date;
                }
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem'
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fill="url(#salesGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        {data.sales.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-500">No sales data for this period</p>
        )}
      </div>

      {/* Calls Volume Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Calls Volume Timeline
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.calls}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                try {
                  return format(new Date(date), 'MMM d');
                } catch {
                  return date;
                }
              }}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: number) => [`${value}`, 'Calls']}
              labelFormatter={(date) => {
                try {
                  return format(new Date(date), 'MMM d, yyyy');
                } catch {
                  return date;
                }
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        {data.calls.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-500">No calls data for this period</p>
        )}
      </div>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-[300px] animate-pulse rounded bg-gray-100" />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-[300px] animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
