---
description: Implement MetricsGrid and MetricCard UI with responsive layout
globs: ["components/**", "app/page.tsx", "styles/globals.css"]
alwaysApply: false
---

id: "TASK-0006"
title: "Build dashboard MetricsGrid and cards"
status: "planned"
priority: "P1"
labels: [frontend, ui, tailwind]
dependencies: ["tasks/setup-nextjs-app.md", "tasks/metrics-api-routes.md"]
created: "2025-09-24"

# 1) High-Level Objective

Create the main dashboard page with a responsive grid and MetricCard-based KPIs per PRD.

# 2) Background / Context (Optional but recommended)

PRD specifies grid layout: 4 columns desktop, 2 tablet, 1 mobile.

# 3) Assumptions & Constraints

- ASSUMPTION: Tailwind configured
- Constraint: No heavy UI libs beyond Recharts

# 4) Dependencies (Other Tasks or Artifacts)

- tasks/charts-components.md
- tasks/filters-date-owner-source.md

# 5) Context Plan

**Beginning (add to model context):**

- app/page.tsx
- components/MetricCard.tsx
- styles/globals.css _(read-only)_

**End state (must exist after completion):**

- components/MetricsGrid.tsx
- app/page.tsx (fetches `/api/metrics` and renders KPIs)

# 6) Low-Level Steps (Ordered, information-dense)

1. MetricsGrid component

   - File: `components/MetricsGrid.tsx`
   - Exported API:
     ```ts
     export interface MetricsGridProps { metrics: Array<{ key: string; value: unknown }>; }
     export function MetricsGrid(props: MetricsGridProps): JSX.Element;
     ```
   - Details:
     - CSS grid responsive classes per PRD

2. Hook up on page

   - File: `app/page.tsx`
   - Fetch from `/api/metrics?scope=daily` on server side; render top 14 ready metrics

# 7) Types & Interfaces (if applicable)

```ts
export interface MetricsGridProps { metrics: Array<{ key: string; value: unknown }>; }
```

# 8) Acceptance Criteria

- Dashboard displays at least 14 metrics
- Layout adapts to desktop/tablet/mobile per PRD

# 9) Testing Strategy

- Visual check across breakpoints
- Verify no CLS and fast render from cached API

# 10) Notes / Links

- Reference spec section: PRD.md → UI Design Specifications → Layout
- Related tasks: TASK-0009, TASK-0011


