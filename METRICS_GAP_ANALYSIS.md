# Gap Analysis: 22 Метрики vs Реальная Схема Supabase

**Дата проверки**: 2025-10-07
**Проверено автоматически**: scripts/check-schema.js

---

## 📊 РЕАЛЬНАЯ СХЕМА SUPABASE

### hubspot_contacts_raw (14 колонок)
```
✅ hubspot_id
✅ email, phone, firstname, lastname
✅ createdate
✅ lifecyclestage
✅ sales_script_version
✅ vsl_watched
✅ vsl_watch_duration
✅ hubspot_owner_id
✅ raw_json, synced_at, updated_at
```

### hubspot_deals_raw (19 колонок)
```
✅ hubspot_id
✅ amount
✅ dealstage
✅ createdate, closedate
✅ qualified_status ⚠️ (в deals, НЕ в contacts!)
✅ trial_status
✅ payment_status
✅ number_of_installments__months
✅ cancellation_reason
✅ is_refunded
✅ installment_plan
✅ upfront_payment
✅ offer_given
✅ offer_accepted
✅ hubspot_owner_id
✅ raw_json, synced_at, updated_at
```

### hubspot_calls_raw (10 колонок)
```
✅ hubspot_id
✅ call_duration
✅ call_direction
✅ call_to_number, call_from_number
✅ call_timestamp
✅ call_disposition
❌ hubspot_owner_id (НЕТ!)
✅ raw_json, synced_at, updated_at
```

---

## ✅ MILESTONE 2 - EASY METRICS (13 метрик)

| # | Метрика | Требуемые поля | Статус | Комментарий |
|---|---------|---------------|--------|-------------|
| 1 | **Total Sales** | `deals.amount, dealstage='closedwon'` | ✅ ГОТОВО | Все поля есть |
| 2 | **Average Deal Size** | `deals.amount, dealstage='closedwon'` | ✅ ГОТОВО | Все поля есть |
| 3 | **Total Deals** | `COUNT(deals)` | ✅ ГОТОВО | Все поля есть |
| 4 | **Cancellation Rate** | `deals.dealstage='cancelled'` | ⚠️ НУЖНА ПРОВЕРКА | Нужно проверить есть ли значение 'cancelled' в dealstage |
| 5 | **Conversion Rate** | `deals/contacts` | ✅ ГОТОВО | Простой COUNT |
| 6 | **Qualified Rate** | `deals.qualified_status='yes'` | ⚠️ ИСПРАВЛЕНО | **БЫЛО НЕПРАВИЛЬНО**: искали в contacts, а поле в deals! |
| 7 | **Trial Rate** | `deals.trial_status='yes'` | ✅ ГОТОВО | Поле есть в deals |
| 8 | **Avg Installments** | `deals.number_of_installments__months` | ✅ ГОТОВО | Поле есть |
| 9 | **Time to Sale** | `deals.closedate, createdate` | ✅ ГОТОВО | Оба поля есть |
| 10 | **Average Call Time** | `calls.call_duration` | ✅ ГОТОВО | Поле есть |
| 11 | **Total Call Time** | `calls.call_duration` | ✅ ГОТОВО | Поле есть |
| 12 | **Sales Script Testing** | `contacts.sales_script_version, lifecyclestage` | ✅ ГОТОВО | Оба поля есть |
| 13 | **VSL Watch → Close** | `contacts.vsl_watched, lifecyclestage` | ✅ ГОТОВО | Оба поля есть |

**Итог Milestone 2**: 11 из 13 готовы, 2 требуют проверки значений.

---

## ⚠️ MILESTONE 3 - COMPLEX METRICS (9 метрик)

| # | Метрика | Требуемые поля | Статус | Комментарий |
|---|---------|---------------|--------|-------------|
| 14 | **Upfront Cash Collected** | `deals.upfront_payment` | ✅ ГОТОВО | Поле есть! |
| 15 | **Followup Rate** | Deal stages history | ❌ НЕТ ДАННЫХ | Нужна история изменений stages |
| 16 | **Total Calls Made** | `COUNT(calls)` | ✅ ГОТОВО | Простой COUNT |
| 17 | **5min Reached Rate** | `calls.call_duration >= 300000` | ✅ ГОТОВО | Поле есть |
| 18 | **Pickup Rate** | `calls.call_disposition` | ⚠️ ПРОВЕРКА | Нужно проверить значения disposition |
| 19 | **Time to First Contact** | `calls.call_timestamp, contacts.createdate` | ❌ СЛОЖНО | Нужен JOIN calls → contacts через phone |
| 20 | **Avg Followups per Lead** | `COUNT(calls) / COUNT(contacts)` | ❌ СЛОЖНО | Нужен JOIN calls → contacts через phone |
| 21 | **Offers Given Rate** | `deals.offer_given='yes'` | ✅ ГОТОВО | Поле есть! |
| 22 | **Offer → Close Rate** | `deals.offer_accepted, dealstage` | ✅ ГОТОВО | Оба поля есть! |

**Итог Milestone 3**: 5 из 9 готовы, 2 сложных (JOIN), 1 нужна история, 1 проверка значений.

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### Проблема #1: qualified_status искали не в той таблице
```typescript
// ❌ БЫЛО НЕПРАВИЛЬНО (в lib/db/metrics.ts):
const { data: contacts } = await supabase
  .from('hubspot_contacts_raw')
  .select('qualified_status, trial_status');  // ❌ qualified_status в contacts НЕТ!

// ✅ ПРАВИЛЬНО:
const { data: deals } = await supabase
  .from('hubspot_deals_raw')
  .select('qualified_status, trial_status');  // ✅ qualified_status в deals!
```

### Проблема #2: Нет hubspot_owner_id в calls
```typescript
// ❌ НЕВОЗМОЖНО:
let callsQuery = supabase
  .from('hubspot_calls_raw')
  .select('call_duration')
  .eq('hubspot_owner_id', ownerId);  // ❌ Такой колонки НЕТ!

// ⚠️ РЕШЕНИЕ: Фильтрация звонков по owner невозможна напрямую
// Нужен JOIN через phone: calls → contacts → owner_id
```

### Проблема #3: Нет прямой связи calls ↔ contacts
- В calls есть только phone (call_to_number, call_from_number)
- В contacts есть phone
- Нужен JOIN по phone для метрик #19, #20

---

## ✅ ЧТО МОЖНО СДЕЛАТЬ ПРЯМО СЕЙЧАС (БЕЗ ИЗМЕНЕНИЙ БД)

### 🎯 Priority 1: Milestone 2 (9 метрик готовы)
1. ✅ Total Sales - `SUM(amount) WHERE dealstage='closedwon'`
2. ✅ Average Deal Size - `AVG(amount) WHERE dealstage='closedwon'`
3. ✅ Total Deals - `COUNT(*) WHERE dealstage='closedwon'`
5. ✅ Conversion Rate - `(closedwon deals / total contacts) * 100`
6. ✅ Qualified Rate - `COUNT(deals WHERE qualified_status='yes') / total_deals`
7. ✅ Trial Rate - `COUNT(deals WHERE trial_status='yes') / total_deals`
8. ✅ Avg Installments - `AVG(number_of_installments__months)`
9. ✅ Time to Sale - `AVG(closedate - createdate) days`
10. ✅ Average Call Time - `AVG(call_duration) / 60000 minutes`
11. ✅ Total Call Time - `SUM(call_duration) / 3600000 hours`

### 🎯 Priority 2: A/B Testing (2 метрики)
12. ✅ Sales Script Testing - `GROUP BY sales_script_version`
13. ✅ VSL Impact - `GROUP BY vsl_watched`

### 🎯 Priority 3: Milestone 3 Easy (4 метрики)
14. ✅ Upfront Cash - `SUM(upfront_payment)`
16. ✅ Total Calls - `COUNT(*) FROM calls`
17. ✅ 5min Rate - `COUNT(WHERE duration >= 300000) / total`
21. ✅ Offers Given - `COUNT(WHERE offer_given='yes') / total_deals`
22. ✅ Offer → Close - `COUNT(WHERE offer_accepted='yes' AND closedwon) / COUNT(offer_given)`

**Итого: 15 из 22 метрик готовы к реализации ПРЯМО СЕЙЧАС!**

---

## ⚠️ ЧТО НУЖНО ПРОВЕРИТЬ

### Проверка #1: Значения dealstage
```sql
SELECT DISTINCT dealstage FROM hubspot_deals_raw;
```
Проверить есть ли значение 'cancelled' для метрики #4.

### Проверка #2: Значения call_disposition
```sql
SELECT DISTINCT call_disposition FROM hubspot_calls_raw;
```
Проверить какие значения есть для метрики #18 (Pickup Rate).

---

## 🚫 ЧТО НЕВОЗМОЖНО БЕЗ ИЗМЕНЕНИЙ

### Невозможно #1: История изменений stages
**Метрика #15** - Followup Rate (время между стадиями)
- Нужна таблица `deal_stage_history` с timestamp изменений
- Альтернатива: использовать raw_json если там есть history

### Невозможно #2: Прямая фильтрация звонков по owner
**Фильтр звонков по менеджеру** (для метрик #10, #11, #16, #17)
- В calls нет hubspot_owner_id
- Решение: JOIN calls → contacts по phone
- Или: добавить owner_id в calls при синке

---

## 📋 РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ

### Этап 1: Быстрая победа (2 часа)
1. Исправить getConversionMetrics() - искать qualified_status в deals, не contacts
2. Реализовать 11 метрик из Milestone 2
3. Показать рабочий дашборд

### Этап 2: A/B тесты (1 час)
4. Добавить 2 метрики A/B testing (#12, #13)

### Этап 3: Простые сложные метрики (1 час)
5. Добавить 4 метрики из Milestone 3 (#14, #16, #17, #21, #22)

### Этап 4: Проверки и финализация (1 час)
6. Проверить значения dealstage и call_disposition
7. Добавить оставшиеся метрики если значения есть

### Этап 5: JOIN для звонков (позже)
8. Реализовать JOIN calls → contacts для метрик #19, #20
9. Решить вопрос с фильтрацией звонков по owner

**Итого: 15 метрик можно реализовать за 5 часов!**

---

## 🎯 SOURCE OF TRUTH: ВАЛИДАЦИЯ СХЕМЫ

Для быстрой проверки схемы в любой момент:

```bash
node scripts/check-schema.js
```

Этот скрипт:
- ✅ Проверяет реальную схему Supabase
- ✅ Показывает все колонки каждой таблицы
- ✅ Валидирует требуемые поля для метрик
- ✅ Выводит список ❌ отсутствующих полей

**Best Practice**: Запускать перед каждым добавлением новых метрик!
