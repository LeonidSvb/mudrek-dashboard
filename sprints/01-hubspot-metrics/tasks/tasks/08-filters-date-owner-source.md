---
description: Implement date range, grouping, owner, source, payment method filters and compare mode
globs: ["components/filters/**", "app/page.tsx"]
alwaysApply: false
---

id: "TASK-0008"
title: "Add filters and compare mode"
status: "planned"
priority: "P1"
labels: [frontend, filters, ux]
dependencies: ["tasks/ui-components-metrics-grid.md", "tasks/metrics-api-routes.md"]
created: "2025-09-24"

# 1) High-Level Objective

Provide interactive filters per PRD and compare mode for two dimensions.

# 2) Background / Context

Filters control query params to `/api/metrics` and trigger re-fetch.

# 3) Assumptions & Constraints

- ASSUMPTION: Server components can read search params
- Constraint: Keep UI minimal and keyboard accessible

# 4) Dependencies

- tasks/metrics-api-routes.md

# 5) Context Plan

**Beginning:**
- PRD.md _(read-only)_

**End state:**
- components/filters/FiltersBar.tsx
- components/filters/CompareToggle.tsx
- wiring in `app/page.tsx`

# 6) Low-Level Steps

1. FiltersBar component with controls for date range, grouping (day/week/month), owner, source, payment method
2. CompareToggle to select A vs B dimension
3. Update query construction to pass filters to API

# 7) Acceptance Criteria

- Filters update API requests and the grid/charts react to changes
- Compare mode overlays/side-by-side per spec

# 8) Testing Strategy

- Manual: change filters and validate payloads and visuals

# 9) Notes

- PRD.md → Breakdowns & Filters, Compare Mode


