'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowDown } from 'lucide-react';

interface SalesFunnelData {
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

interface SalesFunnelProps {
  ownerId: string | null;
  dateFrom: string;
  dateTo: string;
}

export function SalesFunnel({ ownerId, dateFrom, dateTo }: SalesFunnelProps) {
  const [data, setData] = useState<SalesFunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunnel() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (ownerId && ownerId !== 'all') params.set('owner_id', ownerId);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);

        const res = await fetch(`/api/sales-funnel?${params.toString()}`);
        if (res.ok) {
          const funnel = await res.json();
          setData(funnel);
        }
      } catch (error) {
        console.error('Failed to fetch sales funnel:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFunnel();
  }, [ownerId, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Sales Funnel</h2>
        <Card className="p-8 animate-pulse">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-20 bg-gray-200 rounded w-full max-w-md"></div>
                {i < 4 && <div className="h-8 w-16 bg-gray-100 rounded mt-2"></div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Sales Funnel</h2>
        <Card className="p-6">
          <p className="text-sm text-gray-500 text-center">No data available</p>
        </Card>
      </div>
    );
  }

  const stages = [
    {
      name: 'Contacts Created',
      count: data.contacts.total,
      breakdown: [
        { label: 'New Leads', value: data.contacts.new_leads },
        { label: 'No Answer', value: data.contacts.no_answer },
        { label: 'Wrong Number', value: data.contacts.wrong_number },
        { label: 'Disqualified', value: data.contacts.disqualified },
      ].filter((item) => item.value > 0),
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-900',
    },
    {
      name: 'Deals Created',
      count: data.deals.total,
      breakdown: [
        { label: 'Qualified to Buy', value: data.deals.qualified_to_buy },
        { label: 'High Interest / Offer Sent', value: data.deals.high_interest },
      ].filter((item) => item.value > 0),
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-900',
    },
    {
      name: 'Closed Won',
      count: data.deals.closed_won,
      breakdown: [],
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-900',
    },
  ];

  const conversionRates = [
    data.conversion_rates.contact_to_deal,
    data.conversion_rates.deal_to_won,
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Sales Funnel</h2>

      <Card className="p-8">
        <div className="flex flex-col items-center space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex flex-col items-center w-full max-w-2xl">
              {/* Stage Card */}
              <div
                className={`w-full border-2 rounded-lg p-6 ${stage.color} ${stage.textColor}`}
              >
                <div className="text-center">
                  <div className="text-sm font-medium mb-1">{stage.name}</div>
                  <div className="text-4xl font-bold mb-2">{stage.count.toLocaleString()}</div>

                  {/* Breakdown */}
                  {stage.breakdown.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                      {stage.breakdown.map((item) => (
                        <div key={item.label} className="flex items-center gap-1">
                          <span className="font-medium">{item.label}:</span>
                          <span>{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Arrow */}
              {index < stages.length - 1 && (
                <div className="flex flex-col items-center py-2">
                  <ArrowDown className="h-6 w-6 text-gray-400" />
                  <div className="text-sm font-semibold text-gray-700 mt-1">
                    {conversionRates[index]}% conversion
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Overall Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200 w-full max-w-2xl">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">Overall Conversion</div>
                <div className="text-lg font-bold text-gray-900">
                  {data.contacts.total > 0
                    ? ((data.deals.closed_won / data.contacts.total) * 100).toFixed(2)
                    : 0}
                  %
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Closed Lost</div>
                <div className="text-lg font-bold text-red-600">
                  {data.deals.closed_lost.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Pipeline</div>
                <div className="text-lg font-bold text-gray-900">
                  {(
                    data.deals.qualified_to_buy +
                    data.deals.high_interest
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
