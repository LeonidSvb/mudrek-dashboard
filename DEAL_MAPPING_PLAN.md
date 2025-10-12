# ПЛАН ОБНОВЛЕНИЯ DEALS: CSV → HubSpot

## ШАГ 1: Mapping таблица

### Существующие HubSpot Properties (из raw_json)

Из анализа `raw_json.properties` мы нашли следующие поля:

| HubSpot Property Name | Current Value | Type | Status |
|----------------------|---------------|------|--------|
| `amount` | 540, 1325, 3780 | Decimal | ⚠️ НЕПРАВИЛЬНО (payment size) |
| `deal_whole_amount` | 3240, 5300, 3780 | Decimal | ✅ ПРАВИЛЬНО (total contract) |
| `installments` | 6, 4, 12, 1 | Integer | ✅ ПРАВИЛЬНО |
| `n1st_payment` | 2025-08-26 | Date | ✅ ПРАВИЛЬНО |
| `last_payment` | 2025-12-28 | Date | ✅ ПРАВИЛЬНО |
| `dealstage` | closedwon | String | ⚠️ НЕПРАВИЛЬНО (все closedwon) |
| `dealname` | Ibrahim Julani | String | ✅ ПРАВИЛЬНО |
| `closedate` | 2023-04-01 | Date | ✅ ПРАВИЛЬНО |
| `hubspot_owner_id` | 682432124 | String | ✅ ПРАВИЛЬНО |

### CSV → HubSpot Mapping

| CSV Column | HubSpot Property | Action | Notes |
|-----------|------------------|--------|-------|
| **deal amount** | `deal_whole_amount` | ✅ Keep | Уже правильно |
| **payment** | `amount` | ⚠️ UPDATE | Сейчас = payment_size, нужно = deal_whole_amount |
| **installments** | `installments` | ✅ Keep | Уже правильно |
| **1st payment** | `n1st_payment` | ✅ Keep | Уже правильно |
| **Last payment** | `last_payment` | ✅ Keep | Уже правильно |
| **Status** | `dealstage` | ⚠️ UPDATE | Нужен новый property или mapping |
| **fname** | (в contact) | - | Хранится в contact, не в deal |
| **lname** | (в contact) | - | Хранится в contact, не в deal |
| **phone** | `phone_number` | ✅ Keep | В raw_json.properties.phone_number |
| **email** | (в contact) | - | Хранится в contact, не в deal |
| **sales** | `hubspot_owner_id` | ✅ Keep | Нужен mapping имен → ID |

---

## ШАГ 2: Что нужно ОБНОВИТЬ в HubSpot

### Проблема 1: `amount` field

**Текущее состояние:**
- `amount` = размер ОДНОГО платежа (payment_size)
- `deal_whole_amount` = полная сумма договора (правильно!)

**Пример:**
```
حنين دراوشة:
  amount: 540 (payment_size) ← НЕПРАВИЛЬНО
  deal_whole_amount: 3240 (total) ← ПРАВИЛЬНО
  installments: 6
```

**Решение:**
```javascript
// Обновить HubSpot API:
amount = deal_whole_amount  // 540 → 3240
```

**Почему это важно:**
- HubSpot используется для построения revenue dashboards
- Если `amount` = payment_size → revenue показывается неправильно
- После update: `amount` = полная сумма договора ✅

---

### Проблема 2: Status mapping

**CSV statuses:**
- `finished` (712 deals) → заплатили 100%
- `stopped` (125 deals) → перестали платить
- `paused` (144 deals) → приостановили платежи
- `no status` (240 deals) → неизвестно

**HubSpot dealstage:**
- Все deals показывают `closedwon` (даже stopped/paused!)

**Возможные решения:**

**Вариант A:** Создать кастомное свойство `payment_status`
```
payment_status: "paid_in_full" | "stopped" | "paused" | "pending"
```

**Вариант B:** Использовать правильные dealstage values
```
finished → closedwon
stopped → closedlost
paused → (custom stage "payment_paused")
```

**Вариант C:** Комбинированный
- `dealstage` = closedwon (для всех кто начал платить)
- `payment_status` = finished/stopped/paused (детальный статус)

**Рекомендация:** Вариант C (не ломаем существующие dashboards)

---

### Проблема 3: Manager mapping (опционально)

CSV имеет имена, HubSpot имеет ID:

| CSV sales | HubSpot owner_id | Deals Count |
|-----------|-----------------|-------------|
| Wala | ? | 468 |
| Mothanna | ? | 391 |
| Sabreen | ? | 261 |
| Shadi | 682432124 | 424 (confirmed) |

**Решение:** Fetch owners list from HubSpot API для mapping

---

## ШАГ 3: HubSpot Batch Update API

### Endpoint
```
POST https://api.hubapi.com/crm/v3/objects/deals/batch/update
```

### Request Format
```json
{
  "inputs": [
    {
      "id": "123456789",
      "properties": {
        "amount": "3240",
        "payment_status": "finished"
      }
    },
    {
      "id": "987654321",
      "properties": {
        "amount": "5300",
        "payment_status": "stopped"
      }
    }
  ]
}
```

### Limits
- Max 100 deals per batch
- Rate limit: 100 requests per 10 seconds
- For 1000 deals: 10 batches × ~1 second = 10-15 seconds total

---

## ШАГ 4: Тестовый план (10 deals)

### Выбор тестовых deals

Возьмем разные типы:
1. **Ibrahim Julani** (installments=1, paid in full) → amount OK
2. **wael makhoul** (installments=4) → amount WRONG (1325 → 5300)
3. **حنين دراوشة** (installments=6, finished) → amount WRONG (540 → 3240)
4. **Nasser Shehadeh** (stopped) → amount WRONG + status WRONG
5. **Bashar Hajajri** (stopped) → amount WRONG + status WRONG
6. **Lana Sahloul** (paused) → amount WRONG + status WRONG
7. **عطالله مطر** (paused) → amount WRONG + status WRONG
8. **Abdullah Al-Dulaimi** (installments=6) → amount WRONG (395 → 2370)
9. **هילانه علي** (installments=4) → amount WRONG (1325 → 5300)
10. **دعاء ل** (installments=7, stopped?) → amount WRONG (600 → 3600)

### Что обновим
- `amount` field → правильная сумма из `deal_whole_amount`
- (опционально) `payment_status` → finished/stopped/paused

### Как проверить
Скрипт вернет прямые ссылки:
```
https://app.hubspot.com/contacts/PORTAL_ID/deal/DEAL_ID
```

Ты вручную откроешь 10 ссылок и проверишь что:
- Amount поле обновилось правильно
- Все остальные поля остались без изменений

---

## ШАГ 5: Full Update (1000 deals)

После твоего OK → запускаем batch update для всех 1000 deals.

**Progress tracking:**
```
Batch 1/10: 100 deals updated ✓
Batch 2/10: 100 deals updated ✓
...
Batch 10/10: 100 deals updated ✓

Total: 1000 deals updated in 15 seconds
```

---

## ШАГ 6: Incremental Sync

После обновления HubSpot:
- Запускаем `sync-incremental.js`
- Проверяем что данные синкаются правильно
- Убеждаемся что `amount` теперь = `deal_whole_amount`

**Existing incremental sync уже:**
- ✅ Использует `hs_lastmodifieddate` filter
- ✅ Fetch только измененные deals
- ✅ Upsert в Supabase

**Нужно добавить:**
- Mapping `payment_status` → CSV Status (если создадим кастомное свойство)

---

## Что дальше?

Скажи OK и я:
1. Fetch HubSpot Batch Update API документацию (или использовать existing knowledge)
2. Создам скрипт `update-deals-test-10.cjs`
3. Запущу на 10 deals
4. Дам тебе 10 ссылок для проверки
5. После твоего OK → обновлю все 1000 deals
