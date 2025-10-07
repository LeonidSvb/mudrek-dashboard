# 📖 Объяснение Sync Script - Что за что отвечает

Главный файл: `frontend/app/api/sync/route.ts`

---

## 🏗️ СТРУКТУРА ФАЙЛА

```
route.ts (400+ строк)
│
├── 1. Imports - подключение библиотек
├── 2. Supabase client - подключение к БД
├── 3. Transform Functions - преобразование данных
│   ├── transformContact() - HubSpot → Supabase format
│   ├── transformDeal()
│   └── transformCall()
├── 4. Sync Functions - основная логика
│   ├── syncContacts() - синхронизация контактов
│   ├── syncDeals() - синхронизация сделок
│   └── syncCalls() - синхронизация звонков
└── 5. POST Handler - главный endpoint
    └── Запускает все 3 sync параллельно
```

---

## 📦 1. IMPORTS - Что подключаем

```typescript
import { NextRequest, NextResponse } from 'next/server';
// ↑ Next.js - для создания API endpoint

import { createClient } from '@supabase/supabase-js';
// ↑ Supabase - для записи данных в PostgreSQL

import {
  fetchAllContacts,    // Функция: получить ВСЕ контакты из HubSpot
  fetchAllDeals,       // Функция: получить ВСЕ сделки
  fetchAllCalls,       // Функция: получить ВСЕ звонки
  CONTACT_PROPERTIES,  // Список полей для контактов (email, phone, etc)
  DEAL_PROPERTIES,     // Список полей для сделок (amount, stage, etc)
  CALL_PROPERTIES,     // Список полей для звонков (duration, etc)
} from '@/lib/hubspot/api';
// ↑ Наш HubSpot client

import { SyncLogger } from '@/lib/logger';
// ↑ Logger - логирует каждую синхронизацию в sync_logs таблицу

import type { ... } from '@/types/hubspot';
// ↑ TypeScript типы для type safety
```

**Зачем:**
- Next.js - создать `/api/sync` endpoint
- Supabase - записать данные в БД
- HubSpot API - получить данные из CRM
- Logger - отслеживать что происходит
- Types - чтобы TypeScript помогал избежать ошибок

---

## 🔌 2. SUPABASE CLIENT - Подключение к БД

```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // https://xxx.supabase.co
  process.env.SUPABASE_SERVICE_KEY!           // Секретный ключ (admin права)
);
```

**Что происходит:**
1. Берем URL и Service Key из `.env.local`
2. Создаем клиент с **admin правами** (может всё)
3. Этот клиент будет INSERT данные в таблицы

**Почему Service Key, а не Anon Key:**
- Service Key = admin (может INSERT в любую таблицу)
- Anon Key = обычный пользователь (ограничен RLS policies)
- Для sync нужны admin права

---

## 🔄 3. TRANSFORM FUNCTIONS - Преобразование данных

### transformContact() - Контакты

```typescript
function transformContact(contact: HubSpotContact): ContactRaw {
  const props = contact.properties;  // Берем свойства из HubSpot

  return {
    // === ИЗВЛЕКАЕМ ЧАСТО ИСПОЛЬЗУЕМЫЕ ПОЛЯ В КОЛОНКИ ===
    hubspot_id: contact.id,                    // ID из HubSpot
    email: props.email || null,                // Email или null
    phone: props.phone || null,                // Телефон
    firstname: props.firstname || null,        // Имя
    lastname: props.lastname || null,          // Фамилия
    createdate: props.createdate || null,      // Дата создания
    lifecyclestage: props.lifecyclestage || null,  // Стадия воронки

    // VSL метрики
    vsl_watched: props.vsl_watched === 'true' ? true : false,
    vsl_watch_duration: props.vsl_watch_duration
      ? parseInt(props.vsl_watch_duration)
      : null,

    // === ВСЕ ДАННЫЕ В JSONB ===
    raw_json: contact,  // Весь объект HubSpot (включая associations!)
  };
}
```

**Что происходит:**
1. **Берем HubSpot contact** (большой JSON объект)
2. **Извлекаем 8-10 важных полей** → отдельные колонки (быстрые запросы)
3. **Сохраняем ВСЕ данные** → raw_json (гибкость, associations, owner)

**Зачем 2 формата (колонки + JSONB):**
- **Колонки** = быстро искать по email, phone (индексы работают)
- **raw_json** = всё остальное доступно (owner, associations, custom fields)

### transformDeal() - Сделки

```typescript
function transformDeal(deal: HubSpotDeal): DealRaw {
  const props = deal.properties;

  return {
    hubspot_id: deal.id,
    amount: props.amount ? parseFloat(props.amount) : null,  // Сумма сделки
    dealstage: props.dealstage || null,                      // Стадия
    createdate: props.createdate || null,
    closedate: props.closedate || null,

    // Метрики
    qualified_status: props.qualified_status || null,
    trial_status: props.trial_status || null,
    payment_status: props.payment_status || null,
    // ... еще 6 полей

    raw_json: deal,  // Весь объект (включая associations с contacts)
  };
}
```

**Особенность:**
- `parseFloat(props.amount)` - HubSpot возвращает amount как строку "5000.00"
- Конвертируем в число для PostgreSQL NUMERIC типа

### transformCall() - Звонки

```typescript
function transformCall(call: HubSpotCall): CallRaw {
  const props = call.properties;

  return {
    hubspot_id: call.id,
    call_duration: props.hs_call_duration
      ? parseInt(props.hs_call_duration)
      : null,                                 // Длительность в миллисекундах
    call_to_number: props.hs_call_to_number || null,  // Кому звонили
    call_timestamp: props.hs_timestamp || null,       // Когда звонили
    // ...

    raw_json: call,  // Весь объект
  };
}
```

**Зачем call_to_number:**
- Для JOIN с contacts через phone
- Calls НЕ имеют associations в HubSpot API
- Связываем через: `calls.call_to_number = contacts.phone`

---

## 🚀 4. SYNC FUNCTIONS - Основная логика

### syncContacts() - Полный flow контактов

```typescript
async function syncContacts(): Promise<SyncResult> {
  // === ШАГ 1: СОЗДАТЬ LOGGER ===
  const logger = new SyncLogger();
  await logger.start('contacts', 'manual');
  // ↑ Записывает в sync_logs: "Started syncing contacts"

  try {
    // === ШАГ 2: ПОЛУЧИТЬ ДАННЫЕ ИЗ HUBSPOT ===
    console.log('📇 SYNCING CONTACTS');

    const contacts = await fetchAllContacts(
      CONTACT_PROPERTIES,      // Какие поля получить
      CONTACT_ASSOCIATIONS     // Включить associations (deals, calls)
    );
    // ↑ Получили ВСЕ 29,000 контактов из HubSpot

    // === ШАГ 3: ТРАНСФОРМАЦИЯ ===
    const transformed = contacts.map(transformContact);
    // ↑ Преобразовали каждый контакт:
    //   HubSpot format → Supabase format

    // === ШАГ 4: BATCH UPSERT В SUPABASE ===
    const BATCH_SIZE = 500;  // По 500 за раз
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
      const batch = transformed.slice(i, i + BATCH_SIZE);
      // ↑ Взяли следующие 500 записей

      const { data, error } = await supabase
        .from('hubspot_contacts_raw')
        .upsert(batch, { onConflict: 'hubspot_id' })
        // ↑ UPSERT = INSERT если новый, UPDATE если существует
        .select();

      if (error) {
        console.error(`❌ Batch failed:`, error.message);
        failed += batch.length;
      } else {
        updated += data.length;
        console.log(`✅ Batch ${i}-${i + BATCH_SIZE}: ${data.length} records`);
      }
    }

    // === ШАГ 5: ЛОГИРОВАТЬ РЕЗУЛЬТАТ ===
    const result = {
      object_type: 'contacts',
      records_fetched: contacts.length,    // Сколько получили из HubSpot
      records_updated: updated,            // Сколько записали в Supabase
      records_failed: failed,              // Сколько failed
      status: failed === 0 ? 'success' : 'partial',
    };

    await logger.complete(result);
    // ↑ Записывает в sync_logs: duration, stats, status

    return result;

  } catch (error) {
    await logger.error(error.message);
    throw error;
  }
}
```

**Что происходит пошагово:**

1. **Logger.start()** → INSERT в sync_logs таблицу
2. **fetchAllContacts()** → GET запросы к HubSpot API (пагинация)
3. **transform()** → Преобразовать формат данных
4. **Batch UPSERT** → Записать в Supabase (по 500 за раз)
5. **Logger.complete()** → UPDATE sync_logs с результатами

**Почему BATCH (по 500):**
- Если отправить все 29k за раз → timeout или out of memory
- По 500 = быстро + надежно
- Если один batch failed → остальные продолжают работать

**UPSERT - что это:**
```sql
-- UPSERT = INSERT + UPDATE:
INSERT INTO hubspot_contacts_raw (hubspot_id, email, ...)
VALUES ('123', 'test@mail.com', ...)
ON CONFLICT (hubspot_id)
DO UPDATE SET email = 'test@mail.com', updated_at = NOW();
```
- Если `hubspot_id = '123'` НЕ существует → INSERT
- Если существует → UPDATE
- **Нет дубликатов**, всегда актуальные данные

---

### syncDeals() и syncCalls() - Аналогично

Точно такая же логика, только:
- Разные endpoints HubSpot (`/deals`, `/calls`)
- Разные transform функции
- Разные таблицы Supabase

---

## 🎯 5. POST HANDLER - Главный endpoint

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now();  // Запомнить время старта

  try {
    console.log('HUBSPOT → SUPABASE SYNC STARTED');

    // === ПАРАЛЛЕЛЬНАЯ СИНХРОНИЗАЦИЯ ===
    const [contactsResult, dealsResult, callsResult] =
      await Promise.allSettled([
        syncContacts(),  // Контакты (45s)
        syncDeals(),     // Сделки (12s)
        syncCalls()      // Звонки (65s)
      ]);
    // ↑ Все 3 функции работают ОДНОВРЕМЕННО!
    //   Total time = MAX(45s, 12s, 65s) = 65s
    //   (не 45+12+65 = 122s как sequential)

    // === СОБРАТЬ РЕЗУЛЬТАТЫ ===
    const results = {
      contacts: contactsResult.status === 'fulfilled'
        ? contactsResult.value
        : null,
      deals: dealsResult.status === 'fulfilled'
        ? dealsResult.value
        : null,
      calls: callsResult.status === 'fulfilled'
        ? callsResult.value
        : null,
    };

    const totalDuration = Math.round((Date.now() - startTime) / 1000);

    // === ВЫВЕСТИ SUMMARY ===
    console.log('SYNC COMPLETED');
    console.log(`Total duration: ${totalDuration}s`);
    console.log(`Contacts: ${results.contacts.records_fetched} fetched`);
    console.log(`Deals: ${results.deals.records_fetched} fetched`);
    console.log(`Calls: ${results.calls.records_fetched} fetched`);

    // === ВЕРНУТЬ JSON RESPONSE ===
    return NextResponse.json({
      success: true,
      results,
      total_duration_seconds: totalDuration,
    });

  } catch (error) {
    console.error('SYNC FAILED:', error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**Что происходит:**

1. **Promise.allSettled()** - запустить все 3 sync ПАРАЛЛЕЛЬНО
   - НЕ `Promise.all()` (упадет если хоть один failed)
   - `allSettled()` = дождаться всех, даже если некоторые failed

2. **Собрать результаты** из каждой функции

3. **Вернуть JSON response** клиенту

**Результат:**
```json
{
  "success": true,
  "results": {
    "contacts": { "records_fetched": 29000, ... },
    "deals": { "records_fetched": 1000, ... },
    "calls": { "records_fetched": 8100, ... }
  },
  "total_duration_seconds": 120
}
```

---

## 🔥 КЛЮЧЕВЫЕ МОМЕНТЫ

### 1. Parallel > Sequential (в 3 раза быстрее)
```typescript
// ❌ МЕДЛЕННО (122 секунды):
await syncContacts();  // 45s
await syncDeals();     // 12s
await syncCalls();     // 65s

// ✅ БЫСТРО (65 секунд):
await Promise.allSettled([
  syncContacts(),  // Все 3 работают
  syncDeals(),     // одновременно!
  syncCalls()
]);
```

### 2. Hybrid Schema = Speed + Flexibility
```typescript
{
  // Колонки (быстро):
  email: "test@mail.com",     // Indexed, быстрый поиск
  phone: "+71234567890",      // Indexed, JOIN с calls

  // JSONB (гибко):
  raw_json: {
    properties: { ... },      // Все поля HubSpot
    associations: {           // Связи с другими объектами
      deals: [...],
      calls: [...]
    },
    hubspot_owner_id: "123"   // Owner (менеджер)
  }
}
```

### 3. UPSERT = No Duplicates
```sql
-- Первая синхронизация:
INSERT contact_123 → OK

-- Вторая синхронизация (тот же contact):
INSERT contact_123 → CONFLICT → UPDATE вместо duplicate
```

### 4. Logging = Прозрачность
Каждая синхронизация → запись в `sync_logs`:
```sql
SELECT * FROM sync_logs ORDER BY sync_started_at DESC LIMIT 1;
-- Видишь: сколько fetched, сколько synced, errors, duration
```

---

## 📊 ПРИМЕР ВЫПОЛНЕНИЯ

```
Запуск: POST /api/sync

┌─────────────────────────────────┐
│  Logger.start('contacts')       │ → INSERT sync_logs
│  fetchAllContacts()             │ → 290 API calls к HubSpot
│    Page 1/290: +100 contacts    │
│    Page 2/290: +100 contacts    │
│    ...                          │
│    Page 290/290: +100 contacts  │
│  ✅ Fetched 29000               │
│                                 │
│  transform() x29000             │ → Преобразовать формат
│                                 │
│  UPSERT batch 0-500             │ → INSERT/UPDATE Supabase
│  UPSERT batch 500-1000          │
│  ...                            │
│  UPSERT batch 28500-29000       │
│  ✅ Synced 29000                │
│                                 │
│  Logger.complete()              │ → UPDATE sync_logs
└─────────────────────────────────┘
```

Аналогично для deals и calls (параллельно!)

---

Понятна логика? Могу детализировать любой блок!