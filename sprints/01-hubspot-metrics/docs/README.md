# Sprint 01: HubSpot Metrics - Documentation

**Sprint:** HubSpot Metrics Dashboard Setup
**Created:** 2025-10-06
**Status:** Planning & Architecture Phase

---

## 📚 Documentation Index

### 1. [Database Architecture and Data Flow](./database-architecture-and-data-flow.md)

**What's inside:**
- Complete system architecture (HubSpot → Supabase → Dashboard)
- Data synchronization strategy (parallel vs sequential)
- Database schema design (hybrid: columns + JSONB)
- Associations and relationships between objects
- Query performance optimization
- Phone-based linking for calls
- Implementation roadmap

**Key decisions:**
- ✅ Hybrid approach: 8-10 columns + JSONB
- ✅ Parallel sync for 3x speed improvement
- ✅ Associations stored in JSONB
- ✅ Calls linked via phone numbers

### 2. [HubSpot Fields Analysis and Creation Plan](./hubspot-fields-analysis-and-creation-plan.md)

**What's inside:**
- Complete analysis of 22 metrics requirements
- Existing fields vs missing fields breakdown
- Detailed specifications for 11 new fields
- Deal stages configuration plan
- Field creation script (ready to run)
- Implementation checklist

**Key findings:**
- ✅ 9 deal fields already exist
- ❌ 10 deal fields need creation
- ❌ 1 contact field needs creation
- ✅ All call fields exist (Kavkom integration)

---

## 🎯 Quick Reference

### Metrics Breakdown

**Ready to track (existing fields):**
1. Total sales
2. Total deals
3. Average deal size (needs fix)
4. Average call time
5. Total call time
6. Time to sale
7. Total calls made
8. 5min-reached-rate
9. Pickup rate
10. Average installments (partial)

**Need new fields:**
11. Conversion rate (needs stages)
12. Qualified rate (field exists, needs automation)
13. Trial rate (field exists, needs automation)
14. Cancellation rate (needs: cancellation_reason, is_refunded)
15. Followup rate (needs: followup_count, days_between_stages)
16. VSL effectiveness (needs: vsl_watched, vsl_watch_duration)
17. Upfront cash (needs: upfront_payment)
18. Offers given & rate (needs: offer_given, offer_accepted)
19. Sales scripts testing (field exists)
20. Time to first contact (fields exist)
21. Average followups (calculation)
22. Team efficiency (calculation)

### Fields to Create

**DEALS (10 fields):**
1. cancellation_reason (dropdown)
2. is_refunded (checkbox)
3. followup_count (number)
4. days_between_stages (number)
5. installment_plan (dropdown: 1x/3x/6x/12x)
6. vsl_watched (checkbox)
7. vsl_watch_duration (number)
8. upfront_payment (number)
9. offer_given (checkbox)
10. offer_accepted (checkbox)

**CONTACTS (1 field):**
1. vsl_watch_duration (number)

**CALLS:**
- ✅ No fields needed (Kavkom provides everything)

### Database Tables

```
hubspot_contacts_raw
  - 8 indexed columns (email, phone, firstname, etc)
  - raw_json (JSONB)
  - ~29,000 records

hubspot_deals_raw
  - 8 indexed columns (amount, dealstage, etc)
  - raw_json (JSONB)
  - ~1,000 records

hubspot_calls_raw
  - 5 indexed columns (duration, direction, phone, etc)
  - raw_json (JSONB)
  - ~100+ records
```

---

## 📊 Project Status

### Completed ✅
- [x] Analyzed 200 calls - associations behavior
- [x] Analyzed current deal stages structure
- [x] Compared with client requirements
- [x] Identified all missing fields
- [x] Designed database schema
- [x] Documented architecture decisions
- [x] Created field specifications

### In Progress ⏳
- [ ] Create SQL migration
- [ ] Test migration in Supabase
- [ ] Create field creation script

### Pending ⏸️
- [ ] Run field creation script (after client approval)
- [ ] Client adds new deal stages in HubSpot UI
- [ ] Update sync script with new fields
- [ ] Test full sync
- [ ] Create views for metrics
- [ ] Build frontend dashboard

---

## 🔑 Key Insights

### 1. Calls Associations
**Discovery:** Calls have NO associations in HubSpot API, but we can link via phone numbers.

```sql
-- Link calls to contacts via phone
SELECT ca.*, c.email
FROM hubspot_calls_raw ca
JOIN hubspot_contacts_raw c
  ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '');
```

### 2. Deal Stages Problem
**Current:** 100% of deals in "closedwon" stage.
**Needed:** 5 new stages (Qualified to Buy, High Interest, Offer Received, Closed Won, Closed Lost)
**Action:** Client will add via HubSpot UI (not via API)

### 3. Hybrid Schema Benefits
- Fast queries for common metrics (indexed columns)
- Flexible for new fields (JSONB)
- Never breaks on HubSpot changes
- 53% of required fields already exist

---

## 📁 Related Files

### Analysis Scripts
- `src/scripts/analyze-calls-associations.js` - 200 calls analysis
- `src/scripts/analyze-calls-by-phone.js` - Phone linking verification
- `src/scripts/analyze-dealstages.js` - Deal stages analysis
- `src/scripts/check-existing-fields.js` - Field existence check

### Sync Scripts
- `src/hubspot/sync-parallel.js` - Parallel sync implementation
- `src/hubspot/api.js` - HubSpot API client

### Reports
- `docs/reports/2025-10-06-analysis-complete.md` - Full analysis summary

---

## 🚀 Next Steps

1. **Database Setup** (Current Phase)
   - Create SQL migration with hybrid schema
   - Execute in Supabase
   - Test with sample data

2. **Field Creation** (After client approval)
   - Run `create-missing-fields.js` script
   - Verify in HubSpot UI
   - Test API responses

3. **Sync Implementation**
   - Update sync script with new fields
   - Add associations fetching
   - Full data sync

4. **Dashboard Development**
   - Create views for metrics
   - Build React components
   - Connect to Supabase

---

**Last Updated:** 2025-10-06
**Phase:** Architecture Planning Complete
**Ready For:** SQL Migration Creation
