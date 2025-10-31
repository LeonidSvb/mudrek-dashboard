'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface DealStageData {
  stage: string;
  count: number;
  amount: number;
}

interface DealsBreakdownProps {
  ownerId: string | null;
  dateFrom: string;
  dateTo: string;
}

const STAGE_LABELS: Record<string, string> = {
  appointmentscheduled: 'Appointments',
  closedwon: 'Closed Won',
  closedlost: 'Closed Lost',
  qualifiedtobuy: 'Qualified',
  presentationscheduled: 'Presentations',
  decisionmakerboughtin: 'Decision Maker',
  contractsent: 'Contract Sent',
  unknown: 'Unknown',
};

export function DealsBreakdown({ ownerId, dateFrom, dateTo }: DealsBreakdownProps) {
  const [data, setData] = useState<DealStageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBreakdown() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (ownerId && ownerId !== 'all') params.set('owner_id', ownerId);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);

        const res = await fetch(`/api/deals/breakdown?${params.toString()}`);
        if (res.ok) {
          const breakdown = await res.json();
          setData(breakdown);
        }
      } catch (error) {
        console.error('Failed to fetch deals breakdown:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBreakdown();
  }, [ownerId, dateFrom, dateTo]);

  const totalDeals = data.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="mb-3">
        <h2 className="text-xs font-semibold mb-2 text-gray-600 uppercase tracking-wide">Deals by Stage</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mb-3">
        <h2 className="text-xs font-semibold mb-2 text-gray-600 uppercase tracking-wide">Deals by Stage</h2>
        <Card className="p-6">
          <p className="text-sm text-gray-500 text-center">No deals found for selected filters</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Deals by Stage</h2>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{totalDeals}</span> deals
          {totalAmount > 0 && (
            <>
              {' • '}
              <span className="font-medium">{formatAmount(totalAmount)}</span> total
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {data.map((item) => (
          <Card key={item.stage} className="p-4 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-gray-500 mb-1">
              {STAGE_LABELS[item.stage] || item.stage}
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.count}</div>
            {item.amount > 0 && (
              <div className="text-xs text-gray-600 mt-1">{formatAmount(item.amount)}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
