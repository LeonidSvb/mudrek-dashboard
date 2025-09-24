---
description: Implement ILS/USD currency toggle with conversion utility
globs: ["components/filters/CurrencyToggle.tsx", "lib/currency.ts"]
alwaysApply: false
---

id: "TASK-0009"
title: "Add currency toggle ILS/USD"
status: "planned"
priority: "P1"
labels: [frontend, currency]
dependencies: ["tasks/metrics-calculation-cache.md"]
created: "2025-09-24"

# 1) High-Level Objective

Allow users to switch between ILS and USD across all monetary KPIs with consistent conversion.

# 2) Background / Context

PRD requires multi-currency support.

# 3) Assumptions & Constraints

- ASSUMPTION: Static or env-provided rate is acceptable
- Constraint: Conversion happens server-side for consistency

# 4) Dependencies

- lib/currency.ts

# 5) Context Plan

**Beginning:**
- lib/currency.ts _(read-only)_

**End state:**
- components/filters/CurrencyToggle.tsx
- wiring to pass `currency` to `/api/metrics`

# 6) Low-Level Steps

1. Add CurrencyToggle UI and state
2. Pipe selected currency to API
3. Ensure monetary KPIs convert consistently

# 7) Acceptance Criteria

- Toggling currency updates all monetary values within 200ms

# 8) Testing Strategy

- Manual: switch and verify equivalence by rate

# 9) Notes

- PRD.md → UI Design Specifications → Currency


