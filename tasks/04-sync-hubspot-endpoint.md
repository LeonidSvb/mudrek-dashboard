---
description: Implement Next.js sync endpoint and scheduled job to refresh Supabase from HubSpot daily
globs: ["app/api/sync-hubspot/**", "hubspot/supabase-sync.js", "src/hubspot-api.js"]
alwaysApply: false
---

id: "TASK-0004"
title: "Add daily HubSpot→Supabase sync endpoint and schedule"
status: "planned"
priority: "P0"
labels: [backend, sync, hubspot, supabase]
dependencies: ["tasks/setup-nextjs-app.md", "tasks/create-supabase-schema-and-views.md"]
created: "2025-09-24"

# 1) High-Level Objective

Provide `/api/sync-hubspot` that runs daily (Vercel cron) to keep Supabase data fresh per PRD.

# 2) Background / Context (Optional but recommended)

There is a Node sync class `hubspot/supabase-sync.js` for local use. Wrap it in an API route or re-implement minimal fetch-diff for hosted environment.

# 3) Assumptions & Constraints

- ASSUMPTION: Vercel Cron can hit public endpoint
- Constraint: Avoid long-running serverless functions (> 10s) — use pagination and resume tokens
- Constraint: Rate limit HubSpot API (100 req/10s)

# 4) Dependencies (Other Tasks or Artifacts)

- hubspot/supabase-sync.js
- src/hubspot-api.js _(read-only)_

# 5) Context Plan

**Beginning (add to model context):**

- hubspot/supabase-sync.js
- src/hubspot-api.js
- PRD.md _(read-only)_

**End state (must exist after completion):**

- app/api/sync-hubspot/route.ts
- vercel.json (with Cron schedule)

# 6) Low-Level Steps (Ordered, information-dense)

1. Create API route

   - File: `app/api/sync-hubspot/route.ts`
   - Exported API:
     ```ts
     export async function POST(request: Request): Promise<Response>;
     export async function GET(request: Request): Promise<Response>;
     ```
   - Details:
     - POST triggers sync; GET returns last sync status
     - Reuse logic from `hubspot/supabase-sync.js` to upsert contacts, deals, calls

2. Configure Vercel cron

   - File: `vercel.json`
   - Add schedule hitting `/api/sync-hubspot` once or twice per day

3. Add lightweight persistence of last sync

   - File: `db/tables/sync_status.sql`
   - Table `sync_status(scope text primary key, last_synced timestamptz, details jsonb)`

# 7) Types & Interfaces (if applicable)

N/A

# 8) Acceptance Criteria

- `POST /api/sync-hubspot` completes within platform timeout and updates Supabase rows
- `GET /api/sync-hubspot` returns `{ lastSynced, counts }`
- Vercel cron triggers endpoint daily without errors

# 9) Testing Strategy

- Manual trigger via POST; inspect Supabase row deltas
- Observe Vercel cron logs for scheduled executions

# 10) Notes / Links

- Reference spec section: PRD.md → Data Flow → Daily Sync
- Related tasks: TASK-0003, TASK-0005, TASK-0012


