# Project Architecture Audit - Полный анализ системы

**Дата проведения:** 2025-10-10
**Проект:** Shadi Sales Dashboard
**Версия:** v3.12.0 (Production Ready)

---

## A. ОБЩАЯ ИНФОРМАЦИЯ О ПРОЕКТЕ

### Базовые параметры
- **Название проекта:** Shadi Sales Dashboard
- **Основное назначение:** Внутренний дашборд для отображения 22 ключевых метрик продаж из HubSpot CRM с автоматической синхронизацией в Supabase
- **Ожидаемое количество пользователей:** 10 (одновременных сессий)
- **Допустимая задержка данных:** 1 час
- **Максимальный размер загрузки в браузер:** 0.5 MB

---

## B. HUBSPOT (источник данных)

### Аутентификация и объекты
- **Метод аутентификации:** Private App Token
- **Синхронизируемые объекты:** contacts, deals, calls

### Обязательные поля по объектам

**Contacts (13 полей):**
```
id, email, firstname, lastname, phone, company, createdate,
lastmodifieddate, lifecyclestage, hs_lead_status, hubspot_owner_id,
vsl_watched, sales_script_version
```

**Deals (21 поле):**
```
id, amount, dealstage, dealname, pipeline, createdate, closedate,
hs_lastmodifieddate, qualified_status, trial_status,
number_of_installments__months, payment_method, payment_type,
payment_status, hubspot_owner_id, cancellation_reason, is_refunded,
installment_plan, upfront_payment, offer_given, offer_accepted
```

**Calls (11 полей):**
```
id, hs_call_duration, hs_call_direction, hs_call_disposition,
hs_call_body, hs_timestamp, hs_call_recording_url,
hs_call_from_number, hs_call_to_number, hs_call_status,
hs_createdate, hs_lastmodifieddate
```

### Associations (связи)
- **Используются:** Да
- **Детали реализации:**
  - Звонки НЕ имеют прямых associations в HubSpot API
  - Связь реализована через phone matching (calls → contacts по номеру телефона)
  - Deals связаны с contacts через hubspot_owner_id
  - Associations НЕ сохраняются в отдельную таблицу
  - Используются SQL VIEWs для JOIN через phone normalization

### Обработка удаленных объектов
- **Стратегия:** Не обрабатываются
- **Детали:** При incremental sync удалённые записи просто исчезают из HubSpot API и остаются в Supabase. Soft-delete НЕ реализован.

### Пагинация
- **Используется:** Да
- **Размер страницы:** 100 записей
- **Метод:** Cursor-based (after token)

### Rate Limits
- **Статус:** Unknown (документация HubSpot упоминает лимиты, но точные цифры не зафиксированы в коде)

### Webhooks
- **Используются:** Нет
- **Альтернатива:** Polling через incremental sync (планируется hourly cron)

---

## C. SCHEMA В SUPABASE

### Таблицы и структура

**hubspot_contacts_raw:**
```sql
hubspot_id (PK), email, phone, firstname, lastname, createdate,
lifecyclestage, sales_script_version, vsl_watched, vsl_watch_duration,
hubspot_owner_id, raw_json, synced_at, updated_at
```

**hubspot_deals_raw:**
```sql
hubspot_id (PK), amount, dealstage, createdate, closedate,
qualified_status, trial_status, payment_status,
number_of_installments__months, cancellation_reason, is_refunded,
installment_plan, upfront_payment, offer_given, offer_accepted,
hubspot_owner_id, raw_json, synced_at, updated_at
```

**hubspot_calls_raw:**
```sql
hubspot_id (PK), call_duration, call_direction, call_to_number,
call_from_number, call_timestamp, call_disposition, raw_json,
synced_at, updated_at
```

**hubspot_owners:**
```sql
owner_id (PK), owner_name, owner_email, created_at, updated_at
```

**sync_logs:**
```sql
id (PK), sync_started_at, sync_completed_at, duration_seconds,
object_type, records_fetched, records_inserted, records_updated,
records_failed, status, error_message, triggered_by, metadata
```

### Стратегия Primary Keys
- **Подход:** `hubspot_id` как TEXT primary key (HubSpot object ID)
- **Обоснование:** Естественный ключ, гарантирует уникальность, упрощает UPSERT

### Raw JSON Storage
- **Используется:** Да, во всех таблицах
- **Колонка:** `raw_json` (JSONB NOT NULL)
- **Назначение:** Сохранение полного API response для гибкости и истории

### Association Tables
- **Используются:** Нет
- **Альтернатива:** SQL VIEWs с JOIN через phone normalization

### Индексы и Foreign Keys

**Индексы:**
- GIN индексы на всех `raw_json` колонках (для JSONB queries)
- B-tree индексы на: `hubspot_owner_id`, `email`, `phone`, `createdate`, `closedate`, `call_timestamp`, `call_disposition`, `dealstage`, `payment_status`, `lifecyclestage`

**Foreign Keys:**
- НЕ используются (гибкий подход, JOIN on-the-fly без жёстких связей)

### Текущие объёмы данных

| Таблица | Количество записей |
|---------|-------------------|
| contacts | 31,636 |
| deals | 1,193 |
| calls | 118,799 |
| owners | 8 |

### Прогноз роста (месяц)

| Тип данных | Рост (MB/месяц) | Комментарий |
|------------|-----------------|-------------|
| Contacts | 0.5 | ~100-200 новых контактов |
| Deals | 0.05 | Медленный рост |
| Calls | 2.0 | Активные продажи |
| **Итого** | **~2.5 MB** | B2C sales, стабильный поток |

---

## D. VIEWS, SQL-FUNCTIONS, МЕТРИКИ

### Список VIEWs

1. **calls_normalized** - Нормализация телефонных номеров в звонках (убирает +972, пробелы)
2. **contacts_normalized** - Нормализация phone в контактах
3. **call_contact_matches** - JOIN calls и contacts через normalized phone (118,674 matches)
4. **contact_call_stats** - Агрегированная статистика звонков по контактам (followup metrics)
   - ⚠️ **ПРОБЛЕМА:** Очень медленно, timeout на больших датасетах

### Materialized Views
- **Используются:** Нет
- **Все VIEWs:** Обычные (пересчитываются при каждом запросе)

### SQL Functions

**get_all_metrics(p_owner_id, p_date_from, p_date_to):**
- Возвращает JSON с 21 метрикой
- Фильтрация по менеджеру и диапазону дат
- Производительность: ~4 секунды (приемлемо)

### Метрики (22 total)

#### 1. Total Sales (Общая сумма продаж)
- **SQL:** `SUM(amount) WHERE dealstage = 'closedwon'`
- **Источник:** `hubspot_deals_raw.amount`, `dealstage`
- **Агрегация:** global
- **Окно времени:** all_time (или filtered by closedate)
- **Стоимость вычисления:** low

#### 2. Average Deal Size (Средний размер сделки)
- **SQL:** `AVG(amount) WHERE dealstage = 'closedwon' AND amount > 0`
- **Источник:** `hubspot_deals_raw.amount`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 3. Total Deals (Количество закрытых сделок)
- **SQL:** `COUNT(*) WHERE dealstage = 'closedwon'`
- **Источник:** `hubspot_deals_raw.dealstage`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 4. Conversion Rate (Коэффициент конверсии)
- **SQL:** `COUNT(deals closedwon) / COUNT(contacts) * 100`
- **Источник:** `hubspot_deals_raw`, `hubspot_contacts_raw`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 5. Qualified Rate (% квалифицированных сделок)
- **SQL:** `COUNT(qualified_status='yes') / COUNT(*) * 100`
- **Источник:** `hubspot_deals_raw.qualified_status`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 6. Trial Rate (% сделок с trial)
- **SQL:** `COUNT(trial_status='yes') / COUNT(*) * 100`
- **Источник:** `hubspot_deals_raw.trial_status`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 7. Cancellation Rate (% отмененных сделок)
- **SQL:** `COUNT(dealstage='closedlost') / COUNT(*) * 100`
- **Источник:** `hubspot_deals_raw.dealstage`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 8. Average Installments (Средняя рассрочка)
- **SQL:** `AVG(number_of_installments__months) WHERE > 0`
- **Источник:** `hubspot_deals_raw.number_of_installments__months`
- **Агрегация:** per_deal
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 9. Average Call Time (Средняя длительность звонка)
- **SQL:** `AVG(call_duration) / 60000 WHERE call_duration > 0`
- **Источник:** `hubspot_calls_raw.call_duration`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 10. Total Call Time (Общее время звонков)
- **SQL:** `SUM(call_duration) / 3600000`
- **Источник:** `hubspot_calls_raw.call_duration`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 11. Total Calls (Количество звонков)
- **SQL:** `COUNT(*) FROM hubspot_calls_raw`
- **Источник:** `hubspot_calls_raw`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 12. 5-Min Reached Rate (% звонков >5 минут)
- **SQL:** `COUNT(call_duration >= 300000) / COUNT(*) * 100`
- **Источник:** `hubspot_calls_raw.call_duration`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 13. Time to Sale (Время до закрытия сделки)
- **SQL:** `AVG(EXTRACT(EPOCH FROM closedate - createdate) / 86400)`
- **Источник:** `hubspot_deals_raw.closedate`, `createdate`
- **Агрегация:** per_deal
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 14. Upfront Cash Collected (Собранная предоплата)
- **SQL:** `SUM(upfront_payment) WHERE upfront_payment > 0`
- **Источник:** `hubspot_deals_raw.upfront_payment`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 15. Followup Rate (% контактов с повторными звонками)
- **SQL:** `COUNT(contacts with call_count > 1) / COUNT(contacts) * 100`
- **Источник:** `contact_call_stats.call_count` VIEW
- **Агрегация:** per_contact
- **Окно времени:** all_time
- **Стоимость вычисления:** ⚠️ **HIGH (VIEW timeout issue)**

#### 16. Average Followups (Среднее количество followup)
- **SQL:** `AVG(followup_count - 1) FROM contact_call_stats WHERE call_count > 1`
- **Источник:** `contact_call_stats.call_count`
- **Агрегация:** per_contact
- **Окно времени:** all_time
- **Стоимость вычисления:** high

#### 17. Time to First Contact (Время до первого звонка)
- **SQL:** `AVG(EXTRACT(EPOCH FROM first_call_timestamp - createdate) / 86400)`
- **Источник:** `contact_call_stats.first_call_timestamp`, `contacts.createdate`
- **Агрегация:** per_contact
- **Окно времени:** all_time
- **Стоимость вычисления:** high

#### 18. Offers Given Rate (% сделок с предложением)
- **SQL:** `COUNT(offer_given='yes') / COUNT(*) * 100`
- **Источник:** `hubspot_deals_raw.offer_given`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 19. Offer → Close Rate (% закрытых из предложений)
- **SQL:** `COUNT(offer_accepted='yes' AND dealstage='closedwon') / COUNT(offer_given='yes') * 100`
- **Источник:** `hubspot_deals_raw.offer_given`, `offer_accepted`, `dealstage`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** low

#### 20. Sales Script A/B Testing
- **SQL:** `GROUP BY sales_script_version, COUNT conversions, AVG conversion_rate`
- **Источник:** `hubspot_contacts_raw.sales_script_version`, `lifecyclestage`
- **Агрегация:** per_script_version
- **Окно времени:** all_time (НЕТ фильтров для статистической значимости)
- **Стоимость вычисления:** medium

#### 21. VSL Watch Impact
- **SQL:** `GROUP BY vsl_watched, COUNT conversions, AVG conversion_rate`
- **Источник:** `hubspot_contacts_raw.vsl_watched`, `lifecyclestage`
- **Агрегация:** per_vsl_status
- **Окно времени:** all_time
- **Стоимость вычисления:** medium

#### 22. Pickup Rate (% отвеченных звонков)
- **Статус:** ⚠️ **NOT IMPLEMENTED**
- **Причина:** Требуется mapping call_disposition UUID → human-readable labels
- **SQL:** Не реализовано
- **Источник:** `hubspot_calls_raw.call_disposition`
- **Агрегация:** global
- **Окно времени:** all_time
- **Стоимость вычисления:** medium (после mapping)

### Incremental Computation
- **Используется:** Нет
- **Текущая стратегия:** SQL функция `get_all_metrics()` пересчитывает ВСЕ метрики при каждом вызове
- **Примечание:** Incremental sync касается только данных (HubSpot → Supabase), но не агрегаций

---

## E. СИНХРОНИЗАЦИЯ (ETL / sync logic)

### Триггеры синхронизации
- **Текущий:** Manual (запуск скрипта вручную)
- **Планируется:** Vercel Cron (hourly)

### Местоположение синка
- **Файл:** `src/hubspot/sync-parallel.js`
- **Тип:** Node.js script (backend worker)
- **НЕ используется:** Next.js API route (пока)

### Хранение lastSync
- **Таблица:** `sync_logs`
- **Поле:** `sync_completed_at` (timestamp последнего успешного sync для каждого object_type)

### Incremental Sync Key
- **Поле HubSpot:** `hs_lastmodifieddate`
- **Метод:** HubSpot Search API с фильтром `GTE last sync timestamp`

### Обработка конфликтов
- **Стратегия:** Last-write-wins
- **Реализация:** UPSERT с `onConflict: 'hubspot_id'`, `ignoreDuplicates: false`

### Batch Size и параллелизм
- **Batch size:** 500 записей
- **Параллельные запросы:** 3 (Contacts, Deals, Calls синхронизируются параллельно через `Promise.allSettled`)

### Retry и Backoff
- **Exponential backoff:** НЕТ
- **Retry логика:** Есть в `api.js` (до 3 попыток)
- **⚠️ Проблема:** Нет задержки между попытками

### Dead Letter Queue
- **Используется:** Нет

### Схема sync_logs

```typescript
{
  id: bigint (PRIMARY KEY),
  sync_started_at: timestamp,
  sync_completed_at: timestamp,
  duration_seconds: integer,
  object_type: string, // contacts/deals/calls
  records_fetched: integer,
  records_inserted: integer,
  records_updated: integer,
  records_failed: integer,
  status: string, // success/partial/failed
  error_message: text,
  triggered_by: string, // manual/cron
  metadata: jsonb
}
```

### Обработка удалений
- **Реализовано:** Нет
- **Поведение:** Удалённые записи из HubSpot остаются в Supabase

---

## F. КОНТРОЛЬ ИДЕМПОТЕНТНОСТИ

### Уникальные ключи
- **Используются:** `hubspot_id` (единственный ключ для дедупликации)

### Idempotency Keys
- **Используются:** Нет

### Правила разрешения конфликтов
- **Метод:** UPSERT with `onConflict='hubspot_id'`
- **Поведение:** При дубликате - полная перезапись всех полей (last-write-wins)
- **Параметр:** `ignoreDuplicates: false` означает что запись обновляется каждый раз

---

## G. FRONTEND (React / Dashboard)

### Runtime
- **Фреймворк:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Язык:** TypeScript
- **Тип рендеринга:** SSR (Server-Side Rendering)

### Стратегия получения данных
- **Подход:** Server-driven (metrics API)
- **Реализация:**
  - Dashboard вызывает `/api/metrics`
  - API выполняет SQL функцию `get_all_metrics()` на сервере
  - Клиент получает готовый JSON с метриками

### Вычисления на клиенте
- **Используются:** НЕТ
- **Вся агрегация:** На сервере (PostgreSQL)
- **Объём данных в браузер:** ~0.5 MB (только результаты метрик, не raw data)

### Кеширование
- **Storage:** None
- **TTL:** None
- **Stale-while-revalidate:** No
- **Поведение:** Каждое изменение фильтров → новый fetch `/api/metrics`

### UX Requirements

**Обязательные фичи:**
1. ✅ Фильтры по менеджерам (owner_id)
2. ✅ Фильтры по диапазону дат (7d/30d/90d)
3. ✅ 22 метрики на одном dashboard
4. ✅ Client-side rendering с loading skeleton
5. ✅ Error handling с retry кнопкой
6. ✅ Responsive grid (Tailwind CSS)
7. ✅ shadcn/ui components (cards, select, buttons)

### Change History / Audit View
- **Требуется:** Нет

---

## H. BACKFILL, BACKUPS, MIGRATIONS

### Initial Backfill Strategy
- **Метод:** Bulk snapshot
- **Реализация:** `fetchAllFromHubSpot()` загружает ВСЕ объекты через pagination API
- **Параметры:** `limit=100`, cursor-based pagination
- **Объём первого запуска:** 31k+ contacts, 1k+ deals, 118k+ calls

### Пересчёт исторических метрик
- **Возможность:** Да
- **Метод:** SQL функция может фильтровать по любому диапазону дат

### Backups и Retention

| Параметр | Значение |
|----------|----------|
| Частота backup | Daily (Supabase automatic) |
| Retention | Unknown (зависит от Supabase plan) |
| PITR | Доступен на Supabase Pro plan |

### Процесс миграций
- **Файлы:** SQL в `migrations/` (001-005)
- **Запуск:** Вручную через Supabase SQL Editor
- **Автоматизация:** НЕТ (нет pg_migrate, Flyway и т.д.)
- **Обновление функций:** `CREATE OR REPLACE` - можно обновлять без потери данных

---

## I. ОПЕРАЦИИ, МОНИТОРИНГ И ALERTS

### Критерии успешной синхронизации
- **Max fail rate:** 0% (НЕТ документированного threshold)
- **Max duration:** 10 минут (для full sync ~118k calls)
- **⚠️ Проблема:** Критерии НЕ формализованы в коде. `Promise.allSettled` позволяет partial success.

### Инструменты мониторинга
1. `console.log` (stdout)
2. `sync_logs` table

### Alerting Rules
- **Статус:** НЕТ автоматических алертов

### Runbook при сбое
**Текущий процесс (неформализованный):**
1. Проверить console logs
2. Проверить `sync_logs` table
3. Re-run script вручную

---

## J. БЕЗОПАСНОСТЬ И ДОСТУП

### ⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА: Хранение секретов
- **Местоположение:** `.env` файл в корне проекта
- **🔴 ПРОБЛЕМА:** `.env` НЕ в `.gitignore` - API ключи в публичном репозитории!

### Ключи, доступные клиенту
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Service Role Key
- **Exposed to client:** НЕТ
- **Использование:** Только backend sync scripts

### Row Level Security (RLS)

| Параметр | Значение |
|----------|----------|
| RLS включен | НЕТ |
| Роли | anon (frontend), service_role (backend sync) |
| User auth | НЕТ - dashboard публичный для всех кто знает URL |

### Compliance
- **Требования:** Unknown
- **GDPR/PDPA:** Не документировано

---

## K. PERFORMANCE, SCALING, COSTS

### Ожидаемая нагрузка (месяц)

**При hourly cron:**
- **Write ops:** 2,160 (720 syncs × 3 objects = 2,160 UPSERT batches)
- **Read ops:** 720 (предположительно 1 dashboard view в час по 10 пользователям)

### Допустимое время загрузки
- **Initial load:** 5 секунд

### Рост данных (12 месяцев)
- **Прогноз:** 3x
- **Детали:**
  - Contacts: 31k → ~100k
  - Calls: 118k → ~350k

### Ограничения по стоимости
- **Цель:** Минимизировать
- **Текущие затраты:**
  - Vercel Free tier: $0/месяц
  - Supabase Free tier: $0/месяц (для <500MB + 2GB transfer)

### Известные проблемы производительности

1. **contact_call_stats VIEW timeout**
   - Сложный phone matching JOIN на 118k calls × 31k contacts
   - Приводит к timeout при запросе

2. **get_all_metrics() медленно**
   - Текущее время: ~4 секунды
   - Приемлемо сейчас, но может стать медленнее при росте данных

3. **Отсутствие индексов на normalized phone**
   - Нельзя создать индексы на VIEW
   - Только на таблицах

---

## L. EDGE CASES И КАЧЕСТВО ДАННЫХ

### Обработка неполных записей
- **Стратегия:** Сохранять всё
- **Пример:** Контакт без email/phone → `phone: null`, `email: null`
- **Валидация:** НЕ производится

### Политика для missing fields
- **Defaults:** `null` для всех опциональных полей
- **Nulls:** Разрешены везде кроме `hubspot_id` и `raw_json`
- **Reject:** НЕТ, никогда не отбрасываем записи

### Правила нормализации

**Phone formatting:**
- Убираем `+972`, пробелы, дефисы
- Реализация: VIEWs (`calls_normalized`, `contacts_normalized`)

**Currency:**
- Валюта: ILS (Israeli Shekels)
- Символ: ₪
- Хранение: `Decimal` без конвертации

**Timezone:**
- Все timestamps: UTC
- Тип: `TIMESTAMP WITH TIME ZONE`

### Правила валидации данных

**Обязательные:**
1. `hubspot_id` - PRIMARY KEY
2. `raw_json` - JSONB NOT NULL

**Типы:**
1. `amount` → `parseFloat()` при transform
2. `call_duration` → `parseInt()`

**Остальное:**
- БЕЗ валидации

---

## M. TESTING И STAGING

### Staging Environment
- **Существует:** НЕТ

### Test Data
- **Доступность:** Да (sample JSON в `scripts/discovery/`)
- **Использование:** Для discovery и анализа

### Integration Tests Coverage
- **Статус:** None
- **Проблема:** `tests/` директория пуста, только discovery scripts

---

## N. SAMPLE DATA (примеры реальных записей)

### Contact Example
```json
{
  "hubspot_id": "93260",
  "email": null,
  "phone": "+9720522502697",
  "firstname": "Avi Altif",
  "lastname": null,
  "createdate": "2024-02-10T18:13:16.645Z",
  "lifecyclestage": "lead",
  "sales_script_version": null,
  "vsl_watched": null,
  "hubspot_owner_id": "",
  "raw_json": {
    "hs_object_id": "93260",
    "email": null,
    "phone": "+9720522502697"
  }
}
```

### Deal Example
```json
{
  "hubspot_id": "43486818671",
  "amount": 5300,
  "dealstage": "closedwon",
  "dealname": "Ibrahim Julani",
  "closedate": "2025-09-09T07:21:05.775Z",
  "createdate": "2023-01-03T22:00:00Z",
  "qualified_status": null,
  "trial_status": null,
  "payment_status": null,
  "number_of_installments__months": null,
  "hubspot_owner_id": "682432124",
  "raw_json": {
    "hs_object_id": "43486818671",
    "amount": "5300",
    "dealstage": "closedwon"
  }
}
```

### Call Example
```json
{
  "hubspot_id": "46379611462",
  "call_duration": 15220,
  "call_direction": "OUTBOUND",
  "call_to_number": "+972525200106",
  "call_from_number": "+972537695224",
  "call_timestamp": "2024-01-27T18:28:16Z",
  "call_disposition": "73a0d17f-1163-4015-bdd5-ec830791da20",
  "raw_json": {
    "hs_call_body": "Outbound answered call",
    "hs_call_recording_url": "https://api.kavkom.com/..."
  }
}
```

---

## ВЫВОДЫ И РЕКОМЕНДАЦИИ

### 🔴 Критические проблемы (требуют немедленного решения)

#### 1. Безопасность: .env в репозитории
**Проблема:** API ключи HubSpot и Supabase service_role_key в публичном репозитории

**Решение:**
```bash
# Немедленно:
echo ".env" >> .gitignore
git rm --cached .env
git commit -m "security: Remove .env from repository"

# Ротация ключей:
# 1. Создать новые API keys в HubSpot и Supabase
# 2. Обновить локальный .env
# 3. Обновить Vercel environment variables
```

#### 2. contact_call_stats VIEW timeout
**Проблема:** Сложный JOIN phone matching приводит к timeout

**Решения (по приоритету):**

**A. Materialized View (быстро):**
```sql
CREATE MATERIALIZED VIEW contact_call_stats_mv AS
SELECT ... FROM calls_normalized JOIN contacts_normalized;

CREATE INDEX idx_mv_contact_id ON contact_call_stats_mv(hubspot_id);

-- Refresh strategy: hourly после sync
REFRESH MATERIALIZED VIEW CONCURRENTLY contact_call_stats_mv;
```

**B. Denormalized Table (медленнее, но надёжнее):**
```sql
CREATE TABLE contact_phone_normalized (
  hubspot_id TEXT PRIMARY KEY,
  phone_normalized TEXT,
  -- ... другие поля
);

CREATE INDEX idx_phone_norm ON contact_phone_normalized(phone_normalized);
```

**C. Incremental Aggregation (долгосрочное решение):**
- Считать followup metrics инкрементально при каждом sync
- Сохранять в отдельную таблицу `contact_metrics_cache`

#### 3. Отсутствие мониторинга
**Проблема:** Нет автоматических уведомлений при failed sync

**Решение:**

**Уровень 1 (простой):**
```javascript
// В sync script добавить:
if (status === 'failed') {
  await fetch('https://hooks.slack.com/...', {
    method: 'POST',
    body: JSON.stringify({
      text: `🔴 Sync failed: ${error_message}`
    })
  });
}
```

**Уровень 2 (продакшн):**
- Подключить Sentry для error tracking
- Настроить Supabase Database Webhooks на ошибки
- Создать dashboard для sync_logs (Metabase/Grafana)

---

### 🟡 Требует внимания (средний приоритет)

#### 4. Pickup Rate метрика
**Проблема:** call_disposition содержит UUID, не human-readable labels

**Решение:**
```javascript
// Создать mapping table:
CREATE TABLE call_disposition_mapping (
  disposition_id TEXT PRIMARY KEY,
  disposition_label TEXT,
  is_answered BOOLEAN
);

// Fetch mapping из HubSpot API:
GET /crm/v3/properties/calls/hs_call_disposition
```

#### 5. Incremental Metrics Computation
**Текущая проблема:** Полный пересчёт всех 21 метрик каждый раз (~4 сек)

**Решение - Delta Tables:**
```sql
-- Создать incremental aggregations
CREATE TABLE metrics_cache (
  metric_name TEXT,
  owner_id TEXT,
  date_bucket DATE,
  value NUMERIC,
  last_updated TIMESTAMP,
  PRIMARY KEY (metric_name, owner_id, date_bucket)
);

-- Обновлять только изменённые бакеты после sync
```

#### 6. Staging Environment
**Рекомендация:** Создать staging для тестов перед production

**Подход:**
```yaml
# Vercel Preview Deployments:
# - Автоматический staging на каждый PR
# - Отдельная Supabase staging база
# - Отдельный HubSpot sandbox account (если доступен)
```

#### 7. Integration Tests
**Создать минимальный набор:**
```javascript
// tests/integration/sync.test.js
test('full sync completes successfully', async () => {
  const result = await syncAll();
  expect(result.contacts.success).toBeGreaterThan(0);
  expect(result.deals.errors).toBe(0);
});

// tests/integration/metrics.test.js
test('get_all_metrics returns 21 metrics', async () => {
  const metrics = await getAllMetrics();
  expect(Object.keys(metrics)).toHaveLength(21);
});
```

---

### ✅ Работает хорошо (сохранить как есть)

1. **RAW layer pattern с JSONB** - отличная гибкость + сохранность данных
2. **Parallel sync** - быстрая загрузка 3 объектов одновременно
3. **SQL функция для метрик** - централизованная логика, легко обновлять
4. **Phone matching через VIEWs** - работает для связи calls ↔ contacts
5. **TypeScript + Next.js** - отличный DX для AI coding
6. **shadcn/ui** - красивый современный UI

---

### Приоритизация исправлений

**Sprint 1 (1-2 дня):**
1. 🔴 Исправить .env gitignore + ротация ключей
2. 🔴 contact_call_stats → materialized view
3. 🟡 Базовый monitoring (Slack webhook)

**Sprint 2 (2-3 дня):**
1. 🟡 Pickup rate метрика (disposition mapping)
2. 🟡 Retry backoff логика
3. 🟡 Integration tests (минимум)

**Sprint 3 (1 неделя):**
1. 🟡 Incremental metrics computation
2. 🟡 Staging environment setup
3. 🟡 Production monitoring dashboard

---

## Заключение

**Общая оценка проекта:** 7.5/10

**Сильные стороны:**
- ✅ Хорошая архитектура (RAW layer, parallel sync)
- ✅ Современный стек (Next.js 15, TypeScript, Prisma)
- ✅ Работающий MVP с 21/22 метриками
- ✅ Production-ready dashboard

**Критические риски:**
- 🔴 Безопасность (.env в репозитории)
- 🔴 Performance (contact_call_stats timeout)
- 🔴 Отсутствие мониторинга

**Рекомендация:**
Проект готов к production после исправления 3 критических проблем (Sprint 1). Остальные улучшения можно делать постепенно.

---

**Дата аудита:** 2025-10-10
**Следующий review:** После Sprint 1 (через 1-2 недели)
