# Mudrek Dashboard

**Real-time sales analytics platform with automated HubSpot CRM synchronization**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-green)](https://supabase.com/)

Production-grade analytics dashboard tracking **24 sales metrics** with modular sync architecture and triple logging system.

---

## Features

- **24 Real-time Metrics**: Sales, Calls, Performance, Funnel (auto-generated docs)
- **Automated Sync**: GitHub Actions (every 4 hours incremental, daily full)
- **Modular Architecture**: 3 independent scripts (contacts, deals, calls)
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

# Optional: Vercel Cron Secret
CRON_SECRET=your-random-secret
```

**GitHub Actions Secrets:**

Add to repository (Settings → Secrets and variables → Actions):
- `HUBSPOT_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## Documentation

### Core Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Complete system architecture (sync, HubSpot, database, frontend)
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
```

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
