'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface CustomDatePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function CustomDatePicker({ dateRange, onDateRangeChange }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: 'Today', days: 0 },
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
    { label: 'All Time', days: -1 }, // Special value for all time
  ];

  const handlePresetClick = (days: number) => {
    const to = new Date();
    let from: Date;

    if (days === -1) {
      // All time: set from to a very old date (e.g., 2020-01-01)
      from = new Date('2020-01-01');
    } else if (days === 0) {
      // Today
      from = new Date();
    } else {
      // Last N days
      from = subDays(to, days);
    }

    onDateRangeChange({ from, to });
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return 'Select date range';

    const fromStr = format(dateRange.from, 'MMM d, yyyy');
    const toStr = format(dateRange.to, 'MMM d, yyyy');

    if (fromStr === toStr) return fromStr;
    return `${fromStr} → ${toStr}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick presets */}
      <div className="flex gap-1">
        {presets.map(({ label, days }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(days)}
            className="h-8 px-3"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Custom range picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[280px] justify-start text-left font-normal',
              !dateRange.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
