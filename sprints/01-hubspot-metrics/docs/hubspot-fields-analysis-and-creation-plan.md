# HubSpot Fields Analysis and Creation Plan

**Created:** 2025-10-06
**Sprint:** HubSpot Metrics Dashboard
**Status:** Field Planning Phase

---

## 📋 Table of Contents

1. [Metrics Requirements](#metrics-requirements)
2. [Existing Fields Analysis](#existing-fields-analysis)
3. [Missing Fields to Create](#missing-fields-to-create)
4. [Field Creation Specifications](#field-creation-specifications)
5. [Deal Stages Configuration](#deal-stages-configuration)
6. [Creation Script](#creation-script)

---

## 📊 Metrics Requirements

### Source: Client Call 2025-10-02

From `docs/calls/2025-10-02/metrics-table.csv`:

#### Milestone 2 (High Priority - 14 metrics)

| # | Metric | Status | Required Fields |
|---|--------|--------|-----------------|
| 1 | Total sales | ✅ Ready | amount |
| 2 | Total deals | ✅ Ready | dealstage |
| 3 | Average deal size | ⚠️ Broken | amount |
| 4 | Conversion rate | ⚠️ Needs fixing | dealstage, stages |
| 5 | Qualified rate | ❌ Not yet | qualified_status |
| 6 | Trial rate | ❌ Not yet | trial_status |
| 7 | Cancellation rate | ❌ Not yet | cancellation_reason, is_refunded |
| 8 | Followup rate | ❌ Not yet | followup_count, days_between_stages |
| 9 | Avg installments | ❌ Not yet | number_of_installments__months, installment_plan |
| 10 | Average call time | ❌ Not yet | hs_call_duration (Kavkom ✅) |
| 11 | Total call time | ❌ Not yet | hs_call_duration (Kavkom ✅) |
| 12 | Time to sale | ❌ Not yet | createdate, closedate |
| 13 | Sales scripts testing | ❌ Not yet | sales_script_version (contact) |
| 14 | VSL watch → close rate | ❌ Not yet | vsl_watched, vsl_watch_duration |

#### Milestone 3 (Medium Priority - 8 metrics)

| # | Metric | Status | Required Fields |
|---|--------|--------|-----------------|
| 15 | Upfront cash collected | ❌ Not yet | upfront_payment |
| 16 | Total calls made | ❌ Not yet | Kavkom ✅ |
| 17 | 5min-reached-rate | ❌ Not yet | hs_call_duration (Kavkom ✅) |
| 18 | Offers given & rate | ❌ Not yet | offer_given, offer_accepted |
| 19 | Team efficiency | ❌ Not yet | Calculated from above |
| 20 | Pickup rate | ❌ Not yet | hs_call_disposition (Kavkom ✅) |
| 21 | Time to first contact | ❌ Not yet | createdate + hs_timestamp |
| 22 | Average followups | ❌ Not yet | COUNT(calls) per contact |

---

## 🔍 Existing Fields Analysis

### Methodology

Analyzed via HubSpot Properties API:
- `GET /crm/v3/properties/deals` (213 properties found)
- `GET /crm/v3/properties/contacts` (421 properties found)
- `GET /crm/v3/properties/calls` (96 properties found)

### Results Summary

```
📊 DEALS:     10 missing / 19 required = 53% exist ✅
📇 CONTACTS:   1 missing /  4 required = 75% exist ✅
📞 CALLS:      0 missing /  5 required = 100% exist ✅ (Kavkom)
```

---

## ✅ Existing Fields (No Action Needed)

### DEALS (9 fields exist)

| Field Name | Type | Usage |
|------------|------|-------|
| amount | number | Total sales, Average deal size |
| dealstage | string | Conversion rate |
| createdate | datetime | Time to sale |
| closedate | datetime | Time to sale |
| qualified_status | string | Qualified rate |
| trial_status | string | Trial rate |
| payment_status | string | Retention (Active/Paused/etc) |
| payment_type | string | Payment method tracking |
| number_of_installments__months | number | Avg installments |

### CONTACTS (3 fields exist)

| Field Name | Type | Usage |
|------------|------|-------|
| createdate | datetime | Time to first contact |
| sales_script_version | string | A/B testing sales scripts |
| vsl_watched | boolean | VSL watch → close rate |

### CALLS (5 fields exist - Kavkom Integration)

| Field Name | Type | Usage |
|------------|------|-------|
| hs_call_duration | number | Avg/total call time, 5min-reached |
| hs_call_direction | string | OUTBOUND/INBOUND |
| hs_call_disposition | string | Pickup rate |
| hs_call_body | string | Call details |
| hs_timestamp | datetime | Time to first contact |

---

## ❌ Missing Fields to Create

### Архитектурное решение: Гибридный подход

**HubSpot (8 полей)** - для полей, которые нужны команде продаж в CRM:
- 7 deal fields: cancellation_reason, is_refunded, installment_plan, vsl_watched, upfront_payment, offer_given, offer_accepted
- 1 contact field: vsl_watch_duration

**Supabase Views (2 поля)** - вычисляемые поля из существующих данных:
- followup_count - COUNT(calls) per contact
- days_between_stages - closedate - createdate

**Причины:**
- HubSpot: Данные нужны менеджерам в интерфейсе, заполняются вручную или через Make.com
- Supabase: Агрегации и производные значения, нужны только для дашборда

---

### DEALS (10 fields)

#### 1. cancellation_reason
```javascript
{
  name: "cancellation_reason",
  label: "Cancellation Reason",
  description: "Why customer cancelled/refunded",
  groupName: "dealinformation",
  type: "enumeration",
  fieldType: "select",
  options: [
    { label: "Too expensive", value: "too_expensive" },
    { label: "Not satisfied", value: "not_satisfied" },
    { label: "No results", value: "no_results" },
    { label: "Changed mind", value: "changed_mind" },
    { label: "Other", value: "other" }
  ]
}
```

#### 2. is_refunded
```javascript
{
  name: "is_refunded",
  label: "Is Refunded",
  description: "Has this deal been refunded?",
  groupName: "dealinformation",
  type: "bool",
  fieldType: "booleancheckbox"
}
```

#### 3. followup_count
**🔄 ВЫЧИСЛЯЕТСЯ В SUPABASE** - не создаем в HubSpot
```sql
-- View в Supabase
SELECT
  d.hubspot_id,
  COUNT(ca.hubspot_id) as followup_count
FROM hubspot_deals_raw d
JOIN hubspot_contacts_raw c ON c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
JOIN hubspot_calls_raw ca ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '')
GROUP BY d.hubspot_id;
```

#### 4. days_between_stages
**🔄 ВЫЧИСЛЯЕТСЯ В SUPABASE** - не создаем в HubSpot
```sql
-- View в Supabase
SELECT
  hubspot_id,
  EXTRACT(days FROM closedate - createdate) as days_between_stages
FROM hubspot_deals_raw;
```

#### 5. installment_plan
```javascript
{
  name: "installment_plan",
  label: "Installment Plan",
  description: "Payment installment plan",
  groupName: "dealinformation",
  type: "enumeration",
  fieldType: "select",
  options: [
    { label: "1x (Full payment)", value: "1x" },
    { label: "3x", value: "3x" },
    { label: "6x", value: "6x" },
    { label: "12x", value: "12x" }
  ]
}
```

#### 6. vsl_watched (Deal)
```javascript
{
  name: "vsl_watched",
  label: "VSL Watched",
  description: "Did contact watch VSL before deal?",
  groupName: "dealinformation",
  type: "bool",
  fieldType: "booleancheckbox"
}
```

#### 7. vsl_watch_duration (Deal)
**❌ НЕ СОЗДАЕМ** - берем из contact через JOIN
```sql
-- Берется из hubspot_contacts_raw.vsl_watch_duration
SELECT d.*, c.vsl_watch_duration
FROM hubspot_deals_raw d
JOIN hubspot_contacts_raw c ON c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id';
```

#### 8. upfront_payment
```javascript
{
  name: "upfront_payment",
  label: "Upfront Payment",
  description: "Amount paid upfront (first payment)",
  groupName: "dealinformation",
  type: "number",
  fieldType: "number"
}
```

#### 9. offer_given
```javascript
{
  name: "offer_given",
  label: "Offer Given",
  description: "Was an offer presented?",
  groupName: "dealinformation",
  type: "bool",
  fieldType: "booleancheckbox"
}
```

#### 10. offer_accepted
```javascript
{
  name: "offer_accepted",
  label: "Offer Accepted",
  description: "Did customer accept the offer?",
  groupName: "dealinformation",
  type: "bool",
  fieldType: "booleancheckbox"
}
```

### CONTACTS (1 field)

#### 1. vsl_watch_duration
```javascript
{
  name: "vsl_watch_duration",
  label: "VSL Watch Duration",
  description: "Minutes of VSL watched (4min, 18min markers)",
  groupName: "contactinformation",
  type: "number",
  fieldType: "number"
}
```

### CALLS

✅ **NO FIELDS NEEDED** - Kavkom integration provides everything!

---

## 🎯 Deal Stages Configuration

### Current State

**Pipeline:** Sales Pipeline (ID: default)

| Stage ID | Label | Display Order | Used? |
|----------|-------|---------------|-------|
| appointmentscheduled | Lead | 0 | ❌ No |
| qualifiedtobuy | call back | 1 | ❌ No |
| 199274159 | In Progress | 2 | ❌ No |
| 199274158 | Trial Account | 3 | ❌ No |
| **closedwon** | **Closed Won** | 4 | ✅ **100%** |
| closedlost | Closed Lost | 5 | ❌ No |

**Problem:** All deals stuck in `closedwon`. No funnel tracking!

### Client Requirements (from Slack discussion)

#### Contact Stages (NOT in deals pipeline)
- New leads (pending to be contacted)
- No answer
- Wrong number
- Disqualified

#### Deal Stages (NEW pipeline structure)
1. **Qualified to Buy** - Shows any interest
2. **High interest** - Strong buying signals
3. **Offer received** - Pending payment
4. **Closed won** - Paid something
5. **Closed lost** - Cancelled after interest

#### Retention Properties (for Closed Won)
- **payment_status** field with values:
  - Active
  - Paused
  - Stopped
  - Refunded
  - Completed

### Recommended Pipeline Configuration

```javascript
// NEW deal stages (client will add via HubSpot UI)
[
  {
    label: "Qualified to Buy",
    displayOrder: 0,
    metadata: { probability: "0.2", isClosed: "false" }
  },
  {
    label: "High Interest",
    displayOrder: 1,
    metadata: { probability: "0.5", isClosed: "false" }
  },
  {
    label: "Offer Received",
    displayOrder: 2,
    metadata: { probability: "0.8", isClosed: "false" }
  },
  {
    label: "Closed Won",
    displayOrder: 3,
    metadata: { probability: "1.0", isClosed: "true" }
  },
  {
    label: "Closed Lost",
    displayOrder: 4,
    metadata: { probability: "0.0", isClosed: "true" }
  }
]
```

**NOTE:** We DON'T create stages via API. Client adds them manually in HubSpot UI.

---

## 🛠️ Creation Script

### API Endpoint

```
POST https://api.hubapi.com/crm/v3/properties/{objectType}
```

### Script: `src/scripts/create-missing-fields.js`

```javascript
import 'dotenv/config';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

// NOTE: followup_count и days_between_stages вычисляются в Supabase, не создаем в HubSpot

const DEAL_FIELDS = [
  {
    name: "cancellation_reason",
    label: "Cancellation Reason",
    type: "enumeration",
    fieldType: "select",
    groupName: "dealinformation",
    options: [
      { label: "Too expensive", value: "too_expensive" },
      { label: "Not satisfied", value: "not_satisfied" },
      { label: "No results", value: "no_results" },
      { label: "Changed mind", value: "changed_mind" },
      { label: "Other", value: "other" }
    ]
  },
  {
    name: "is_refunded",
    label: "Is Refunded",
    type: "bool",
    fieldType: "booleancheckbox",
    groupName: "dealinformation"
  },
  {
    name: "installment_plan",
    label: "Installment Plan",
    type: "enumeration",
    fieldType: "select",
    groupName: "dealinformation",
    options: [
      { label: "1x (Full payment)", value: "1x" },
      { label: "3x", value: "3x" },
      { label: "6x", value: "6x" },
      { label: "12x", value: "12x" }
    ]
  },
  {
    name: "vsl_watched",
    label: "VSL Watched",
    type: "bool",
    fieldType: "booleancheckbox",
    groupName: "dealinformation"
  },
  {
    name: "upfront_payment",
    label: "Upfront Payment",
    type: "number",
    fieldType: "number",
    groupName: "dealinformation"
  },
  {
    name: "offer_given",
    label: "Offer Given",
    type: "bool",
    fieldType: "booleancheckbox",
    groupName: "dealinformation"
  },
  {
    name: "offer_accepted",
    label: "Offer Accepted",
    type: "bool",
    fieldType: "booleancheckbox",
    groupName: "dealinformation"
  }
];

const CONTACT_FIELDS = [
  {
    name: "vsl_watch_duration",
    label: "VSL Watch Duration (minutes)",
    type: "number",
    fieldType: "number",
    groupName: "contactinformation"
  }
];

async function createField(objectType, field) {
  const response = await fetch(
    `${BASE_URL}/crm/v3/properties/${objectType}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(field)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed: ${error.message}`);
  }

  return await response.json();
}

async function createAllFields() {
  console.log('=== CREATING MISSING FIELDS ===\n');

  // Create deal fields
  console.log('📊 DEALS:\n');
  for (const field of DEAL_FIELDS) {
    try {
      await createField('deals', field);
      console.log(`  ✅ Created: ${field.label}`);
    } catch (error) {
      console.log(`  ❌ Failed: ${field.label} - ${error.message}`);
    }
  }

  // Create contact fields
  console.log('\n📇 CONTACTS:\n');
  for (const field of CONTACT_FIELDS) {
    try {
      await createField('contacts', field);
      console.log(`  ✅ Created: ${field.label}`);
    } catch (error) {
      console.log(`  ❌ Failed: ${field.label} - ${error.message}`);
    }
  }

  console.log('\n✅ Done!\n');
}

createAllFields().catch(console.error);
```

### Usage

```bash
# Create all missing fields
node src/scripts/create-missing-fields.js
```

---

## 📝 Implementation Checklist

### Phase 1: Preparation (Current)
- [x] Analyze existing fields in HubSpot
- [x] Identify missing fields (10 deals, 1 contact)
- [x] Design field specifications
- [x] Document creation plan

### Phase 2: Field Creation
- [x] Decide HubSpot vs Supabase approach (hybrid: 7 in HubSpot, 2 in Supabase)
- [ ] Review field specs with client
- [ ] Run creation script (creates 7 deal fields + 1 contact field)
- [ ] Verify fields in HubSpot UI
- [ ] Test with sample data

### Phase 3: Deal Stages
- [ ] Client creates new pipeline stages in HubSpot UI
- [ ] Document stage IDs
- [ ] Update sync script with new stage IDs

### Phase 4: Automation (Make.com)
- [ ] Setup triggers for auto-populating fields
- [ ] `vsl_watched` → triggered when video watched
- [ ] `qualified_status` → triggered on stage change
- [ ] `offer_given` → manual or stage-based

---

## 🎯 Success Criteria

**HubSpot Fields:**
- [ ] 7 deal fields created in HubSpot (cancellation_reason, is_refunded, installment_plan, vsl_watched, upfront_payment, offer_given, offer_accepted)
- [ ] 1 contact field created in HubSpot (vsl_watch_duration)
- [ ] Fields visible in HubSpot UI
- [ ] Fields appear in API responses
- [ ] Test records have sample data

**Supabase Views:**
- [ ] followup_count view created
- [ ] days_between_stages view created

**Overall:**
- [ ] Sync script includes new fields
- [ ] All 22 metrics can be calculated

---

**Status:** Architectural decision made - hybrid approach
**Next:** Run creation script to create 8 fields in HubSpot
