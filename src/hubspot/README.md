# HubSpot → Supabase Sync

Скрипты для синхронизации данных из HubSpot CRM в Supabase.

## 📁 Файлы

### 1. `sync-parallel.js` - FULL SYNC (Initial Migration)
**Назначение:** Первичная загрузка ВСЕХ данных из HubSpot
**Когда использовать:** Один раз при первом запуске
**Что делает:** Загружает все 31k+ контактов, 1k+ сделок, 8k+ звонков

```bash
node src/hubspot/sync-parallel.js
```

**Время выполнения:** ~3-5 минут
**Особенности:**
- Загружает ВСЕ данные (архивные и активные)
- Использует UPSERT (не создаёт дубликаты)
- Работает параллельно для всех 3 типов данных

---

### 2. `sync-incremental.js` - INCREMENTAL SYNC (Regular Updates) ⭐
**Назначение:** Регулярная синхронизация только изменённых данных
**Когда использовать:** Каждые 2-4 часа (запланировать в cron/scheduler)
**Что делает:** Загружает только новые/изменённые записи с последней синхронизации

```bash
node src/hubspot/sync-incremental.js
```

**Время выполнения:** ~10-30 секунд (вместо 3-5 минут!)
**Особенности:**
- ✅ Использует HubSpot Search API с фильтром `hs_lastmodifieddate`
- ✅ Запоминает время последней синхронизации в `sync_logs`
- ✅ Автоматически переключается на full sync если нет истории
- ✅ В 10-20 раз быстрее чем full sync

---

### 3. `api.js` - HubSpot API Client
Вспомогательные функции для работы с HubSpot API (используется другими скриптами).

---

## 🚀 Quick Start

### Первый запуск (Initial Migration)

```bash
# 1. Проверь .env файл
cat .env  # Должны быть HUBSPOT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# 2. Запусти полную синхронизацию
node src/hubspot/sync-parallel.js

# 3. Проверь результаты
node check-sync-status.js
```

**Результат:**
```
✅ Контакты: 31636 записей
✅ Сделки: 1193 записей
✅ Звонки: 8100+ записей
```

---

### Регулярная синхронизация (каждые 2 часа)

После initial migration переключайся на incremental sync:

```bash
node src/hubspot/sync-incremental.js
```

**Результат (пример):**
```
📇 INCREMENTAL SYNC: Contacts
   → Only records modified after: 2025-10-07 10:00:00
   → Fetched 15 modified records

💼 INCREMENTAL SYNC: Deals
   → Only records modified after: 2025-10-07 10:00:00
   → Fetched 3 modified records

📞 INCREMENTAL SYNC: Calls
   → Only records modified after: 2025-10-07 10:00:00
   → Fetched 25 modified records

✅ Incremental sync completed! (12s)
```

---

## ⏰ Автоматическая синхронизация (Cron/Scheduler)

### Option 1: Node-cron (в приложении)

Добавь в `package.json`:
```json
"scripts": {
  "sync:schedule": "node src/hubspot/scheduler.js"
}
```

Создай `src/hubspot/scheduler.js`:
```javascript
import cron from 'node-cron';
import { execSync } from 'child_process';

// Каждые 2 часа
cron.schedule('0 */2 * * *', () => {
  console.log('🕐 Running incremental sync...');
  execSync('node src/hubspot/sync-incremental.js', { stdio: 'inherit' });
});

console.log('✅ Scheduler started: incremental sync every 2 hours');
```

Запуск:
```bash
npm run sync:schedule
```

---

### Option 2: Vercel Cron Jobs

Создай `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/sync-incremental",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

Создай API route `frontend/app/api/sync-incremental/route.ts`:
```typescript
export async function GET() {
  // Call sync-incremental.js logic here
  // Return JSON response
}
```

---

### Option 3: GitHub Actions

Создай `.github/workflows/sync-hubspot.yml`:
```yaml
name: HubSpot Sync

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node src/hubspot/sync-incremental.js
        env:
          HUBSPOT_API_KEY: ${{ secrets.HUBSPOT_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

---

## 📊 Мониторинг синхронизации

### Проверка статуса

```bash
node check-sync-status.js
```

### SQL запросы в Supabase

```sql
-- Последние синхронизации
SELECT * FROM sync_logs ORDER BY sync_started_at DESC LIMIT 10;

-- Статистика по типам
SELECT
  object_type,
  COUNT(*) as total_syncs,
  AVG(duration_seconds) as avg_duration,
  SUM(records_updated) as total_updated,
  SUM(records_failed) as total_failed
FROM sync_logs
GROUP BY object_type;

-- Ошибки
SELECT * FROM sync_logs WHERE status != 'success';
```

---

## 🔍 Troubleshooting

### Sync fails с "No previous sync found"
**Решение:** Это нормально для первого incremental sync. Скрипт автоматически сделает full sync.

### Слишком много записей за 2 часа
**Решение:** Увеличь интервал до 4-6 часов или используй streaming подход.

### Rate limit от HubSpot API
**Решение:**
- Free plan: 100 req/10sec
- Starter: 150 req/10sec
- Pro+: нет лимита

Добавь retry logic с exponential backoff.

---

## 📈 Оптимизация

### Если нужна Real-time синхронизация (< 5 min lag)

Используй HubSpot Webhooks:
1. Настрой webhook в HubSpot Settings → Integrations → Webhooks
2. Создай endpoint `/api/webhook/hubspot` в Next.js
3. При получении webhook → сразу обнови запись в Supabase

### Если нужна Streaming синхронизация

Переключись на streaming подход:
```javascript
while (hasMore) {
  const page = await fetchPage(after);  // 100 records
  await saveToSupabase(page);           // Save immediately
  after = page.next;
}
```

---

## ✅ Checklist

- [x] Initial migration выполнена (`sync-parallel.js`)
- [ ] Incremental sync настроена (`sync-incremental.js`)
- [ ] Scheduler/Cron настроен (каждые 2-4 часа)
- [ ] Мониторинг настроен (alerts на failed syncs)
- [ ] Dashboard подключен к Supabase

---

## 🎯 Рекомендации

**Для production:**
1. ✅ Используй `sync-incremental.js` каждые 2-4 часа
2. ✅ Настрой monitoring через `sync_logs`
3. ✅ Добавь alerts на Telegram/Email при errors
4. ✅ Periodic full sync раз в неделю (для consistency check)

**Производительность:**
- Initial sync: ~3-5 минут
- Incremental sync (2 часа): ~10-30 секунд
- Incremental sync (4 часа): ~20-60 секунд

---

📚 Дополнительно: см. `CLAUDE.md` для coding guidelines
