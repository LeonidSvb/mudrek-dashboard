# Future Improvements Plan

**Дата:** 2025-10-08
**Статус:** Рекомендации для улучшения
**Приоритет:** LOW (можно делать после запуска dashboard)

---

## Обзор

Этот документ содержит рекомендации по улучшению структуры данных в HubSpot CRM. Все предложенные изменения **не критичны** и могут быть выполнены после запуска основного дашборда.

**Текущее состояние:** ✅ Работает, 22 метрики готовы

---

## Категория 1: Очистка избыточных полей

### Проблема

В CRM накопилось **24+ junk поля** которые создают визуальный шум и усложняют работу менеджеров.

### Поля для удаления (Contacts)

#### A) Facebook Lead Ads мусор (24 поля)

```
lead_ad_prop_
lead_ad_prop___
lead_ad_prop____
lead_ad_prop____120____60_______
lead_ad_prop_____
lead_ad_prop______
lead_ad_prop______2_4_8_16_
lead_ad_prop_______
lead_ad_prop_______20007000___
lead_ad_prop_______256_512_1024_2048_4096_8191
lead_ad_prop________
lead_ad_prop_________
lead_ad_prop_________200300__
lead_ad_prop_________400500___
lead_ad_prop_________500700___
lead_ad_prop_________500700____
lead_ad_prop_________500750___
lead_ad_prop__________
lead_ad_prop___________
lead_ad_prop_____________
lead_ad_prop_______________
lead_ad_prop________________
lead_ad_prop___________________
lead_ad_prop_______________________________
```

**Причина удаления:** Автоматически созданы Facebook Lead Ads интеграцией, не содержат полезных данных.

**Как удалить:**
1. HubSpot → Settings → Properties → Contact Properties
2. Найти `lead_ad_prop_*`
3. Delete (по одному)

**Риск:** Минимальный (эти поля не используются)

---

#### B) Избыточные Notes поля (6 полей)

```
notes1
notes2
notes3
notes_4
notes_5
legacy_note
message
```

**Проблема:** Слишком много полей для заметок, менеджеры не знают куда писать.

**Рекомендация:**
- Оставить: `notes` (основное поле)
- Удалить: `notes1, notes2, notes3, notes_4, notes_5`
- Удалить: `legacy_note` (устарело)
- Переименовать: `message` → удалить (дублирует notes)

**Как исправить:**
1. Экспортировать данные из `notes1-5` в один `notes`
2. Удалить старые поля

**Риск:** Средний (нужно предварительно экспортировать данные)

---

### Поля для удаления (Deals)

#### C) Contact data в Deals (4 поля)

```
email
email2
lname
phone_number
```

**Проблема:** Personal contact information дублируется в deals. Это anti-pattern западных CRM.

**Почему неправильно:**
- Deals = про **деньги и процесс продажи**
- Contacts = про **личные данные клиента**
- Если email меняется в Contact, в Deal остается старый

**Рекомендация:** Удалить эти поля из Deals.

**Как использовать вместо:**
```
Deal → Associated Contact → Email/Phone
```

**Риск:** Низкий (данные есть в Contacts)

---

#### D) Unclear/Duplicate fields (3 поля)

```
status__cloned_
open
deal_whole_amount (есть amount)
```

**Проблема:** Назначение полей неясно, могут быть дубликатами.

**Рекомендация:** Проверить используются ли эти поля. Если нет → удалить.

---

## Категория 2: Дублирование данных

### Проблема

Payment и deal information дублируется между Contacts и Deals.

### Поля в Contacts которые дублируют Deals (7 полей)

```
deal_amount              → есть в deals.amount
closedate                → есть в deals.closedate
days_to_close            → calculated field
payment_method           → есть в deals.payment_method
monthly_payment          → есть в deals.installment_monthly_amount
number_of_installments   → есть в deals.number_of_installments__months
total_revenue            → SUM(deals.amount) per contact
```

**Проблема:**
- Данные рассинхронизируются (deal amount меняется, в contact остается старое)
- Усложняет отчетность (какая цифра правильная?)
- Занимает место в UI

**Рекомендация:**

**УДАЛИТЬ из Contacts:**
- `deal_amount`
- `closedate`
- `days_to_close`
- `payment_method`
- `monthly_payment`
- `number_of_installments`

**ОСТАВИТЬ в Deals** (source of truth):
- `amount`
- `closedate`
- `payment_method`
- `installment_monthly_amount`
- `number_of_installments__months`

**Как получить эти данные для Contact:**
```
Contact → Associated Deals → Sum(amount)
```

**Исключение: `total_revenue`**

Это поле можно оставить как **calculated/rollup field** если настроить автоматическое обновление:
```
Contact.total_revenue = SUM(Associated Deals WHERE dealstage = closedwon)
```

HubSpot поддерживает Rollup Properties для автоматического расчета.

---

### Поле в Contacts которое должно быть в Deals

#### `offer_sent`

**Проблема:** Оффер отправляется для **конкретной сделки**, не для контакта вообще.

**Текущее:** `Contact.offer_sent = yes`
**Правильно:** `Deal.offer_given = yes`

**Мы уже создали правильное поле:** `Deal.offer_given` ✅

**Рекомендация:**
1. Мигрировать данные: `Contact.offer_sent` → `Deal.offer_given`
2. Удалить `Contact.offer_sent`

**SQL для миграции:**
```sql
-- Найти contacts с offer_sent = yes
SELECT hubspot_id, offer_sent
FROM hubspot_contacts_raw
WHERE offer_sent = 'yes';

-- Обновить associated deals
UPDATE hubspot_deals_raw d
SET offer_given = 'yes'
FROM hubspot_contacts_raw c
WHERE c.offer_sent = 'yes'
  AND d.contact_id = c.hubspot_id;  -- если есть связь
```

**Риск:** Средний (нужно правильно мигрировать данные)

---

## Категория 3: Western CRM Best Practices

### Философия данных

| Entity | Что хранить | Что НЕ хранить |
|--------|------------|---------------|
| **Contact** | Personal info (name, email, phone) | Deal amounts, payment info |
| | Demographics (city, age) | Close dates, sales data |
| | Lifecycle stage | Offer status (это про deal) |
| | Marketing data (source, campaign) | |
| **Deal** | Sales process (stage, pipeline) | Personal contact info |
| | Money (amount, payments) | Demographics |
| | Offer status | Source/campaign |
| | Dates (create, close) | |

### Текущее состояние vs Стандарт

**Оценка: 7/10** ⭐⭐⭐⭐⭐⭐⭐

**Что правильно:**
- ✅ Payment structure (installments, upfront) - отлично!
- ✅ Offer tracking (`offer_given`, `offer_accepted`) - западный стандарт
- ✅ A/B testing (`vsl_watched`, `sales_script_version`) - modern!
- ✅ Standard fields (`amount`, `dealstage`)

**Что неправильно:**
- ❌ 24 junk поля (`lead_ad_prop_*`)
- ⚠️ Дублирование (payment info в contacts И deals)
- ⚠️ Contact fields в deals (email, phone)

---

## Рекомендуемый план очистки

### Phase 1: Low Risk (можно сделать сейчас)

**1. Удалить Facebook Lead Ads мусор (5 минут)**
```
Удалить: lead_ad_prop_* (24 поля)
Риск: Минимальный
```

**2. Удалить unclear fields в Deals (2 минуты)**
```
Удалить: status__cloned_, open
Проверить: deal_whole_amount (возможно дубликат amount)
Риск: Низкий (если поля не используются)
```

### Phase 2: Medium Risk (нужна подготовка)

**3. Консолидировать Notes поля (10 минут)**
```
1. Экспортировать notes1-5 в CSV
2. Объединить все в один notes field
3. Удалить notes1, notes2, notes3, notes_4, notes_5
Риск: Средний (нужен backup)
```

**4. Мигрировать offer_sent (15 минут)**
```
1. Экспортировать Contact.offer_sent
2. Обновить Deal.offer_given
3. Удалить Contact.offer_sent
Риск: Средний (нужна миграция данных)
```

### Phase 3: Требует обсуждения с командой

**5. Удалить дублирующие payment fields из Contacts**
```
Удалить: deal_amount, payment_method, monthly_payment, etc.
Риск: Высокий (может использоваться в Make.com workflows)
⚠️ Проверить все Make scenarios перед удалением!
```

**6. Удалить contact info из Deals**
```
Удалить: email, email2, lname, phone_number
Риск: Высокий (может использоваться в шаблонах/workflows)
⚠️ Проверить email templates и workflows!
```

---

## Estimated Time

| Task | Time | Risk | Priority |
|------|------|------|----------|
| Delete junk fields | 10 min | Low | High |
| Consolidate notes | 15 min | Medium | Medium |
| Migrate offer_sent | 20 min | Medium | Medium |
| Remove duplicate payment fields | 30 min | High | Low |
| Remove contact info from deals | 15 min | High | Low |
| **Total** | **~90 min** | | |

---

## Рекомендации

### Когда делать

**НЕ СЕЙЧАС!** ❌

Лучшее время:
1. ✅ После запуска dashboard (чтобы не сломать метрики)
2. ✅ В нерабочее время (weekend)
3. ✅ После согласования с командой

### Что делать сначала

**Priority 1:**
- Удалить `lead_ad_prop_*` (24 поля)
- Низкий риск, immediate cleanup

**Priority 2:**
- Консолидировать notes fields
- Мигрировать `offer_sent` → `Deal.offer_given`

**Priority 3 (обсудить с командой):**
- Удалить дублирующие payment fields
- Проверить Make.com workflows

---

## Before/After сравнение

### Contacts (до очистки)

```
151 fields
├── 24 lead_ad_prop_* (junk)
├── 7 notes fields
├── 7 duplicate payment fields
└── 113 useful fields
```

### Contacts (после очистки)

```
113 useful fields ✨
├── Personal info (name, email, phone)
├── Demographics (city, age, etc)
├── Lifecycle tracking
├── Marketing data (source, campaign)
└── A/B testing (vsl_watched, sales_script_version)
```

**Сокращение: 151 → 113 fields (-25%)**

---

### Deals (до очистки)

```
55 fields
├── 4 contact info (duplicate)
├── 3 unclear fields
└── 48 useful fields
```

### Deals (после очистки)

```
48 useful fields ✨
├── Sales data (amount, stage, dates)
├── Payment tracking (installments, upfront)
├── Process tracking (qualified, trial, offer)
└── Manager assignment
```

**Сокращение: 55 → 48 fields (-13%)**

---

## Conclusion

Текущая структура CRM **работает**, но имеет избыточность которую можно постепенно почистить.

**Главное:**
1. ✅ Dashboard можно запускать с текущими полями
2. ✅ Метрики корректные
3. ⚠️ Cleanup - nice to have, не критично

**Next Steps:**
1. Запустить dashboard
2. Согласовать plan с командой
3. Выполнить cleanup в нерабочее время

---

**Prepared by:** Claude Code
**Date:** 2025-10-08
**For review by:** Client team
