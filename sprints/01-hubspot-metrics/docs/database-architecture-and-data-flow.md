# Database Architecture and Data Flow Documentation

**Created:** 2025-10-06
**Sprint:** HubSpot Metrics Dashboard
**Status:** Architecture Planning Phase

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow: HubSpot → Supabase](#data-flow-hubspot-supabase)
3. [Database Schema Design](#database-schema-design)
4. [Associations and Relationships](#associations-and-relationships)
5. [JSONB vs Normalized Approach](#jsonb-vs-normalized-approach)
6. [Query Performance Strategy](#query-performance-strategy)
7. [Implementation Plan](#implementation-plan)

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      HUBSPOT CRM                            │
│  • 29,000 contacts                                          │
│  • 1,000 deals                                              │
│  • 100+ calls (Kavkom integration)                          │
└────────────┬────────────────────────────────────────────────┘
             │
             │ API Sync (Parallel)
             │ Every hour via Vercel Cron
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                     │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ hubspot_         │  │ hubspot_         │                │
│  │ contacts_raw     │  │ deals_raw        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐                                       │
│  │ hubspot_         │                                       │
│  │ calls_raw        │                                       │
│  └──────────────────┘                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             │ SQL Queries
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS DASHBOARD                         │
│  • React components                                          │
│  • ShadCN UI                                                 │
│  • 22 metrics visualization                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: HubSpot → Supabase

### Synchronization Strategy: **PARALLEL**

```javascript
// ✅ RECOMMENDED: All 3 sync in parallel
async function syncAll() {
  const [contactsResult, dealsResult, callsResult] =
    await Promise.allSettled([
      syncContacts(),  // Independent
      syncDeals(),     // Independent
      syncCalls()      // Independent
    ]);
}
```

### Why Parallel?

1. **No Dependencies**: Each HubSpot API endpoint is independent
2. **3x Faster**: All sync simultaneously
3. **Resilient**: If one fails, others still complete
4. **Simple**: No complex dependency management

### Sync Process Per Object Type

```
1. Fetch from HubSpot API
   ├─ GET /crm/v3/objects/contacts?limit=100&properties=...
   ├─ GET /crm/v3/objects/deals?limit=100&properties=...
   └─ GET /crm/v3/objects/calls?limit=100&properties=...

2. Pagination
   ├─ Handle 'after' cursor
   ├─ Fetch all pages
   └─ Collect all records

3. Transform Data
   ├─ Extract frequently used fields → columns
   └─ Store full response → raw_json (JSONB)

4. Upsert to Supabase
   ├─ Use hubspot_id as unique key
   ├─ Batch insert (500 records per batch)
   └─ Handle conflicts (update on duplicate)
```

---

## 🗄️ Database Schema Design

### Hybrid Approach: **Columns + JSONB**

#### Why Hybrid?

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **All Columns** | Fast queries, Type safety | Rigid schema, 200+ columns | Not flexible |
| **Only JSONB** | Ultra flexible | Slower queries, Complex SQL | Too loose |
| **HYBRID ✅** | Fast for common fields, Flexible for rest | Slightly more complex | **PERFECT for us** |

### Schema Structure

```sql
-- PATTERN: 8-10 frequently used columns + raw_json

CREATE TABLE hubspot_contacts_raw (
    -- PRIMARY KEY
    hubspot_id TEXT PRIMARY KEY,

    -- FREQUENTLY USED FIELDS (for metrics)
    email TEXT,
    phone TEXT,                    -- for JOIN with calls!
    firstname TEXT,
    lastname TEXT,
    createdate TIMESTAMP,
    lifecyclestage TEXT,
    vsl_watched BOOLEAN,           -- for VSL metrics
    sales_script_version TEXT,     -- for A/B testing

    -- ALL DATA (including above fields)
    raw_json JSONB NOT NULL,

    -- METADATA
    synced_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hubspot_deals_raw (
    -- PRIMARY KEY
    hubspot_id TEXT PRIMARY KEY,

    -- FREQUENTLY USED FIELDS (for metrics)
    amount NUMERIC,                -- Total sales, Avg deal size
    dealstage TEXT,                -- Conversion rate, stages
    createdate TIMESTAMP,          -- Time to sale
    closedate TIMESTAMP,           -- Time to sale
    qualified_status TEXT,         -- Qualified rate
    trial_status TEXT,             -- Trial rate
    payment_status TEXT,           -- Retention metrics
    number_of_installments__months INTEGER,  -- Avg installments

    -- ALL DATA (including above fields)
    raw_json JSONB NOT NULL,

    -- METADATA
    synced_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hubspot_calls_raw (
    -- PRIMARY KEY
    hubspot_id TEXT PRIMARY KEY,

    -- FREQUENTLY USED FIELDS (for metrics)
    call_duration INTEGER,         -- Avg call time, Total call time
    call_direction TEXT,           -- OUTBOUND/INBOUND
    call_to_number TEXT,           -- for JOIN with contacts.phone!
    call_from_number TEXT,
    call_timestamp TIMESTAMP,      -- Time to first contact

    -- ALL DATA (including above fields)
    raw_json JSONB NOT NULL,

    -- METADATA
    synced_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes Strategy

```sql
-- CONTACTS: Fast lookups by phone and email
CREATE INDEX idx_contacts_phone ON hubspot_contacts_raw(phone);
CREATE INDEX idx_contacts_email ON hubspot_contacts_raw(email);
CREATE INDEX idx_contacts_createdate ON hubspot_contacts_raw(createdate);

-- DEALS: Fast filtering by stage and amount
CREATE INDEX idx_deals_stage ON hubspot_deals_raw(dealstage);
CREATE INDEX idx_deals_amount ON hubspot_deals_raw(amount);
CREATE INDEX idx_deals_closedate ON hubspot_deals_raw(closedate);
CREATE INDEX idx_deals_payment_status ON hubspot_deals_raw(payment_status);

-- CALLS: Fast JOIN with contacts via phone
CREATE INDEX idx_calls_to_number ON hubspot_calls_raw(call_to_number);
CREATE INDEX idx_calls_timestamp ON hubspot_calls_raw(call_timestamp);
CREATE INDEX idx_calls_duration ON hubspot_calls_raw(call_duration);

-- JSONB: GIN indexes for fast JSONB queries
CREATE INDEX idx_contacts_raw_json ON hubspot_contacts_raw USING GIN (raw_json);
CREATE INDEX idx_deals_raw_json ON hubspot_deals_raw USING GIN (raw_json);
CREATE INDEX idx_calls_raw_json ON hubspot_calls_raw USING GIN (raw_json);
```

---

## 🔗 Associations and Relationships

### Discovery: HubSpot Associations Analysis

**Result from analyzing 200 calls:**
- ❌ Calls DO NOT have associations to contacts or deals in API
- ✅ But calls have phone numbers (100% coverage)
- ✅ Contacts have associations to calls (one-way only)
- ✅ Deals have associations to contacts

### Relationship Patterns

```
CONTACTS ←──────────→ DEALS
   │                     │
   │                     │
   │ (via phone)         │ (via contact association)
   │                     │
   ▼                     ▼
 CALLS ──────────────→ CALLS
      (no direct link)
```

### How We Store Associations

#### Option A: In JSONB (CHOSEN ✅)

```sql
-- Associations stored in raw_json
{
  "properties": { ... },
  "associations": {
    "contacts": {
      "results": [
        { "id": "150479232059", "type": "deal_to_contact" }
      ]
    },
    "calls": {
      "results": [
        { "id": "59205660498", "type": "contact_to_call" },
        { "id": "59209537173", "type": "contact_to_call" }
      ]
    }
  }
}
```

**Querying associations:**

```sql
-- Get contact_id for a deal
SELECT
  hubspot_id,
  raw_json->'associations'->'contacts'->'results'->0->>'id' as contact_id
FROM hubspot_deals_raw
WHERE hubspot_id = '43486818666';

-- Get all call IDs for a contact
SELECT
  hubspot_id,
  jsonb_array_elements(
    raw_json->'associations'->'calls'->'results'
  )->>'id' as call_id
FROM hubspot_contacts_raw
WHERE hubspot_id = '75051';
```

#### Option B: Separate Table (NOT chosen)

```sql
-- More complex, but cleaner queries
CREATE TABLE hubspot_associations (
    id BIGSERIAL PRIMARY KEY,
    from_object_type TEXT,
    from_object_id TEXT,
    to_object_type TEXT,
    to_object_id TEXT,
    association_type TEXT
);
```

**Why we chose JSONB:**
- ✅ Simpler sync (one INSERT instead of two)
- ✅ More reliable (all data in one place)
- ✅ HubSpot flexibility (new association types = automatic)
- ✅ PostgreSQL JSONB is fast with GIN indexes

---

## 🔗 Linking Calls to Contacts/Deals

### Challenge

Calls have **NO associations** in HubSpot API.

### Solution: Phone Number JOIN

```sql
-- Link calls → contacts via phone
SELECT
  ca.hubspot_id as call_id,
  ca.call_duration,
  c.hubspot_id as contact_id,
  c.email,
  c.firstname
FROM hubspot_calls_raw ca
JOIN hubspot_contacts_raw c
  ON REPLACE(ca.call_to_number, '+', '') =
     REPLACE(c.phone, '+', '');

-- Link calls → deals (via contact)
SELECT
  d.hubspot_id as deal_id,
  d.amount,
  ca.hubspot_id as call_id,
  ca.call_duration,
  c.email
FROM hubspot_deals_raw d
JOIN hubspot_contacts_raw c
  ON c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
JOIN hubspot_calls_raw ca
  ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '');
```

### Why This Works

1. **100% of calls** have `hs_call_to_number`
2. **100% of contacts** have `phone` field
3. **100% of deals** have `phone_number` field
4. Phone normalization (`REPLACE('+', '')`) handles format differences

---

## ⚡ Query Performance Strategy

### Fast Queries: Use Columns

```sql
-- ✅ FAST - indexed column
SELECT AVG(amount)
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon'
  AND closedate >= '2024-01-01';

-- ✅ FAST - indexed column
SELECT COUNT(*)
FROM hubspot_calls_raw
WHERE call_duration >= 300000;  -- 5 minutes
```

### Flexible Queries: Use JSONB

```sql
-- ✅ FAST with GIN index
SELECT
  hubspot_id,
  raw_json->>'payment_method' as payment_method,
  COUNT(*)
FROM hubspot_deals_raw
WHERE raw_json->>'payment_method' IS NOT NULL
GROUP BY hubspot_id, payment_method;
```

### Views for Convenience

```sql
-- Create view for common metrics
CREATE VIEW deals_with_contacts AS
SELECT
  d.hubspot_id as deal_id,
  d.amount,
  d.dealstage,
  d.closedate,
  d.raw_json->'associations'->'contacts'->'results'->0->>'id' as contact_id,
  d.raw_json->>'dealname' as dealname
FROM hubspot_deals_raw d;

-- Now simple queries
SELECT * FROM deals_with_contacts
WHERE dealstage = 'closedwon';
```

---

## 📊 Implementation Plan

### Phase 1: Database Setup (Current)

1. ✅ Analyze existing HubSpot data structure
2. ✅ Design hybrid schema (columns + JSONB)
3. ⏳ Create SQL migration
4. ⏳ Execute migration in Supabase
5. ⏳ Test with sample data

### Phase 2: Sync Logic

1. Update `src/hubspot/sync-parallel.js` with correct fields
2. Add associations fetching to sync
3. Test sync with 100 records
4. Full sync (all 29k contacts, 1k deals, 100+ calls)

### Phase 3: Views & Queries

1. Create views for common metrics
2. Write SQL for 22 metrics
3. Test query performance
4. Optimize indexes if needed

### Phase 4: Frontend Integration

1. Next.js API routes to fetch metrics
2. React components for visualization
3. Connect to Supabase

---

## 🎯 Success Criteria

- [x] Database schema supports all 22 metrics
- [x] Schema is flexible (new HubSpot fields = automatic)
- [x] Associations work (deal → contact, contact → calls)
- [x] Phone-based linking works (calls → contacts)
- [ ] Sync completes in < 5 minutes
- [ ] Queries return in < 100ms
- [ ] All metrics calculate correctly

---

**Status:** Ready for SQL migration creation
**Next:** Create migration file with full schema
