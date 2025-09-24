---
description: Configure Vercel deployment and daily cron for sync endpoint
globs: ["vercel.json", ".env.example"]
alwaysApply: false
---

id: "TASK-0010"
title: "Deploy to Vercel with daily cron"
status: "planned"
priority: "P1"
labels: [devops, vercel]
dependencies: ["tasks/sync-hubspot-endpoint.md"]
created: "2025-09-24"

# 1) High-Level Objective

Deploy app to Vercel and schedule daily sync hitting `/api/sync-hubspot`.

# 2) Assumptions & Constraints

- ASSUMPTION: GitHub repo connected to Vercel
- Constraint: Env vars set in Vercel dashboard

# 3) End state

- `vercel.json` with cron schedule
- `.env.example` listing required vars (Supabase, HubSpot)

# 4) Acceptance Criteria

- Successful deployment with working endpoint and cron invocation


