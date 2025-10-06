# Полный анализ данных HubSpot

**Дата:** 2025-10-06
**Проект:** Shadi Sales Dashboard
**Цель:** Определить структуру данных для Supabase

---

## 1. АНАЛИЗ CALLS (200 записей)

### Результаты:

✅ **Все 200 calls НЕ имеют associations в HubSpot**
- ❌ call → contact: НЕТ
- ❌ call → deal: НЕТ

✅ **Но у всех calls есть номера телефонов:**
- ✅ hs_call_to_number: 100%
- ✅ hs_call_from_number: 100%

### Вывод:

**Calls привязаны к Contacts через номер телефона!**

```sql
-- Связь calls → contacts через phone
SELECT
  ca.hubspot_id,
  ca.call_duration,
  c.hubspot_id as contact_id,
  c.email
FROM hubspot_calls_raw ca
JOIN hubspot_contacts_raw c
  ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '');
```

**Логика клиента ПРАВИЛЬНАЯ:**
- Менеджер звонит → call привязан к contact
- Contact переходит в deal → call ОСТАЕТСЯ привязанным к contact
- Можем найти calls для deal через contact

---

## 2. АНАЛИЗ DEAL STAGES

### Текущие stages в HubSpot:

| Stage ID | Label | Использование |
|----------|-------|---------------|
| appointmentscheduled | Lead | Не используется |
| qualifiedtobuy | call back | Не используется |
| 199274159 | In Progress | Не используется |
| 199274158 | Trial Account | Не используется |
| **closedwon** | **Closed Won** | **100% deals** |
| closedlost | Closed Lost | Не используется |

**ПРОБЛЕМА:** Все deals в closedwon! Нет промежуточных stages.

### Требования клиента (Shadi):

#### Contacts (НЕ deals):
1. New leads (pending to be contacted)
2. No answer
3. Wrong number
4. Disqualified

#### Deal Stages:
1. **Qualified to Buy** - показали интерес
2. **High interest** - высокий интерес
3. **Offer received** - получил оффер, ждет оплату
4. **Closed won** - заплатил что-то
5. **Closed lost** - отказался после interest

#### Retention (custom property):
- **payment_status** (для Closed Won):
  - Active
  - Paused
  - Stopped
  - Refunded
  - Completed

---

## 3. ЧТО НУЖНО ДОБАВИТЬ В HUBSPOT

### 3.1. Новые Deal Stages

НЕ ТРОГАЕМ существующие! Только ждем когда клиент добавит:

```
Pipeline "Sales Pipeline" stages:
1. qualified_to_buy    → Qualified to Buy
2. high_interest       → High interest
3. offer_received      → Offer received
4. closedwon           → Closed Won (уже есть ✅)
5. closedlost          → Closed Lost (уже есть ✅)
```

### 3.2. Новые Deal Properties

```javascript
// Payment status для retention
{
  name: "payment_status",
  label: "Payment Status",
  type: "enumeration",
  fieldType: "select",
  options: [
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
    { label: "Stopped", value: "stopped" },
    { label: "Refunded", value: "refunded" },
    { label: "Completed", value: "completed" }
  ]
}
```

**НО!** Сейчас НЕ создаем, просто учитываем в SQL схеме.

---

## 4. ФИНАЛЬНАЯ СТРУКТУРА ДАННЫХ

### Таблицы Supabase:

```sql
-- 1. CONTACTS
CREATE TABLE hubspot_contacts_raw (
    hubspot_id TEXT PRIMARY KEY,
    email TEXT,
    phone TEXT,                    -- для связи с calls!
    firstname TEXT,
    lastname TEXT,
    createdate TIMESTAMP,
    lifecyclestage TEXT,
    raw_json JSONB NOT NULL,       -- все данные + associations
    synced_at TIMESTAMP
);

-- 2. DEALS
CREATE TABLE hubspot_deals_raw (
    hubspot_id TEXT PRIMARY KEY,
    amount NUMERIC,
    dealstage TEXT,                -- closedwon, closedlost, etc
    createdate TIMESTAMP,
    closedate TIMESTAMP,
    qualified_status TEXT,
    trial_status TEXT,
    payment_status TEXT,           -- NEW! для retention
    raw_json JSONB NOT NULL,       -- все данные + associations
    synced_at TIMESTAMP
);

-- 3. CALLS
CREATE TABLE hubspot_calls_raw (
    hubspot_id TEXT PRIMARY KEY,
    call_duration INTEGER,         -- миллисекунды
    call_direction TEXT,           -- OUTBOUND/INBOUND
    call_to_number TEXT,           -- для JOIN с contacts!
    call_from_number TEXT,
    call_timestamp TIMESTAMP,
    raw_json JSONB NOT NULL,       -- все данные
    synced_at TIMESTAMP
);
```

### Индексы для быстрых запросов:

```sql
-- Contacts
CREATE INDEX idx_contacts_phone ON hubspot_contacts_raw(phone);
CREATE INDEX idx_contacts_email ON hubspot_contacts_raw(email);

-- Deals
CREATE INDEX idx_deals_stage ON hubspot_deals_raw(dealstage);
CREATE INDEX idx_deals_amount ON hubspot_deals_raw(amount);
CREATE INDEX idx_deals_closedate ON hubspot_deals_raw(closedate);
CREATE INDEX idx_deals_payment_status ON hubspot_deals_raw(payment_status);

-- Calls
CREATE INDEX idx_calls_to_number ON hubspot_calls_raw(call_to_number);
CREATE INDEX idx_calls_timestamp ON hubspot_calls_raw(call_timestamp);
CREATE INDEX idx_calls_duration ON hubspot_calls_raw(call_duration);

-- JSONB индексы
CREATE INDEX idx_contacts_raw_json ON hubspot_contacts_raw USING GIN (raw_json);
CREATE INDEX idx_deals_raw_json ON hubspot_deals_raw USING GIN (raw_json);
CREATE INDEX idx_calls_raw_json ON hubspot_calls_raw USING GIN (raw_json);
```

---

## 5. СВЯЗИ МЕЖДУ ТАБЛИЦАМИ

### Через JSONB (когда associations есть):

```sql
-- Deal → Contact (через associations)
SELECT
  d.hubspot_id,
  d.amount,
  d.raw_json->'associations'->'contacts'->'results'->0->>'id' as contact_id
FROM hubspot_deals_raw d;
```

### Через Phone (для calls):

```sql
-- Calls → Contact (через phone)
SELECT
  ca.hubspot_id,
  ca.call_duration,
  c.hubspot_id as contact_id,
  c.email,
  c.firstname
FROM hubspot_calls_raw ca
JOIN hubspot_contacts_raw c
  ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '');

-- Calls для Deal (через contact)
SELECT
  d.hubspot_id as deal_id,
  d.dealname,
  ca.hubspot_id as call_id,
  ca.call_duration
FROM hubspot_deals_raw d
JOIN hubspot_contacts_raw c
  ON c.hubspot_id = d.raw_json->'associations'->'contacts'->'results'->0->>'id'
JOIN hubspot_calls_raw ca
  ON REPLACE(ca.call_to_number, '+', '') = REPLACE(c.phone, '+', '');
```

---

## 6. МЕТРИКИ КОТОРЫЕ ГОТОВЫ

Из 22 метрик - смотрим какие уже работают:

### ✅ Готовые (текущие поля):
1. Total sales - `SUM(amount)`
2. Total deals - `COUNT(*)`
3. Average deal size - `AVG(amount)`
4. Average call time - `AVG(call_duration)`
5. Total call time - `SUM(call_duration)`
6. Time to sale - `closedate - createdate`
7. Total calls made - `COUNT(calls)`
8. 5min-reached rate - `COUNT(WHERE call_duration >= 300000) / COUNT(*)`
9. Pickup rate - `COUNT(WHERE call_direction = 'OUTBOUND' AND answered)`
10. Average installments - `AVG(number_of_installments__months)`

### ⏳ Ждут новые fields:
11. Conversion rate - нужны новые stages
12. Qualified rate - нужно `qualified_status`
13. Trial rate - нужно `trial_status`
14. Cancellation rate - нужно `payment_status = 'refunded'`
15. VSL watch rate - нужно `vsl_watched`

---

## 7. NEXT STEPS

### СЕЙЧАС:
1. ✅ Создать SQL миграцию с ГИБРИД структурой (колонки + JSONB)
2. ✅ Выполнить миграцию в Supabase
3. ✅ Протестировать sync скрипт

### ПОТОМ (когда клиент добавит stages):
4. ⏳ Клиент добавляет новые deal stages в HubSpot
5. ⏳ Клиент добавляет payment_status field
6. ⏳ Пересинхронизируем данные
7. ⏳ Все метрики заработают!

---

## 8. РЕКОМЕНДАЦИИ

1. **НЕ создавать новые поля СЕЙЧАС** - ждем когда клиент сам добавит
2. **Использовать JSONB для гибкости** - новые поля автоматически будут в raw_json
3. **Связь calls через phone РАБОТАЕТ** - логика клиента правильная
4. **payment_status критичен для retention метрик** - нужно добавить первым

---

**Готово к созданию SQL миграции!**
