# Shadi Sales Metrics Dashboard

**Professional multilingual sales analytics dashboard for HubSpot CRM data**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Platform](https://img.shields.io/badge/platform-Vercel-black)
![Framework](https://img.shields.io/badge/framework-Next.js%2015-blue)

---

## Overview

Internal dashboard for tracking 22 key sales metrics from HubSpot CRM with automatic hourly synchronization to Supabase and real-time visualization using React + ShadCN UI.

**Live URL:** [mudrek-dashboard.vercel.app](https://mudrek-dashboard.vercel.app)

---

## Features

### Current Sprint (01-hubspot-metrics)
- ✅ HubSpot API integration ready
- ✅ Supabase database configured
- ✅ Project structure organized
- ⏳ RAW layer database schema (in progress)
- ⏳ Incremental sync logic (planned)
- ⏳ React dashboard with ShadCN UI (planned)

### Key Metrics (22 total)
1. Total sales revenue
2. Total deals count
3. Average deal size
4. Conversion rate
5. Qualified rate
6. Trial rate
7. Cancellation rate
8. Followup rate
9. Average installments
10. Average call time
11. Total call time
12. Time to sale
13. Sales script A/B testing
14. VSL watch → close rate
15. Upfront cash collected
16. Total calls made
17. 5min-reached rate
18. Offers given & rate
19. Team efficiency metrics
20. Pickup rate
21. Time to first contact
22. Average followups per lead

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + TypeScript
- **Components:** ShadCN UI (Radix + Tailwind)
- **Charts:** Recharts
- **Styling:** Tailwind CSS

### Backend
- **Runtime:** Node.js (ES Modules)
- **API:** Vercel Serverless Functions
- **Cron:** Vercel Cron (hourly sync)

### Database
- **Provider:** Supabase (PostgreSQL)
- **Pattern:** RAW layer (JSONB storage)
- **Auth:** Service role key (internal tool)

### Integrations
- **HubSpot:** CRM data source
- **Kavkom:** Call recordings (via HubSpot)
- **Make.com:** Field automation

---

## Project Structure

```
shadi-new/
├── frontend/              # Next.js React app (to be created)
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── package.json
│
├── src/                  # Backend logic
│   ├── hubspot/
│   │   ├── api.js       # HubSpot API client
│   │   └── sync.js      # Supabase sync logic
│   ├── lib/
│   │   └── supabase.js  # Supabase client
│   ├── scripts/         # Utility scripts
│   └── utils/           # Helpers
│
├── tests/               # Test files
│   ├── supabase/       # Database tests
│   ├── hubspot/        # API tests
│   └── fixtures/       # Sample data
│
├── migrations/          # SQL migrations
│   └── 001_hubspot_raw_layer.sql
│
├── docs/               # Documentation
│   ├── ARCHITECTURE.md # Architecture decisions
│   ├── PRD.md         # Product requirements
│   ├── analysis/      # Data analysis
│   └── reports/       # Reports
│
├── sprints/            # Sprint planning
│   └── 01-hubspot-metrics/
│       ├── README.md
│       └── tasks/
│
├── .env               # Environment variables
├── .mcp.json          # MCP configuration
├── vercel.json        # Vercel config + cron
├── package.json       # Dependencies
├── CLAUDE.md          # Coding guidelines
└── CHANGELOG.md       # Version history
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- HubSpot API key
- Supabase project

### Installation

```bash
# Clone repository
git clone https://github.com/LeonidSvb/mudrek-dashboard.git
cd shadi-new

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your keys

# Run tests
npm test

# Start development (when frontend is ready)
cd frontend && npm run dev
```

### Environment Variables

```bash
# HubSpot
HUBSPOT_API_KEY=pat-xxx

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SUPABASE_ANON_KEY=xxx

# Vercel Cron
CRON_SECRET=xxx
```

---

## Development

### Current Sprint

See `sprints/01-hubspot-metrics/` for detailed tasks and goals.

**Goal:** Set up all 22 metrics from HubSpot for dashboard analytics

**Timeline:** 2 days

### Phase 1: Database Setup (Current)
- [ ] Create RAW layer migrations
- [ ] Execute SQL in Supabase
- [ ] Test with sample data

### Phase 2: Sync Logic (Next)
- [ ] Implement incremental sync
- [ ] Create Vercel Cron endpoint
- [ ] Test hourly updates

### Phase 3: Frontend (After DB)
- [ ] Setup Next.js + ShadCN
- [ ] Build metric components
- [ ] Deploy to Vercel

---

## Architecture Decisions

See `docs/ADR.md` for detailed Architecture Decision Record.

**Key Decisions:**
1. **No modular architecture** - Single HubSpot source, simple use case
2. **React + Next.js** - Dynamic updates, component reuse
3. **RAW layer pattern** - Full API response preservation in JSONB
4. **Hourly incremental sync** - Balance of freshness + cost
5. **No authentication** - Internal use only (10 users max)

---

## Testing

```bash
# Run Supabase connection tests
node tests/supabase/connection.test.js

# Run HubSpot API tests
node tests/hubspot/api.test.js

# Run all tests
npm test
```

---

## Deployment

### Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure environment variables
vercel env add HUBSPOT_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
```

### Cron Setup

Cron is configured in `vercel.json`:
- **Schedule:** Every hour (`0 * * * *`)
- **Endpoint:** `/api/cron/sync-hubspot`
- **Action:** Incremental sync from HubSpot to Supabase

---

## Documentation

- **[ADR.md](docs/ADR.md)** - Architecture Decision Record
- **[PRD.md](docs/PRD.md)** - Product requirements document
- **[CLAUDE.md](CLAUDE.md)** - Coding guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

---

## Contributing

This is a private internal project. For questions or issues, contact the development team.

### Coding Standards

See `CLAUDE.md` for detailed guidelines:
- Simple solutions over complex
- DRY principle
- Real data only (no mocks in production)
- Clean code organization
- Files under 200-300 lines

---

## License

**Private Project** - All rights reserved

---

## Links

- **Dashboard:** [mudrek-dashboard.vercel.app](https://mudrek-dashboard.vercel.app)
- **Repository:** [github.com/LeonidSvb/mudrek-dashboard](https://github.com/LeonidSvb/mudrek-dashboard)
- **Supabase:** [pimcijqzezvlhicurbkq.supabase.co](https://pimcijqzezvlhicurbkq.supabase.co)

---

## Status

**Version:** 0.1.0 (In Development)
**Last Updated:** 2025-10-06
**Current Sprint:** 01-hubspot-metrics

### Progress
- [x] Project structure organized
- [x] HubSpot API integration ready
- [x] Supabase configured
- [ ] Database RAW layer created
- [ ] Sync logic implemented
- [ ] Frontend dashboard built
- [ ] Production deployment

---

**Developed with:** Claude Code + MCP
