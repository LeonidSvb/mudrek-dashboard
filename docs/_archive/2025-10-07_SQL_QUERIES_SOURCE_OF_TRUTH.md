# SQL Queries - Source of Truth

**Проверено против реальной схемы**: 2025-10-07
**Валидация**: scripts/check-schema.js

Все запросы ниже проверены против актуальной схемы Supabase.

---

## 🎯 MILESTONE 2 - READY TO IMPLEMENT (11 метрик)

### 1. Total Sales (₪)
```sql
SELECT COALESCE(SUM(amount), 0) as total_sales
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
```
**TypeScript (Supabase)**:
```typescript
const { data: deals } = await supabase
  .from('hubspot_deals_raw')
  .select('amount')
  .eq('dealstage', 'closedwon');

const totalSales = deals?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
```

### 2. Average Deal Size (₪)
```sql
SELECT COALESCE(ROUND(AVG(amount), 2), 0) as avg_deal_size
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND amount > 0;
```
**TypeScript**:
```typescript
const dealsWithAmount = deals?.filter(d => d.amount > 0) || [];
const avgDealSize = dealsWithAmount.length > 0
  ? dealsWithAmount.reduce((sum, d) => sum + d.amount, 0) / dealsWithAmount.length
  : 0;
```

### 3. Total Deals
```sql
SELECT COUNT(*) as total_deals
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
```
**TypeScript**:
```typescript
const totalDeals = deals?.length || 0;
```

### 5. Conversion Rate (%)
```sql
SELECT ROUND(
  (SELECT COUNT(*) FROM hubspot_deals_raw WHERE dealstage = 'closedwon')::numeric /
  NULLIF((SELECT COUNT(*) FROM hubspot_contacts_raw), 0) * 100,
  2
) as conversion_rate;
```
**TypeScript**:
```typescript
const { count: totalContacts } = await supabase
  .from('hubspot_contacts_raw')
  .select('*', { count: 'exact', head: true });

const conversionRate = totalContacts && totalContacts > 0
  ? (totalDeals / totalContacts) * 100
  : 0;
```

### 6. Qualified Rate (%) ⚠️ ИСПРАВЛЕНО
**ВАЖНО**: Поле `qualified_status` находится в `hubspot_deals_raw`, НЕ в contacts!

```sql
SELECT ROUND(
  COUNT(*) FILTER (WHERE qualified_status = 'yes')::numeric /
  NULLIF(COUNT(*), 0) * 100,
  2
) as qualified_rate
FROM hubspot_deals_raw;
```
**TypeScript**:
```typescript
const { data: allDeals } = await supabase
  .from('hubspot_deals_raw')
  .select('qualified_status');

const total = allDeals?.length || 0;
const qualified = allDeals?.filter(d => d.qualified_status === 'yes').length || 0;
const qualifiedRate = total > 0 ? (qualified / total) * 100 : 0;
```

### 7. Trial Rate (%)
```sql
SELECT ROUND(
  COUNT(*) FILTER (WHERE trial_status = 'yes')::numeric /
  NULLIF(COUNT(*), 0) * 100,
  2
) as trial_rate
FROM hubspot_deals_raw;
```
**TypeScript**:
```typescript
const trial = allDeals?.filter(d => d.trial_status === 'yes').length || 0;
const trialRate = total > 0 ? (trial / total) * 100 : 0;
```

### 8. Average Installments
```sql
SELECT COALESCE(ROUND(AVG(number_of_installments__months), 1), 0) as avg_installments
FROM hubspot_deals_raw
WHERE number_of_installments__months IS NOT NULL
  AND number_of_installments__months > 0;
```
**TypeScript**:
```typescript
const { data: installmentDeals } = await supabase
  .from('hubspot_deals_raw')
  .select('number_of_installments__months')
  .gt('number_of_installments__months', 0)
  .not('number_of_installments__months', 'is', null);

const avgInstallments = installmentDeals && installmentDeals.length > 0
  ? installmentDeals.reduce((sum, d) => sum + d.number_of_installments__months, 0) / installmentDeals.length
  : 0;
```

### 9. Time to Sale (days)
```sql
SELECT COALESCE(
  ROUND(
    AVG(EXTRACT(EPOCH FROM (closedate::timestamp - createdate::timestamp)) / 86400),
    1
  ),
  0
) as avg_days_to_sale
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate IS NOT NULL
  AND createdate IS NOT NULL;
```
**TypeScript**:
```typescript
const { data: closedDeals } = await supabase
  .from('hubspot_deals_raw')
  .select('closedate, createdate')
  .eq('dealstage', 'closedwon')
  .not('closedate', 'is', null)
  .not('createdate', 'is', null);

const validDeals = closedDeals?.filter(d => d.closedate && d.createdate) || [];
const avgDays = validDeals.length > 0
  ? validDeals.reduce((sum, d) => {
      const diff = new Date(d.closedate).getTime() - new Date(d.createdate).getTime();
      return sum + (diff / (1000 * 60 * 60 * 24));
    }, 0) / validDeals.length
  : 0;
```

### 10. Average Call Time (minutes)
```sql
SELECT COALESCE(
  ROUND(AVG(call_duration::numeric) / 60000, 2),
  0
) as avg_call_minutes
FROM hubspot_calls_raw
WHERE call_duration > 0;
```
**TypeScript**:
```typescript
const { data: calls } = await supabase
  .from('hubspot_calls_raw')
  .select('call_duration')
  .gt('call_duration', 0);

const avgCallTime = calls && calls.length > 0
  ? calls.reduce((sum, c) => sum + c.call_duration, 0) / calls.length / 60000
  : 0;
```

### 11. Total Call Time (hours)
```sql
SELECT COALESCE(
  ROUND(SUM(call_duration::numeric) / 3600000, 2),
  0
) as total_call_hours
FROM hubspot_calls_raw;
```
**TypeScript**:
```typescript
const { data: allCalls } = await supabase
  .from('hubspot_calls_raw')
  .select('call_duration');

const totalCallTime = allCalls
  ? allCalls.reduce((sum, c) => sum + (c.call_duration || 0), 0) / 3600000
  : 0;
```

---

## 🧪 A/B TESTING (2 метрики)

### 12. Sales Script Testing
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
**TypeScript**:
```typescript
const { data: contacts } = await supabase
  .from('hubspot_contacts_raw')
  .select('sales_script_version, lifecyclestage')
  .not('sales_script_version', 'is', null);

const scriptStats = contacts?.reduce((acc, c) => {
  const version = c.sales_script_version;
  if (!acc[version]) acc[version] = { total: 0, conversions: 0 };
  acc[version].total++;
  if (c.lifecyclestage === 'customer') acc[version].conversions++;
  return acc;
}, {} as Record<string, { total: number; conversions: number }>);
```

### 13. VSL Watch → Close Rate
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
GROUP BY vsl_watched
ORDER BY conversion_rate DESC;
```
**TypeScript**:
```typescript
const { data: allContacts } = await supabase
  .from('hubspot_contacts_raw')
  .select('vsl_watched, lifecyclestage');

const vslStats = allContacts?.reduce((acc, c) => {
  const watched = c.vsl_watched || 'unknown';
  if (!acc[watched]) acc[watched] = { total: 0, conversions: 0 };
  acc[watched].total++;
  if (c.lifecyclestage === 'customer') acc[watched].conversions++;
  return acc;
}, {} as Record<string, { total: number; conversions: number }>);
```

---

## 💼 MILESTONE 3 - EASY (4 метрики)

### 14. Upfront Cash Collected (₪)
```sql
SELECT COALESCE(SUM(upfront_payment), 0) as upfront_cash
FROM hubspot_deals_raw
WHERE upfront_payment IS NOT NULL
  AND upfront_payment > 0;
```
**TypeScript**:
```typescript
const { data: upfrontDeals } = await supabase
  .from('hubspot_deals_raw')
  .select('upfront_payment')
  .gt('upfront_payment', 0)
  .not('upfront_payment', 'is', null);

const upfrontCash = upfrontDeals?.reduce((sum, d) => sum + d.upfront_payment, 0) || 0;
```

### 16. Total Calls Made
```sql
SELECT COUNT(*) as total_calls
FROM hubspot_calls_raw;
```
**TypeScript**:
```typescript
const { count } = await supabase
  .from('hubspot_calls_raw')
  .select('*', { count: 'exact', head: true });

const totalCalls = count || 0;
```

### 17. 5min Reached Rate (%)
```sql
SELECT ROUND(
  COUNT(*) FILTER (WHERE call_duration >= 300000)::numeric /
  NULLIF(COUNT(*), 0) * 100,
  2
) as five_min_rate
FROM hubspot_calls_raw;
```
**TypeScript**:
```typescript
const { data: allCalls } = await supabase
  .from('hubspot_calls_raw')
  .select('call_duration');

const total = allCalls?.length || 0;
const fiveMinCalls = allCalls?.filter(c => c.call_duration >= 300000).length || 0;
const fiveMinRate = total > 0 ? (fiveMinCalls / total) * 100 : 0;
```

### 21. Offers Given Rate (%)
```sql
SELECT ROUND(
  COUNT(*) FILTER (WHERE offer_given = 'yes')::numeric /
  NULLIF(COUNT(*), 0) * 100,
  2
) as offers_given_rate
FROM hubspot_deals_raw;
```
**TypeScript**:
```typescript
const { data: allDeals } = await supabase
  .from('hubspot_deals_raw')
  .select('offer_given');

const total = allDeals?.length || 0;
const offersGiven = allDeals?.filter(d => d.offer_given === 'yes').length || 0;
const offersGivenRate = total > 0 ? (offersGiven / total) * 100 : 0;
```

### 22. Offer → Close Rate (%)
```sql
SELECT ROUND(
  COUNT(*) FILTER (WHERE offer_accepted = 'yes' AND dealstage = 'closedwon')::numeric /
  NULLIF(COUNT(*) FILTER (WHERE offer_given = 'yes'), 0) * 100,
  2
) as offer_close_rate
FROM hubspot_deals_raw;
```
**TypeScript**:
```typescript
const { data: offerDeals } = await supabase
  .from('hubspot_deals_raw')
  .select('offer_given, offer_accepted, dealstage');

const offersGiven = offerDeals?.filter(d => d.offer_given === 'yes').length || 0;
const offersClosed = offerDeals?.filter(d =>
  d.offer_given === 'yes' &&
  d.offer_accepted === 'yes' &&
  d.dealstage === 'closedwon'
).length || 0;
const offerCloseRate = offersGiven > 0 ? (offersClosed / offersGiven) * 100 : 0;
```

---

## ⚠️ FILTERING BY OWNER

### Contacts Filter (работает)
```typescript
let query = supabase
  .from('hubspot_contacts_raw')
  .select('*');

if (ownerId) {
  query = query.eq('hubspot_owner_id', ownerId);
}
```

### Deals Filter (работает)
```typescript
let query = supabase
  .from('hubspot_deals_raw')
  .select('*');

if (ownerId) {
  query = query.eq('hubspot_owner_id', ownerId);
}
```

### Calls Filter (НЕ РАБОТАЕТ напрямую)
❌ **В calls нет hubspot_owner_id!**

Варианты решения:
1. Не фильтровать звонки по owner (показывать все)
2. JOIN calls → contacts по phone (сложно)
3. Добавить owner_id в calls при синке (миграция)

---

## 📅 DATE FILTERING

### Deals by Date
```typescript
if (dateFrom && dateTo) {
  dealsQuery = dealsQuery
    .gte('closedate', dateFrom)
    .lte('closedate', dateTo);
}
```

### Calls by Date
```typescript
if (dateFrom && dateTo) {
  callsQuery = callsQuery
    .gte('call_timestamp', dateFrom)
    .lte('call_timestamp', dateTo);
}
```

### Contacts by Date
```typescript
if (dateFrom && dateTo) {
  contactsQuery = contactsQuery
    .gte('createdate', dateFrom)
    .lte('createdate', dateTo);
}
```

---

## ✅ BEST PRACTICES

### 1. Always Check for NULL
```typescript
const value = data?.field || 0;  // Default to 0
const items = data?.filter(x => x.field !== null) || [];
```

### 2. Handle Empty Arrays
```typescript
const avg = items.length > 0
  ? items.reduce((sum, x) => sum + x.value, 0) / items.length
  : 0;
```

### 3. Round Financial Values
```typescript
const totalSales = Math.round(rawTotal);  // Целые шекели
const avgDeal = Math.round(rawAvg * 100) / 100;  // 2 знака после запятой
```

### 4. Validate Before Query
```typescript
// Запускаем check-schema.js перед добавлением новых метрик!
node scripts/check-schema.js
```

---

## 📊 PRIORITY IMPLEMENTATION ORDER

1. **Phase 1** (2 hours): Metrics #1-3, #5, #10-11 (6 метрик) - Основные KPI
2. **Phase 2** (1 hour): Metrics #6-9 (4 метрики) - Conversion & Sales
3. **Phase 3** (1 hour): Metrics #12-13 (2 метрики) - A/B Testing
4. **Phase 4** (1 hour): Metrics #14, #16-17, #21-22 (5 метрик) - Advanced

**Total: 17 метрик за 5 часов!**
