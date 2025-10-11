# Dashboard Design - Source of Truth

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FILTER PANEL (Global)                      │
│  [Sales Manager ▼]    [Today] [7d] [30d] [90d] [Custom Date ▼] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DEALS BREAKDOWN (By Stage)                   │
│  appointmentscheduled │ closedwon │ closedlost │ ... (other)   │
│         25 deals      │  10 deals │   5 deals  │    ...        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  SALES METRICS   │ │  CALL METRICS    │ │ CONVERSION RATES │
│                  │ │                  │ │                  │
│ Total Sales      │ │ Total Calls      │ │ Qualified Rate   │
│ Avg Deal Size    │ │ Avg Call Time    │ │ Trial Rate       │
│ Total Deals      │ │ Total Call Time  │ │ Cancellation %   │
│ Conversion Rate  │ │ 5min Reached %   │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘

┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ PAYMENT METRICS  │ │ FOLLOWUP METRICS │ │  OFFER METRICS   │
│                  │ │                  │ │                  │
│ Upfront Cash     │ │ Followup Rate    │ │ Offers Given %   │
│ Avg Installments │ │ Avg Followups    │ │ Offer Close %    │
│                  │ │ Time to Contact  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘

┌──────────────────┐ ┌──────────────────────────────────────────┐
│  TIME METRICS    │ │       A/B TESTING METRICS                │
│                  │ │                                          │
│ Time to Sale     │ │ Sales Script Stats │ VSL Watch Stats    │
│ (avg days)       │ │  (version A/B/C)   │  (yes/no/unknown) │
└──────────────────┘ └──────────────────────────────────────────┘
```

## Components Structure

### 1. Global Filters (FilterPanel.tsx)
- **Owner Filter**: Dropdown selector
  - Default: "All Managers"
  - Options: List from `/api/owners`
- **Date Range Filter**: Custom date picker
  - Quick presets: Today, 7d, 30d, 90d
  - Custom range: Calendar with from/to dates
  - Format: MMM d, yyyy → MMM d, yyyy

### 2. Deals Breakdown (NEW - To Create)
- **Purpose**: Show deals distribution by stage
- **Data**: Count of deals per dealstage
- **Stages**: appointmentscheduled, closedwon, closedlost, + others
- **Layout**: Horizontal cards or table

### 3. Metrics Sections
- **Layout**: Grid cards, 3 columns desktop
- **Card Style**: Simple, clean (shadcn/ui Card component)
- **Format**:
  - Title (text-sm, gray-700)
  - Value (text-2xl, bold)
  - No trend arrows (simplified)

## Data Flow

```
User changes filter
       ↓
FilterPanel state updates
       ↓
Dashboard page re-fetches from API
       ↓
API calls get_all_metrics() with filters
       ↓
All sections update with filtered data
```

## Design Principles

### Simplicity
- No period comparisons (no "vs previous period")
- No complex charts (focus on numbers)
- Clear, scannable layout

### Industry Standards
- Inspired by: Stripe, Amplitude, Google Analytics
- Global filters apply to all metrics
- Custom date range with presets
- Clean typography and spacing

### Filter Logic
- **Owner filter**:
  - NULL = All Managers (default)
  - Selected = Specific manager's metrics
- **Date filter**:
  - Applied to time-based metrics (deals.closedate, calls.call_timestamp)
  - NOT applied to: A/B testing metrics (show all historical data)

## Metrics List (21 Total)

### Sales Metrics (4)
1. Total Sales (₪)
2. Avg Deal Size (₪)
3. Total Deals (count)
4. Conversion Rate (%)

### Call Metrics (4)
5. Total Calls (count)
6. Avg Call Time (minutes)
7. Total Call Time (hours)
8. 5min Reached Rate (%)

### Conversion Metrics (3)
9. Qualified Rate (%)
10. Trial Rate (%)
11. Cancellation Rate (%)

### Payment Metrics (2)
12. Upfront Cash Collected (₪)
13. Avg Installments (months)

### Followup Metrics (3)
14. Followup Rate (%)
15. Avg Followups (count)
16. Time to First Contact (days)

### Offer Metrics (2)
17. Offers Given Rate (%)
18. Offer Close Rate (%)

### Time Metrics (1)
19. Time to Sale (days)

### A/B Testing Metrics (2)
20. Sales Script Stats (table: version, conversions, rate)
21. VSL Watch Stats (table: watched yes/no, conversions, rate)

## Files

- `frontend/app/dashboard/page.tsx` - Main dashboard page
- `frontend/components/dashboard/FilterPanel.tsx` - Global filters
- `frontend/components/dashboard/CustomDatePicker.tsx` - Date range picker
- `frontend/components/dashboard/MetricCard.tsx` - Metric display card
- `frontend/components/dashboard/DealsBreakdown.tsx` - Deals by stage (TO CREATE)

## API Endpoints

- `GET /api/metrics` - All 21 metrics (with owner_id, date_from, date_to params)
- `GET /api/owners` - List of sales managers
- Backend: `get_all_metrics(owner_id, date_from, date_to)` PostgreSQL function

## Next Steps

1. Create DealsBreakdown component
2. Update dashboard page.tsx to use DateRange state
3. Simplify layout (remove comparison features if any)
4. Test with filters

---

**Last Updated**: 2025-10-11
**Version**: 1.0 (Initial design)
