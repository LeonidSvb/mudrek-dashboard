# HubSpot API Data Analysis

## Summary

Запрошено по 50 записей каждого типа из HubSpot API с параметром `&associations=...`

**Дата:** 2025-10-10
**Лимит:** 50 записей на тип

## Critical Findings

### 1. CONTACTS - ОТСУТСТВУЕТ ПОЛЕ PHONE!

**Properties возвращенные API (6 полей):**
- createdate
- email
- firstname
- hs_object_id
- lastmodifieddate
- lastname

**❌ ПРОБЛЕМА:** Поле `phone` НЕ ВКЛЮЧЕНО в default properties!

**Почему 97% contacts без phone:**
- Sync скрипт НЕ запрашивает phone явно
- API возвращает только 6 default properties
- В БД сохраняется raw_json БЕЗ phone поля

**Schema показывает 422 доступных properties**, но API возвращает только 6!

**Associations:**
- Некоторые contacts имеют associations.deals
- Пример: contact 75062 → deal 43499885994 (type: "contact_to_deal")

---

### 2. DEALS - 8 PROPERTIES

**Properties возвращенные API (8 полей):**
- amount
- closedate
- createdate
- dealname
- dealstage
- hs_lastmodifieddate
- hs_object_id
- pipeline

**Schema показывает 215 доступных properties**, но API возвращает только 8!

**Associations:**
- ✅ Deals ИМЕЮТ associations.contacts
- Тип: "deal_to_contact"
- Пример: deal 43486818666 → contact 150479232059
- ⚠️ Некоторые deals БЕЗ associations (43486825757, 43486825758, 43486825759)

---

### 3. CALLS - ВСЕГО 3 PROPERTIES!

**Properties возвращенные API (3 поля):**
- hs_createdate
- hs_lastmodifieddate
- hs_object_id

**❌ КРИТИЧНО: ОТСУТСТВУЮТ ВСЕ ВАЖНЫЕ ПОЛЯ:**
- ✗ call_to_number
- ✗ call_from_number
- ✗ call_duration
- ✗ call_timestamp
- ✗ call_disposition
- ✗ call_recording_url

**Schema показывает 97 доступных properties**, но API возвращает только 3!

**Associations:**
- ❌ Calls НЕ ИМЕЮТ associations вообще
- Запрошены: contacts, deals, companies
- Результат: ПУСТО

---

### 4. OWNERS - 8 записей

✅ Owners синкаются корректно

---

## Root Cause Analysis

### Почему API возвращает так мало полей?

**Проблема в sync-parallel.js:**

```javascript
// sync-parallel.js:26-35
let url = `${BASE_URL}/crm/v3/objects/${objectType}?limit=100&archived=false`;

if (fetchAllProperties) {
  url += `&propertiesWithHistory=all`;  // НЕ ИСПОЛЬЗУЕТСЯ!
} else if (properties.length > 0) {
  const propsParam = properties.map(p => `properties=${p}`).join('&');
  url += `&${propsParam}`;
}
```

**Текущее поведение:**
1. Sync вызывает `fetchAllFromHubSpot('contacts', properties, false)`
2. `fetchAllProperties = false` → параметр `properties` игнорируется
3. API возвращает только DEFAULT fields (6-8 штук)

**Правильное поведение:**
```javascript
// Нужно ЯВНО указывать properties:
const url = '/crm/v3/objects/contacts?' +
  'properties=phone&' +
  'properties=mobilephone&' +
  'properties=hubspot_owner_id&' +
  'properties=vsl_watched&' +
  // ... все остальные
```

---

## Comparison: API vs Database

| Object | API Properties | Schema Properties | DB raw_json | Coverage |
|--------|---------------|-------------------|-------------|----------|
| Contacts | 6 | 422 | 12 | 1.4% |
| Deals | 8 | 215 | 15 | 3.7% |
| Calls | 3 | 97 | 11 | 3.1% |

**Вывод:** Мы синкаем МЕНЬШЕ 5% доступных данных!

---

## Associations Status

| From → To | Status | Example | Notes |
|-----------|--------|---------|-------|
| Contacts → Deals | ✅ ЕСТЬ | contact 75062 → deal 43499885994 | type: contact_to_deal |
| Deals → Contacts | ✅ ЕСТЬ | deal 43486818666 → contact 150479232059 | type: deal_to_contact |
| Calls → Contacts | ❌ НЕТ | - | Associations пустые |
| Calls → Deals | ❌ НЕТ | - | Associations пустые |

**Вывод:**
- Deals ↔ Contacts связь РАБОТАЕТ через associations
- Calls НЕ связаны ни с чем (ни contacts, ни deals)

---

## Immediate Actions Required

### 1. FIX CONTACTS SYNC (HIGH PRIORITY)

**Добавить в sync-parallel.js:116-120:**

```javascript
const properties = [
  'phone',              // ← ДОБАВИТЬ!
  'mobilephone',        // ← ДОБАВИТЬ!
  'email',
  'firstname',
  'lastname',
  'createdate',
  'lastmodifieddate',
  'lifecyclestage',
  'hs_lead_status',
  'hubspot_owner_id',
  'vsl_watched',
  'sales_script_version'
];
```

### 2. FIX CALLS SYNC (CRITICAL)

**Добавить в sync-parallel.js:171-175:**

```javascript
const properties = [
  'hs_call_duration',        // ← УЖЕ ЕСТЬ
  'hs_call_direction',
  'hs_call_disposition',
  'hs_call_body',
  'hs_timestamp',            // ← ВАЖНО: это call_timestamp!
  'hs_call_recording_url',
  'hs_call_from_number',
  'hs_call_to_number',       // ← КРИТИЧНО для phone matching!
  'hs_call_status',
  'hs_createdate',
  'hs_lastmodifieddate'
];
```

### 3. TEST ASSOCIATIONS

Associations API v4 показывает 0 results для всех объектов.

**Возможные причины:**
- Calls не созданы через HubSpot UI (импортированы?)
- Calls созданы до включения associations
- Calls требуют ручного создания associations

**Нужно проверить:**
1. Создать test call через HubSpot UI
2. Связать с contact
3. Запросить через API
4. Если associations появятся → нужна ручная миграция

---

## Next Steps

**Immediate (сегодня):**
1. ✅ Исправить properties в sync-parallel.js
2. ✅ Re-sync last 3 months с полными properties
3. ✅ Проверить phone matching (должно быть 90%+)

**Short-term (эта неделя):**
1. ⏳ Дождаться CSV от пользователя
2. ⏳ Сравнить CSV vs API data
3. ⏳ Решить проблему с calls associations

**Long-term:**
1. 🔮 Migrate к Wrappers FDW (опционально)
2. 🔮 Implement associations для calls (если возможно)
