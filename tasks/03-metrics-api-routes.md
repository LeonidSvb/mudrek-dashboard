---
description: Implement Metrics API routes in Next.js to read cached metrics or compute on demand
globs: ["app/api/metrics/**", "lib/calculations.ts", "lib/supabase.ts"]
alwaysApply: false
---

id: "TASK-0003"
title: "Implement Metrics API routes (Next.js)"
status: "planned"
priority: "P0"
labels: [backend, nextjs, api]
dependencies: ["tasks/setup-nextjs-app.md", "tasks/create-supabase-schema-and-views.md"]
created: "2025-09-24"

# 1) High-Level Objective

Expose `/api/metrics` endpoints returning the 22 metrics using Supabase views/tables and cache in `dashboard_metrics`.

# 2) Background / Context (Optional but recommended)

PRD requires fast loading; API should serve cached metrics and compute only when stale.

# 3) Assumptions & Constraints

- ASSUMPTION: `lib/supabase.ts` is available
- Constraint: No auth; internal tool
- Constraint: Response < 300ms for cached metrics

# 4) Dependencies (Other Tasks or Artifacts)

- tasks/metrics-calculation-cache.md
- db/views/*.sql _(read-only)_

# 5) Context Plan

**Beginning (add to model context):**

- lib/supabase.ts
- db/views/daily_call_activity.sql _(read-only)_
- db/views/manager_performance.sql _(read-only)_
- db/views/sales_funnel.sql _(read-only)_

**End state (must exist after completion):**

- app/api/metrics/route.ts
- lib/calculations.ts

# 6) Low-Level Steps (Ordered, information-dense)

1. Create calculations module

   - File: `lib/calculations.ts`
   - Exported API:
     ```ts
     export type MetricScope = "daily" | "weekly" | "monthly";
     export interface MetricQuery { scope: MetricScope; from?: string; to?: string; ownerId?: string; source?: string; currency?: "ILS" | "USD"; }
     export interface MetricResult { key: string; value: unknown; dims?: Record<string, unknown>; computedAt: string; }
     export async function calculateMetrics(query: MetricQuery): Promise<MetricResult[]>;
     ```
   - Details:
     - Query Supabase views; map to 22 metrics keys
     - Convert currency if requested (using exchange util)

2. Implement API route

   - File: `app/api/metrics/route.ts`
   - Add support for GET with query params: `scope`, `from`, `to`, `ownerId`, `source`, `currency`
   - Retrieve from `dashboard_metrics` by unique key; if stale or missing, call `calculateMetrics`, upsert cache, return fresh

# 7) Types & Interfaces (if applicable)

```ts
export type MetricScope = "daily" | "weekly" | "monthly";
export interface MetricQuery { scope: MetricScope; from?: string; to?: string; ownerId?: string; source?: string; currency?: "ILS" | "USD"; }
export interface MetricResult { key: string; value: unknown; dims?: Record<string, unknown>; computedAt: string; }
```

# 8) Acceptance Criteria

- GET `/api/metrics?scope=daily` returns JSON with 22 metric keys
- Cache is written to `dashboard_metrics` and reused on subsequent calls
- Query params filter results by owner/source/date range

# 9) Testing Strategy

- Manual: call endpoint with curl/Postman, verify payload shape and timing
- Insert sample rows to views; verify aggregation mapping

# 10) Notes / Links

- Reference spec section: PRD.md → Data Flow / Display
- Related tasks: TASK-0004, TASK-0008, TASK-0009


