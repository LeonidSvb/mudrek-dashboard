# Metrics Guide for Sales Managers

Complete guide to understanding and using metrics in Mudrek Dashboard.

⚠️ **AUTO-GENERATED FILE** - Do not edit manually.
📝 **Source**: `docs/metrics-schema.yaml`
🔄 **Update**: Run `npm run docs:generate`

---

## Table of Contents

- [Sales Metrics](#sales)
- [Call Performance Metrics](#calls)
- [Conversion Metrics](#conversion)
- [Payment Metrics](#payment)
- [Followup Metrics](#followup)
- [Offer Metrics](#offers)
- [Time Metrics](#time)
- [Call-to-Close Metrics](#calltoclose)
- [A/B Testing Metrics](#abtesting)

---

## Sales Metrics

### Total Sales

**What it shows**: Total revenue from closed deals

**Source**: HubSpot Deals → 'Amount' field (dealstage = closedwon)

**Good benchmark**: Depends on your business goals

**Interpretation**: Higher is better. Shows overall business performance.

**SQL Query**:
```sql
SELECT SUM(amount) AS total_sales
FROM deals
WHERE dealstage = 'closedwon'
  AND closedate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.totalSales`

---

### Average Deal Size

**What it shows**: Average revenue per closed deal

**Source**: HubSpot Deals → Sum of 'Amount' / Count of closedwon deals

**Good benchmark**: $5,000-$15,000 (varies by industry)

**Interpretation**: Higher is better. Shows deal quality and pricing effectiveness.

**SQL Query**:
```sql
SELECT AVG(amount) AS avg_deal_size
FROM deals
WHERE dealstage = 'closedwon'
  AND closedate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.avgDealSize`

---

### Total Closed Deals

**What it shows**: Total number of closed won deals

**Source**: HubSpot Deals → Count where dealstage = closedwon

**Good benchmark**: Varies by business size and team

**Interpretation**: Higher is better. Shows sales volume.

**SQL Query**:
```sql
SELECT COUNT(*) AS total_deals
FROM deals
WHERE dealstage = 'closedwon'
  AND closedate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.totalDeals`

---

### Conversion Rate

**What it shows**: Percentage of contacts who became paying customers

**Source**: HubSpot Contacts created → Deals closedwon ratio

**Good benchmark**: 5-15%

**Interpretation**: Good rate: 5-15%. Shows overall funnel effectiveness.

**SQL Query**:
```sql
SELECT
  COUNT(DISTINCT d.contact_id)::float /
  NULLIF(COUNT(DISTINCT c.id), 0) * 100 AS conversion_rate
FROM contacts c
LEFT JOIN deals d ON d.contact_id = c.id AND d.dealstage = 'closedwon'
WHERE c.createdate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.conversionRate`

---

### New Contacts Created

**What it shows**: New contacts added in selected period

**Source**: HubSpot Contacts → 'Created date' field

**Good benchmark**: Depends on marketing budget and channels

**Interpretation**: Shows lead generation performance. More contacts = more opportunities.

**SQL Query**:
```sql
SELECT COUNT(*) AS total_contacts
FROM contacts
WHERE createdate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.totalContactsCreated`

---

## Call Performance Metrics

### Total Calls

**What it shows**: Total calls made in selected period

**Source**: HubSpot Calls → All logged call activities

**Good benchmark**: 50-100 calls/day per sales manager

**Interpretation**: Higher call volume = more engagement. Track alongside conversion metrics.

**SQL Query**:
```sql
SELECT COUNT(*) AS total_calls
FROM calls
WHERE call_date BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.totalCalls`

---

### Average Call Time

**What it shows**: Average duration of calls in minutes

**Source**: HubSpot Calls → 'Duration' field average

**Good benchmark**: 2-5 minutes

**Interpretation**: Longer calls (2-5 min) often indicate more engaged conversations.

**SQL Query**:
```sql
SELECT AVG(duration_minutes) AS avg_call_time
FROM calls
WHERE call_date BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.avgCallTime`

---

### Total Call Time

**What it shows**: Total time spent on calls in hours

**Source**: HubSpot Calls → Sum of all 'Duration' fields

**Good benchmark**: Depends on team size

**Interpretation**: Shows team effort. Combine with conversion rate to measure efficiency.

**SQL Query**:
```sql
SELECT SUM(duration_minutes) / 60.0 AS total_call_hours
FROM calls
WHERE call_date BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.totalCallTime`

---

### Pickup Rate

**What it shows**: Percentage of calls where contact answered and had real conversation

**Source**: HubSpot Calls → 'Call outcome' property (Connected status with 4+ min duration)

**Good benchmark**: 40-50%

**Interpretation**: Good rate: 40-50%. Lower rate may indicate bad timing or wrong numbers.

**SQL Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE outcome = 'CONNECTED' AND duration_minutes >= 4)::float /
  NULLIF(COUNT(*), 0) * 100 AS pickup_rate
FROM calls
WHERE call_date BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.pickupRate`

---

### 5+ Minute Call Rate

**What it shows**: Percentage of calls lasting 5 minutes or longer

**Source**: HubSpot Calls → 'Duration' >= 5 minutes

**Good benchmark**: 30-50%

**Interpretation**: Quality indicator. High-value conversations typically last 5+ minutes.

**SQL Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE duration_minutes >= 5)::float /
  NULLIF(COUNT(*), 0) * 100 AS five_min_rate
FROM calls
WHERE call_date BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.fiveMinReachedRate`

---

## Conversion Metrics

### Qualified Rate

**What it shows**: Percentage of deals marked as qualified to buy

**Source**: HubSpot Deals → 'Qualified status' custom field

**Good benchmark**: 30-60%

**Interpretation**: Shows lead quality. Good rate: 30-60%.

⚠️ **Why might it be 0?**: Fill 'qualified_status' field in HubSpot deals to see data.

**Code reference**: `METRIC_DEFINITIONS.qualifiedRate`

---

### Trial Rate

**What it shows**: Percentage of deals that entered trial stage

**Source**: HubSpot Deals → 'Trial status' custom field

**Good benchmark**: 20-40%

**Interpretation**: Shows trial conversion. Track trial-to-paid separately.

⚠️ **Why might it be 0?**: Fill 'trial_status' field in HubSpot deals to see data.

**Code reference**: `METRIC_DEFINITIONS.trialRate`

---

### Cancellation Rate

**What it shows**: Percentage of deals that were cancelled or lost

**Source**: HubSpot Deals → dealstage = 'closedlost' or cancelled

**Good benchmark**: <30%

**Interpretation**: Lower is better. High rate (>40%) indicates pricing or qualification issues.

**SQL Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE dealstage = 'closedlost')::float /
  NULLIF(COUNT(*), 0) * 100 AS cancellation_rate
FROM deals
WHERE createdate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.cancellationRate`

---

## Payment Metrics

### Upfront Cash Collected

**What it shows**: Total upfront payments collected from customers

**Source**: HubSpot Deals → 'Upfront payment' custom field (closedwon deals)

**Good benchmark**: Depends on pricing model

**Interpretation**: Shows immediate cash flow. Higher is better for business liquidity.

⚠️ **Why might it be 0?**: Fill 'upfront_payment' field in HubSpot deals to see data.

**Code reference**: `METRIC_DEFINITIONS.upfrontCashCollected`

---

### Average Installments

**What it shows**: Average payment plan length in months

**Source**: HubSpot Deals → 'Number of installments' custom field

**Good benchmark**: 3-12 months typical

**Interpretation**: Shows typical payment terms. Longer plans may indicate affordability focus.

⚠️ **Why might it be 0?**: Fill 'number_of_installments__months' field in HubSpot deals to see data.

**Code reference**: `METRIC_DEFINITIONS.avgInstallments`

---

## Followup Metrics

### Followup Rate

**What it shows**: Percentage of contacts with follow-up calls

**Source**: HubSpot Contacts → Calls count > 1

**Good benchmark**: 60-80%

**Interpretation**: Good rate: 60-80%. Shows persistence in outreach.

**SQL Query**:
```sql
SELECT
  COUNT(DISTINCT contact_id) FILTER (WHERE call_count > 1)::float /
  NULLIF(COUNT(DISTINCT contact_id), 0) * 100 AS followup_rate
FROM (
  SELECT contact_id, COUNT(*) as call_count
  FROM calls
  GROUP BY contact_id
) subquery
```

**Code reference**: `METRIC_DEFINITIONS.followupRate`

---

### Average Followups

**What it shows**: Average number of calls per contact

**Source**: HubSpot Contacts → Average calls count

**Good benchmark**: 2-4 calls

**Interpretation**: Typical: 2-4 calls. Too high (>6) may indicate poor targeting.

**SQL Query**:
```sql
SELECT AVG(call_count) AS avg_followups
FROM (
  SELECT contact_id, COUNT(*) as call_count
  FROM calls
  GROUP BY contact_id
) subquery
```

**Code reference**: `METRIC_DEFINITIONS.avgFollowups`

---

### Time to First Contact

**What it shows**: Average days from contact creation to first call

**Source**: HubSpot Contacts 'Created date' → First call timestamp

**Good benchmark**: <1 day

**Interpretation**: Lower is better. Fast response (< 1 day) improves conversion.

**SQL Query**:
```sql
SELECT AVG(first_call_days) AS avg_time_to_first_contact
FROM (
  SELECT
    c.id,
    MIN(call_date) - c.createdate AS first_call_days
  FROM contacts c
  JOIN calls ON calls.contact_id = c.id
  WHERE c.createdate BETWEEN :date_from AND :date_to
  GROUP BY c.id
) subquery
```

**Code reference**: `METRIC_DEFINITIONS.timeToFirstContact`

---

## Offer Metrics

### Offers Given Rate

**What it shows**: Percentage of deals where offer was presented

**Source**: HubSpot Deals → 'Offer given' custom field or deal stage

**Good benchmark**: 50-70%

**Interpretation**: Shows how many leads reach offer stage. Good rate: 50-70%.

⚠️ **Why might it be 0?**: Set up 'offer given' tracking in HubSpot deals or use deal stages.

**Code reference**: `METRIC_DEFINITIONS.offersGivenRate`

---

### Offer Close Rate

**What it shows**: Percentage of offers that converted to closed won

**Source**: HubSpot Deals → Offers given → Closedwon ratio

**Good benchmark**: 20-40%

**Interpretation**: Good rate: 20-40%. Low rate indicates pricing or objection handling issues.

⚠️ **Why might it be 0?**: Set up 'offer given' tracking in HubSpot deals.

**Code reference**: `METRIC_DEFINITIONS.offerCloseRate`

---

## Time Metrics

### Time to Sale

**What it shows**: Average days from contact creation to closed deal

**Source**: HubSpot Contacts 'Created date' → Associated deal 'Close date'

**Good benchmark**: 7-30 days

**Interpretation**: Lower is better. Shows sales cycle speed. Typical: 7-30 days.

**SQL Query**:
```sql
SELECT AVG(close_date - createdate) AS avg_time_to_sale
FROM contacts c
JOIN deals d ON d.contact_id = c.id
WHERE d.dealstage = 'closedwon'
  AND d.closedate BETWEEN :date_from AND :date_to
```

**Code reference**: `METRIC_DEFINITIONS.timeToSale`

---

## Call-to-Close Metrics

### Call-to-Close Rate

**What it shows**: Percentage of calls that resulted in closed won deals

**Source**: HubSpot Calls → Associated contacts → Deals (closedwon) / Total calls

**Good benchmark**: 1-3%

**Interpretation**: Good rate: 1-3%. Shows conversion efficiency from calls to sales.

⚠️ **Why might it be 0?**: May indicate: no closed deals yet, or contacts not properly associated with calls.

**Code reference**: `METRIC_DEFINITIONS.callToCloseRate`

---

## A/B Testing Metrics

### Sales Script Version Performance

**What it shows**: Conversion rates by different sales script versions

**Source**: HubSpot Contacts → 'Sales script version' custom field

**Good benchmark**: Test and compare versions

**Interpretation**: Compare conversion rates to find best performing script.

⚠️ **Why might it be 0?**: Fill 'sales_script_version' field in HubSpot contacts for A/B testing.

**Code reference**: `METRIC_DEFINITIONS.salesScriptVersion`

---

### VSL Watch Performance

**What it shows**: Conversion rates by VSL video watch status

**Source**: HubSpot Contacts → 'VSL watched' custom field (4min/18min markers)

**Good benchmark**: Test and compare watch depths

**Interpretation**: Compare conversion rates to measure VSL effectiveness.

⚠️ **Why might it be 0?**: Fill 'vsl_watched' field in HubSpot contacts for tracking.

**Code reference**: `METRIC_DEFINITIONS.vslWatched`

---


## Metadata

- **Generated**: 2025-10-31T04:12:58.542Z
- **Source**: `docs/metrics-schema.yaml`
- **TypeScript**: `lib/metric-definitions.ts`
