---
description: Implement calculations and caching layer for 22 metrics
globs: ["lib/calculations.ts", "lib/currency.ts", "db/tables/dashboard_metrics.sql"]
alwaysApply: false
---

id: "TASK-0005"
title: "Calculations and caching for 22 metrics"
status: "planned"
priority: "P0"
labels: [backend, metrics, caching]
dependencies: ["tasks/create-supabase-schema-and-views.md", "tasks/metrics-api-routes.md"]
created: "2025-09-24"

# 1) High-Level Objective

Compute the 22 metrics using Supabase queries and cache results into `dashboard_metrics` keyed by scope and filters.

# 2) Background / Context (Optional but recommended)

Tracking reports contain ready SQL for calls and sales metrics and list all required KPIs.

# 3) Assumptions & Constraints

- ASSUMPTION: Currency conversion needed (ILS/USD)
- Constraint: Cache TTL configurable (env), default 12 hours
- Constraint: Keep compute idempotent and safe to retry

# 4) Dependencies (Other Tasks or Artifacts)

- docs/UPDATED_TRACKING_REPORT.md _(read-only)_
- docs/TRACKING_SETUP_REPORT.md _(read-only)_

# 5) Context Plan

**Beginning (add to model context):**

- docs/UPDATED_TRACKING_REPORT.md
- docs/TRACKING_SETUP_REPORT.md
- db/views/*.sql _(read-only)_

**End state (must exist after completion):**

- lib/calculations.ts
- lib/currency.ts

# 6) Low-Level Steps (Ordered, information-dense)

1. Currency utility

   - File: `lib/currency.ts`
   - Exported API:
     ```ts
     export async function convertAmount(amount: number, from: "ILS"|"USD", to: "ILS"|"USD"): Promise<number>;
     export async function getRate(from: "ILS"|"USD", to: "ILS"|"USD"): Promise<number>;
     ```
   - Details:
     - Use ECB or configurable static rate `CURRENCY_USD_ILS_RATE`

2. Implement `calculateMetrics`

   - File: `lib/calculations.ts`
   - Details:
     - For each KPI, run SQL against views/tables; normalize into `{ key, value }`
     - Write to `dashboard_metrics` with `scope`, `dims` and `computed_at`

# 7) Types & Interfaces (if applicable)

```ts
export interface MetricQuery { scope: "daily"|"weekly"|"monthly"; from?: string; to?: string; ownerId?: string; source?: string; currency?: "ILS" | "USD"; }
export interface MetricResult { key: string; value: unknown; dims?: Record<string, unknown>; computedAt: string; }
```

# 8) Acceptance Criteria

- Calling `calculateMetrics({ scope: 'daily' })` returns all 22 KPIs
- Values cached to `dashboard_metrics` and reused via API route

# 9) Testing Strategy

- Seed minimal rows; compare outputs to expected values

# 10) Notes / Links

- Reference spec section: PRD.md → Success Metrics / Data Flow
- Related tasks: TASK-0003, TASK-0008, TASK-0009


