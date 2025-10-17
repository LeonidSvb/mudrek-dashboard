# Supabase Reporting Setup Guide for Make.com

This guide shows how to set up automated reports from your Supabase database to Slack/Telegram/Email using Make.com.

---

## Quick Start

**What you need:**
- Supabase project credentials (URL + API Key)
- Make.com account (free tier available)
- Slack workspace or Telegram bot or Email

**Time to setup:** 5-10 minutes per report

---

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings → API**
4. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon/public key**: Your API key (starts with `eyJ...`)

⚠️ **Security Note**: The anon key is safe to use in Make.com - it has read-only access with Row Level Security enabled.

---

## Step 2: Available API Endpoints

Your Supabase database has pre-built functions that return metrics data. Here are the main endpoints you can use:

### 📊 Dashboard Overview Metrics

**Endpoint:** `/rest/v1/rpc/get_all_metrics`

Returns 21+ metrics including:
- Total sales, deals, conversion rates
- Call metrics (duration, volume, quality)
- Payment metrics, funnel stats, A/B testing results

**Example Request:**
```
Method: POST
URL: https://your-project.supabase.co/rest/v1/rpc/get_all_metrics

Headers:
  apikey: your-anon-key
  Authorization: Bearer your-anon-key
  Content-Type: application/json

Body (JSON):
{
  "p_owner_id": null,
  "p_date_from": "2025-01-01",
  "p_date_to": "2025-01-31"
}
```

**Response Example:**
```json
{
  "totalSales": 125000,
  "totalDeals": 42,
  "avgDealSize": 2976,
  "conversionRate": 12.5,
  "totalCalls": 856,
  "avgCallTime": 8.3,
  "qualifiedRate": 45.2,
  "trialRate": 28.6
}
```

---

### 🎯 Sales Funnel Metrics

**Endpoint:** `/rest/v1/rpc/get_sales_funnel_metrics`

Returns funnel breakdown:
- Contacts by stage (new leads, no answer, disqualified)
- Deals by stage (qualified, high interest, closed won/lost)
- Conversion rates between stages

**Request:** Same format as above

**Response Example:**
```json
{
  "contacts": {
    "total": 1250,
    "new_leads": 450,
    "no_answer": 320,
    "disqualified": 180
  },
  "deals": {
    "total": 150,
    "qualified_to_buy": 85,
    "high_interest": 35,
    "closed_won": 30
  },
  "conversion_rates": {
    "contact_to_deal": 12.0,
    "deal_to_won": 20.0
  }
}
```

---

### 💼 Deals Breakdown by Stage

**Endpoint:** `/rest/v1/rpc/get_deals_breakdown`

Returns detailed breakdown of deals by each stage with amounts.

**Response Example:**
```json
[
  {
    "stage_name": "Qualified to buy",
    "deal_count": 85,
    "total_amount": 255000,
    "avg_amount": 3000
  },
  {
    "stage_name": "Closed won",
    "deal_count": 30,
    "total_amount": 125000,
    "avg_amount": 4167
  }
]
```

---

### 📈 Timeline Charts Data

**Endpoint:** `/rest/v1/rpc/get_timeline_data`

Returns daily/weekly/monthly time-series data for charts.

---

## Step 3: Setting Up Make.com Scenario

### Example: Daily Sales Report to Slack

**Scenario Flow:**
```
Schedule (Daily 9am) → HTTP Request (Supabase) → Text Formatter → Slack
```

**Detailed Steps:**

#### 1. Create New Scenario
- Go to https://make.com
- Click **"Create a new scenario"**

#### 2. Add Schedule Trigger
- Add module: **Tools → Schedule**
- Select: **"Every day"**
- Set time: **09:00** (or your preferred time)
- Timezone: Your timezone

#### 3. Add HTTP Request Module
- Add module: **HTTP → Make a request**
- Configure:

```
URL: https://your-project.supabase.co/rest/v1/rpc/get_all_metrics

Method: POST

Headers:
  apikey: your-anon-key
  Authorization: Bearer your-anon-key
  Content-Type: application/json

Body (raw JSON):
{
  "p_owner_id": null,
  "p_date_from": "{{formatDate(addDays(now; -30); "YYYY-MM-DD")}}",
  "p_date_to": "{{formatDate(now; "YYYY-MM-DD")}}"
}
```

**💡 Tip:** The date formulas automatically calculate "last 30 days"

#### 4. Format the Message
- Add module: **Tools → Set variable**
- Variable name: `report_message`
- Value (copy this template):

```
📊 DAILY SALES REPORT

💰 Sales (Last 30 Days):
• Total Revenue: ${{formatNumber(totalSales; 0; "."; ",")}}
• Deals Closed: {{totalDeals}}
• Average Deal Size: ${{formatNumber(avgDealSize; 0; "."; ",")}}

📈 Conversion Metrics:
• Lead → Customer: {{formatNumber(conversionRate; 1)}}%
• Qualification Rate: {{formatNumber(qualifiedRate; 1)}}%
• Trial Signup Rate: {{formatNumber(trialRate; 1)}}%

📞 Call Activity:
• Total Calls: {{totalCalls}}
• Avg Call Duration: {{formatNumber(avgCallTime; 1)}} min
• 5+ Min Calls: {{formatNumber(fiveMinReachedRate; 1)}}%

💵 Revenue Breakdown:
• Upfront Cash: ${{formatNumber(upfrontCashCollected; 0; "."; ",")}}
• Avg Installments: {{formatNumber(avgInstallments; 1)}} months

────────────────────────────
Report generated: {{formatDate(now; "MMM DD, YYYY")}}
```

#### 5. Send to Slack
- Add module: **Slack → Create a Message**
- Connect your Slack workspace
- **Channel**: Select channel (e.g., `#sales-reports`)
- **Text**: `{{report_message}}`
- **Optional**: Enable **"Mark as bot message"**

#### 6. Save & Activate
- Click **"Save"** (bottom right)
- Toggle **ON** to activate
- Click **"Run once"** to test

---

## Step 4: Ready-to-Use Report Templates

### 📅 Template 1: Daily Morning Briefing
**Schedule:** Every day at 9:00 AM
**Data:** Last 7 days metrics
**Destination:** Slack #sales-team

**What it shows:**
- Week-over-week sales performance
- Key conversion metrics
- Call volume and quality

---

### 📊 Template 2: Weekly Funnel Report
**Schedule:** Every Monday at 10:00 AM
**Data:** Previous week funnel breakdown
**Destination:** Email to CEO + Slack

**What it shows:**
- How many leads at each stage
- Where leads are dropping off
- Conversion rates between stages

**Endpoint to use:** `get_sales_funnel_metrics`

**Message Template:**
```
🎯 WEEKLY SALES FUNNEL REPORT

📥 Top of Funnel:
• Total Contacts: {{contacts.total}}
• New Leads: {{contacts.new_leads}}
• No Answer: {{contacts.no_answer}}
• Disqualified: {{contacts.disqualified}}

💼 Deal Pipeline:
• Total Deals: {{deals.total}}
• Qualified to Buy: {{deals.qualified_to_buy}}
• High Interest: {{deals.high_interest}}
• Closed Won: {{deals.closed_won}}
• Closed Lost: {{deals.closed_lost}}

📈 Conversion Rates:
• Contact → Deal: {{conversion_rates.contact_to_deal}}%
• Deal → Won: {{conversion_rates.deal_to_won}}%

────────────────────────────
Week of {{formatDate(addDays(now; -7); "MMM DD")}} - {{formatDate(now; "MMM DD, YYYY")}}
```

---

### 📅 Template 3: Monthly Performance Summary
**Schedule:** 1st of every month at 9:00 AM
**Data:** Previous month full metrics
**Destination:** Email with charts

**What it shows:**
- Complete overview of all 21 metrics
- Month-over-month comparison
- Revenue breakdown by stage

**Body Configuration:**
```json
{
  "p_owner_id": null,
  "p_date_from": "{{formatDate(setDay(addMonths(now; -1); 1); "YYYY-MM-DD")}}",
  "p_date_to": "{{formatDate(lastDayOfMonth(addMonths(now; -1)); "YYYY-MM-DD")}}"
}
```

---

### 🚨 Template 4: Performance Alerts (Telegram)
**Schedule:** Every hour
**Trigger:** Only if conversion rate drops
**Destination:** Telegram

**Setup:**
1. Add **HTTP Request** (same as above)
2. Add **Router** module
3. Add **Filter** after router:
   - Condition: `conversionRate` **less than** `10`
4. Add **Telegram Bot → Send Message**
   - Chat ID: Your Telegram chat ID
   - Message:
   ```
   🚨 ALERT: Conversion Rate Drop!

   Current rate: {{conversionRate}}%
   This is below the 10% threshold.

   Check dashboard immediately.
   ```

---

## Step 5: Filtering by Sales Manager

To get metrics for a specific sales manager:

**Change the HTTP Request body:**
```json
{
  "p_owner_id": "682432124",
  "p_date_from": "2025-01-01",
  "p_date_to": "2025-01-31"
}
```

**To create reports for ALL managers in one scenario:**

1. Add **HTTP Request** to fetch owners list:
   ```
   URL: https://your-project.supabase.co/rest/v1/rpc/get_owner_list
   Method: POST
   Body: {}
   ```

2. Add **Iterator** module (to loop through owners)

3. Add **HTTP Request** for each owner:
   ```json
   {
     "p_owner_id": "{{id}}",
     "p_date_from": "{{formatDate(addDays(now; -7); "YYYY-MM-DD")}}",
     "p_date_to": "{{formatDate(now; "YYYY-MM-DD")}}"
   }
   ```

4. Send individual reports to each manager's Slack DM

---

## Step 6: Advanced Features

### Export to Google Sheets

**Use case:** Weekly backup of metrics to spreadsheet

**Modules:**
1. Schedule → Every Monday 9am
2. HTTP Request → `get_all_metrics`
3. **Google Sheets → Add a Row**
   - Spreadsheet: Select your sheet
   - Row values: Map each metric to column

**Result:** Automatic historical data tracking

---

### Send Email with PDF Attachment

**Use case:** Monthly report to executives

**Modules:**
1. Schedule → Monthly
2. HTTP Request → `get_all_metrics`
3. **Formatter → Create HTML Table** (format data as table)
4. **PDF Generator** (Make.com addon)
5. **Email → Send with attachment**

---

### Multi-Channel Broadcasting

**Use case:** Send same report to Slack + Email + Telegram

**Setup:**
1. HTTP Request → Get data
2. Format message
3. **Router** (splits into 3 paths)
   - Path 1: Slack
   - Path 2: Email
   - Path 3: Telegram

All receive the same data simultaneously.

---

## Troubleshooting

### Error: "Invalid API key"
- ✅ Check that you copied the **anon/public** key (not service_role)
- ✅ Verify the key starts with `eyJ`
- ✅ Make sure both `apikey` header AND `Authorization` header are set

### Error: "Function not found"
- ✅ Verify the endpoint URL is exactly: `/rest/v1/rpc/get_all_metrics`
- ✅ Check that your Supabase project has the SQL functions installed
- ✅ Test the endpoint directly with curl first

### Empty Response
- ✅ Check date format is `YYYY-MM-DD`
- ✅ Verify there's data in the database for those dates
- ✅ Try with `p_owner_id: null` first

### Rate Limiting
- ✅ Supabase Free tier: 50,000 requests/month
- ✅ Make.com Free tier: 1,000 operations/month
- ✅ For hourly reports, you'll use ~720 ops/month (within free tier)

---

## Make.com Pricing

**Free Tier:**
- ✅ 1,000 operations/month
- ✅ Unlimited scenarios
- ✅ 15-minute execution interval minimum

**Enough for:**
- 3 daily reports (90 ops/month)
- 4 weekly reports (16 ops/month)
- 1 monthly report (1 op/month)
- Several alert scenarios

**Paid Tiers:**
- $9/month = 10,000 operations
- $29/month = 100,000 operations

---

## Best Practices

### 1. Use Descriptive Scenario Names
```
✅ Good: "Daily Sales Report - Slack #sales"
❌ Bad: "Scenario 1"
```

### 2. Add Error Handling
- Add **Error Handler** route after HTTP Request
- Send notification if API call fails
- Example: "Failed to fetch metrics - check Supabase connection"

### 3. Test Before Activating
- Always click **"Run once"** to test
- Check Slack/Email to verify message looks correct
- Verify data values are reasonable

### 4. Document Your Scenarios
- Add **Notes** modules to explain logic
- Screenshot final setup for documentation

### 5. Monitor Usage
- Check Make.com operations counter monthly
- Set up alert at 80% of free tier limit

---

## Security Best Practices

✅ **DO:**
- Use the `anon` key (not `service_role` key)
- Store keys in Make.com Credentials (not hardcoded)
- Use environment-specific scenarios (test vs production)

❌ **DON'T:**
- Share your Supabase keys publicly
- Use `service_role` key in Make.com (it has full access)
- Expose keys in screenshots

---

## Support

**If something doesn't work:**

1. **Check Supabase logs:**
   - Supabase Dashboard → Logs → Edge Functions
   - Look for API request errors

2. **Check Make.com execution history:**
   - Click on scenario → "History" tab
   - See exactly where it failed

3. **Test API directly:**
   ```bash
   curl -X POST 'https://your-project.supabase.co/rest/v1/rpc/get_all_metrics' \
     -H "apikey: your-key" \
     -H "Authorization: Bearer your-key" \
     -H "Content-Type: application/json" \
     -d '{"p_owner_id":null,"p_date_from":"2025-01-01","p_date_to":"2025-01-31"}'
   ```

---

## Resources

- **Make.com Documentation:** https://www.make.com/en/help/tutorials
- **Make.com Templates:** https://www.make.com/en/templates
- **Supabase REST API:** https://supabase.com/docs/guides/api
- **Make.com Community:** https://community.make.com/

---

## Quick Reference: Common Date Formulas

```javascript
// Today
{{formatDate(now; "YYYY-MM-DD")}}

// Yesterday
{{formatDate(addDays(now; -1); "YYYY-MM-DD")}}

// Last 7 days
{{formatDate(addDays(now; -7); "YYYY-MM-DD")}}

// Last 30 days
{{formatDate(addDays(now; -30); "YYYY-MM-DD")}}

// Start of this month
{{formatDate(setDay(now; 1); "YYYY-MM-DD")}}

// Start of last month
{{formatDate(setDay(addMonths(now; -1); 1); "YYYY-MM-DD")}}

// End of last month
{{formatDate(lastDayOfMonth(addMonths(now; -1)); "YYYY-MM-DD")}}
```

---

**That's it! You're ready to automate your Supabase reports with Make.com** 🚀
