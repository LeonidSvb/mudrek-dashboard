# Mudrek Dashboard - HubSpot Analytics Platform

Powerful analytics platform for tracking sales metrics from HubSpot CRM with automatic synchronization and advanced calculations.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (PostgreSQL 17)
- **Charts**: Recharts
- **Deployment**: Vercel
- **CRM Integration**: HubSpot API

## Quick Start

### Prerequisites

- Node.js 20+
- Access to Supabase project
- HubSpot Private App with access to: Contacts, Deals, Calls, Owners

### Installation

```bash
# Clone repository
git clone https://github.com/LeonidSvb/mudrek-dashboard.git
cd mudrek-dashboard

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env (see Environment Variables section)

# Start dev server
npm run dev
```

Open http://localhost:3000

### Environment Variables

Create `.env` file:

```bash
# Supabase (get from https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...

# HubSpot Private App (create in Settings → Integrations → Private Apps)
HUBSPOT_API_KEY=pat-eu1-xxx...

# Optional: Vercel Cron Secret (to protect /api/sync endpoint)
CRON_SECRET=your-random-secret
```

## Project Architecture

```
mudrek-dashboard/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── sync/            # HubSpot sync endpoints
│   │   ├── metrics/         # Metrics API
│   │   ├── sales-funnel/    # Sales funnel data
│   │   └── deals/           # Deals breakdown
│   ├── dashboard/           # Dashboard page
│   └── sync/                # Manual sync page
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   └── dashboard/           # Dashboard-specific components
├── lib/
│   ├── db/                  # Database functions
│   │   └── metrics-fast.ts  # Fast metrics via SQL functions
│   ├── sync/                # HubSpot sync logic
│   │   ├── contacts.ts
│   │   ├── deals.ts
│   │   ├── calls.ts
│   │   └── owners.ts
│   └── metric-definitions.ts # Metric explanations
├── migrations/              # Supabase SQL migrations
└── scripts/                 # Utility scripts
```

## Key Features

### 1. Automatic HubSpot Synchronization

- **Incremental Sync**: Every 2 hours (via Vercel Cron)
- **Full Sync**: Daily at 00:00 UTC
- **Manual Sync**: Available at `/sync`
- **Rate Limiting**: Automatic retry when exceeding HubSpot API limits

### 2. Real-time Metrics

**Sales (5 metrics)**:
- Total Sales
- Average Deal Size
- Total Deals
- Conversion Rate (contacts → customers)
- Contacts Created

**Call Performance (5 metrics)**:
- Total Calls
- Average Call Time
- Total Call Time
- Pickup Rate (calls with real conversation)
- 5min Reached Rate

**Conversion (3 metrics)**:
- Qualified Rate
- Trial Rate
- Cancellation Rate

**Payment (2 metrics)**:
- Upfront Cash Collected
- Average Installments

**Followup (3 metrics)**:
- Followup Rate
- Average Followups
- Time to First Contact

**Time Performance (1 metric)**:
- Time to Sale

**Call-to-Close (self-learning system)**:
- Team Call-to-Close Rate
- Per-manager rates
- Automatic closing manager detection

### 3. Visualizations

- **Sales Funnel**: 5-stage sales pipeline
- **Deals Breakdown**: Deal distribution by stage
- **Timeline Charts**: Metrics dynamics over time
- **Team Performance**: Sales managers comparison

### 4. A/B Testing

- Sales Script Performance (by script versions)
- VSL Watch Impact (video viewing impact)

## Database (Supabase)

### Main Tables

```sql
hubspot_contacts_raw   -- All contacts from HubSpot
hubspot_deals_raw      -- All deals
hubspot_calls_raw      -- All calls
hubspot_owners         -- Sales managers
```

### Materialized Views (for performance)

```sql
call_contact_matches_mv     -- Call-to-contact matching
phone_to_owner_mapping      -- ML-based phone number mapping
```

### SQL Functions (fast calculations)

```sql
get_sales_metrics()         -- Sales metrics
get_call_metrics()          -- Call metrics
get_conversion_metrics()    -- Conversion metrics
get_call_to_close_metrics() -- Call-to-Close with auto-detection
get_sales_funnel()          -- Sales funnel
get_deals_breakdown()       -- Breakdown by stages
get_timeline_metrics()      -- Time series
```

## Deployment

### Vercel (Production)

```bash
# Automatic deploy on push to master
git push origin master

# Or manually via Vercel CLI
vercel --prod
```

### Environment Variables in Vercel

Add in Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `HUBSPOT_API_KEY`
- `CRON_SECRET`

### Vercel Cron Jobs

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync?mode=incremental",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/sync?mode=full",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Migrations

### Applying New Migration

1. Create file in `migrations/XXX_description.sql`
2. Run via Supabase Dashboard: SQL Editor
3. Or via Supabase CLI:

```bash
supabase db push
```

### Important Migrations

- `036_modular_metrics_functions.sql` - Modular metrics functions
- `038_call_to_close_metrics.sql` - ML-based phone mapping
- `039_optimize_call_to_close.sql` - Call-to-close optimization (3s instead of 60s)

## Adding New Metric

1. **Define metric** in `lib/metric-definitions.ts`:

```typescript
export const METRIC_DEFINITIONS = {
  myNewMetric: {
    description: "What this metric shows",
    source: "Where data comes from",
    interpretation: "How to read it"
  }
}
```

2. **Create SQL function** in `migrations/`:

```sql
CREATE OR REPLACE FUNCTION get_my_new_metric(
  p_owner_id TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
  -- your calculations
  RETURN result;
END;
$$;
```

3. **Add to TypeScript** in `lib/db/metrics-fast.ts`:

```typescript
const { data } = await supabase.rpc('get_my_new_metric', {
  p_owner_id: ownerId || null,
  p_date_from: dateFrom || null,
  p_date_to: dateTo || null,
});
```

4. **Add MetricCard** in `app/dashboard/page.tsx`:

```tsx
<MetricCard
  title="My New Metric"
  value={metrics.myNewMetric}
  format="number"
  helpText={formatMetricHelp(METRIC_DEFINITIONS.myNewMetric)}
/>
```

## Troubleshooting

### Slow Queries

1. Check `EXPLAIN ANALYZE` in Supabase SQL Editor
2. Refresh materialized views:

```sql
REFRESH MATERIALIZED VIEW call_contact_matches_mv;
REFRESH MATERIALIZED VIEW phone_to_owner_mapping;
```

3. Add indexes if needed

### HubSpot API Rate Limits

- **Burst limit**: 100 requests/10s (automatic retry)
- **Daily limit**: 500,000 calls/day
- Sync makes ~1000-2000 requests per full sync

### Metrics = 0

See `docs/METRICS_GUIDE.md` for explanation of each metric and reasons for zero values.

## Development

```bash
# Dev server with hot reload
npm run dev

# Type checking
npm run lint

# Production build (locally)
npm run build
npm start
```

## Additional Documentation

- **[docs/METRICS_GUIDE.md](docs/METRICS_GUIDE.md)** - Detailed explanation of all metrics (for managers)
- **[docs/HUBSPOT_SETUP.md](docs/HUBSPOT_SETUP.md)** - HubSpot configuration for accurate metrics

## License

Private repository. All rights reserved.

## Contacts

- **Project Owner**: Shadi Halloun
- **Developer**: Leo
- **Repository**: https://github.com/LeonidSvb/mudrek-dashboard
