'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PeriodSelectorProps {
  selectedDays: number;
  onPeriodChange: (days: number) => void;
}

export function PeriodSelector({ selectedDays, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Period:</span>
      <Tabs value={selectedDays.toString()} onValueChange={(value) => onPeriodChange(Number(value))}>
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger
            value="7"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            7 Days
          </TabsTrigger>
          <TabsTrigger
            value="30"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            30 Days
          </TabsTrigger>
          <TabsTrigger
            value="90"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            90 Days
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
