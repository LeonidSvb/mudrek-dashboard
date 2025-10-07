---
description: Initialize Next.js 14 + TypeScript + Tailwind app with baseline structure per PRD
globs: ["app/**", "components/**", "lib/**", "styles/**", "pages/**"]
alwaysApply: false
---

id: "TASK-0001"
title: "Setup Next.js 14 project with TypeScript and Tailwind"
status: "planned"
priority: "P0"
labels: [frontend, nextjs, setup]
dependencies: []
created: "2025-09-24"

# 1) High-Level Objective

Create a Next.js 14 project with TypeScript, Tailwind, and the base folders/files matching the PRD skeleton to enable rapid implementation of metrics, API routes, and UI.

# 2) Background / Context (Optional but recommended)

The current repo contains static HTML dashboards. The PRD requires a Next.js app with API routes, components, and cached metrics.

# 3) Assumptions & Constraints

- ASSUMPTION: Node 18+ is available
- Constraint: Use App Router (Next.js 14)
- Constraint: Keep dependencies minimal (Tailwind, Recharts)

# 4) Dependencies (Other Tasks or Artifacts)

- N/A
- docs/NEXTJS_DASHBOARD_PLAN.md (read-only reference)

# 5) Context Plan

**Beginning (add to model context):**

- PRD.md
- docs/NEXTJS_DASHBOARD_PLAN.md
- package.json _(read-only)_
- README.md _(read-only)_

**End state (must exist after completion):**

- app/page.tsx
- app/api/metrics/route.ts
- components/MetricCard.tsx
- lib/supabase.ts
- styles/globals.css

# 6) Low-Level Steps (Ordered, information-dense)

1. Create Next.js app scaffold

   - File: `package.json`
   - Exported API:
     ```ts
     // No runtime API; ensure scripts exist
     // scripts: dev, build, start, lint
     ```
   - Details:
     - Initialize Next.js 14 with TypeScript: `npx create-next-app@latest --ts`
     - Add Tailwind CSS per official guide; configure `postcss.config.js`, `tailwind.config.ts`
     - Add `recharts` dependency for charts

2. Establish base folders and files

   - File: `app/page.tsx`
   - Add: minimal dashboard shell with grid container and placeholder cards

3. Add base UI component

   - File: `components/MetricCard.tsx`
   - Exported API:
     ```ts
     export interface MetricCardProps { title: string; value: string | number; trend?: string; color?: "green"|"red"|"blue"; }
     export function MetricCard(props: MetricCardProps): JSX.Element;
     ```
   - Details:
     - Tailwind-styled card with title, value, optional trend badge

4. Configure Tailwind and globals

   - File: `styles/globals.css`
   - Add Tailwind base/components/utilities; root color variables for success/warning/danger/primary/secondary per plan

5. Add supabase client stub

   - File: `lib/supabase.ts`
   - Exported API:
     ```ts
     import { createClient } from "@supabase/supabase-js";
     export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
     ```

# 7) Types & Interfaces (if applicable)

```ts
// components/MetricCard.tsx
export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: string;
  color?: "green" | "red" | "blue";
}
```

# 8) Acceptance Criteria

- `npm run dev` starts a Next.js 14 app without errors
- `components/MetricCard.tsx` exports `MetricCard(...)` with the signature above
- Tailwind classes apply and colors match PRD palette

# 9) Testing Strategy

- Manual run `npm run dev` and verify root page renders
- Lint build succeeds `npm run build`
- Visual check of MetricCard rendering

# 10) Notes / Links

- Reference spec section: PRD.md → Technical Implementation → MVP Architecture
- Related tasks: TASK-0003, TASK-0005


