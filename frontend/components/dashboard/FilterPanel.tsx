'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Owner {
  owner_id: string;
  owner_name: string;
  owner_email: string;
}

export function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedOwner = searchParams.get('owner_id') || 'all';
  const selectedRange = searchParams.get('range') || '30d';

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

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === 'all' && key === 'owner_id') {
      params.delete('owner_id');
    } else {
      params.set(key, value);
    }

    router.push(`?${params.toString()}`);
    router.refresh();
  };

  const handleOwnerChange = (value: string) => {
    updateFilter('owner_id', value);
  };

  const handleRangeChange = (value: string) => {
    updateFilter('range', value);
  };

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Sales Manager
          </label>
          <Select
            value={selectedOwner}
            onValueChange={handleOwnerChange}
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
          <Tabs value={selectedRange} onValueChange={handleRangeChange}>
            <TabsList>
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
              <TabsTrigger value="90d">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
