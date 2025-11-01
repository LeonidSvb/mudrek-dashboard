# Mudrek Dashboard

**Real-time sales analytics platform with automated HubSpot CRM synchronization**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-green)](https://supabase.com/)

Production-grade analytics dashboard tracking **24 sales metrics** with modular sync architecture and triple logging system.

---

## Features

- **24 Real-time Metrics**: Sales, Calls, Performance, Funnel (auto-generated docs)
- **Automated Sync**: GitHub Actions (every 4 hours incremental, weekly owners, daily full)
- **Smart Owner Sync**: Automatically extracts manager phone numbers from call data
- **Modular Architecture**: 4 independent scripts (contacts, deals, calls, owners)
- **Triple Logging**: Console + JSON files + Supabase (observability + clarity)
- **Performance**: 2-3 second dashboard load (SQL functions with indexes)
- **Future-proof**: JSONB storage preserves all HubSpot custom fields

---

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project ([create free](https://supabase.com))
- HubSpot Private App ([setup guide](./docs/setup/HUBSPOT_SETUP.md))

### Installation

```bash
# Clone repository
git clone https://github.com/LeonidSvb/mudrek-dashboard.git
cd mudrek-dashboard

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript 5.6 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Supabase (PostgreSQL 17) |
| **Charts** | Recharts |
| **CRM** | HubSpot API v3 |
| **CI/CD** | GitHub Actions (FREE tier) |
| **Deployment** | Vercel |

---

## Configuration

Create `.env` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...

# HubSpot Private App
HUBSPOT_API_KEY=pat-eu1-xxx...

# Slack Webhook URL (for daily reports)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional: Vercel Cron Secret
CRON_SECRET=your-random-secret
```

**GitHub Actions Secrets:**

Add to repository (Settings → Secrets and variables → Actions):
- `HUBSPOT_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SLACK_WEBHOOK_URL` (for daily reports)

---

## Documentation

### Core Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Complete system architecture (sync, HubSpot, database, frontend)
- **[OWNERS_SYNC.md](./docs/OWNERS_SYNC.md)** - Smart owner sync system (auto-extract phone numbers from calls) ⭐
- **[LOGGING.md](./docs/LOGGING.md)** - Triple logging system (console + JSON + Supabase)
- **[ADR.md](./docs/ADR.md)** - Architecture Decision Record (why we made these choices)

### Metrics & Guides

- **[METRICS_GUIDE.generated.md](./docs/METRICS_GUIDE.generated.md)** - All 24 metrics explained (auto-generated)
- **[metrics-schema.yaml](./docs/metrics-schema.yaml)** - Single source of truth for metrics

### Setup Guides

- **[HUBSPOT_SETUP.md](./docs/setup/HUBSPOT_SETUP.md)** - Configure HubSpot for accurate metrics
- **[MCP_SETUP.md](./docs/setup/MCP_SETUP.md)** - MCP server configuration
- **[SUPABASE_REPORTING.md](./docs/setup/SUPABASE_REPORTING_WITH_MAKE.md)** - Automated reporting with Make.com

### Code Patterns

- **[backend-patterns.md](./docs/backend-patterns.md)** - Backend code examples
- **[frontend-patterns.md](./docs/frontend-patterns.md)** - Frontend code examples

---

## Sync Operations

### Automated (GitHub Actions)

- **Incremental**: Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
- **Full**: Daily at 02:00 UTC
- **Owners**: Weekly on Sundays at 00:00 UTC
- **Slack Daily Report**: Daily at 09:00 UTC (12:00 Israel time)
- **Slack Weekly Report**: Sundays at 10:00 UTC (13:00 Israel time)

### Manual

```bash
# Incremental (since last successful sync)
node scripts/sync-contacts.js
node scripts/sync-deals.js
node scripts/sync-calls.js

# Full sync (all records)
node scripts/sync-contacts.js --all
node scripts/sync-deals.js --all
node scripts/sync-calls.js --all

# Owners sync (names + auto-extract phone numbers from calls)
node scripts/sync-owners.js

# Daily metrics report to Slack (yesterday's data)
node scripts/utils/slack-daily-report.js

# Specific date daily report
node scripts/utils/slack-daily-report.js --date=2025-10-30

# Weekly metrics report to Slack (last 7 days)
node scripts/utils/slack-weekly-report.js

# Specific week ending on date
node scripts/utils/slack-weekly-report.js --date=2025-10-30
```

### Smart Owner Phone Sync 🧠

**Problem**: HubSpot API doesn't provide manager phone numbers.

**Our Solution**: Automatically extract phone numbers from call data!

The system analyzes the last 30,000 calls and finds which numbers most frequently call each manager's contacts. Top-10 numbers are automatically assigned to each manager.

**See**: [docs/OWNERS_SYNC.md](./docs/OWNERS_SYNC.md) for detailed explanation.

### Slack Reports 📊

**Automated daily and weekly metrics reports to Slack** using Supabase RPC functions (8 metrics functions).

**Daily Reports:**
- Runs automatically at 09:00 UTC (12:00 Israel time)
- Reports on yesterday's metrics
- Sends to #test-logs channel

**Weekly Reports:**
- Runs automatically on Sundays at 10:00 UTC (13:00 Israel time)
- Reports on last 7 days
- Aggregated metrics across the week

**All reports include:** Sales, Calls, Conversion, Payment, Followup, Offers, Time metrics (24 total)

---

## Deployment

### Vercel (Frontend)

Automatic deployment on push to `master` branch.

### GitHub Actions (Sync)

Already configured! Just add secrets (see Configuration section).

---

## Monitoring

View sync logs at [/logs](http://localhost:3000/logs)

---

## License

Proprietary - All rights reserved

---

**Built with ❤️ for sales teams**
