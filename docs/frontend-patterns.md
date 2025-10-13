# Frontend Code Patterns & Examples

Это reference файл с примерами кода для frontend разработки (React/Next.js/TypeScript).
**НЕ загружается автоматически** - используй только по необходимости.

---

## TypeScript Patterns

### Interface vs Type

```typescript
// Good - interface for objects
interface MetricCardProps {
  title: string;
  value: number;
  trend?: 'up' | 'down' | 'neutral';
  onChange?: (value: number) => void;
}

export function MetricCard({ title, value, trend }: MetricCardProps) {
  // Component logic
}
```

### Const Objects instead of Enums

```typescript
// Good - const object
const TREND = {
  UP: 'up',
  DOWN: 'down',
  NEUTRAL: 'neutral'
} as const;

type Trend = typeof TREND[keyof typeof TREND];
```

### Discriminated Unions

```typescript
interface SuccessResult {
  success: true;
  data: MetricData;
}

interface ErrorResult {
  success: false;
  error: string;
}

type ApiResult = SuccessResult | ErrorResult;
```

---

## Next.js App Router

### Server Component (default)

```typescript
// app/dashboard/page.tsx
async function DashboardPage() {
  const metrics = await fetchMetrics();
  return <MetricsDashboard data={metrics} />;
}
```

### Client Component (minimal)

```typescript
'use client';
import { useState } from 'react';

export function InteractiveChart({ data }: ChartProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div onClick={() => setSelected(data.id)}>
      {/* Chart rendering */}
    </div>
  );
}
```

### Data Fetching (Server)

```typescript
import { Suspense } from 'react';

async function DashboardPage() {
  const metrics = await fetch('http://localhost:3000/api/metrics', {
    cache: 'no-store'  // Always fresh data
  });

  const data = await metrics.json();

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MetricsDashboard data={data} />
    </Suspense>
  );
}
```

### Data Fetching (Client with SWR)

```typescript
'use client';
import useSWR from 'swr';

export function LiveMetrics() {
  const { data, error, isLoading } = useSWR('/api/metrics', fetcher, {
    refreshInterval: 60000  // Refresh every minute
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return <MetricsView data={data} />;
}
```

---

## Supabase Integration (Next.js)

### Browser Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );
}
```

### Usage in Server Components

```typescript
import { createClient } from '@/lib/supabase/server';

async function MetricsPage() {
  const supabase = await createClient();
  const { data: metrics } = await supabase
    .from('metrics_view')
    .select('*');

  return <MetricsDisplay data={metrics} />;
}
```

### Usage in Client Components

```typescript
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function LiveData() {
  const [data, setData] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('metrics').select('*');
      setData(data);
    }
    fetchData();
  }, []);

  return <div>{/* render */}</div>;
}
```

---

## Tailwind CSS with cn() Utility

```typescript
import { cn } from "@/lib/utils";

export function Button({ variant, isLoading, children }: ButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md font-medium",
        variant === 'primary' && "bg-blue-600 text-white",
        variant === 'secondary' && "bg-gray-200 text-gray-900",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
```

---

## Component Structure Template

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Types/Interfaces first
interface MetricCardProps {
  title: string;
  value: number;
  trend?: 'up' | 'down';
}

// Main Component
export function MetricCard({ title, value, trend }: MetricCardProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);

  // Event handlers
  const handleClick = () => setIsExpanded(!isExpanded);

  // Render
  return (
    <div onClick={handleClick}>
      <h3>{title}</h3>
      <p>{formatValue(value)}</p>
      {trend && <TrendIndicator direction={trend} />}
    </div>
  );
}

// Helper functions at the end
function formatValue(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
```

---

## API Routes

```typescript
// app/api/hubspot/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Prisma Usage

```typescript
import { prisma } from '@/lib/prisma';

// Type-safe queries with autocomplete
const deals = await prisma.hubspot_deals_raw.findMany({
  where: { dealstage: 'closedwon' },
  select: { amount: true, dealstage: true, closedate: true }
});

// TypeScript knows: deals[0].amount is Decimal | null
const totalSales = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
```

---

## Performance Optimization

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false  // Client-only component
});
```

### Next.js Image

```typescript
import Image from 'next/image';

export function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Logo"
      width={200}
      height={50}
      priority  // For above-the-fold images
    />
  );
}
```

---

## State Management

### URL State (nuqs)

```typescript
import { useQueryState } from 'nuqs';

export function DateRangePicker() {
  const [startDate, setStartDate] = useQueryState('start');
  const [endDate, setEndDate] = useQueryState('end');

  return <DatePicker start={startDate} end={endDate} onChange={...} />;
}
```
