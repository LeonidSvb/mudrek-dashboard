# Architecture Overview

Complete technical architecture of Mudrek Dashboard.

**Last Updated:** 2025-10-31

---

## Table of Contents

- [1. Sync System](#1-sync-system)
- [2. HubSpot Integration](#2-hubspot-integration)
- [3. Database (Supabase)](#3-database-supabase)
- [4. Frontend Architecture](#4-frontend-architecture)

---

## 1. Sync System

### Modular Architecture

**3 Independent Scripts:**
```
scripts/
├── sync-contacts.js    # Syncs contacts (35 properties)
├── sync-deals.js       # Syncs deals (21 properties)
├── sync-calls.js       # Syncs calls (9 properties)
│
├── sync-full.js        # Legacy monolith (kept for compatibility)
└── sync-incremental.js # Legacy monolith (kept for compatibility)
```

**Shared Library** (DRY principle):
```
lib/sync/
├── logger.js          # Triple logging system
├── api.js             # HubSpot API client with retry
├── transform.js       # Data transformation
├── upsert.js          # JSONB merge logic
├── properties.js      # HubSpot field configuration
└── cli.js             # CLI argument parser
```

### Why Modular?

- ✅ **Isolation**: Failed contacts sync ≠ failed deals sync
- ✅ **Debugging**: 135 lines each vs 677 lines monolith
- ✅ **Parallel**: GitHub Actions runs all 3 simultaneously
- ✅ **UNIX Philosophy**: "Do one thing well"

### Sync Modes

**Incremental Sync** (default):
```bash
node scripts/sync-contacts.js
```
- Fetches records modified since last successful sync
- Uses 3-level fallback for timestamp detection:
  1. Last successful run in `runs` table
  2. Latest `lastmodifieddate` in existing records
  3. Default: last 30 days

**Full Sync** (with `--all` flag):
```bash
node scripts/sync-contacts.js --all
```
- Fetches ALL records from HubSpot
- Auto-detects new custom fields
- Recommended: once per day

**Custom Date Range:**
```bash
node scripts/sync-contacts.js --last=7d
node scripts/sync-deals.js --from=2025-10-01 --to=2025-10-15
```

### GitHub Actions Automation

**Incremental Sync** (`.github/workflows/incremental-sync.yml`):
- **Schedule**: Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
- **Cron**: `0 */4 * * *`
- **Timeout**: 30 minutes
- **Runs**: 3 scripts in sequence (contacts → deals → calls)

**Daily Full Sync** (`.github/workflows/daily-full-sync.yml`):
- **Schedule**: Daily at 02:00 UTC
- **Cron**: `0 2 * * *`
- **Timeout**: 1 hour
- **Runs**: 3 scripts with `--all` flag

**Benefits:**
- ✅ FREE (GitHub Actions, no Vercel Pro needed)
- ✅ Automatic execution
- ✅ Independent from frontend deployment
- ✅ Manual trigger support

---

## 2. HubSpot Integration

### Properties Fetched

**Contacts (35 properties):**

*Standard HubSpot (11):*
- `email`, `phone`, `firstname`, `lastname`
- `createdate`, `lastmodifieddate`, `lifecyclestage`
- `hubspot_owner_id`, `hs_object_id`

*Custom Critical (9):*
- `sold_by_` - WHO sold (sales attribution)
- `contact_stage`, `status`, `stage` - funnel tracking
- `sales_script_version` - A/B testing
- `qualified`, `hot_lead` - lead scoring
- `contact_source`, `lost_reason` - analytics

*Custom Useful (15):*
- Payment: `deal_amount`, `monthly_payment`, `number_of_installments`, `payment_method`
- Video: `vsl_watched`, `vsl_watch_duration`, `video_attended`
- Lead: `lead_score`, `first_contact_within_30min`, `offer_sent`
- Marketing: `campaign`, `ad`, `source`, `quiz`
- Dates: `first_payment_date`, `last_payment`

**Deals (21 properties):**
- Core: `amount`, `dealstage`, `dealname`, `createdate`, `closedate`
- Status: `qualified_status`, `trial_status`, `payment_status`
- Payment: `number_of_installments__months`, `upfront_payment`, `installment_plan`, `installment_monthly_amount`
- Offers: `offer_given`, `offer_accepted`
- Amounts: `deal_whole_amount`, `the_left_amount`
- Other: `cancellation_reason`, `is_refunded`, `hubspot_owner_id`, `lastmodifieddate`

**Calls (9 properties):**
- Duration: `hs_call_duration`
- Direction: `hs_call_direction`
- Numbers: `hs_call_to_number`, `hs_call_from_number`
- Status: `hs_call_disposition`, `hs_call_status`
- Timestamps: `hs_timestamp`, `hs_createdate`
- Owner: `hubspot_owner_id` (who made the call)

### Why JSONB Storage?

```sql
-- Example: hubspot_contacts_raw
CREATE TABLE hubspot_contacts_raw (
  id uuid PRIMARY KEY,
  hs_object_id text UNIQUE,
  email text,
  phone text,
  -- ... other columns ...
  data jsonb  -- ALL HubSpot fields (including future custom fields)
);
```

**Benefits:**
- ✅ **Future-proof**: New custom fields auto-saved
- ✅ **No schema changes**: Add HubSpot fields without migrations
- ✅ **Full data**: Never lose information
- ✅ **Merge logic**: Preserves old custom fields when updating

### API Rate Limits

- **Burst limit**: 100 requests/10 seconds (automatic retry with exponential backoff)
- **Daily limit**: 500,000 calls/day
- **Typical sync**: ~1000-2000 requests per full sync

---

## 3. Database (Supabase)

### Main Tables

**Raw Data Tables:**
```sql
hubspot_contacts_raw   -- All contacts (35+ fields + JSONB)
hubspot_deals_raw      -- All deals (21+ fields + JSONB)
hubspot_calls_raw      -- All calls (9+ fields + JSONB)
hubspot_owners         -- Sales managers (from HubSpot)
```

**Observability Tables:**
```sql
runs  -- Sync execution tracking (status, duration, records count)
logs  -- Filtered event logs (START, END, ERROR, WARNING)
```

### Materialized Views

**Purpose**: Pre-computed joins for performance

```sql
call_contact_matches_mv  -- Matches calls to contacts by phone number
phone_to_owner_mapping   -- ML-based phone → owner mapping
```

**Refresh:**
```sql
REFRESH MATERIALIZED VIEW call_contact_matches_mv;
REFRESH MATERIALIZED VIEW phone_to_owner_mapping;
```

### SQL Functions (for fast metrics)

**Modular Metrics Functions:**
```sql
get_sales_metrics(owner_id, date_from, date_to)
  → { totalSales, avgDealSize, totalDeals, conversionRate, totalContactsCreated }

get_call_metrics(owner_id, date_from, date_to)
  → { totalCalls, avgCallTime, totalCallTime, pickupRate, fiveMinReachedRate }

get_conversion_metrics(owner_id, date_from, date_to)
  → { qualifiedRate, trialRate, cancellationRate }

get_payment_metrics(owner_id, date_from, date_to)
  → { upfrontCashCollected, avgInstallments }

get_followup_metrics(owner_id, date_from, date_to)
  → { followupRate, avgFollowups, timeToFirstContact }

get_offer_metrics(owner_id, date_from, date_to)
  → { offersGivenRate, offerCloseRate }

get_time_metrics(owner_id, date_from, date_to)
  → { timeToSale }

get_call_to_close_metrics(owner_id, date_from, date_to)
  → { callToCloseRate }
```

**Visualization Functions:**
```sql
get_sales_funnel(owner_id, date_from, date_to)
  → 5-stage funnel with counts

get_deals_breakdown(owner_id, date_from, date_to)
  → Deals distribution by stage

get_timeline_metrics(owner_id, date_from, date_to, interval)
  → Time series for all metrics
```

**Performance:** 2-3 seconds for all metrics (vs 30+ seconds with client-side aggregation)

### Indexes

**Optimized for dashboard queries:**

Contacts:
- `email` (lookup)
- `phone` (call matching)
- `createdate` (date filtering)
- `hubspot_owner_id` (manager filtering)

Deals:
- `dealstage` (funnel queries)
- `closedate` (date filtering)
- `contact_id` (joins)
- `hubspot_owner_id` (manager filtering)

Calls:
- `contact_id` (joins)
- `hs_timestamp` (date filtering)
- `hubspot_owner_id` (manager filtering)

---

## 4. Frontend Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 19 (Server Components by default)
- **TypeScript**: 5.6 (interfaces over types)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts
- **State**: URL parameters (nuqs)
- **Data Fetching**: Supabase JS Client

### Server Components (RSC)

**Philosophy**: Minimize `'use client'`, fetch data on server

```typescript
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  // Data fetching on server
  const metrics = await getAllMetrics({ ownerId, dateFrom, dateTo });

  // Pass data to client components
  return <MetricCard value={metrics.totalSales} />;
}
```

**Benefits:**
- ✅ No API routes needed (direct DB access)
- ✅ Faster initial load
- ✅ SEO-friendly
- ✅ Less client-side JavaScript

### Client Components

**Only for interactivity:**
```typescript
// components/dashboard/MetricCard.tsx
'use client';

// Uses Web APIs (useState, useEffect)
// Handles user interactions
// Receives data as props from Server Components
```

### Data Flow

```
GitHub Actions (sync)
    ↓
Supabase (PostgreSQL)
    ↓
SQL Functions (aggregation)
    ↓
Next.js Server Components (fetch)
    ↓
Client Components (display)
    ↓
User Browser
```

### State Management

**URL Parameters (nuqs):**
- Manager filter (`?owner=123`)
- Date range (`?from=2025-10-01&to=2025-10-31`)

**Why URL state?**
- ✅ Shareable links
- ✅ Browser back/forward
- ✅ No global state needed
- ✅ Server Components read params directly

### File Structure

```
app/
├── api/                         # API Routes (only for special cases)
│   ├── metrics/route.ts         # Metrics API (if needed)
│   ├── sales-funnel/route.ts    # Sales funnel
│   └── deals/breakdown/route.ts # Deals breakdown
├── dashboard/                   # Main dashboard
│   └── page.tsx                 # Server Component
└── logs/                        # Sync logs viewer
    └── page.tsx                 # Server Component

components/
├── ui/                          # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
└── dashboard/                   # Dashboard-specific
    ├── MetricCard.tsx           # Client Component
    ├── TimelineCharts.tsx       # Client Component
    ├── SalesFunnel.tsx          # Client Component
    └── DealsBreakdown.tsx       # Client Component

lib/
├── db/
│   └── metrics-fast.ts          # SQL functions wrapper
├── metric-definitions.ts        # Metric explanations
└── supabase/
    ├── client.ts                # Browser client
    └── server.ts                # Server client
```

### Adding New Metric

1. **Define in YAML** (`docs/metrics-schema.yaml`)
2. **Create SQL function** in Supabase migration
3. **Add TypeScript wrapper** (`lib/db/metrics-fast.ts`)
4. **Add to dashboard** (`app/dashboard/page.tsx`)
5. **Regenerate docs** (`npm run docs:generate`)

---

## Performance

### Metrics Calculation

- **Before**: 30+ seconds (fetch all records, aggregate in Node.js)
- **After**: 2-3 seconds (SQL functions with indexes)

### Sync Performance

- **Incremental**: ~30-60 seconds (only modified records)
- **Full**: ~5-10 minutes (all records, 500+ contacts + 300+ deals + 1000+ calls)

### Frontend

- **Server Components**: Fast initial load
- **Incremental Static Regeneration**: Cached pages
- **Edge Functions**: Global distribution via Vercel

---

## Deployment

### Vercel (Frontend)

- **Automatic**: Push to `master` branch
- **Environment**: Production only (internal tool)
- **Edge Network**: Global CDN

### GitHub Actions (Sync)

- **Platform**: GitHub-hosted runners (FREE)
- **Execution**: Ubuntu-latest, Node.js 20
- **Logs**: Console + JSON files + Supabase

### Supabase (Database)

- **Platform**: Supabase Cloud
- **PostgreSQL**: Version 17
- **Region**: US (or closest to users)

---

## Troubleshooting

### Slow Queries

1. Check `EXPLAIN ANALYZE` in SQL Editor
2. Refresh materialized views
3. Add indexes if needed

### Sync Failures

- Check GitHub Actions logs
- Check Supabase `runs` and `logs` tables
- Check JSON logs: `logs/YYYY-MM-DD.jsonl`

### Metrics = 0

- See [METRICS_GUIDE.generated.md](./METRICS_GUIDE.generated.md)
- Check HubSpot custom field names
- Run full sync: `node scripts/sync-contacts.js --all`

---

## Related Documentation

- [LOGGING.md](./LOGGING.md) - Triple logging system
- [METRICS_GUIDE.generated.md](./METRICS_GUIDE.generated.md) - All 24 metrics explained
- [ADR.md](./ADR.md) - Architecture decisions
- [setup/](./setup/) - Setup guides
