---
description: Execution runbook — prerequisites, parallelization, and usage of existing scripts
globs: ["tasks/*.md", "hubspot/**", "scripts/**", "docs/**"]
alwaysApply: false
---

# Tasks Runbook

## What can run in parallel

- Batch 1 (parallel):
  - 01-setup-nextjs-app.md
  - 02-create-supabase-schema-and-views.md
  - 11-make-automation-workflows.md (independent)

- Batch 2 (parallel, after 01+02):
  - 03-metrics-api-routes.md
  - 05-metrics-calculation-cache.md (needs DB views from 02)

- Batch 3 (parallel, after 01 and preferably 03/05):
  - 06-ui-components-metrics-grid.md
  - 07-charts-components.md
  - 08-filters-date-owner-source.md
  - 09-currency-toggle.md (depends on 05 for conversion consistency)

- Batch 4 (finalization):
  - 04-sync-hubspot-endpoint.md (requires 02; can be done earlier if needed)
  - 10-deployment-vercel-and-cron.md (after 03 and 04 are stable)

Notes:
- Frontend (06/07/08) can start with mocked `/api/metrics` responses if 03/05 are not ready yet.
- 11 (Make automations) is independent and can proceed at any time.

## Prerequisites: Supabase data status

- IF Supabase already contains HubSpot data (contacts, deals, calls):
  - Proceed directly with 02 (views) → 05 (calculations) → 03 (API) → 06–09.

- IF Supabase does NOT contain HubSpot data yet:
  - Either run local sync using existing scripts (see below), or implement 04 to run in the deployed environment.
  - Minimum for development: seed a small subset (10–100 records) to validate queries and UI.

## Using existing scripts (not from scratch)

This plan leverages scripts and code already present in the repo:

- `hubspot/supabase-sync.js` — class to create tables (SQL files) and upsert contacts/deals from exported JSON. Use it locally to bootstrap DB. Calls table still needs to be added via 02.
- `src/hubspot-api.js` — HubSpot REST client for pulling contacts/deals; can be reused by 04 to fetch fresh data into Supabase.
- `scripts/hubspot-bulk-loader.js`, `scripts/get-sample-data.js`, `scripts/metrics-mapping.js` — supporting tools for data fetch/analysis; not required in runtime but useful for seeding and validating fields/metrics.
- `docs/TRACKING_SETUP_REPORT.md`, `docs/UPDATED_TRACKING_REPORT.md` — contain ready SQL for views used in 02 and queries that inform 05.

You do NOT need to rebuild these from scratch. The tasks reference and reuse them.

## Recommended execution order (fast path)

1) 01 + 02 + 11 in parallel
2) 03 + 05 in parallel (after 02)
3) 06 + 07 + 08 in parallel; add 09 after 05
4) 04, then 10

## Environments and flags

- Ensure env vars are set before running 01/03/04/05/10:
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
  - HUBSPOT_API_KEY
  - Optional: CURRENCY_USD_ILS_RATE (for 05/09)

## Data seeding options

- Quick seed: run `hubspot/supabase-sync.js` locally with exported JSONs to populate contacts/deals; then create `hubspot_calls` and views (02) and proceed.
- Full sync: implement and run 04 to ingest directly from HubSpot to Supabase with pagination and rate limiting.


