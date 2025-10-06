# Architecture Decision Record (ADR)

**Project:** Shadi Sales Metrics Dashboard
**Last Updated:** 2025-10-06
**Status:** Active Development

---

## Overview

Internal sales dashboard for displaying 22 key metrics from HubSpot CRM with automatic daily sync to Supabase and real-time visualization.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19 + TypeScript
- **Components:** ShadCN UI (Radix UI + Tailwind CSS)
- **Styling:** Tailwind CSS
- **Data Fetching:** Supabase JS Client
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js (ES Modules)
- **API:** Vercel Serverless Functions
- **Sync Logic:** Custom HubSpot API integration
- **Cron Jobs:** Vercel Cron (hourly sync)

### Database & Storage
- **Database:** Supabase (PostgreSQL)
- **Schema:** RAW layer pattern (preserves full API responses)
- **Auth:** Service role key (internal tool, no user auth)

### External Integrations
- **HubSpot:** CRM data source (deals, contacts, calls)
- **Kavkom:** Call recordings integration (via HubSpot)
- **Make.com:** Automation workflows (field population)

### Deployment
- **Platform:** Vercel
- **Domain:** mudrek-dashboard.vercel.app
- **Environment:** Production only (internal use)

---

## Architecture Decisions

### 1. Why NOT Modular Architecture?

**Decision:** Use simplified `src/` structure instead of `modules/` pattern

**Reasons:**
- Single data source (HubSpot only)
- Simple dashboard use case
- No need for 9+ integrations like Outreach project
- MCP available for future extensibility
- Faster development and maintenance

**Future:** If adding Apollo/OpenAI/other integrations → migrate to modular

---

### 2. Why React + Next.js over HTML?

**Decision:** Next.js 15 with App Router + ShadCN UI

**Reasons:**
- Dynamic metric updates without page reload
- Component reusability (MetricCard, Charts)
- TypeScript for type safety
- ShadCN = industry standard beautiful components
- Vercel optimization (Edge Functions, ISR)
- Proven pattern from Outreach project

**Alternative Rejected:** Plain HTML
- No dynamic updates
- Manual DOM manipulation
- No component system
- Poor developer experience

---

### 3. Database Schema: RAW Layer Pattern

**Decision:** Store full HubSpot API responses in JSONB columns

**Schema Pattern:**
```sql
CREATE TABLE hubspot_deals_raw (
    hubspot_deal_id TEXT PRIMARY KEY,

    -- Extracted fields (for fast queries)
    dealname TEXT,
    amount NUMERIC,
    dealstage TEXT,

    -- CRITICAL: Full API response
    raw_json JSONB NOT NULL,

    -- Sync tracking
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Benefits:**
- Never lose data from API
- Can add new columns without data loss
- Historical data preserved
- Easy incremental sync
- Flexible schema evolution

**Pattern copied from:** Outreach `migrations/002_instantly_raw_layer.sql`

---

### 4. Sync Strategy: Incremental Hourly

**Decision:** Vercel Cron → hourly incremental sync

**Flow:**
```
Vercel Cron (every hour)
    ↓
/api/cron/sync-hubspot
    ↓
Get last_synced_at from Supabase
    ↓
HubSpot Search API (hs_lastmodifieddate > last_synced_at)
    ↓
Transform to RAW format
    ↓
Upsert to Supabase RAW tables
    ↓
Update synced_at timestamp
```

**Why Incremental:**
- Reduces API calls (HubSpot rate limits)
- Faster sync (only changed data)
- Lower costs
- Real-time enough for dashboard

**Why Hourly:**
- Dashboard doesn't need real-time
- HubSpot data changes slowly
- Vercel Cron free tier sufficient

---

### 5. Project Structure

**Decision:** Monorepo with separate frontend/

**Structure:**
```
shadi-new/
├── frontend/           # Next.js app (React + ShadCN)
├── src/               # Backend logic (HubSpot sync)
├── tests/             # Test files
├── migrations/        # SQL migrations
├── docs/              # Documentation
└── sprints/           # Sprint planning
```

**Benefits:**
- Clear separation of concerns
- Frontend can be deployed independently
- Backend logic reusable
- Tests organized by type
- Documentation centralized

---

### 6. Testing Strategy

**Decision:** Integration tests > Unit tests

**Location:** `tests/` in project root (industry standard)

**Organization:**
```
tests/
├── supabase/         # Database tests
├── hubspot/          # API integration tests
└── fixtures/         # Test data
```

**Why:**
- Integration tests catch real issues
- Small project → unit tests overkill
- Focus on API + DB integration
- Real data flows tested

---

### 7. No User Authentication

**Decision:** Public dashboard (no auth)

**Reasons:**
- Internal use only (10 users max)
- Vercel project not public
- No sensitive PII displayed
- Simplifies development
- Can add later if needed

**Security:**
- Vercel project private
- Supabase RLS disabled (service key)
- No data modification from frontend

---

## Data Flow

### Sync Flow (Hourly)
```
HubSpot API
    ↓ (REST API calls)
src/hubspot/api.js (collector)
    ↓ (raw data)
src/hubspot/transform.js
    ↓ (normalized format)
src/hubspot/sync.js
    ↓ (upsert)
Supabase RAW tables
    ↓ (SQL views)
Aggregated metrics
```

### Display Flow (User visits dashboard)
```
User → Next.js Dashboard
    ↓
Supabase Client (ANON key)
    ↓
SQL Views (pre-aggregated metrics)
    ↓
React Components render
    ↓
ShadCN Cards + Recharts
```

---

## Key Metrics (22 total)

See `sprints/01-hubspot-metrics/README.md` for full list

**Categories:**
1. Revenue metrics (total sales, average deal size)
2. Conversion metrics (qualified rate, trial rate)
3. Call metrics (pickup rate, call duration)
4. Sales efficiency (time to sale, followup rate)

---

## Environment Variables

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

## Migration Path

### Current State → Target State

**Phase 1: Restructure (This Sprint)**
- ✅ Clean project structure
- ✅ Move files to correct locations
- ✅ Create frontend/ with Next.js

**Phase 2: Database (Next)**
- Create RAW layer migrations
- Execute in Supabase SQL Editor
- Test sync with sample data

**Phase 3: Sync Logic (After DB)**
- Implement incremental sync
- Create Vercel Cron endpoint
- Test hourly updates

**Phase 4: Dashboard (Final)**
- Build React components
- Integrate ShadCN UI
- Deploy to Vercel

---

## References

### Inspiration Projects
- **Outreach Project:** Modular architecture pattern
- **Outreach Frontend:** Next.js + ShadCN setup
- **Outreach Migrations:** RAW layer SQL pattern

### Documentation
- `docs/PRD.md` - Product requirements
- `sprints/01-hubspot-metrics/` - Current sprint goals
- `CLAUDE.md` - Coding guidelines
- `CHANGELOG.md` - Version history

---

## Future Enhancements

**Not in MVP, but possible:**
- [ ] Multiple user authentication
- [ ] Custom metric configurations
- [ ] Mobile app
- [ ] Real-time updates (WebSockets)
- [ ] Advanced filtering
- [ ] Export to PDF/Excel
- [ ] Multi-language (AR/HE)
- [ ] Dark mode
- [ ] Apollo integration (if needed)
- [ ] Make.com deeper integration

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2025-10-06 | No modular architecture | Single data source, simple use case |
| 2025-10-06 | React + Next.js | Dynamic updates, component reuse |
| 2025-10-06 | RAW layer pattern | Data preservation, flexibility |
| 2025-10-06 | Hourly incremental sync | Balance of freshness + cost |
| 2025-10-06 | No authentication | Internal use only |

---

**Last Reviewed:** 2025-10-06
**Next Review:** After Phase 1 completion
