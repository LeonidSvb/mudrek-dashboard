# Next Session Plan - Dashboard UI + Filters + Incremental Sync

## Приоритеты следующей сессии

### 1. Client Instructions - Как заполнить метрики в HubSpot (30 мин)

**Создать документ**: `docs/HUBSPOT_CUSTOM_FIELDS_SETUP.md`

**Содержание:**
- Как создать custom fields в HubSpot (через UI + API)
- Какие поля нужны для оставшихся 7 метрик:
  1. upfront_payment (deals)
  2. is_refunded (deals)
  3. cancellation_reason (deals)
  4. offer_given (deals)
  5. offer_accepted (deals)
  6. vsl_watch_duration (contacts)
  7. Заполнить существующие: sales_script_version, vsl_watched
- Инструкция для менеджеров как заполнять эти поля при работе с клиентами

**Альтернатива**: API script для автоматического создания полей

### 2. Dashboard UI Design + Implementation (2-3 часа)

**Референсы dashboard:**
- Посмотреть industry standards (HubSpot, Salesforce, Stripe)
- Выбрать UI library (shadcn/ui уже установлен)
- Сделать mockup/wireframe

**Компоненты dashboard:**

```typescript
// app/dashboard/page.tsx
interface DashboardFilters {
  dateRange: 'today' | '7d' | '30d' | '90d' | 'custom';
  ownerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Компоненты:
1. DateRangePicker (today, 7d, 30d, 90d, custom)
2. OwnerFilter (dropdown с менеджерами)
3. MetricsGrid (карточки метрик)
4. MetricCard (individual metric display)
```

**Фичи:**
- ✅ Filters: today, 7 days, 30 days, 90 days, custom range
- ✅ Filter по менеджерам (owner_id)
- ✅ Real-time data (no caching сначала)
- ✅ Loading states
- ✅ Error states
- ⏳ Export to CSV/PDF (опционально)

**Подход к UI:**
1. Сначала простой HTML/Tailwind mockup (быстро)
2. Потом React components (переиспользуемые)
3. Или сразу React если референс готов

### 3. Incremental Sync - Не полная пересинхронизация (1-2 часа)

**Проблема:** Сейчас `sync-parallel.js` делает full resync 118k+ calls каждый раз

**Решение:**

```javascript
// src/hubspot/sync-incremental.js

async function incrementalSync() {
  // 1. Get lastModifiedDate from Supabase
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('last_sync_timestamp')
    .eq('entity_type', 'calls')
    .single();

  const since = lastSync?.last_sync_timestamp || '2020-01-01';

  // 2. Fetch only updated records from HubSpot
  const url = `${BASE_URL}/crm/v3/objects/calls?limit=100&archived=false&hs_lastmodifieddate__gte=${since}`;

  // 3. Upsert changed records
  // 4. Update sync_logs table
}
```

**Таблица sync_logs:**
```sql
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'contacts', 'deals', 'calls'
  last_sync_timestamp TIMESTAMPTZ NOT NULL,
  records_synced INT,
  sync_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Фичи:**
- Sync только новых/измененных записей
- Логирование всех sync операций
- Rollback если sync failed
- Можно запускать каждые 5 минут (cron)

### 4. Display 15 Metrics on Dashboard UI (1 час)

**Простые карточки:**

```typescript
const metrics = [
  { label: 'Total Sales', value: data.totalSales, format: 'currency' },
  { label: 'Avg Deal Size', value: data.avgDealSize, format: 'currency' },
  { label: 'Followup Rate', value: data.followupRate, format: 'percentage' },
  // ... все 15 метрик
];

return (
  <div className="grid grid-cols-4 gap-4">
    {metrics.map(m => (
      <MetricCard key={m.label} {...m} />
    ))}
  </div>
);
```

**Группировка:**
1. Sales Metrics (4)
2. Call Metrics (4)
3. Conversion Metrics (2)
4. Followup Metrics (3)
5. Other (2)

### 5. Pickup Rate - Нужен mapping (30 мин)

**Проблема:** `call_disposition` это UUID, не текст

**Решение:**

```javascript
// Получить mapping из HubSpot API
const response = await fetch(
  'https://api.hubapi.com/calling/v1/dispositions',
  { headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` } }
);
// → { id: 'uuid', label: 'answered' | 'no_answer' | 'busy' ... }

// Сохранить mapping в отдельную таблицу или в памяти
```

**После этого:**
```sql
-- Pickup rate = answered calls / total calls
SELECT
  COUNT(CASE WHEN disposition_label = 'answered' THEN 1 END) / COUNT(*) * 100
FROM calls_with_disposition_labels;
```

---

## Summary Priorities

**Must Have (Session 1):**
1. ✅ Dashboard filters (date range + owner)
2. ✅ Display 15 metrics on UI
3. ✅ Incremental sync

**Nice to Have (Session 2):**
4. Client instructions document
5. Pickup rate (disposition mapping)
6. Export to CSV

**Future:**
7. Остальные 6 метрик (после Leo заполнит HubSpot fields)
8. Charts/graphs
9. Mobile responsive

---

## Technical Stack Decisions

**UI Framework:** React + Next.js 15 (уже установлен)
**Component Library:** shadcn/ui + Radix UI (уже установлен)
**Styling:** Tailwind CSS (уже установлен)
**State Management:** URL state (nuqs) + React Query for API
**Charts:** Recharts или Chart.js (если нужны графики)

**Approach:**
- Desktop-first (client requirement)
- Server Components где возможно
- Client Components только для интерактивности

---

## Session Agenda

1. **Review this plan** (5 min)
2. **UI mockup/wireframe** (15 min)
3. **Implement filters** (30 min)
4. **Display 15 metrics** (45 min)
5. **Incremental sync** (1 hour)
6. **Testing** (30 min)
7. **Git commit + push** (10 min)

**Total:** ~3.5 hours
