# Metrics Guide for Sales Managers

Complete guide to understanding and using metrics in Mudrek Dashboard.

## Table of Contents

- [Sales Metrics](#sales-metrics)
- [Call Performance Metrics](#call-performance-metrics)
- [Conversion Metrics](#conversion-metrics)
- [Payment Metrics](#payment-metrics)
- [Followup Metrics](#followup-metrics)
- [Time Performance](#time-performance)
- [Call-to-Close Metrics](#call-to-close-metrics)
- [A/B Testing](#ab-testing)
- [FAQ](#faq)

---

## Sales Metrics

### Total Sales
**What it shows**: Total revenue from all closed won deals
**Source**: HubSpot Deals → 'Amount' field (dealstage = closedwon)
**Good benchmark**: Depends on your business goals
**Why might it be 0?**: No deals closed yet in the selected period

### Average Deal Size
**What it shows**: Average revenue per closed deal
**Source**: Sum of amounts / Number of closed won deals
**Good benchmark**: $5,000-$15,000 (varies by industry)
**Why might it be 0?**: No closed deals in period

### Total Deals
**What it shows**: Number of closed won deals
**Source**: Count of deals where dealstage = closedwon
**Good benchmark**: Depends on team size and targets
**Why might it be 0?**: No deals closed in selected period

### Conversion Rate
**What it shows**: Percentage of contacts who became paying customers
**Formula**: (Closed won deals / Contacts created) × 100
**Source**: HubSpot Contacts → Deals ratio
**Good benchmark**: 5-15%
**Why might it be low?**:
- Lead quality issues
- Long sales cycle (deals not closed yet)
- Pricing too high
- Follow-up gaps

### Contacts Created
**What it shows**: New contacts added in selected period
**Source**: HubSpot Contacts → 'Created date' field
**Good benchmark**: Steady growth month-over-month
**Why might it be 0?**: No new leads in period (check lead generation)

---

## Call Performance Metrics

### Total Calls
**What it shows**: All calls made in selected period
**Source**: HubSpot Calls → All logged call activities
**Good benchmark**: 50-100 calls/day per sales manager
**Why might it be 0?**: No calls logged (check HubSpot integration)

### Average Call Time
**What it shows**: Average duration of calls in minutes
**Source**: Average of all call durations
**Good benchmark**: 2-5 minutes
**Interpretation**:
- < 1 min: Not reaching contacts or quick rejections
- 2-5 min: Good engagement
- > 10 min: May indicate inefficiency or very engaged prospects

### Total Call Time
**What it shows**: Total time spent on calls (in hours)
**Source**: Sum of all call durations
**Good benchmark**: 3-5 hours/day per sales manager
**Use case**: Track team effort and productivity

### Pickup Rate
**What it shows**: Percentage of calls where contact actually answered and had a real conversation
**Formula**: (Connected calls with 4+ min duration / Total calls) × 100
**Source**: HubSpot Calls → 'Call outcome' = Connected + duration >= 4 minutes
**Good benchmark**: 40-50%
**Why might it be low?**:
- Bad timing (calling at wrong hours)
- Wrong phone numbers
- Contacts don't recognize the number

### 5min Reached Rate
**What it shows**: Percentage of calls lasting 5 minutes or longer
**Formula**: (Calls >= 5 min / Total calls) × 100
**Source**: Call duration analysis
**Good benchmark**: 20-40%
**Interpretation**: High-value conversations typically last 5+ minutes

---

## Conversion Metrics

### Qualified Rate
**What it shows**: Percentage of deals marked as qualified to buy
**Source**: HubSpot Deals → 'Qualified status' custom field
**Good benchmark**: 30-60%
**Why might it be 0?**: Field not filled in HubSpot (see HubSpot Setup Guide)

### Trial Rate
**What it shows**: Percentage of deals that entered trial stage
**Source**: HubSpot Deals → 'Trial status' custom field
**Good benchmark**: Varies by product
**Why might it be 0?**: Field not filled in HubSpot

### Cancellation Rate
**What it shows**: Percentage of deals that were cancelled or lost
**Formula**: (Closed lost deals / Total deals) × 100
**Source**: Dealstage = 'closedlost' or cancelled
**Good benchmark**: < 30%
**Why might it be high (>40%)?**:
- Pricing issues
- Poor qualification
- Product-market fit problems

---

## Payment Metrics

### Upfront Cash Collected
**What it shows**: Total first payments collected from customers
**Source**: HubSpot Deals → 'Upfront payment' custom field
**Good benchmark**: Higher is better for cash flow
**Why might it be 0?**: Field not filled in HubSpot

### Average Installments
**What it shows**: Average payment plan length in months
**Source**: HubSpot Deals → 'Number of installments' field
**Good benchmark**: 3-12 months typical
**Interpretation**: Longer plans may indicate affordability focus

---

## Followup Metrics

### Followup Rate
**What it shows**: Percentage of contacts with multiple calls
**Formula**: (Contacts with calls > 1 / Total contacts) × 100
**Source**: Contact call count analysis
**Good benchmark**: 60-80%
**Why might it be low?**: Not enough persistence in outreach

### Average Followups
**What it shows**: Average number of calls per contact
**Source**: Total calls / Total contacts
**Good benchmark**: 2-4 calls
**Interpretation**: Too high (>6) may indicate poor targeting

### Time to First Contact
**What it shows**: Average days from contact creation to first call
**Source**: Contact 'Created date' → First call timestamp
**Good benchmark**: < 1 day (faster is better)
**Why might it be high?**: Lead response process delays

---

## Time Performance

### Time to Sale
**What it shows**: Average days from contact creation to closed deal
**Source**: Contact 'Created date' → Deal 'Close date'
**Good benchmark**: 7-30 days (varies by industry)
**Interpretation**: Shows sales cycle speed

---

## Call-to-Close Metrics

### Team Call-to-Close Rate
**What it shows**: Percentage of calls that resulted in closed won deals
**Formula**: (Closed won deals / Total calls) × 100
**Source**: Automatic detection based on call history
**Good benchmark**: 1-3%
**Why might it be low (< 0.5%)?**:
- This is actually NORMAL for high-volume calling
- Many calls are follow-ups, not all lead to closes
- System uses ML to detect closing manager from call history

### How it Works (Technical)
The system automatically determines who closed each deal by:
1. Finding all calls to the deal's contact
2. Identifying the last call before deal close date
3. Determining which manager made that call
4. Assigning credit to that manager

**Important Notes**:
- All deals in HubSpot may be assigned to one admin user
- System uses call history to find the REAL closing manager
- About 46% of deals can be tracked this way
- Missing 54% means no call history found before close date

### Improving Accuracy
**Option 1 (Recommended)**: Add custom field "Closing Manager" in HubSpot Deals
- Go to Settings → Objects → Deals → Properties
- Create new property: "Closing Manager" (type: Owner)
- Fill manually when closing deals
- Contact developer to update dashboard logic

**Option 2**: Ensure all calls are logged in HubSpot
- Use HubSpot calling feature
- Log manual calls immediately
- Refresh materialized views after sync

---

## A/B Testing

### Sales Script Performance
**What it shows**: Conversion rates by different sales script versions
**Source**: HubSpot Contacts → 'Sales script version' custom field
**How to use**:
1. Add 'sales_script_version' field to contacts
2. Assign A/B/C versions when creating contact
3. Dashboard shows conversion rate for each version

### VSL Watch Impact
**What it shows**: Conversion difference between contacts who watched VSL video vs didn't
**Source**: HubSpot Contacts → 'VSL watched' custom field
**How to set up**:
1. Add 'vsl_watched' field (type: Yes/No)
2. Mark "Yes" for contacts who watched 4+ or 18+ minute markers
3. Dashboard compares conversion rates

---

## FAQ

### Q: Why are my metrics showing 0?
**A**: Check these common causes:
1. **No data in period**: Select a wider date range
2. **Custom fields not filled**: See HubSpot Setup Guide
3. **Sync not completed**: Go to /sync and run manual sync
4. **Wrong owner filter**: Select "All" to see team data

### Q: Why is my Conversion Rate so low?
**A**: Low conversion (< 5%) usually means:
- Most contacts are still in pipeline (not closed yet)
- Lead quality issues
- Long sales cycle
- Try filtering by longer time periods

### Q: Why doesn't Call-to-Close show all my deals?
**A**: The automatic detection can only track deals where:
1. Contact has phone number
2. Calls were logged to that contact
3. Calls happened BEFORE deal close date

If deals are closed without logged calls, they won't be tracked. See "Improving Accuracy" section above.

### Q: What's the difference between Total Deals and Call-to-Close deals?
**A**:
- **Total Deals**: ALL closed won deals in HubSpot
- **Call-to-Close deals**: Only deals where system found call history

They will differ because not all deals have tracked call history.

### Q: My Pickup Rate seems low (10-20%). Is this normal?
**A**:
- 40-50% is ideal
- 10-20% means you're getting many voicemails/no-answers
- Try calling at different times
- Verify phone numbers are correct

### Q: How often does data update?
**A**:
- **Automatic sync**: Every 2 hours (incremental)
- **Full sync**: Daily at 00:00 UTC
- **Manual sync**: Available at /sync page

### Q: Can I export metrics to Excel?
**A**: Currently dashboard is view-only. For exports:
1. Take screenshots
2. Contact developer for CSV export feature
3. Use HubSpot's native reporting

### Q: Why do some metrics have a help icon (?) and others don't?
**A**: Hover over the (?) icon to see detailed explanation of how that metric is calculated and what good benchmarks are.

---

## Need Help?

**Technical issues**: Contact developer
**HubSpot setup**: See `HUBSPOT_SETUP.md`
**Metric clarification**: Hover over (?) icons in dashboard

**Last updated**: 2025-10-21
