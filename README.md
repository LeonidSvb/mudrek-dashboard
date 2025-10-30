# Mudrek Dashboard

**Real-time sales analytics platform with automated HubSpot CRM synchronization**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

> Production-grade analytics dashboard tracking 15+ sales metrics with modular sync architecture and triple logging system.

---

## 📊 Features

- **Real-time Metrics**: 15+ calculated metrics (Sales, Calls, Performance, Funnel)
- **Automated Sync**: GitHub Actions (every 4 hours incremental, daily full sync)
- **Modular Architecture**: Separate scripts for Contacts, Deals, Calls (UNIX philosophy)
- **Triple Logging**: Console + JSON files + Supabase (observability + client clarity)
- **JSONB Merge**: Preserves custom HubSpot fields during updates
- **Timeout Protection**: Automatic termination (30min incremental, 1h full)
- **Fallback Logic**: 3-level fallback for finding last sync timestamp
- **Production Ready**: Used by sales teams managing 500+ deals

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | React 19, Server Components |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Responsive UI, dark mode |
| **Database** | Supabase (PostgreSQL 17) | Materialized views, RLS |
| **Charts** | Recharts | Interactive sales visualizations |
| **CRM Integration** | HubSpot API v3 | Contacts, Deals, Calls, Owners |
| **CI/CD** | GitHub Actions | Automated sync (FREE tier) |
| **Deployment** | Vercel | Edge functions, ISR |
| **Logging** | JSONL + Supabase | Triple logging system |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase project ([create free](https://supabase.com))
- HubSpot Private App ([create](https://developers.hubspot.com/docs/api/private-apps))

### Installation

```bash
# Clone repository
git clone https://github.com/LeonidSvb/mudrek-dashboard.git
cd mudrek-dashboard

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Configuration section)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📐 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐│
│  │ Incremental Sync │  │   Daily Full     │  │Manual Trigger ││
│  │  (Every 4 hours) │  │   (02:00 UTC)    │  │   (On-demand) ││
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘│
└───────────┼────────────────────┼──────────────────────┼────────┘
            │                    │                      │
            ▼                    ▼                      ▼
  ┌─────────────────────────────────────────────────────────────┐
  │             Modular Sync Scripts (lib/sync/)                │
  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐│
  │  │sync-contacts.js│  │ sync-deals.js  │  │sync-calls.js  ││
  │  │   ~145 lines   │  │   ~134 lines   │  │  ~135 lines   ││
  │  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘│
  └───────────┼────────────────────┼──────────────────┼────────┘
              │                    │                  │
              ▼                    ▼                  ▼
  ┌────────────────────────────────────────────────────────────┐
  │                     HubSpot API v3                         │
  │    Contacts (35 fields) | Deals (30 fields) | Calls       │
  └────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────────┐
  │                  Supabase PostgreSQL 17                    │
  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
  │  │ Raw Tables   │  │Materialized  │  │ Observability   │ │
  │  │ (JSONB)      │→ │    Views     │  │ (runs + logs)   │ │
  │  └──────────────┘  └──────┬───────┘  └─────────────────┘ │
  └─────────────────────────────┼───────────────────────────────┘
                                │
                                ▼
  ┌────────────────────────────────────────────────────────────┐
  │              Next.js 15 Frontend (Vercel)                  │
  │  /dashboard  |  /logs  |  /sales-funnel  |  /api/metrics  │
  └────────────────────────────────────────────────────────────┘
```

### Sync Architecture (Modular)

**Why Modular?** (vs Monolithic)
- ✅ **Isolation**: Failed contacts sync ≠ failed deals sync
- ✅ **Debugging**: 145 lines vs 677 lines monolith
- ✅ **Parallel**: GitHub Actions runs all 3 simultaneously
- ✅ **UNIX Philosophy**: "Do one thing well"
- ✅ **Industry Standard**: Segment, Fivetran, Airbyte use modular

```
scripts/
├── sync-contacts.js     # Contacts sync (modular)
├── sync-deals.js        # Deals sync (modular)
├── sync-calls.js        # Calls sync (modular)
├── sync-full.js         # Legacy (kept for compatibility)
└── sync-incremental.js  # Legacy (kept for compatibility)

lib/sync/                # Shared library (DRY principle)
├── logger.js            # Triple logging system
├── api.js               # HubSpot API client with retry
├── transform.js         # Data transformation
├── upsert.js            # JSONB merge logic
├── properties.js        # HubSpot field configuration
└── cli.js               # CLI argument parser
```

---

## 📋 Logging & Observability

### Triple Logging System

**Philosophy:** "Observability for Engineers, Clarity for Clients"

```
┌─────────────────────────────────────────────────────────────┐
│                    Sync Script Execution                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │  SyncLogger             │
        │  (lib/sync/logger.js)   │
        └─────────────┬───────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌────────┐   ┌─────────┐   ┌──────────┐
   │Console │   │JSON File│   │ Supabase │
   │(stdout)│   │(local)  │   │  (logs)  │
   └────────┘   └─────────┘   └──────────┘

   ALWAYS       ALWAYS         FILTERED
   (all logs)   (all logs)     (important only)
```

### 1. Console Logging (stdout)

**What:** All events in real-time
**Format:** `[LEVEL] STEP: message`
**For:** Engineers (real-time monitoring)

```bash
[INFO] START: Contacts sync started with options: {...}
[INFO] FETCH: Incremental sync: fetching contacts since 2025-10-25...
[INFO] END: Contacts sync completed: 236 fetched, 232 new, 4 updated
```

### 2. JSON File Logging (logs/YYYY-MM-DD.jsonl)

**What:** All events (raw stream)
**Format:** JSONL (JSON Lines)
**Rotation:** Daily (industry standard)
**For:** Engineers (debugging, audit trail)

```json
{"run_id":"ed72494f...","timestamp":"2025-10-30T14:50:41.466Z","level":"INFO","step":"START","message":"Contacts sync started...","meta":{}}
{"run_id":"ed72494f...","timestamp":"2025-10-30T14:50:42.831Z","level":"INFO","step":"FETCH","message":"Incremental sync: fetching contacts since...","meta":{}}
{"run_id":"ed72494f...","timestamp":"2025-10-30T14:50:47.700Z","level":"INFO","step":"END","message":"Contacts sync completed: 236 fetched...","meta":{}}
```

**Why JSONL?**
- Industry standard (AWS CloudWatch, Datadog, ELK)
- Each line = valid JSON (easy to parse)
- Streamable in real-time

### 3. Supabase Logging (logs table)

**What:** ONLY important events
**Philosophy:** "Noise kills trust" - clients see status, not technical details
**For:** Clients/Managers (status dashboard)

**Filter Logic** (lib/sync/logger.js:60-66):
```javascript
const shouldLogToSupabase =
  level === 'ERROR' ||
  level === 'WARNING' ||
  step === 'START' ||
  step === 'END' ||
  step === 'TIMEOUT';
```

**Saved to Supabase:**
- ✅ START - sync started
- ✅ END - results (how many records)
- ✅ ERROR - critical errors
- ✅ WARNING - warnings
- ✅ TIMEOUT - exceeded time limit

**Filtered out (technical noise):**
- ❌ FETCH - "fetching contacts since..."
- ❌ SYNC - "Found 236 contacts"
- ❌ UPSERT - "232 new, 4 updated"
- ❌ BATCH - "Processing batch 0-500"

### Database Schema

#### Table: `logs`
Detailed event logs (filtered)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| run_id | uuid | FK to runs table (correlation ID) |
| timestamp | timestamptz | When event occurred |
| level | text | INFO, ERROR, WARNING |
| step | text | START, END, ERROR, TIMEOUT |
| message | text | Event description |
| meta | jsonb | Additional context |

#### Table: `runs`
Sync metrics (for dashboard)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (run_id) |
| script_name | text | sync-contacts/deals/calls |
| status | text | running, success, failed |
| started_at | timestamptz | Start time |
| finished_at | timestamptz | End time |
| duration_ms | int | Duration in milliseconds |
| records_fetched | int | How many fetched from HubSpot |
| records_inserted | int | How many inserted to Supabase |
| records_updated | int | How many updated in Supabase |
| error_message | text | Error if failed |

**Relationship:** `logs.run_id → runs.id`

### Example: Successful Sync

```javascript
// Run: node scripts/sync-contacts.js

// 1. Console (real-time, engineer)
[INFO] START: Contacts sync started
[INFO] FETCH: Incremental sync: fetching contacts since 2025-10-25
[INFO] END: Contacts sync completed: 236 fetched, 232 new, 4 updated

// 2. JSON file (logs/2025-10-30.jsonl, engineer)
{"step":"START",...}  ← saved
{"step":"FETCH",...}  ← saved
{"step":"END",...}    ← saved

// 3. Supabase (logs table, client)
START: Contacts sync started       ← saved
FETCH: Incremental sync...         ← FILTERED OUT (noise)
END: Contacts sync completed       ← saved
```

**Result:**
- Engineer sees all 3 events in JSON file
- Client sees 2 events in Supabase (START + END)
- Less noise in UI, easier to understand status

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```bash
# Supabase (get from https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...

# HubSpot (create Private App in Settings → Integrations → Private Apps)
# Required scopes: crm.objects.contacts.read, crm.objects.deals.read, etc.
HUBSPOT_API_KEY=pat-eu1-xxx...

# Optional: Vercel Cron Secret (to protect /api/sync endpoint)
CRON_SECRET=your-random-secret
```

### GitHub Actions Secrets

Add to repository secrets (Settings → Secrets and variables → Actions):

```
HUBSPOT_API_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_KEY
```

Without these, GitHub Actions will fail with "Missing environment variables".

---

## 🔄 Sync Operations

### Automated Sync (GitHub Actions)

**Incremental Sync** (every 4 hours):
- Runs at: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
- Fetches: Records modified since last successful sync
- Timeout: 30 minutes
- Workflow: `.github/workflows/incremental-sync.yml`

**Daily Full Sync** (once per day):
- Runs at: 02:00 UTC
- Fetches: ALL records (auto-detects new custom fields)
- Timeout: 1 hour
- Workflow: `.github/workflows/daily-full-sync.yml`

### Manual Sync (CLI)

```bash
# Incremental (since last successful sync)
node scripts/sync-contacts.js
node scripts/sync-deals.js
node scripts/sync-calls.js

# Full sync (all records)
node scripts/sync-contacts.js --all
node scripts/sync-deals.js --all
node scripts/sync-calls.js --all

# Custom date range
node scripts/sync-contacts.js --last=7d
node scripts/sync-deals.js --from=2025-10-01 --to=2025-10-15

# Rollback (undo batch)
node scripts/sync-contacts.js --rollback=batch_id
```

---

## 📊 Monitoring

### View Logs

**Frontend:**
- Go to [http://localhost:3000/logs](http://localhost:3000/logs)
- See all sync runs with status, duration, records count

**Supabase:**
```sql
-- View recent sync runs
SELECT * FROM runs
WHERE script_name = 'sync-contacts'
ORDER BY started_at DESC
LIMIT 10;

-- View logs for specific run
SELECT * FROM logs
WHERE run_id = 'ed72494f-7d65-4715-9010-3c3d557eeecd'
ORDER BY timestamp;
```

**JSON Files:**
```bash
# View today's logs
cat logs/2025-10-30.jsonl

# Filter by run_id
cat logs/2025-10-30.jsonl | grep "ed72494f"

# Filter by step
cat logs/2025-10-30.jsonl | grep "\"step\":\"ERROR\""
```

### Metrics

**Success Rate:**
```sql
SELECT
  script_name,
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM runs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY script_name;
```

**Average Duration:**
```sql
SELECT
  script_name,
  AVG(duration_ms) / 1000 as avg_seconds
FROM runs
WHERE status = 'success'
  AND started_at > NOW() - INTERVAL '7 days'
GROUP BY script_name;
```

---

## 🐛 Troubleshooting

### Sync Failed: "First sync must be full sync"

**Cause:** No previous successful sync found
**Fix:** Run full sync first:
```bash
node scripts/sync-contacts.js --all
```

### Sync Failed: "API rate limit exceeded"

**Cause:** HubSpot API rate limit (100 requests/10 seconds)
**Fix:** Automatic retry (3 attempts with 2s delay). If persistent, wait 10 minutes.

### Sync Stuck in "running" Status

**Cause:** Process hung without timeout protection (old scripts)
**Fix:** Run cleanup utility:
```bash
node scripts/utils/cleanup-stuck-runs.js
```

This marks runs in "running" status >2 hours as "failed".

### GitHub Actions Failing

**Cause:** Missing secrets
**Fix:** Add secrets to repository (see Configuration section)

**Cause:** Timeout (6 hour limit)
**Fix:** GitHub Actions has 6h timeout. If full sync takes longer, optimize queries or split into smaller batches.

### Logs Not Appearing in Supabase

**Cause:** Only important events are logged (by design)
**Check:** JSON files (`logs/YYYY-MM-DD.jsonl`) contain all events

---

## 🚀 Deployment

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### GitHub Actions (Sync)

Already configured! Just add secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Add: `HUBSPOT_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
3. Workflows run automatically

---

## 📚 Documentation

- [TECHNICAL.md](./TECHNICAL.md) - Detailed technical documentation
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [CLAUDE.md](./CLAUDE.md) - Project guidelines for Claude Code

---

## 📄 License

Proprietary - All rights reserved

---

## 🤝 Support

For issues, questions, or feature requests:
- Email: [your-email]
- GitHub Issues: https://github.com/LeonidSvb/mudrek-dashboard/issues

---

**Built with ❤️ for sales teams**
