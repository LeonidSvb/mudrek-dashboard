'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface CallToCloseMetric {
  owner_id: string;
  owner_name: string;
  total_calls: number;
  closed_won: number;
  call_to_close_rate: number;
}

interface TeamCallToCloseProps {
  dateFrom?: string;
  dateTo?: string;
}

export function TeamCallToClose({ dateFrom, dateTo }: TeamCallToCloseProps) {
  const [teamRate, setTeamRate] = useState<number>(0);
  const [top3, setTop3] = useState<CallToCloseMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);

        const url = `/api/metrics/call-to-close${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();

        // Filter 3 sales managers
        const salesManagers = data.filter((m: CallToCloseMetric) =>
          ['81280578', '726197388', '687247262'].includes(m.owner_id)
        );

        if (salesManagers.length === 0) {
          setTeamRate(0);
          setTop3([]);
          return;
        }

        // Calculate team rate
        const totalCalls = salesManagers.reduce((sum: number, m: CallToCloseMetric) => sum + m.total_calls, 0);
        const totalWon = salesManagers.reduce((sum: number, m: CallToCloseMetric) => sum + m.closed_won, 0);
        const rate = totalCalls > 0 ? (totalWon / totalCalls) * 100 : 0;

        // Sort by call_to_close_rate descending
        const sorted = [...salesManagers].sort((a, b) => b.call_to_close_rate - a.call_to_close_rate);

        setTeamRate(rate);
        setTop3(sorted);
      } catch (err) {
        console.error('Failed to fetch team call-to-close:', err);
        setTeamRate(0);
        setTop3([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <Card className="p-3 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
        <div className="h-6 bg-gray-200 rounded w-12"></div>
      </Card>
    );
  }

  return (
    <Card className="p-3 hover:shadow-lg transition-shadow">
      <div className="text-xs font-medium text-gray-500 mb-0.5">Team Call-to-Close</div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{teamRate.toFixed(1)}%</div>

      <div className="flex gap-3 text-xs">
        {top3.map((manager) => (
          <div key={manager.owner_id} className="flex items-center gap-1">
            <span className="text-gray-600">{manager.owner_name.split(' ')[0]}:</span>
            <span className={`font-semibold ${
              manager.call_to_close_rate > 1 ? 'text-green-600' :
              manager.call_to_close_rate > 0 ? 'text-yellow-600' :
              'text-gray-400'
            }`}>
              {manager.call_to_close_rate.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
