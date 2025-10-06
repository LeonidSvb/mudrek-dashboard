# Спринт: HubSpot Метрики и Дашборд

**Дата:** 2025-10-06
**Таймлайн:** 2 недели
**Цель:** Настроить все метрики из Milestone 2 и 3 для дашборда аналитики

---

## 1. ЦЕЛЬ СПРИНТА

### Основная задача
Реализовать полный трекинг метрик из HubSpot для дашборда продаж и аналитики.

### Критерии успеха
- ✅ Все метрики Milestone 2 работают и отображаются в дашборде
- ✅ Все метрики Milestone 3 готовы к реализации
- ✅ Данные синхронизируются с Supabase
- ✅ Make.com автоматизация настроена для новых полей
- ✅ SQL запросы готовы для всех метрик

---

## 2. МЕТРИКИ MILESTONE 2 (Высокий приоритет)

### ✅ Готовые метрики
1. **Total sales** - Dashboard Ready
2. **Total deals (rev)** - Dashboard Ready

### ⚠️ Требуют исправления
3. **Average deal size** - Broken (работаешь в своей версии)
4. **Conversion rate** - Needs fixing (добавить использование stages)

### 🔴 Требуют реализации

#### A. Поля уже существуют в HubSpot
5. **Qualified rate**
   - Поле: `qualified_status` (уже создано в HubSpot)
   - POA: Добавить в дашборд
   - Make сценарий: Автоматическое заполнение на основе стадий

#### B. Требуют новых полей в HubSpot
6. **Cancellation rate**
   - POA: Создать stage "cancel" + поле refunds (checkbox)
   - Поле сделки: `cancellation_reason` (dropdown)
   - Поле сделки: `is_refunded` (checkbox)

7. **Followup rate**
   - POA: Проверить API или рассчитать как дни между stages
   - Поле сделки: `followup_count` (number)
   - Поле сделки: `days_between_stages` (number)

8. **Avg installments**
   - Поле сделки: `installment_count` (number)
   - Поле сделки: `installment_plan` (dropdown: 1x, 3x, 6x, 12x)

9. **Average call time**
   - Используем Kavkom integration (уже есть записи звонков)
   - SQL: AVG(call_duration) из hubspot_calls

10. **Total call time**
    - Используем Kavkom integration
    - SQL: SUM(call_duration) из hubspot_calls

11. **Trial rate**
    - Поле: `trial_status` (уже создано в HubSpot)
    - POA: Добавить в дашборд

12. **Time to sale**
    - SQL: Рассчитать разницу между dealstage timestamps
    - Поля: `created_at` -> `closed_won_date`

13. **Different sales scripts testing**
    - Поле контакта: `sales_script_version` (dropdown)
    - Значения: Script A, Script B, Script C

14. **Watched video -> Close rate**
    - Поле: `vsl_watched` (уже создано в HubSpot)
    - Поле: `vsl_watch_duration` (number, минуты)
    - Отслеживать: 4min, 18min просмотры

---

## 3. МЕТРИКИ MILESTONE 3 (Средний приоритет)

### 🔴 Требуют реализации

1. **Upfront cash collected**
   - POA: Требует уточнения
   - Поле сделки: `upfront_payment` (number)

2. **Total calls made**
   - POA: Проверить связь звонков с deals
   - Используем Kavkom integration
   - SQL: COUNT(calls) WHERE deal_id IS NOT NULL

3. **5min-reached-rate**
   - Используем Kavkom integration
   - SQL: COUNT(calls WHERE duration >= 5min) / COUNT(total_calls)

4. **Offers given & rate**
   - POA: Уточнить у Shadi (если это stage)
   - Поле сделки: `offer_given` (checkbox)
   - Поле сделки: `offer_accepted` (checkbox)

5. **The 3 above rate to close** (team efficiency)
   - Рассчитывается после наличия данных выше
   - Формула: qualified_rate × offer_rate × close_rate

6. **Pickup rate**
   - POA: Проверить возможность через API
   - Используем Kavkom integration
   - SQL: COUNT(answered_calls) / COUNT(total_calls)

7. **Time to first contact**
   - POA: Проверить возможность через API
   - SQL: Разница между created_at контакта и первым звонком

8. **Average followups per lead/sale**
   - POA: Проверить возможность через API
   - SQL: AVG(COUNT(calls)) GROUP BY deal_id

---

## 4. ТЕХНИЧЕСКИЕ РЕШЕНИЯ

### 4.1. Новые поля HubSpot (Milestone 2)

```javascript
// Поля для создания в HubSpot API
const fieldsToCreate = [
  // Cancellation tracking
  {
    name: 'cancellation_reason',
    label: 'Cancellation Reason',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    options: [
      { label: 'Too expensive', value: 'too_expensive' },
      { label: 'Not interested', value: 'not_interested' },
      { label: 'Found alternative', value: 'found_alternative' },
      { label: 'Other', value: 'other' }
    ]
  },
  {
    name: 'is_refunded',
    label: 'Is Refunded',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'dealinformation'
  },

  // Followup tracking
  {
    name: 'followup_count',
    label: 'Followup Count',
    type: 'number',
    fieldType: 'number',
    groupName: 'dealinformation'
  },
  {
    name: 'days_between_stages',
    label: 'Days Between Stages',
    type: 'number',
    fieldType: 'number',
    groupName: 'dealinformation'
  },

  // Installments
  {
    name: 'installment_count',
    label: 'Number of Installments',
    type: 'number',
    fieldType: 'number',
    groupName: 'dealinformation'
  },
  {
    name: 'installment_plan',
    label: 'Installment Plan',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'dealinformation',
    options: [
      { label: '1x (Full payment)', value: '1x' },
      { label: '3x', value: '3x' },
      { label: '6x', value: '6x' },
      { label: '12x', value: '12x' }
    ]
  },

  // Sales scripts
  {
    name: 'sales_script_version',
    label: 'Sales Script Version',
    type: 'enumeration',
    fieldType: 'select',
    groupName: 'contactinformation',
    options: [
      { label: 'Script A', value: 'script_a' },
      { label: 'Script B', value: 'script_b' },
      { label: 'Script C', value: 'script_c' }
    ]
  },

  // VSL tracking
  {
    name: 'vsl_watch_duration',
    label: 'VSL Watch Duration (minutes)',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation'
  }
];
```

### 4.2. Новые поля HubSpot (Milestone 3)

```javascript
const milestone3Fields = [
  // Upfront payment
  {
    name: 'upfront_payment',
    label: 'Upfront Payment Amount',
    type: 'number',
    fieldType: 'number',
    groupName: 'dealinformation'
  },

  // Offers
  {
    name: 'offer_given',
    label: 'Offer Given',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'dealinformation'
  },
  {
    name: 'offer_accepted',
    label: 'Offer Accepted',
    type: 'bool',
    fieldType: 'booleancheckbox',
    groupName: 'dealinformation'
  }
];
```

### 4.3. SQL запросы для дашборда

```sql
-- Total Sales (Ready)
SELECT COUNT(*) as total_sales, SUM(amount) as revenue
FROM hubspot_deals
WHERE dealstage = 'closedwon';

-- Average Deal Size (Fix)
SELECT AVG(amount) as avg_deal_size
FROM hubspot_deals
WHERE dealstage = 'closedwon' AND amount > 0;

-- Conversion Rate (Fix - use stages)
SELECT
  COUNT(CASE WHEN dealstage = 'closedwon' THEN 1 END)::float /
  COUNT(*) * 100 as conversion_rate
FROM hubspot_deals
WHERE dealstage IN ('closedwon', 'closedlost');

-- Cancellation Rate (New)
SELECT
  COUNT(CASE WHEN is_refunded = true THEN 1 END)::float /
  COUNT(*) * 100 as cancellation_rate
FROM hubspot_deals
WHERE dealstage = 'closedwon';

-- Qualified Rate (Use existing field)
SELECT
  COUNT(CASE WHEN qualified_status = 'qualified' THEN 1 END)::float /
  COUNT(*) * 100 as qualified_rate
FROM hubspot_deals;

-- Trial Rate (Use existing field)
SELECT
  COUNT(CASE WHEN trial_status = 'started' THEN 1 END)::float /
  COUNT(*) * 100 as trial_rate
FROM hubspot_deals;

-- Average Call Time (Kavkom)
SELECT AVG(duration_seconds) / 60 as avg_call_time_minutes
FROM hubspot_calls
WHERE duration_seconds > 0;

-- Total Call Time (Kavkom)
SELECT SUM(duration_seconds) / 3600 as total_call_time_hours
FROM hubspot_calls;

-- Pickup Rate (Kavkom)
SELECT
  COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END)::float /
  COUNT(*) * 100 as pickup_rate
FROM hubspot_calls;

-- 5min-reached-rate (Kavkom)
SELECT
  COUNT(CASE WHEN duration_seconds >= 300 THEN 1 END)::float /
  COUNT(*) * 100 as five_min_rate
FROM hubspot_calls;

-- Time to Sale
SELECT
  AVG(EXTRACT(EPOCH FROM (closed_won_date - createdate)) / 86400) as avg_days_to_sale
FROM hubspot_deals
WHERE dealstage = 'closedwon';

-- VSL Effectiveness
SELECT
  vsl_watched,
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN deal_stage = 'closedwon' THEN 1 END) as closed_deals,
  COUNT(CASE WHEN deal_stage = 'closedwon' THEN 1 END)::float /
    COUNT(*) * 100 as close_rate
FROM hubspot_contacts c
LEFT JOIN hubspot_deals d ON c.id = d.contact_id
GROUP BY vsl_watched;
```

### 4.4. Make.com Automation Scenarios

#### Сценарий 1: Auto-fill trial_status
```
Trigger: Deal created
Action:
  IF dealstage = 'trial'
  THEN UPDATE trial_status = 'started'
```

#### Сценарий 2: Auto-fill qualified_status
```
Trigger: Deal stage changed
Action:
  IF dealstage = 'qualified'
  THEN UPDATE qualified_status = 'qualified'
```

#### Сценарий 3: Track VSL viewing
```
Trigger: Contact property changed (vsl_watched)
Action:
  IF vsl_watched = true AND vsl_watch_duration >= 18
  THEN UPDATE contact_tag = 'vsl_completed'
```

#### Сценарий 4: Track followups
```
Trigger: New call logged
Action:
  COUNT calls for deal_id
  UPDATE followup_count = count
```

---

## 5. ПЛАН РЕАЛИЗАЦИИ

### Фаза 1: Создание полей (День 1-2)
- ✅ Создать скрипт для всех новых полей Milestone 2
- ✅ Создать скрипт для всех новых полей Milestone 3
- ✅ Протестировать создание полей в HubSpot
- ✅ Проверить видимость полей в UI

### Фаза 2: Make.com автоматизация (День 3-4)
- ✅ Настроить 4 сценария автоматизации
- ✅ Протестировать на тестовых сделках
- ✅ Проверить корректность заполнения полей

### Фаза 3: SQL запросы (День 5-6)
- ✅ Написать SQL для всех метрик Milestone 2
- ✅ Написать SQL для всех метрик Milestone 3
- ✅ Протестировать на реальных данных
- ✅ Оптимизировать производительность запросов

### Фаза 4: Дашборд (День 7-10)
- ✅ Добавить метрики Milestone 2 в дашборд
- ✅ Добавить метрики Milestone 3 в дашборд
- ✅ Создать визуализации (графики, таблицы)
- ✅ Настроить фильтры по датам

### Фаза 5: Тестирование (День 11-12)
- ✅ Проверить корректность всех метрик
- ✅ Сравнить с данными в HubSpot UI
- ✅ Исправить расхождения
- ✅ Финальная проверка

### Фаза 6: Документация (День 13-14)
- ✅ Обновить CHANGELOG.md
- ✅ Создать инструкцию по использованию дашборда
- ✅ Документировать все новые поля

---

## 6. ТАЙМЛАЙН (2 недели)

### Неделя 1: Поля + Автоматизация
- **День 1-2:** Создание всех полей HubSpot (Milestone 2 + 3)
- **День 3-4:** Настройка Make.com сценариев
- **День 5-6:** SQL запросы для метрик
- **День 7:** Тестирование и исправление ошибок

### Неделя 2: Дашборд + Тестирование
- **День 8-9:** Добавление метрик в дашборд
- **День 10-11:** Визуализации и UI
- **День 12:** Финальное тестирование
- **День 13-14:** Документация и запуск

---

## 7. РИСКИ И МИТИГАЦИЯ

| Риск | Митигация |
|------|-----------|
| HubSpot API rate limits | Добавить retry логику, использовать batch requests |
| Поля не видны в UI после создания | Проверять через API и UI, обновлять property settings |
| Kavkom integration данные неполные | Запросить документацию API, проверить все endpoints |
| Make.com сценарии не срабатывают | Добавить детальные логи, тестировать на каждом шаге |
| SQL запросы медленные | Добавить индексы, оптимизировать JOIN |

---

## 8. МЕТРИКИ УСПЕХА

### Технические метрики
- ✅ 100% полей созданы и видны в HubSpot UI
- ✅ 100% Make.com сценариев работают корректно
- ✅ Все SQL запросы выполняются < 2 секунд
- ✅ 0 ошибок синхронизации данных

### Бизнес метрики
- ✅ Все метрики Milestone 2 доступны в дашборде
- ✅ Все метрики Milestone 3 доступны в дашборде
- ✅ Дашборд обновляется в реальном времени
- ✅ Готовность к масштабированию (10K+ deals)

---

## 9. ВОПРОСЫ ДЛЯ УТОЧНЕНИЯ

### К Shadi:
1. **Offers given & rate** - это отдельная стадия в pipeline или checkbox?
2. **Upfront cash collected** - нужна интеграция с платежной системой или ручной ввод?
3. **Different sales scripts** - сколько версий скриптов планируется тестировать?
4. **VWO experiments** - поле уже создано, нужна ли интеграция с VWO API?

---

## СЛЕДУЮЩИЙ СПРИНТ

После завершения этого спринта:
1. Воронки и фильтры (Optin LP → VSL LP → Call → Close)
2. A/B тестирование автоматизация
3. Предиктивная аналитика (ML модели)
4. Интеграция с платежными системами
