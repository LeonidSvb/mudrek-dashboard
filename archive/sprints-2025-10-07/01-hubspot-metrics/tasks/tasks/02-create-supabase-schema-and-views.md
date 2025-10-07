---
description: Create Supabase tables and SQL views for metrics caching and analytics
globs: ["hubspot/create-tables.sql", "db/**/*.sql"]
alwaysApply: false
---

id: "TASK-0002"
title: "Create Supabase schema and SQL views for metrics"
status: "planned"
priority: "P0"
labels: [backend, database, supabase, sql]
dependencies: []
created: "2025-09-24"

# 1) High-Level Objective

Ensure Supabase has required tables and views to support all 22 metrics and cached results per PRD.

# 2) Background / Context (Optional but recommended)

Repo contains `hubspot/create-tables.sql` and sync code for contacts/deals. Calls table and analytics views must be added.

# 3) Assumptions & Constraints

- ASSUMPTION: Supabase project is available
- Constraint: Use SQL views for analytics aggregations
- Constraint: Avoid stored procedures; keep simple and portable

# 4) Dependencies (Other Tasks or Artifacts)

- tasks/setup-nextjs-app.md
- docs/TRACKING_SETUP_REPORT.md _(read-only)_

# 5) Context Plan

**Beginning (add to model context):**

- hubspot/create-tables.sql
- docs/TRACKING_SETUP_REPORT.md
- docs/UPDATED_TRACKING_REPORT.md _(read-only)_
- analysis/calls-data.json _(read-only)_

**End state (must exist after completion):**

- hubspot/create-tables.sql (updated with `hubspot_calls`)
- db/views/daily_call_activity.sql
- db/views/manager_performance.sql
- db/views/sales_funnel.sql
- db/tables/dashboard_metrics.sql

# 6) Low-Level Steps (Ordered, information-dense)

1. Add hubspot_calls table

   - File: `hubspot/create-tables.sql`
   - Details:
     - Create table `hubspot_calls` with columns: `id BIGSERIAL PK`, `hubspot_id TEXT UNIQUE`, `hubspot_contact_id TEXT`, `hubspot_owner_id TEXT`, `hs_timestamp TIMESTAMPTZ`, `hs_call_direction TEXT`, `hs_call_duration INTEGER`, `call_status TEXT`, `raw_data JSONB`, indices on `hubspot_id`, `hubspot_contact_id`, `hs_timestamp`.

2. Add dashboard_metrics cache table

   - File: `db/tables/dashboard_metrics.sql`
   - Exported API:
     ```sql
     -- materialized-like cache table
     CREATE TABLE IF NOT EXISTS dashboard_metrics (
       id BIGSERIAL PRIMARY KEY,
       scope TEXT NOT NULL, -- daily|weekly|monthly
       key TEXT NOT NULL,   -- metric name
       dims JSONB NOT NULL DEFAULT '{}', -- filters (owner, source, currency)
       value JSONB NOT NULL,
       computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE(scope, key, dims)
     );
     ```

3. Create analytics views

   - File: `db/views/daily_call_activity.sql`
   - Add SQL per `docs/UPDATED_TRACKING_REPORT.md` section "daily_call_activity".

   - File: `db/views/manager_performance.sql`
   - Add SQL per tracking report section "manager_performance".

   - File: `db/views/sales_funnel.sql`
   - Add SQL per tracking report section "sales_funnel".

4. Verify indices and types

   - File: `hubspot/create-tables.sql`
   - Details:
     - Ensure indices on `hubspot_deals(closedate)`, `hubspot_deals(dealstage)`, `hubspot_contacts(hubspot_owner_id)`.

5. Seed check

   - File: `db/views/.README.md`
   - Document how to run these SQL files in Supabase SQL Editor.

# 7) Types & Interfaces (if applicable)

N/A

# 8) Acceptance Criteria

- `hubspot/create-tables.sql` includes `hubspot_calls` definition with indices
- All three views compile successfully in Supabase
- `dashboard_metrics` table exists with unique constraint on `(scope, key, dims)`

# 9) Testing Strategy

- Apply SQL in Supabase SQL Editor; run `SELECT * FROM` each view
- Insert small sample rows and validate expected aggregations

# 10) Notes / Links

- Reference spec section: PRD.md → Data Architecture / Data Flow
- Related tasks: TASK-0003, TASK-0004, TASK-0007


