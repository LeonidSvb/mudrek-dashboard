# Sprint 01: HubSpot Metrics & Dashboard

**Дата:** 2025-10-06
**Таймлайн:** 2 дня
**Цель:** Настроить все метрики из Milestone 2 и 3 для дашборда аналитики

---

## Цель спринта

Реализовать полный трекинг метрик из HubSpot для дашборда продаж и аналитики.

### Критерии успеха
- ✅ Все метрики Milestone 2 работают и отображаются в дашборде
- ✅ Все метрики Milestone 3 готовы к реализации
- ✅ Данные синхронизируются с Supabase
- ✅ Make.com автоматизация настроена для новых полей
- ✅ SQL запросы готовы для всех метрик

---

## Метрики Milestone 2 (Высокий приоритет)

### ✅ Готовые метрики
1. Total sales - Dashboard Ready
2. Total deals (rev) - Dashboard Ready

### ⚠️ Требуют исправления
3. Average deal size - Broken (работаешь в своей версии)
4. Conversion rate - Needs fixing (добавить использование stages)

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

## Метрики Milestone 3 (Средний приоритет)

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

## План реализации (2 дня)

### День 1: Поля + Make.com
- ✅ Создать все новые поля HubSpot (Milestone 2 + 3)
- ✅ Настроить Make.com автоматизацию (4 сценария)
- ✅ Протестировать на тестовых данных

### День 2: SQL + Дашборд
- ✅ Написать SQL запросы для всех метрик
- ✅ Добавить метрики в дашборд
- ✅ Финальное тестирование

---

## Tasks

См. папку `tasks/` для детальных задач:

- ⏸️ [001-create-hubspot-fields.md](tasks/001-create-hubspot-fields.md)
- ⏸️ [002-setup-make-automation.md](tasks/002-setup-make-automation.md)
- ⏸️ [003-sql-queries.md](tasks/003-sql-queries.md)
- ⏸️ [004-dashboard-integration.md](tasks/004-dashboard-integration.md)

---

## Документация

См. папку `docs/` для технических решений:

- [hubspot-fields.md](docs/hubspot-fields.md) - Все новые поля HubSpot
- [sql-queries.md](docs/sql-queries.md) - SQL запросы для метрик
- [make-scenarios.md](docs/make-scenarios.md) - Make.com сценарии

---

## Вопросы для уточнения

### К Shadi:
1. **Offers given & rate** - это отдельная стадия в pipeline или checkbox?
2. **Upfront cash collected** - нужна интеграция с платежной системой или ручной ввод?
3. **Different sales scripts** - сколько версий скриптов планируется тестировать?
4. **VWO experiments** - поле уже создано, нужна ли интеграция с VWO API?
