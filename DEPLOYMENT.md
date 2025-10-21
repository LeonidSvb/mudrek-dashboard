# 🚀 Deployment Guide

## Architecture Overview

**NEW Architecture (No Vercel timeout issues!):**

```
GitHub Actions (FREE, 2000 min/month)
  ├─ Every 4 hours: Incremental Sync (35 fields + JSONB merge)
  └─ Daily at 02:00: Full Sync (auto-detect new custom fields)
       ↓
  HubSpot ←→ Supabase

Vercel (FREE Hobby plan)
  └─ Next.js Dashboard (UI only, no sync)
```

**Key benefits:**
- ✅ No 10-second Vercel timeout (GitHub Actions = 6 hours max)
- ✅ JSONB merge preserves old fields when syncing
- ✅ Auto-detects new custom fields from Jason
- ✅ 35 fields instead of 421 (91% space savings)
- ✅ 100% FREE (no Vercel Pro needed)

---

## Quick Setup (10 minutes)

### 1. Fork Repository

1. Go to this repository on GitHub
2. Click "Fork" button (top right)
3. Wait for fork to complete

### 2. Configure GitHub Secrets

In your forked repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret"
3. Add these 3 secrets:

| Secret Name | Value | Where to get |
|-------------|-------|--------------|
| `HUBSPOT_API_KEY` | Your HubSpot private app token | HubSpot → Settings → Integrations → Private Apps |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJxxx...` (service_role key) | Supabase Dashboard → Settings → API → service_role key |

**Important:** Use the **service_role** key, NOT the anon key!

### 3. Verify Sync Works

**Option A: Manual Test (recommended first time)**

1. Go to **Actions** tab in your GitHub repository
2. Click "Hourly Incremental Sync" workflow
3. Click "Run workflow" → "Run workflow"
4. Wait 2-5 minutes
5. Check run logs - should see "SYNC COMPLETED SUCCESSFULLY"

**Option B: Wait for automatic run**

- Incremental sync runs every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
- Full sync runs daily at 02:00 UTC

### 4. Deploy Dashboard to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your forked GitHub repository
4. Add environment variables in Vercel:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as GitHub secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key (NOT service_role!) |

5. Deploy!

**Your dashboard will be live at:** `https://your-project.vercel.app`

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

**Check GitHub Actions:**
1. Go to **Actions** tab in your repository
2. Look for recent workflow runs
3. Click on failed run to see error logs

**Common issues:**
- ❌ Missing GitHub Secrets → Add them in Settings → Secrets
- ❌ Wrong Supabase key → Use service_role key, not anon key
- ❌ HubSpot API key expired → Generate new one

### Sync failing?

1. Check GitHub Actions logs for specific error
2. Verify HubSpot API key is valid
3. Verify Supabase credentials
4. Check Supabase `sync_logs` table:
   ```sql
   SELECT * FROM sync_logs ORDER BY sync_started_at DESC LIMIT 10;
   ```

### Manual sync for testing

Run locally:
```bash
# Install dependencies
npm install

# Set environment variables
export HUBSPOT_API_KEY="your_key"
export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_key"

# Test incremental sync
node scripts/sync-incremental.js

# Test full sync
node scripts/sync-full.js
```

---

## Cost Breakdown

**100% FREE Setup:**
- GitHub Actions: Incremental (4hr) + Daily Full sync (FREE, 2000 minutes/month)
- Vercel Hobby: Next.js dashboard hosting (FREE)
- Supabase Free tier: 500MB database (FREE)
- **Total: $0/month**

**If you exceed free limits:**
- GitHub Actions Pro: $0.008/minute after 2000 minutes
- Supabase Pro: $25/month for 8GB database
- Vercel Pro: $20/month (NOT needed for this setup)

**Current setup uses:**
- Incremental (6×/day): ~360 min/month
- Daily full sync: ~600 min/month
- **Total: ~960 min/month** (well under 2000 limit!)
- Supabase: ~10MB (well under 500MB limit)

---

## Support

For issues or questions, check:
- GitHub Actions logs: Actions tab in your repository
- Supabase logs: `sync_logs` table
- Test locally: `node scripts/sync-incremental.js`

---

## What Changed from Old Architecture?

**OLD (Vercel-based sync):**
- ❌ 10-second timeout → sync failed for large datasets
- ❌ Needed Vercel Pro ($20/mo) for hourly cron
- ❌ Lost old fields when sync ran (no JSONB merge)
- ❌ Synced 421 fields → wasted space

**NEW (GitHub Actions):**
- ✅ 6-hour timeout → no failures
- ✅ 100% FREE (GitHub Actions free tier)
- ✅ JSONB merge → preserves old fields
- ✅ 35 critical fields → 91% space savings
- ✅ Auto-detects new custom fields weekly
