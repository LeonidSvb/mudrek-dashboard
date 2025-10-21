'use client';

import { ArrowUpIcon, ArrowDownIcon, MinusIcon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MetricCardProps {
  title: string;
  value: string | number;
  format?: 'number' | 'currency' | 'percentage' | 'duration' | 'decimal';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    period?: string;
  };
  subtitle?: string;
  className?: string;
  helpText?: string; // NEW! Tooltip with explanation
}

export function MetricCard({
  title,
  value,
  format = 'number',
  trend,
  subtitle,
  className,
  helpText
}: MetricCardProps) {
  const formattedValue = formatValue(value, format);

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-gray-600">{title}</p>
            {helpText && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="mt-1 text-lg font-bold text-gray-900">{formattedValue}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium',
              trend.direction === 'up' && 'bg-green-50 text-green-700',
              trend.direction === 'down' && 'bg-red-50 text-red-700',
              trend.direction === 'neutral' && 'bg-gray-50 text-gray-700'
            )}
          >
            {trend.direction === 'up' && <ArrowUpIcon className="h-4 w-4" />}
            {trend.direction === 'down' && <ArrowDownIcon className="h-4 w-4" />}
            {trend.direction === 'neutral' && <MinusIcon className="h-4 w-4" />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      {trend?.period && (
        <p className="mt-3 text-xs text-gray-500">{trend.period}</p>
      )}
    </div>
  );
}

function formatValue(value: string | number, format: string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue) || numValue === null || numValue === undefined) return '0';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);

    case 'percentage':
      return `${numValue.toFixed(1)}%`;

    case 'decimal':
      return numValue.toFixed(2);

    case 'duration':
      const minutes = Math.floor(numValue);
      const seconds = Math.round((numValue - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;

    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(numValue);
  }
}
