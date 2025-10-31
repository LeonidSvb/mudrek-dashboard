# Architecture Decision Record (ADR)

**Project:** Mudrek Dashboard - HubSpot Analytics Platform
**Last Updated:** 2025-10-31
**Status:** Active Development

---

## Overview

Internal sales dashboard displaying **24 metrics** from HubSpot CRM with automatic sync to Supabase and real-time visualization.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19 + TypeScript 5.6
- **Components:** shadcn/ui (Radix UI + Tailwind CSS 4)
- **Data Fetching:** Supabase JS Client (@supabase/ssr)
- **Charts:** Recharts
- **State:** URL parameters (nuqs)

### Backend
- **Runtime:** Node.js 20 (ES Modules)
- **Sync Logic:** Modular HubSpot API integration (3 scripts)
- **Automation:** GitHub Actions (FREE tier)

### Database & Storage
- **Database:** Supabase (PostgreSQL 17)
- **Schema:** Raw tables + JSONB (preserves full API responses)
- **Performance:** SQL functions + materialized views

### External Integrations
- **HubSpot:** CRM data source (contacts, deals, calls)
- **Kavkom:** Call recordings integration (via HubSpot)

### Deployment
- **Platform:** Vercel
- **Sync:** GitHub Actions (independent of frontend deployment)

---

## Key Architecture Decisions

### 1. Why Modular Sync Architecture?

**Decision:** Use 3 independent scripts (contacts, deals, calls) instead of monolithic sync

**Context:**
- October 2025: Monolithic script (`sync-full.js`) reached 677 lines
- Debugging was difficult (which entity failed?)
- One API failure stopped entire sync

**Alternatives Considered:**
1. ❌ Keep monolithic (simple but fragile)
2. ✅ **Modular scripts** (chosen)
3. ❌ Microservices (overkill for 10k LOC)

**Decision:**
```
scripts/
├── sync-contacts.js    # 135 lines
├── sync-deals.js       # 135 lines
└── sync-calls.js       # 135 lines
```

**Benefits:**
- ✅ **Isolation**: Failed contacts ≠ failed deals
- ✅ **Debugging**: 135 lines vs 677 lines
- ✅ **Parallel**: GitHub Actions runs all 3 simultaneously
- ✅ **UNIX Philosophy**: Do one thing well
- ✅ **Industry Standard**: Segment, Fivetran, Airbyte use modular

**Trade-offs:**
- ➖ More files (3 vs 1)
- ➕ But shared library (`lib/sync/`) keeps DRY

---

### 2. Why GitHub Actions Instead of Vercel Cron?

**Decision:** Use GitHub Actions for automated sync

**Context:**
- Vercel Hobby plan: 1 cron job (insufficient)
- Vercel Pro: $20/month just for cron
- GitHub Actions: FREE (2000 minutes/month)

**Alternatives Considered:**
1. ❌ Vercel Cron (requires Pro plan $20/mo)
2. ✅ **GitHub Actions** (chosen - FREE)
3. ❌ AWS Lambda (over-engineering)

**Implementation:**
```yaml
# .github/workflows/incremental-sync.yml
- cron: '0 */4 * * *'  # Every 4 hours

# .github/workflows/daily-full-sync.yml
- cron: '0 2 * * *'    # Daily at 02:00 UTC
```

**Benefits:**
- ✅ **FREE**: 2000 minutes/month (vs $20/mo Vercel Pro)
- ✅ **Independent**: Sync doesn't depend on frontend deployment
- ✅ **Manual Trigger**: workflow_dispatch support
- ✅ **Logs**: Built-in GitHub Actions UI

**Trade-offs:**
- ➖ External platform (not in Vercel)
- ➕ But more reliable (no cold starts)

---

### 3. Why Triple Logging System?

**Decision:** Console + JSON Files + Supabase (filtered)

**Context:**
- Engineers need ALL events for debugging
- Clients need ONLY important events for clarity
- Single logging creates conflict

**Alternatives Considered:**
1. ❌ Console only (lost after execution)
2. ❌ Supabase only (too noisy for clients)
3. ✅ **Triple Logging** (chosen)

**Implementation:**

```javascript
// lib/sync/logger.js
const shouldLogToSupabase =
  level === 'ERROR' ||
  level === 'WARNING' ||
  step === 'START' ||
  step === 'END' ||
  step === 'TIMEOUT';
```

**Logging Streams:**
1. **Console** - Real-time (all events)
2. **JSON Files** - `logs/YYYY-MM-DD.jsonl` (all events, audit trail)
3. **Supabase** - Filtered (only START, END, ERROR, WARNING for client dashboard)

**Benefits:**
- ✅ **Engineers**: Full visibility via console + JSON
- ✅ **Clients**: Clean dashboard (no technical noise)
- ✅ **Industry Standard**: JSONL (AWS, Datadog, ELK)
- ✅ **Troubleshooting**: Multiple debugging paths

**Trade-offs:**
- ➖ More complexity (3 streams)
- ➕ But solves engineer vs client needs

See [LOGGING.md](./LOGGING.md) for details.

---

### 4. Why 24 Metrics Instead of 22?

**Decision:** Expand from 22 to 24 metrics

**Added:**
- `totalContactsCreated` (Sales) - lead generation tracking
- `callToCloseRate` (Call-to-Close) - call → sale conversion

**Context:**
- October 2025: Needed better lead generation visibility
- Wanted team call-to-close performance tracking

**Benefits:**
- ✅ Complete funnel view (contacts created → calls → deals)
- ✅ Team performance tracking

---

### 5. Why SQL Functions Instead of Client-Side Aggregation?

**Decision:** Pre-compute metrics in PostgreSQL SQL functions

**Context:**
- Before: Fetch all records → aggregate in Node.js → 30+ seconds
- After: SQL functions with indexes → 2-3 seconds

**Alternatives Considered:**
1. ❌ Client-side aggregation (30+ seconds)
2. ❌ Materialized view for ALL metrics (stale data)
3. ✅ **SQL Functions** (chosen - real-time + fast)

**Implementation:**
```sql
get_sales_metrics(owner_id, date_from, date_to)
get_call_metrics(owner_id, date_from, date_to)
get_conversion_metrics(...)
-- etc (8 modular functions total)
```

**Benefits:**
- ✅ **Performance**: 2-3s vs 30s (10x faster)
- ✅ **Real-time**: No cache staleness
- ✅ **Modular**: Each metric category independent
- ✅ **Testable**: Can test each function separately

**Trade-offs:**
- ➖ SQL code (not TypeScript)
- ➕ But massive performance gain

---

### 6. Why JSONB Storage for HubSpot Data?

**Decision:** Store ALL HubSpot fields in JSONB column

**Context:**
- HubSpot has 421 contact properties
- We use 35, but custom fields added regularly
- Schema migrations for every new field = painful

**Alternatives Considered:**
1. ❌ Fetch only 35 properties (lose custom fields)
2. ❌ Create column for every property (421 columns!)
3. ✅ **JSONB column** (chosen)

**Implementation:**
```sql
CREATE TABLE hubspot_contacts_raw (
  id uuid PRIMARY KEY,
  hs_object_id text UNIQUE,
  email text,  -- frequently queried
  phone text,  -- frequently queried
  -- ... 35 critical fields ...
  data jsonb   -- ALL HubSpot fields (including custom)
);
```

**Benefits:**
- ✅ **Future-proof**: New custom fields auto-saved
- ✅ **No migrations**: Add HubSpot fields without schema changes
- ✅ **Full data**: Never lose information
- ✅ **Merge logic**: Preserves old custom fields when updating

**Trade-offs:**
- ➖ Some queries slower (JSONB)
- ➕ But critical fields indexed (email, phone, etc.)

---

### 7. Why Auto-Generated Metrics Documentation?

**Decision:** Generate docs from YAML source of truth

**Context:**
- October 2025: Manual `METRICS_GUIDE.md` had 5 metrics
- Real code had 24 metrics
- Documentation drift = confusion

**Alternatives Considered:**
1. ❌ Manual Markdown (hard to maintain)
2. ✅ **YAML → auto-generate** (chosen)
3. ❌ JSDoc comments (not user-friendly)

**Implementation:**
```yaml
# docs/metrics-schema.yaml (SSOT)
categories:
  sales:
    metrics:
      totalSales:
        title: "Total Sales"
        description: "..."
        sql: "SELECT SUM(amount)..."
```

```bash
# Auto-generate
npm run docs:generate
```

**Generates:**
- `lib/metric-definitions.generated.ts` (TypeScript)
- `docs/METRICS_GUIDE.generated.md` (User docs)

**Benefits:**
- ✅ **Single Source of Truth**: YAML
- ✅ **No drift**: Docs always match code
- ✅ **SQL included**: Developers see queries
- ✅ **DRY**: One source, two outputs

---

### 8. Why Next.js Server Components by Default?

**Decision:** Use Server Components for data fetching, minimize `'use client'`

**Context:**
- Next.js 15 App Router: RSC by default
- Dashboard = mostly static with filters
- Real-time updates not critical (hourly sync)

**Alternatives Considered:**
1. ❌ Client-side SPA (slow initial load)
2. ✅ **Server Components** (chosen)
3. ❌ SSG (data changes hourly)

**Implementation:**
```typescript
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  const metrics = await getAllMetrics({ ownerId, dateFrom, dateTo });
  return <MetricCard value={metrics.totalSales} />;
}
```

**Benefits:**
- ✅ **Performance**: Fast initial load
- ✅ **SEO**: Fully rendered HTML
- ✅ **Less JS**: Smaller bundle size
- ✅ **Direct DB**: No API routes needed

**Trade-offs:**
- ➖ Client components for interactivity
- ➕ But minimal (only for charts, filters)

---

## Current Status (2025-10-31)

### Metrics
- ✅ 24 metrics implemented
- ✅ Auto-generated documentation
- ✅ SQL functions (2-3s performance)

### Sync
- ✅ Modular architecture (3 scripts)
- ✅ GitHub Actions automation
- ✅ Triple logging system

### Performance
- ✅ 2-3s dashboard load
- ✅ Materialized views for complex joins
- ✅ Indexes on critical fields

### Documentation
- ✅ ARCHITECTURE.md (system design)
- ✅ LOGGING.md (observability)
- ✅ METRICS_GUIDE.generated.md (24 metrics)
- ✅ This ADR (decisions)

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [LOGGING.md](./LOGGING.md) - Triple logging system
- [METRICS_GUIDE.generated.md](./METRICS_GUIDE.generated.md) - All 24 metrics
- [setup/](./setup/) - Setup guides
