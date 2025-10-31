# 📊 METRICS ARCHITECTURE - Complete Map

## 🏗️ Architecture Overview

```
┌─────────────────────┐
│   HUBSPOT DATA      │
│  (sync via API)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  SUPABASE TABLES (Raw Data)                            │
├─────────────────────────────────────────────────────────┤
│  • hubspot_contacts_raw                                 │
│  • hubspot_deals_raw                                    │
│  • hubspot_calls_raw                                    │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  MATERIALIZED VIEWS (Cached - refresh every hour)      │
├─────────────────────────────────────────────────────────┤
│  • daily_metrics_mv          (sales, conversion, etc)   │
│  • call_contact_matches_mv   (calls with contacts)      │
│  • contact_call_stats_mv     (followup stats)           │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  SQL FUNCTIONS (8 modular functions)                    │
├─────────────────────────────────────────────────────────┤
│  1. get_sales_metrics()         ← migration 036 + 037   │
│  2. get_call_metrics()          ← migration 036          │
│  3. get_conversion_metrics()    ← migration 036          │
│  4. get_payment_metrics()       ← migration 036          │
│  5. get_followup_metrics()      ← migration 036          │
│  6. get_offer_metrics()         ← migration 036          │
│  7. get_time_metrics()          ← migration 036          │
│  8. get_ab_testing_metrics()    ← migration 036          │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  BACKEND API (Next.js Route Handlers)                   │
├─────────────────────────────────────────────────────────┤
│  GET /api/metrics                                        │
│    └─> getDashboardOverview() in metrics-fast.ts        │
│        └─> Calls all 8 functions in parallel            │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React Components)                            │
├─────────────────────────────────────────────────────────┤
│  • app/dashboard/page.tsx       (main dashboard)        │
│  • components/MetricCard.tsx    (display metrics)       │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Files Responsible for Metrics

### 1️⃣ SQL Layer (Supabase)

| File | What it does |
|------|-------------|
| `migrations/036_modular_metrics_functions.sql` | Creates 8 modular SQL functions |
| `migrations/037_cleanup_legacy_and_fix_conversion_rate.sql` | Fixes conversionRate, adds totalContactsCreated |
| `migrations/021_create_daily_metrics_view.sql` | Creates daily_metrics_mv (cached) |
| `migrations/027_materialize_contact_call_stats.sql` | Creates contact_call_stats_mv |
| `migrations/013_materialize_call_contact_matches.sql` | Creates call_contact_matches_mv |

### 2️⃣ TypeScript Layer (Backend)

| File | What it does |
|------|-------------|
| `frontend/lib/db/metrics-fast.ts` | Main metrics logic, calls 8 SQL functions in parallel |
| `frontend/app/api/metrics/route.ts` | API endpoint GET /api/metrics |

### 3️⃣ Frontend Layer

| File | What it does |
|------|-------------|
| `frontend/app/dashboard/page.tsx` | Dashboard page, displays all metrics |
| `frontend/components/MetricCard.tsx` | Individual metric card component |
| `frontend/components/dashboard/FilterPanel.tsx` | Owner + Time Range filters |

---

## 🔢 8 Metric Groups - Complete Breakdown

### 1. SALES METRICS (5 metrics)

**SQL Function:** `get_sales_metrics()`
**Location:** `migrations/037_cleanup_legacy_and_fix_conversion_rate.sql` (line 60-115)
**Data Source:** `daily_metrics_mv` + `hubspot_contacts_raw`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Total Sales | `totalSales` | SUM(daily_sales) | Currency |
| Total Deals | `totalDeals` | SUM(daily_deals_won) | Number |
| Avg Deal Size | `avgDealSize` | totalSales / totalDeals | Currency |
| Conversion Rate | `conversionRate` | (customers / contacts_created) * 100 | Percentage |
| Contacts Created | `totalContactsCreated` | COUNT(contacts in period) | Number |

**How to Test:**
```sql
SELECT * FROM get_sales_metrics(NULL, '2025-10-01', '2025-10-16');
SELECT * FROM get_sales_metrics('682432124', '2025-10-01', '2025-10-16');
```

**Frontend Display:** `dashboard/page.tsx` lines 145-183

---

### 2. CALL METRICS (4 metrics)

**SQL Function:** `get_call_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 102-143)
**Data Source:** `call_contact_matches_mv`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Total Calls | `totalCalls` | COUNT(calls) | Number |
| Avg Call Time | `avgCallTime` | AVG(call_duration) / 60000 | Decimal (minutes) |
| Total Call Time | `totalCallTime` | SUM(call_duration) / 3600000 | Decimal (hours) |
| 5min Reached Rate | `fiveMinReachedRate` | (calls ≥ 5min / total) * 100 | Percentage |

**How to Test:**
```sql
SELECT * FROM get_call_metrics(NULL, '2025-10-01', '2025-10-16');
```

**Frontend Display:** `dashboard/page.tsx` lines 186-217

---

### 3. CONVERSION METRICS (3 metrics)

**SQL Function:** `get_conversion_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 149-191)
**Data Source:** `daily_metrics_mv`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Qualified Rate | `qualifiedRate` | (qualified / total_deals) * 100 | Percentage |
| Trial Rate | `trialRate` | (trials / total_deals) * 100 | Percentage |
| Cancellation Rate | `cancellationRate` | (lost / total_deals) * 100 | Percentage |

**HubSpot Fields Used:**
- `qualified_status` in deals table
- `trial_status` in deals table
- `dealstage = 'closedlost'`

**How to Test:**
```sql
SELECT * FROM get_conversion_metrics(NULL, '2025-10-01', '2025-10-16');
```

**Frontend Display:** `dashboard/page.tsx` lines 220-244

---

### 4. PAYMENT METRICS (2 metrics)

**SQL Function:** `get_payment_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 197-233)
**Data Source:** `daily_metrics_mv`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Upfront Cash Collected | `upfrontCashCollected` | SUM(upfront_payment) | Currency |
| Avg Installments | `avgInstallments` | AVG(number_of_installments__months) | Decimal |

**HubSpot Fields Used:**
- `upfront_payment` in deals table
- `number_of_installments__months` in deals table

**How to Test:**
```sql
SELECT * FROM get_payment_metrics(NULL, '2025-10-01', '2025-10-16');
```

**Frontend Display:** `dashboard/page.tsx` lines 247-264

---

### 5. FOLLOWUP METRICS (3 metrics)

**SQL Function:** `get_followup_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 239-271)
**Data Source:** `contact_call_stats_mv`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Followup Rate | `followupRate` | (contacts with >1 call / total) * 100 | Percentage |
| Avg Followups | `avgFollowups` | AVG(followup_count) | Decimal |
| Time to First Contact | `timeToFirstContact` | AVG(days_to_first_call) | Decimal (days) |

**How to Test:**
```sql
SELECT * FROM get_followup_metrics(NULL, NULL, NULL);
```

**Frontend Display:** `dashboard/page.tsx` lines 267-291

---

### 6. OFFER METRICS (2 metrics)

**SQL Function:** `get_offer_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 277-317)
**Data Source:** `daily_metrics_mv`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Offers Given Rate | `offersGivenRate` | (offers_given / total_deals) * 100 | Percentage |
| Offer → Close Rate | `offerCloseRate` | (offers_closed / offers_given) * 100 | Percentage |

**HubSpot Fields Used:**
- `offer_given` (boolean) in deals table
- `offer_accepted` (boolean) in deals table

**How to Test:**
```sql
SELECT * FROM get_offer_metrics(NULL, '2025-10-01', '2025-10-16');
```

**Frontend Display:** `dashboard/page.tsx` lines 314-331

---

### 7. TIME METRICS (1 metric)

**SQL Function:** `get_time_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 323-358)
**Data Source:** `daily_metrics_mv`

| Metric | Field Name | Calculation | Format |
|--------|-----------|-------------|--------|
| Time to Sale | `timeToSale` | AVG(closedate - createdate) | Decimal (days) |

**How to Test:**
```sql
SELECT * FROM get_time_metrics(NULL, '2025-10-01', '2025-10-16');
```

**Frontend Display:** `dashboard/page.tsx` lines 294-311

---

### 8. A/B TESTING METRICS (2 metrics)

**SQL Function:** `get_ab_testing_metrics()`
**Location:** `migrations/036_modular_metrics_functions.sql` (line 364-431)
**Data Source:** `hubspot_contacts_raw` (NOT cached!)

| Metric | Field Name | What it shows |
|--------|-----------|---------------|
| Sales Script Stats | `salesScriptStats` | Conversion rate by script version |
| VSL Watch Stats | `vslWatchStats` | Conversion rate by VSL watch status |

**HubSpot Fields Used:**
- `sales_script_version` in contacts table
- `vsl_watched` (boolean) in contacts table

**How to Test:**
```sql
SELECT * FROM get_ab_testing_metrics(NULL, NULL, NULL);
```

**Frontend Display:** `dashboard/page.tsx` lines 334-381

---

## ✅ Testing Checklist (Top to Bottom)

### Phase 1: Test Each SQL Function Directly

```sql
-- 1. Sales (should return 5 fields including totalContactsCreated)
SELECT * FROM get_sales_metrics(NULL, '2025-10-09', '2025-10-16');

-- 2. Calls (should return 4 fields)
SELECT * FROM get_call_metrics(NULL, '2025-10-09', '2025-10-16');

-- 3. Conversion (should return 3 fields)
SELECT * FROM get_conversion_metrics(NULL, '2025-10-09', '2025-10-16');

-- 4. Payment (should return 2 fields)
SELECT * FROM get_payment_metrics(NULL, '2025-10-09', '2025-10-16');

-- 5. Followup (should return 3 fields)
SELECT * FROM get_followup_metrics(NULL, NULL, NULL);

-- 6. Offers (should return 2 fields)
SELECT * FROM get_offer_metrics(NULL, '2025-10-09', '2025-10-16');

-- 7. Time (should return 1 field)
SELECT * FROM get_time_metrics(NULL, '2025-10-09', '2025-10-16');

-- 8. A/B Testing (should return 2 arrays)
SELECT * FROM get_ab_testing_metrics(NULL, NULL, NULL);
```

### Phase 2: Test API Endpoint

```bash
# Test with different date ranges
curl "http://localhost:3003/api/metrics?date_from=2025-10-09&date_to=2025-10-16"
curl "http://localhost:3003/api/metrics?date_from=2025-09-16&date_to=2025-10-16"

# Test with owner filter
curl "http://localhost:3003/api/metrics?owner_id=682432124&date_from=2025-09-16&date_to=2025-10-16"
```

### Phase 3: Test UI Manually

1. Open http://localhost:3003/dashboard
2. Select different time ranges (7d, 30d, 90d)
3. Select different owners
4. Check each metric card displays correctly
5. Verify values make sense

---

## 🐛 Known Issues & Expected Behavior

### Working Metrics (15/23):
- ✅ Sales (5) - All working
- ✅ Calls (4) - All working
- ✅ Followup (3) - All working
- ✅ Time (1) - Working
- ✅ A/B Testing (2) - Working

### Metrics with Missing Data (8/23):
- ⚠️ Conversion (3) - HubSpot fields empty (qualified_status, trial_status)
- ⚠️ Payment (2) - HubSpot fields empty (upfront_payment, installments)
- ⚠️ Offer (2) - HubSpot fields empty (offer_given, offer_accepted)
- ⚠️ Time to First Contact - May show 0 if no data

**This is NOT a bug** - these HubSpot custom fields need to be populated in HubSpot first!

---

## 🔍 How to Debug Issues

1. **SQL Level:**
   - Run SQL function directly in Supabase SQL editor
   - Check if it returns expected JSON structure
   - Verify data exists in source tables/views

2. **API Level:**
   - Check logs in terminal: `[INFO] [metrics-fast] ...`
   - Look for errors in function calls
   - Verify API response structure

3. **Frontend Level:**
   - Open browser DevTools → Network tab
   - Check `/api/metrics` request/response
   - Verify data is rendered in MetricCard components

---

## 📚 Quick Reference

**Main Files to Know:**
1. `migrations/036_modular_metrics_functions.sql` - Creates 8 functions
2. `migrations/037_cleanup_legacy_and_fix_conversion_rate.sql` - Fixes conversionRate
3. `frontend/lib/db/metrics-fast.ts` - TypeScript interface
4. `frontend/app/api/metrics/route.ts` - API endpoint
5. `frontend/app/dashboard/page.tsx` - Dashboard UI

**Server:** http://localhost:3003
**Dashboard:** http://localhost:3003/dashboard
**API:** http://localhost:3003/api/metrics

---

**Last Updated:** 2025-10-16
**Status:** ✅ All migrations applied, ready for testing
