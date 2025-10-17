'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomDatePicker } from './CustomDatePicker';

interface Owner {
  owner_id: string;
  owner_name: string;
  owner_email: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface FilterPanelProps {
  selectedOwner: string;
  dateRange: DateRange;
  onOwnerChange: (value: string) => void;
  onDateRangeChange: (range: DateRange) => void;
}

export function FilterPanel({
  selectedOwner,
  dateRange,
  onOwnerChange,
  onDateRangeChange,
}: FilterPanelProps) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOwners() {
      try {
        const res = await fetch('/api/owners');
        if (res.ok) {
          const data = await res.json();
          setOwners(data);
        }
      } catch (error) {
        console.error('Failed to fetch owners:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOwners();
  }, []);

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Sales Manager
          </label>
          <Select
            value={selectedOwner}
            onValueChange={onOwnerChange}
            disabled={loading}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Managers</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner.owner_id} value={owner.owner_id}>
                  {owner.owner_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Time Range
          </label>
          <CustomDatePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </div>
      </div>
    </div>
  );
}
