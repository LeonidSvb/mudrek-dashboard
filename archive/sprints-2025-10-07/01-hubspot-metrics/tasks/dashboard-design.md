# Dashboard Design - 22 Metrics для HubSpot Sales Analytics

## 📊 Финальные цифры из Supabase:
- ✅ Контакты: 31,636
- ✅ Сделки: 1,193
- ✅ Звонки: 118,799

---

## 🎯 22 Метрики (из требований клиента)

### **Milestone 2 - "Easy Metrics"** (Priority 1)

#### **1. SALES METRICS** 💰
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 1 | **Total Sales** | `SUM(amount) WHERE dealstage='closedwon'` | ✅ Ready |
| 2 | **Average Deal Size** | `AVG(amount) WHERE dealstage='closedwon'` | ⚠️ Broken (fix) |
| 3 | **Total Deals** | `COUNT(*) FROM deals` | ✅ Ready |
| 4 | **Cancellation Rate** | `COUNT(*) WHERE stage='cancelled' / total * 100` | 🔧 Need stage |

#### **2. CONVERSION METRICS** 📈
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 5 | **Conversion Rate** | `deals / contacts * 100` | 🔧 Need stages |
| 6 | **Qualified Rate** | `COUNT(*) WHERE qualified='yes' / total` | ✅ Have field |
| 7 | **Trial Rate** | `COUNT(*) WHERE trial='yes' / total` | ✅ Have field |

#### **3. PAYMENT METRICS** 💳
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 8 | **Avg Installments** | `AVG(number_of_installments__months)` | ✅ Have field |
| 9 | **Time to Sale** | `AVG(closedate - createdate)` | ✅ Can calculate |

#### **4. CALL METRICS** 📞
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 10 | **Average Call Time** | `AVG(call_duration) / 1000` (seconds) | ✅ Have field |
| 11 | **Total Call Time** | `SUM(call_duration) / 3600000` (hours) | ✅ Have field |

#### **5. A/B TESTING** 🧪
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 12 | **Sales Script Testing** | `conversion by sales_script_version` | ✅ Have field |
| 13 | **VSL Watch → Close Rate** | `conversion by vsl_watched` | ✅ Have field |

---

### **Milestone 3 - "Complex Metrics"** (Priority 2)

#### **6. ADVANCED SALES** 💼
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 14 | **Upfront Cash Collected** | Need 10 payment fields | 🔧 Complex |
| 15 | **Followup Rate** | Days between stages | 🔧 API needed |

#### **7. ADVANCED CALLS** ☎️
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 16 | **Total Calls Made** | `COUNT(*) FROM calls` | ✅ Have data |
| 17 | **5min Reached Rate** | `COUNT(*) WHERE duration >= 300000 / total` | ✅ Can calc |
| 18 | **Pickup Rate** | `connected / total outbound * 100` | 🔧 Need field |
| 19 | **Time to First Contact** | `first_call_date - createdate` | 🔧 API needed |
| 20 | **Avg Followups per Lead** | `COUNT(calls) / COUNT(leads)` | 🔧 Complex |

#### **8. ADVANCED CONVERSION** 🎯
| # | Метрика | SQL Source | Статус |
|---|---------|-----------|--------|
| 21 | **Offers Given Rate** | `COUNT(*) WHERE offer_given='yes'` | 🔧 Need stage |
| 22 | **Offer → Close Rate** | `closed / offers * 100` | 🔧 Need stage |

---

## 🎨 DASHBOARD DESIGN (Industry Best Practices)

### **Референсы (лучшие примеры):**
- **Stripe Dashboard** - минимализм, ключевые цифры вверху
- **Amplitude** - воронки, cohort analysis
- **Mixpanel** - time-series графики, сегментация
- **HubSpot Reports** - drill-down, filters

---

### **Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Dashboard > Sales Metrics                    [Filters] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 KEY METRICS (Top Row - Big Numbers)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  $127K   │  │  $3,547  │  │   1,193  │  │   8.2%   │  │
│  │ Total    │  │ Avg Deal │  │  Total   │  │ Conv     │  │
│  │ Sales    │  │ Size     │  │  Deals   │  │ Rate     │  │
│  │ ↑ 12%    │  │ ↓ 3%     │  │ ↑ 8%     │  │ → 0%     │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                               │
│  💼 SALES PERFORMANCE                                        │
│  ┌────────────────────────┐  ┌──────────────────────────┐  │
│  │ Sales by Agent         │  │ Sales Trend (30 days)    │  │
│  │ ┌──────────────────┐   │  │ ┌────────────────────┐   │  │
│  │ │ Agent A  $45K ▓▓▓│   │  │ │    Chart          │   │  │
│  │ │ Agent B  $38K ▓▓ │   │  │ │                    │   │  │
│  │ │ Agent C  $27K ▓  │   │  │ └────────────────────┘   │  │
│  │ └──────────────────┘   │  └──────────────────────────┘  │
│  └────────────────────────┘                                 │
│                                                               │
│  📞 CALL METRICS                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  31,636  │  │  4:32    │  │  118,799 │  │   67%    │  │
│  │ Contacts │  │ Avg Call │  │  Total   │  │ Pickup   │  │
│  │          │  │ Time     │  │  Calls   │  │ Rate     │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                               │
│  🎯 CONVERSION FUNNEL                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  31,636    →    15,423   →   1,893   →    1,193    │   │
│  │ Contacts   → Qualified(49%) → Offers → Closed(8.2%) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  🧪 A/B TESTS                                                │
│  ┌──────────────────────────┐  ┌──────────────────────┐   │
│  │ Script A vs B            │  │ VSL Impact           │   │
│  │ • Script A: 12% conv     │  │ • Watched: 15% conv  │   │
│  │ • Script B: 8% conv      │  │ • Skipped: 6% conv   │   │
│  └──────────────────────────┘  └──────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 Design Principles (Industry Standards):

### **1. Information Hierarchy** ⭐⭐⭐⭐⭐
```
Priority 1: KPI Cards (Top) - 4 самых важных метрики
Priority 2: Detailed Charts (Middle) - визуализация трендов
Priority 3: Tables/Lists (Bottom) - детальные breakdown
```

### **2. Color System** 🎨
```typescript
// Следуем convention как Stripe/Amplitude:
const colors = {
  // Metrics status
  positive: 'green-600',   // ↑ рост
  negative: 'red-600',     // ↓ падение
  neutral: 'gray-600',     // → без изменений

  // Categories
  sales: 'blue-600',       // 💰 Sales metrics
  calls: 'purple-600',     // 📞 Call metrics
  conversion: 'emerald-600', // 📈 Conversion
  testing: 'orange-600'    // 🧪 A/B tests
}
```

### **3. Card Component Structure**
```typescript
interface MetricCardProps {
  title: string;           // "Total Sales"
  value: string | number;  // "$127,458"
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;    // 12 (для "↑ 12%")
    period: string;        // "vs last month"
  };
  icon?: ReactNode;        // 💰 или <DollarIcon />
  subtitle?: string;       // "From 1,193 deals"
  onClick?: () => void;    // Drill-down
}
```

### **4. Filters (Top Right)** 🔍
```typescript
interface DashboardFilters {
  dateRange: {
    preset: 'today' | '7d' | '30d' | '90d' | 'custom';
    from?: Date;
    to?: Date;
  };
  agent?: string[];        // ["Agent A", "Agent B"]
  dealStage?: string[];    // ["qualified", "offer", "closed"]
  script?: string[];       // ["Script A", "Script B"]
}
```

### **5. Responsive Grid** 📱
```typescript
// Desktop: 4 columns
<div className="grid grid-cols-4 gap-4">

// Tablet: 2 columns
<div className="grid grid-cols-2 gap-4">

// Mobile: 1 column
<div className="grid grid-cols-1 gap-4">
```

---

## 🚀 Component Architecture

### **File Structure:**
```
frontend/app/
├── dashboard/
│   ├── page.tsx                    # Main dashboard page
│   ├── layout.tsx                  # Dashboard layout
│   └── components/
│       ├── MetricCard.tsx          # Reusable metric card
│       ├── SalesChart.tsx          # Sales trend chart
│       ├── ConversionFunnel.tsx    # Funnel visualization
│       ├── AgentLeaderboard.tsx    # Agent performance
│       ├── CallMetrics.tsx         # Call statistics
│       └── FilterPanel.tsx         # Date/agent filters
├── api/
│   └── metrics/
│       ├── route.ts                # Main metrics API
│       ├── sales/route.ts          # Sales-specific
│       ├── calls/route.ts          # Calls-specific
│       └── conversion/route.ts     # Conversion-specific
```

---

## 🎯 Milestone 2 Implementation Plan

### **Phase 1: Core Infrastructure** (2 hours)
1. ✅ Create `MetricCard` component
2. ✅ Create `DashboardLayout`
3. ✅ Setup API routes structure
4. ✅ Create Supabase queries

### **Phase 2: Easy Metrics** (3 hours)
Implement 13 metrics (Milestone 2):
1. Total Sales
2. Average Deal Size
3. Total Deals
4. Cancellation Rate
5. Conversion Rate
6. Qualified Rate
7. Avg Installments
8. Time to Sale
9. Average Call Time
10. Total Call Time
11. Trial Rate
12. Sales Script Testing
13. VSL Watch → Close Rate

### **Phase 3: Visualizations** (2 hours)
1. Sales Trend Chart (line chart)
2. Agent Leaderboard (bar chart)
3. Conversion Funnel
4. A/B Test Comparison

### **Phase 4: Filters & Polish** (1 hour)
1. Date range picker
2. Agent filter
3. Loading states
4. Error handling

**Total: ~8 hours для Milestone 2**

---

## 📊 SQL Queries для каждой метрики

### **1. Total Sales**
```sql
SELECT COALESCE(SUM(amount), 0) as total_sales
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
```

### **2. Average Deal Size**
```sql
SELECT COALESCE(ROUND(AVG(amount), 2), 0) as avg_deal_size
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND amount > 0;
```

### **3. Total Deals**
```sql
SELECT COUNT(*) as total_deals
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
```

### **4. Cancellation Rate**
```sql
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE dealstage = 'cancelled')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE dealstage IN ('closedwon', 'cancelled')), 0) * 100,
    2
  ) as cancellation_rate
FROM hubspot_deals_raw;
```

### **5. Conversion Rate (Contacts → Deals)**
```sql
SELECT
  ROUND(
    (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedwon')::numeric /
    NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw), 0) * 100,
    2
  ) as conversion_rate;
```

### **6. Qualified Rate**
```sql
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE qualified_status = 'yes')::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as qualified_rate
FROM hubspot_contacts_raw;
```

### **7. Average Installments**
```sql
SELECT COALESCE(ROUND(AVG(number_of_installments__months), 1), 0) as avg_installments
FROM hubspot_deals_raw
WHERE number_of_installments__months IS NOT NULL;
```

### **8. Time to Sale (in days)**
```sql
SELECT
  COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400
      ),
      1
    ),
    0
  ) as avg_days_to_sale
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL;
```

### **9. Average Call Time (in minutes)**
```sql
SELECT
  COALESCE(
    ROUND(AVG(call_duration::numeric) / 60000, 2),
    0
  ) as avg_call_minutes
FROM hubspot_calls_raw
WHERE call_duration > 0;
```

### **10. Total Call Time (in hours)**
```sql
SELECT
  COALESCE(
    ROUND(SUM(call_duration::numeric) / 3600000, 2),
    0
  ) as total_call_hours
FROM hubspot_calls_raw;
```

### **11. Trial Rate**
```sql
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE trial_status = 'yes')::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as trial_rate
FROM hubspot_deals_raw;
```

### **12. Sales Script Conversion**
```sql
SELECT
  sales_script_version,
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as conversion_rate
FROM hubspot_contacts_raw
WHERE sales_script_version IS NOT NULL
GROUP BY sales_script_version
ORDER BY conversion_rate DESC;
```

### **13. VSL Impact**
```sql
SELECT
  vsl_watched,
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE lifecyclestage = 'customer') as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE lifecyclestage = 'customer')::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as conversion_rate
FROM hubspot_contacts_raw
GROUP BY vsl_watched;
```

---

## ✅ Next Steps

1. ⏳ **Дождаться финального подтверждения** что все данные загружены
2. 🎨 **Начать с UI компонентов** (MetricCard, Layout)
3. 🔌 **API routes** для метрик
4. 📊 **Визуализация** первых 4-6 метрик
5. ⚡ **Incremental sync** (10 минут)

---

**Приоритет:**
- Dashboard ПЕРВЫМ (видим результат работы)
- Incremental sync ПОТОМ (быстро настроить)
