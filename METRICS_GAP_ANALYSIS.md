# Metrics Gap Analysis - Все 22 метрики

## Данные в базе (схема):

### hubspot_deals_raw (19 полей):
- hubspot_id, amount, dealstage, createdate, closedate
- qualified_status, trial_status, payment_status
- number_of_installments__months, cancellation_reason, is_refunded
- installment_plan, upfront_payment, offer_given, offer_accepted
- raw_json, synced_at, updated_at, hubspot_owner_id

### hubspot_contacts_raw (14 полей):
- hubspot_id, email, phone, firstname, lastname, createdate, lifecyclestage
- sales_script_version, vsl_watched, vsl_watch_duration
- raw_json, synced_at, updated_at, hubspot_owner_id

### hubspot_calls_raw (10 полей):
- hubspot_id, call_duration, call_direction, call_to_number, call_from_number
- call_timestamp, call_disposition
- raw_json, synced_at, updated_at

**ВАЖНО: Все дополнительные поля (qualified_status, trial_status, etc.) = NULL (0 записей)**

---

## Анализ всех 22 метрик:

### ✅ ГОТОВО (12 метрик - можно считать прямо сейчас):

#### 1. **Total sales**
- Источник: `hubspot_deals_raw.amount WHERE dealstage='closedwon'`
- Расчет: SUM(amount)
- Статус: **Работает** (1,331,975)

#### 2. **Average deal size**
- Источник: `hubspot_deals_raw.amount WHERE dealstage='closedwon'`
- Расчет: AVG(amount)
- Статус: **Работает** (1,165.33)

#### 3. **Total deals (rev)**
- Источник: `hubspot_deals_raw WHERE dealstage='closedwon'`
- Расчет: COUNT(*)
- Статус: **Работает** (1,143)

#### 4. **Conversion rate**
- Источник: `hubspot_deals_raw` + `hubspot_contacts_raw`
- Расчет: (totalDeals / totalContacts) * 100
- Статус: **Работает** (3.61%)

#### 5. **Total calls made**
- Источник: `hubspot_calls_raw`
- Расчет: COUNT(*)
- Статус: **Работает** (118,799)

#### 6. **5min-reached-rate**
- Источник: `hubspot_calls_raw.call_duration >= 300000` (5 min = 300,000 ms)
- Расчет: (calls >= 5min / totalCalls) * 100
- Статус: **Работает** (8.76%)

#### 7. **Average call time**
- Источник: `hubspot_calls_raw.call_duration`
- Расчет: AVG(call_duration) / 60000
- Статус: **Работает** (2.48 min)

#### 8. **Total call time**
- Источник: `hubspot_calls_raw.call_duration`
- Расчет: SUM(call_duration) / 3600000
- Статус: **Работает** (4,875.4 hours)

#### 9. **Time to sale**
- Источник: `hubspot_deals_raw.closedate - createdate`
- Расчет: AVG(closedate - createdate) в днях
- Статус: **Добавлено сейчас** (код готов, не протестировано)

#### 10. **Avg installments** ⚠️
- Источник: `hubspot_deals_raw.number_of_installments__months`
- Расчет: AVG(number_of_installments__months)
- Статус: **Код готов, но данные = 0** (все NULL в базе)
- **Нужно**: Заполнить поле в HubSpot

#### 11. **Qualified rate** ⚠️
- Источник: `hubspot_deals_raw.qualified_status = 'yes'`
- Расчет: (qualified / total) * 100
- Статус: **Код готов, но данные = 0** (все NULL в базе)
- **Нужно**: Заполнить поле в HubSpot

#### 12. **Trial rate** ⚠️
- Источник: `hubspot_deals_raw.trial_status = 'yes'`
- Расчет: (trial / total) * 100
- Статус: **Код готов, но данные = 0** (все NULL в базе)
- **Нужно**: Заполнить поле в HubSpot

---

### 🔴 НЕ ХВАТАЕТ ДАННЫХ (10 метрик - нужно добавить поля или связи):

#### 13. **Upfront cash collected**
- Источник: `hubspot_deals_raw.upfront_payment`
- Расчет: SUM(upfront_payment)
- Статус: **Поле есть, но пустое** (0 записей)
- **Нужно**: Добавить данные в HubSpot custom field `upfront_payment`

#### 14. **Cancellation rate**
- Источник: `hubspot_deals_raw.is_refunded = true` или `cancellation_reason IS NOT NULL`
- Расчет: (cancelled / totalDeals) * 100
- Статус: **Поля есть, но пустые** (0 записей)
- **Нужно**:
  1. Добавить stage "cancelled" в HubSpot
  2. Или заполнить `is_refunded` boolean field
  3. Синхронизировать в базу

#### 15. **Followup rate**
- Источник: Нужно считать повторные звонки к одному контакту
- Расчет: Нужна связь `hubspot_calls_raw` -> `hubspot_contacts_raw`
- Статус: **Нет связи между таблицами**
- **Нужно**:
  1. Добавить поле `contact_id` или `deal_id` в `hubspot_calls_raw`
  2. Или извлечь из `raw_json.associations`
  3. Пересинхронизировать calls с associations

#### 16. **Offers given & rate**
- Источник: `hubspot_deals_raw.offer_given = true`, `offer_accepted = true`
- Расчет:
  - Offers given: COUNT(offer_given = true)
  - Acceptance rate: (offer_accepted / offer_given) * 100
- Статус: **Поля есть, но пустые** (0 записей)
- **Нужно**: Заполнить custom fields в HubSpot

#### 17. **Rate to close** (efficiency metric)
- Источник: Нужны промежуточные stages deals
- Расчет: Qualified -> Trial -> Offer -> Close (funnel conversion)
- Статус: **Нужна история stages**
- **Нужно**:
  1. Получить все stages из HubSpot для каждого deal
  2. Сохранить в отдельную таблицу `deal_stage_history`
  3. Или извлечь из `raw_json` если есть

#### 18. **Pickup rate**
- Источник: `hubspot_calls_raw.call_disposition`
- Расчет: (picked_up_calls / totalCalls) * 100
- Статус: **Поле есть, но пустое** (0 записей)
- **Нужно**: Получить `call_disposition` из HubSpot API

#### 19. **Time to first contact**
- Источник: `hubspot_contacts_raw.createdate` + первый `hubspot_calls_raw.call_timestamp`
- Расчет: AVG(first_call_time - contact_created)
- Статус: **Нужна связь calls -> contacts**
- **Нужно**: Связать calls с contacts через associations

#### 20. **Average followups per lead/sale**
- Источник: COUNT(calls per contact) или COUNT(calls per deal)
- Расчет: AVG(calls per contact)
- Статус: **Нужна связь calls -> contacts/deals**
- **Нужно**: Связать calls с contacts/deals через associations

#### 21. **Sales scripts testing**
- Источник: `hubspot_contacts_raw.sales_script_version`
- Расчет: GROUP BY sales_script_version, measure close rate
- Статус: **Поле есть, но пустое** (0 записей)
- **Нужно**: Добавить custom field в HubSpot contacts

#### 22. **VSL watch -> Close rate**
- Источник: `hubspot_contacts_raw.vsl_watched`, `vsl_watch_duration`
- Расчет: Close rate для watched vs not watched
- Статус: **Поля есть, но пустые** (0 записей)
- **Нужно**:
  1. Интегрировать video tracking (Wistia/Vimeo API)
  2. Записывать в HubSpot custom fields
  3. Синхронизировать в базу

---

## Итого:

### ✅ **Работают сейчас: 8 метрик**
1. Total sales
2. Average deal size
3. Total deals
4. Conversion rate
5. Total calls made
6. 5min-reached-rate
7. Average call time
8. Total call time

### 🟡 **Код готов, ждут данных: 4 метрики**
9. Time to sale (код добавлен)
10. Avg installments (код готов, данные = 0)
11. Qualified rate (код готов, данные = 0)
12. Trial rate (код готов, данные = 0)

### 🔴 **Нужна работа: 10 метрик**
13. Upfront cash collected
14. Cancellation rate
15. Followup rate
16. Offers given & rate
17. Rate to close
18. Pickup rate
19. Time to first contact
20. Average followups per lead/sale
21. Sales scripts testing
22. VSL watch -> Close rate

---

## Приоритеты (что делать сначала):

### 🚀 **Быстро можно добавить** (требуют только sync script update):

1. **Pickup rate** - получить `call_disposition` из HubSpot calls API
2. **Связь calls -> deals/contacts** - извлечь associations из `raw_json`
3. **Followup rate** - после связи calls с contacts
4. **Time to first contact** - после связи calls с contacts
5. **Average followups** - после связи calls с contacts

### 📝 **Требуют настройки HubSpot** (custom fields):

6. **Qualified rate** - заполнить `qualified_status` в HubSpot
7. **Trial rate** - заполнить `trial_status`
8. **Avg installments** - заполнить `number_of_installments__months`
9. **Upfront cash collected** - заполнить `upfront_payment`
10. **Cancellation rate** - добавить stage или `is_refunded`
11. **Offers given & rate** - заполнить `offer_given`, `offer_accepted`

### 🔧 **Требуют интеграций** (сложно):

12. **Sales scripts testing** - добавить tracking версий скриптов
13. **VSL watch -> Close rate** - интегрировать video analytics
14. **Rate to close** - получить историю stages

---

## Рекомендации:

### Фаза 1: Улучшить существующий sync (1-2 часа)
```javascript
// scripts/sync-hubspot.js - добавить:
1. call_disposition в hubspot_calls_raw
2. Извлечь associations из raw_json (calls -> deals/contacts)
3. Создать таблицу связей: call_associations (call_id, deal_id, contact_id)
```

После этого добавятся: **+5 метрик** (Pickup rate, Followup rate, Time to first contact, Average followups, Rate to close)

### Фаза 2: Настроить HubSpot custom fields (работа Leo)
```
Добавить/заполнить в HubSpot:
- Deals: qualified_status, trial_status, installments, upfront_payment, is_refunded
- Contacts: sales_script_version, vsl_watched, vsl_watch_duration
```

После этого заработают: **+7 метрик**

### Фаза 3: Интеграции (опционально, долго)
- Video tracking integration
- Advanced funnel analysis

---

## Что делать прямо сейчас:

1. ✅ **Закоммитить** текущие изменения (pagination + Time to Sale)
2. 🔍 **Проверить** `raw_json` в calls - есть ли там associations?
3. 🛠️ **Обновить sync script** - извлечь associations и call_disposition
4. 📊 **Добавить 5 новых метрик** после обновления sync

Хочешь начать с commit или сразу проверим raw_json?
