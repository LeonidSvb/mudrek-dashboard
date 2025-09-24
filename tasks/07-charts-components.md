---
description: Implement chart components (line, bar, stacked, pie/donut, funnel) using Recharts
globs: ["components/charts/**"]
alwaysApply: false
---

id: "TASK-0007"
title: "Add chart components per PRD"
status: "planned"
priority: "P1"
labels: [frontend, charts, recharts]
dependencies: ["tasks/setup-nextjs-app.md", "tasks/metrics-api-routes.md"]
created: "2025-09-24"

# 1) High-Level Objective

Provide reusable chart components to visualize listed metrics: trends, breakdowns, distributions, funnel.

# 2) Background / Context

PRD specifies multiple chart types and breakdowns; Recharts is preferred.

# 3) Assumptions & Constraints

- ASSUMPTION: Data provided by `/api/metrics` and supplemental endpoints
- Constraint: No heavy animations; focus on readability

# 4) Dependencies

- tasks/ui-components-metrics-grid.md

# 5) Context Plan

**Beginning:**
- PRD.md _(read-only)_
- components/MetricsGrid.tsx _(read-only)_

**End state:**
- components/charts/LineTrend.tsx
- components/charts/BarGrouped.tsx
- components/charts/BarStacked.tsx
- components/charts/PieDonut.tsx
- components/charts/FunnelChart.tsx

# 6) Low-Level Steps

1. Create LineTrend component
   - File: `components/charts/LineTrend.tsx`
   - Exported API:
     ```ts
     export interface LineTrendProps { data: Array<{ x: string|number; y: number }>; height?: number; color?: string; }
     export function LineTrend(props: LineTrendProps): JSX.Element;
     ```

2. Create grouped/stacked bars, pie/donut, funnel similarly

# 7) Types & Interfaces

```ts
export interface LineTrendProps { data: Array<{ x: string|number; y: number }>; height?: number; color?: string; }
```

# 8) Acceptance Criteria

- All five components render sample data without console errors

# 9) Testing Strategy

- Storybook-like demo page under `/charts-demo` (optional)

# 10) Notes

- PRD.md → Charts & Visualizations


