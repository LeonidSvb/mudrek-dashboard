# 🚀 Deployment Guide for Client

## Quick Setup (5 minutes)

### 1. Deploy to Vercel

**Option A: Via GitHub (Recommended)**
1. Fork or clone this repository to your GitHub account
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js and configure everything

**Option B: Via Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

---

### 2. Add Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Variable | Value | Where to get |
|----------|-------|--------------|
| `HUBSPOT_API_KEY` | Your HubSpot API key | HubSpot Settings → Integrations → Private Apps |
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Settings → API |

After adding variables, redeploy:
```bash
Deployments → Latest → Redeploy
```

---

### 3. Automatic Sync (Vercel Cron Jobs)

**Sync Schedule** (configured in `vercel.json`):
- ⏰ **Every hour** (00:00, 01:00, ..., 23:00): Incremental sync
- ⏰ **Daily at 02:00 UTC**: Full sync

**Requirements:**
- ✅ Vercel Pro plan ($20/month) or higher
- ✅ Environment variables configured

**How to verify it works:**
1. Wait for next hour
2. Check Vercel Dashboard → Deployments → Functions
3. You should see `/api/sync` invocations every hour

---

### 4. Manual Sync (Optional)

**Via Dashboard:**
1. Go to your deployed URL: `https://your-project.vercel.app`
2. Navigate to `/sync` page
3. Click "Sync Now"

**Via API:**
```bash
# Incremental sync
curl -X POST https://your-project.vercel.app/api/sync

# Full sync
curl -X POST https://your-project.vercel.app/api/sync?mode=full
```

---

## Alternative: Free Cron Service (No Vercel Pro needed)

If you don't want to pay for Vercel Pro, use external cron service:

### Option 1: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org)
2. Register (free)
3. Create new cronjob:
   - **URL**: `https://your-project.vercel.app/api/sync`
   - **Schedule**: Every hour (`0 * * * *`)
   - **Name**: "HubSpot Incremental Sync"
4. Create another cronjob:
   - **URL**: `https://your-project.vercel.app/api/sync?mode=full`
   - **Schedule**: Daily at 02:00 (`0 2 * * *`)
   - **Name**: "HubSpot Full Sync"

### Option 2: UptimeRobot (Free + Monitoring)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add Monitor → HTTP(s)
3. URL: `https://your-project.vercel.app/api/sync`
4. Monitoring Interval: 60 minutes
5. Create another monitor for full sync (if needed)

**Note:** UptimeRobot checks every 5 minutes on free plan, so use keyword monitoring to trigger hourly.

---

## Monitoring Sync Status

### Check Sync Logs in Supabase

```sql
SELECT
  object_type,
  sync_started_at,
  records_fetched,
  records_inserted,
  records_updated,
  status
FROM sync_logs
ORDER BY sync_started_at DESC
LIMIT 20;
```

### Check Last Sync

Dashboard shows last sync time and status.

---

## Troubleshooting

### Sync not running?

**If using Vercel Cron:**
1. Check you have Vercel Pro plan
2. Verify environment variables are set
3. Check Vercel Dashboard → Functions for errors

**If using external cron:**
1. Verify URL is correct
2. Test manually: `curl -X POST https://your-url/api/sync`
3. Check cron service logs

### Sync failing?

1. Check Vercel Function Logs
2. Verify HubSpot API key is valid
3. Verify Supabase credentials
4. Check Supabase `sync_logs` table for errors

---

## Cost Breakdown

**Vercel:**
- Hobby (Free): ✅ Hosting + 100 GB bandwidth
- Pro ($20/mo): ✅ Everything + Cron Jobs

**Alternative (Free Total):**
- Vercel Hobby (Free) + cron-job.org (Free) = $0/month

**Recommended for Production:**
- Vercel Pro ($20/mo) - Most reliable, no external dependencies

---

## Support

For issues or questions, check:
- Vercel logs: Vercel Dashboard → Functions
- Supabase logs: `sync_logs` table
- API endpoint: `/api/sync` (test manually)
