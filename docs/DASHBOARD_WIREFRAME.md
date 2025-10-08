# Dashboard Wireframe - Sales Metrics Dashboard

**Дата:** 2025-10-08
**Для:** Mudrek Online Courses Dashboard

---

## Layout Overview

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER                                                              │
│ ┌──────────┐         ┌────────────┐  ┌──────────────────┐         │
│ │ 📊 Logo │         │ Manager ▼ │  │ 7d | 30d | 90d   │         │
│ └──────────┘         └────────────┘  └──────────────────┘         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ KPI CARDS - Top 4 Metrics                                          │
│                                                                     │
│ ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────┐│
│ │ ₪1,152,668 ↑ │  │ ₪1,152.67    │  │ 1,143         │  │3.61% ││
│ │ Total Sales   │  │ Avg Deal Size│  │ Total Deals   │  │Conv  ││
│ │ +12.5% vs 30d│  │              │  │               │  │Rate  ││
│ └───────────────┘  └───────────────┘  └───────────────┘  └──────┘│
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CHARTS SECTION                                                      │
│                                                                     │
│ ┌─────────────────────────────────┐ ┌──────────────────────────┐  │
│ │ Sales Trend (Last 90 days)     │ │ Top Managers             │  │
│ │                                 │ │                          │  │
│ │     /\  /\                      │ │ Shadi ████████ ₪800K    │  │
│ │    /  \/  \  /\                │ │ Manager2 ███ ₪200K      │  │
│ │   /        \/  \                │ │ Manager3 ██ ₪100K       │  │
│ │  /              \               │ │                          │  │
│ │ ─────────────────────           │ └──────────────────────────┘  │
│ └─────────────────────────────────┘                               │
│                                                                     │
│ ┌─────────────────────────────────┐ ┌──────────────────────────┐  │
│ │ A/B Testing: VSL Watch         │ │ A/B Testing: Scripts     │  │
│ │                                 │ │                          │  │
│ │ Watched:  6.0% conv (300/5000) │ │ Script v1: 5.0%          │  │
│ │ Not:      4.0% conv (400/10000)│ │ Script v2: 7.2%          │  │
│ │ Lift: +50% 🎯                   │ │ Winner: v2 🏆            │  │
│ └─────────────────────────────────┘ └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CALL METRICS                                                        │
│                                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│ │ 118,799      │ │ 3.12 min     │ │ 6,182 hours  │ │ 11.23%     ││
│ │ Total Calls  │ │ Avg Call     │ │ Total Time   │ │ 5min+      ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CONVERSION FUNNEL                                                   │
│                                                                     │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Contacts: 31,636                                             │   │
│ │   ↓ 0% Qualified                                             │   │
│ │ Qualified: 0                                                 │   │
│ │   ↓ 0% Trial                                                 │   │
│ │ Trial: 0                                                     │   │
│ │   ↓ 3.61% Closed Won                                        │   │
│ │ Customers: 1,143                                             │   │
│ │                                                              │   │
│ │ Lost: 4.2% (50 deals)                                        │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ PAYMENT & FOLLOWUP METRICS                                          │
│                                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│ │ ₪950,000     │ │ 0 months     │ │ 82.49%       │ │ 4.8 calls  ││
│ │ Upfront Cash │ │ Avg Install. │ │ Followup Rate│ │ Avg F-ups  ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│ │ 5.1 days     │ │ 12.3 days    │ │ 0%           │ │ 0%         ││
│ │ Time to 1st  │ │ Time to Sale │ │ Offers Given │ │ Offer→Sale ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Header Components

**FilterPanel.tsx**
```tsx
- Manager Dropdown (8 owners)
- Date Range Selector (7d, 30d, 90d, custom)
- Currency Toggle (₪ / $) - OPTIONAL
```

### 2. KPI Cards Components

**MetricCard.tsx** (reusable)
```tsx
Props:
- title: string
- value: number | string
- trend?: 'up' | 'down' | 'neutral'
- trendValue?: string ("+12.5%")
- icon?: ReactNode
- currency?: boolean
```

### 3. Chart Components

**SalesTrendChart.tsx**
```tsx
- Line chart (recharts)
- Last 90 days by default
- Filters apply
```

**ManagerBarChart.tsx**
```tsx
- Horizontal bar chart
- Top 5 managers by sales
```

**ABTestingCard.tsx**
```tsx
- Comparison view
- 2 variations side-by-side
- Winner indicator
```

### 4. Funnel Component

**ConversionFunnel.tsx**
```tsx
- Visual funnel representation
- Contacts → Qualified → Trial → Customer
- Dropout rates
```

### 5. Metrics Grid

**MetricsGrid.tsx**
```tsx
- Responsive grid layout
- Categorized sections
- Collapsible categories
```

---

## Color Palette (Industry Standard)

```
Primary (Sales):     #3b82f6 (blue-500)
Success (Up):        #10b981 (green-500)
Danger (Down):       #ef4444 (red-500)
Warning:             #f59e0b (amber-500)
Neutral:             #6b7280 (gray-500)

Background:          #ffffff (white)
Card Background:     #f9fafb (gray-50)
Border:              #e5e7eb (gray-200)
Text Primary:        #111827 (gray-900)
Text Secondary:      #6b7280 (gray-500)
```

---

## Responsive Breakpoints

```
Mobile:    < 640px   - 1 column
Tablet:    640-1024  - 2 columns
Desktop:   > 1024px  - 4 columns (KPI cards)
```

---

## Filters Logic

### Date Range Filter

```typescript
interface DateRange {
  preset: '7d' | '30d' | '90d' | 'custom';
  from: string;  // ISO date
  to: string;    // ISO date
}

// URL params: ?range=30d
// or: ?date_from=2025-10-01&date_to=2025-10-08
```

### Manager Filter

```typescript
interface ManagerFilter {
  ownerId: string | 'all';
}

// URL param: ?owner_id=682432124
// or: ?owner_id=all
```

### Currency Toggle (OPTIONAL)

```typescript
interface CurrencySettings {
  currency: 'ILS' | 'USD';
  exchangeRate: number; // ILS to USD rate
}

// Stored in localStorage
// Applied client-side (multiply by rate)
```

**⚠️ Recommendation: Skip currency toggle for MVP**
- Все данные в ₪ (Israeli Shekels)
- Клиент работает только в ₪
- Добавим позже если нужно

---

## Metrics Organization

### Section 1: Core Sales (4 metrics)
- Total Sales
- Average Deal Size
- Total Deals
- Conversion Rate

### Section 2: Call Activity (4 metrics)
- Total Calls
- Average Call Time
- Total Call Time
- 5-Min Reached Rate

### Section 3: Conversion & Lifecycle (3 metrics)
- Qualified Rate
- Trial Rate
- Cancellation Rate

### Section 4: Payment & Timing (6 metrics)
- Upfront Cash Collected
- Average Installments
- Followup Rate
- Average Followups
- Time to First Contact
- Time to Sale

### Section 5: A/B Testing (2 sections)
- Sales Script Comparison
- VSL Watch Comparison

### Section 6: Offers (2 metrics)
- Offers Given Rate
- Offer → Close Rate

---

## Data Flow

```
API Endpoint: GET /api/metrics
↓
Query params: ?owner_id=...&date_from=...&date_to=...
↓
Response: { totalSales, avgDealSize, ... all 21 metrics }
↓
Dashboard Page (Server Component)
↓
Individual Components (Client Components for interactivity)
```

---

## shadcn/ui Components Needed

**Already installed:**
- ✅ Button
- ✅ Card

**Need to install:**
```bash
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add tabs
```

**Charts:**
```bash
npm install recharts
```

---

## File Structure

```
frontend/
├── app/
│   └── dashboard/
│       ├── page.tsx                 # Main dashboard (Server Component)
│       └── loading.tsx              # Loading state
│
├── components/
│   ├── dashboard/
│   │   ├── FilterPanel.tsx          # Date + Manager filters
│   │   ├── MetricCard.tsx           # Reusable KPI card
│   │   ├── SalesTrendChart.tsx      # Line chart
│   │   ├── ManagerBarChart.tsx      # Bar chart
│   │   ├── ABTestingCard.tsx        # A/B comparison
│   │   ├── ConversionFunnel.tsx     # Funnel visualization
│   │   └── MetricsGrid.tsx          # Grid layout
│   │
│   └── ui/                           # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── select.tsx
│       └── ...
│
└── lib/
    └── db/
        └── metrics.ts                # Already created ✅
```

---

## Implementation Priority

### Phase 1: Basic Dashboard (1-2 hours)
1. ✅ MetricCard component
2. ✅ FilterPanel component
3. ✅ Dashboard page layout
4. ✅ 4 KPI cards (top metrics)
5. ✅ Metrics grid (all 21 metrics)

### Phase 2: Charts (1 hour)
6. Sales Trend Chart
7. Manager Bar Chart

### Phase 3: Advanced (1 hour)
8. A/B Testing Cards
9. Conversion Funnel
10. Polish & refinements

**Total: 3-4 hours for full dashboard**

---

## Mock Data Strategy

**For initial development:**

```typescript
// Use mock data first
const MOCK_METRICS = {
  totalSales: 1152668,
  avgDealSize: 1152.67,
  // ... all 21 metrics
};

// Then switch to real API
const metrics = await fetch('/api/metrics').then(r => r.json());
```

**Benefits:**
- ✅ Fast UI development
- ✅ No waiting for API
- ✅ Easy to test edge cases
- ✅ Client can see UI immediately

---

## Next Steps

1. **Install shadcn/ui components** (5 min)
2. **Create MetricCard component** (15 min)
3. **Create FilterPanel component** (20 min)
4. **Create Dashboard page with mock data** (30 min)
5. **Add all 21 metric cards** (20 min)
6. **Connect to real API** (5 min)
7. **Add charts** (1 hour)

**Total: ~3 hours to working dashboard**

---

**Created by:** Claude Code
**Date:** 2025-10-08
