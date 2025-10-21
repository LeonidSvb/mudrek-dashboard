# HubSpot Setup Guide for Accurate Metrics

Step-by-step guide to configure HubSpot for optimal dashboard metrics.

## Table of Contents

- [Required Setup (Dashboard will work)](#required-setup)
- [Optional Custom Fields (for better accuracy)](#optional-custom-fields)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Required Setup

### 1. Create HubSpot Private App

Dashboard needs API access to sync data from HubSpot.

**Steps**:
1. Go to HubSpot: Settings → Integrations → Private Apps
2. Click "Create private app"
3. **App name**: "Mudrek Dashboard"
4. **Scopes** (enable these):
   - `crm.objects.contacts.read`
   - `crm.objects.deals.read`
   - `crm.objects.owners.read`
   - `crm.schemas.contacts.read`
   - `crm.schemas.deals.read`
   - `timeline` (for calls)
5. Click "Create app"
6. Copy the **Access Token** → Add to `.env` as `HUBSPOT_API_KEY`

**Security**: Never share this token. It has read-only access to your CRM data.

### 2. Ensure Phone Numbers are Filled

Dashboard uses phone numbers to match calls to contacts.

**What to check**:
- Go to Contacts → Export → Check "Phone" column
- Fill missing phone numbers
- Format: International format preferred (+972...)
- System handles variations automatically

**Why important**: Without phone numbers, call-to-close tracking won't work.

### 3. Log All Calls in HubSpot

Dashboard tracks calls logged in HubSpot.

**Best practices**:
- Use HubSpot's built-in calling feature
- If calling externally, log calls manually immediately after
- Include duration (automatic if using HubSpot calling)
- Calls automatically associate with contacts via phone number

**Integration options**:
- HubSpot calling (built-in)
- Aircall for HubSpot
- RingCentral for HubSpot
- Manual logging

---

## Optional Custom Fields

These fields enable advanced metrics. Add them if you want more detailed tracking.

### Option 1: Closing Manager Field (Recommended)

**Problem**: All deals may be assigned to one admin user in HubSpot
**Solution**: Add "Closing Manager" field to track who actually closed the deal

**Setup**:
1. Go to Settings → Objects → Deals → Properties
2. Click "Create property"
3. **Settings**:
   - Group: Deal Information
   - Label: "Closing Manager"
   - Field type: HubSpot user
   - Description: "Sales manager who closed this deal"
4. Save

**Usage**:
- When closing a deal, select the sales manager who closed it
- Dashboard will use this field instead of auto-detection
- **100% accuracy** vs ~46% with auto-detection

**Note**: Contact developer after adding this field to update dashboard logic.

### Option 2: Qualified Status Field

Enables "Qualified Rate" metric.

**Setup**:
1. Settings → Objects → Deals → Properties → Create
2. **Settings**:
   - Label: "Qualified Status"
   - Field type: Single checkbox
   - Description: "Check if lead is qualified to buy"
3. Save

**Usage**: Check this box when lead passes qualification criteria.

### Option 3: Trial Status Field

Enables "Trial Rate" metric.

**Setup**:
1. Settings → Objects → Deals → Properties → Create
2. **Settings**:
   - Label: "Trial Status"
   - Field type: Single checkbox
   - Description: "Check if contact started trial"
3. Save

**Usage**: Check when contact enters trial stage.

### Option 4: Payment Fields

Enables payment metrics.

**Field 1: Upfront Payment**
1. Settings → Objects → Deals → Properties → Create
2. **Settings**:
   - Label: "Upfront Payment"
   - Field type: Number
   - Number format: Currency
   - Description: "First payment collected from customer"

**Field 2: Number of Installments**
1. Settings → Objects → Deals → Properties → Create
2. **Settings**:
   - Label: "Number of Installments (Months)"
   - Field type: Number
   - Number format: Unformatted number
   - Description: "Payment plan length in months"

**Usage**: Fill when closing deal with payment terms.

### Option 5: A/B Testing Fields

Enables A/B testing metrics.

**Field 1: Sales Script Version**
1. Settings → Objects → Contacts → Properties → Create
2. **Settings**:
   - Label: "Sales Script Version"
   - Field type: Single-line text
   - Description: "A, B, or C - which sales script to use"

**Usage**: Set "A", "B", or "C" when creating contact. Dashboard shows conversion by version.

**Field 2: VSL Watched**
1. Settings → Objects → Contacts → Properties → Create
2. **Settings**:
   - Label: "VSL Watched"
   - Field type: Dropdown select
   - Options: "true" (4min or 18min marker), "false" (didn't watch), "" (unknown)
   - Description: "Did contact watch VSL video to 4min+ marker"

**Usage**: Mark "true" if contact watched video to 4min or 18min marker.

---

## Best Practices

### Data Quality

**Phone Numbers**:
- Always include country code (+972 for Israel)
- Update invalid numbers immediately
- Format: +972501234567 (no spaces, dashes OK)

**Deal Stages**:
- Use consistent stage names
- Primary stages: new, qualified, trial, closedwon, closedlost
- Avoid creating too many custom stages (confuses metrics)

**Owner Assignment**:
- Assign contacts to correct sales manager
- Update when contact is handed off
- Keep assignments current

### Call Logging

**What to log**:
- Every call attempt (even if no answer)
- Duration (exact if possible)
- Call outcome (connected, voicemail, no answer, busy)
- Call direction (inbound vs outbound)

**When to log**:
- Immediately after call ends
- Same day at minimum
- Never wait until end of week

**Call outcome values** (use HubSpot's built-in):
- Connected (4+ min = quality conversation)
- Left voicemail
- No answer
- Busy
- Wrong number

### Deal Management

**Close Dates**:
- Set close date to ACTUAL payment date
- Don't backdate unless fixing error
- Use "Expected close date" for pipeline deals

**Deal Amounts**:
- Enter full contract value
- Use "Upfront Payment" field for first payment
- Keep consistent currency

**Deal Stages**:
- Move deals through stages promptly
- Don't skip stages (affects funnel metrics)
- Use "closedwon" exactly (lowercase, one word)

---

## Troubleshooting

### Metrics Showing 0

**Qualified Rate = 0%**:
- Add "Qualified Status" field
- Fill for existing deals
- Check field name matches exactly

**Trial Rate = 0%**:
- Add "Trial Status" field
- Mark trials in HubSpot
- Ensure field is checked (not just stage)

**Upfront Cash = 0**:
- Add "Upfront Payment" field
- Fill for closed deals
- Use currency number format

**Call-to-Close very low (<0.1%)**:
- Normal if auto-detection only finds 46% of deals
- Add "Closing Manager" field for 100% accuracy
- Ensure calls are logged before deal close date

### Sync Issues

**Data not updating**:
- Wait 2 hours for automatic sync
- Or go to /sync page for manual sync
- Check Vercel logs for errors

**Missing contacts/deals**:
- Verify HubSpot Private App has correct scopes
- Check API key is correct in .env
- Ensure data exists in HubSpot

**Slow dashboard**:
- Normal on first load (calculating)
- Materialized views refresh after sync
- Contact developer if consistently slow (>10s)

### Data Accuracy

**Conversion Rate seems wrong**:
- Check date range (may need wider range)
- Verify contacts have create dates
- Ensure deals have close dates
- Formula: Closed won deals / Contacts created

**Call metrics don't match HubSpot**:
- Dashboard counts ALL calls in period
- HubSpot UI may filter differently
- Check if archived calls are excluded
- Verify call direction (inbound vs outbound)

**Deal amounts don't match**:
- Dashboard sums "Amount" field only
- Check for empty Amount values
- Verify currency conversions if multi-currency
- Ensure no test/deleted deals

---

## Recommended Setup Sequence

**Week 1: Basic Setup**
1. Create HubSpot Private App
2. Configure .env file
3. Run initial full sync
4. Verify basic metrics appear

**Week 2: Data Quality**
1. Fill missing phone numbers
2. Ensure all calls are logged
3. Update owner assignments
4. Clean up deal stages

**Week 3: Advanced Metrics**
1. Add "Closing Manager" field
2. Add A/B testing fields
3. Add payment fields
4. Train team on data entry

**Week 4: Optimization**
1. Review metrics for accuracy
2. Fix data gaps
3. Set up team dashboards
4. Document team processes

---

## Field Checklist

Copy this checklist to track your custom field setup:

**Required** (Dashboard works without these but with limitations):
- [ ] Phone numbers filled for all contacts
- [ ] Calls logged in HubSpot
- [ ] Deals have close dates
- [ ] Deals have amounts

**Highly Recommended**:
- [ ] Closing Manager field (for accurate call-to-close)
- [ ] Owner assignments updated

**Optional** (enables specific metrics):
- [ ] Qualified Status field
- [ ] Trial Status field
- [ ] Upfront Payment field
- [ ] Number of Installments field
- [ ] Sales Script Version field
- [ ] VSL Watched field

---

## Getting Help

**For HubSpot questions**: HubSpot Support or your HubSpot admin
**For dashboard integration**: Contact developer
**For metrics clarification**: See `METRICS_GUIDE.md`

**Last updated**: 2025-10-21
