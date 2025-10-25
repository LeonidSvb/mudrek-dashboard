# ⚙️ Quick Setup Guide

## What You Need to Do Manually

GitHub Actions требует 3 секрета для работы. Настройте их один раз - всё остальное работает автоматически.

---

## Step 1: Add GitHub Secrets (5 minutes)

### Go to GitHub Secrets

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** (верхняя панель)
3. В левом меню: **Secrets and variables** → **Actions**
4. Нажмите **"New repository secret"**

### Add 3 Secrets

**Secret 1: HUBSPOT_API_KEY**
- Name: `HUBSPOT_API_KEY`
- Value: Ваш HubSpot Private App token
- Где взять:
  1. HubSpot → Settings (шестерёнка)
  2. Integrations → Private Apps
  3. Скопируйте Access Token

**Secret 2: NEXT_PUBLIC_SUPABASE_URL**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: `https://xxx.supabase.co`
- Где взять:
  1. Supabase Dashboard → Settings → API
  2. Скопируйте Project URL

**Secret 3: SUPABASE_SERVICE_KEY**
- Name: `SUPABASE_SERVICE_KEY`
- Value: `eyJxxx...`
- Где взять:
  1. Supabase Dashboard → Settings → API
  2. Скопируйте **service_role** key (НЕ anon key!)
  3. ⚠️ Это секретный ключ - никому не показывайте!

---

## Step 2: Test Sync (2 minutes)

1. Перейдите во вкладку **Actions** в вашем репозитории
2. Слева выберите **"Hourly Incremental Sync"**
3. Нажмите **"Run workflow"** → **"Run workflow"**
4. Подождите 2-5 минут
5. Проверьте логи - должно быть "✅ SYNC COMPLETED SUCCESSFULLY"

---

## Step 3: Verify in Supabase (1 minute)

Проверьте что sync работает:

```sql
SELECT
  object_type,
  sync_started_at,
  records_fetched,
  status
FROM sync_logs
ORDER BY sync_started_at DESC
LIMIT 5;
```

Должны увидеть свежие записи с `status = 'success'`.

---

## What Happens Automatically?

После настройки секретов:

**Каждые 4 часа** (6 раз в день):
- ⏰ Incremental sync (только измененные записи)
- 📊 35 полей + JSONB merge (старые поля сохраняются)
- ⚡ Быстро (2-5 минут)

**Каждый день в 02:00 UTC:**
- ⏰ Full sync (все записи)
- 🔍 Auto-detect новых custom полей от Jason
- 📦 Все custom поля (исключая мусор)
- 🐌 Медленнее (10-20 минут)

---

## Troubleshooting

### Sync fails with "Missing environment variables"
→ Проверьте что добавили все 3 секрета в GitHub

### Sync fails with "Authentication error"
→ Проверьте что используете **service_role** key, не anon key

### No new records syncing
→ Это нормально! Incremental sync синхронизирует только изменения с прошлого часа

### Want to force full sync?
1. Actions → "Weekly Full Sync"
2. Run workflow → Run workflow

---

## Need Help?

Смотрите подробную документацию: [DEPLOYMENT.md](./DEPLOYMENT.md)
