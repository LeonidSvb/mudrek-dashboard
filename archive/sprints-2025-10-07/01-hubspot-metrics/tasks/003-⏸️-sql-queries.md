# 003 - SQL Queries for Metrics

**Status:** ⏸️ Pending

---

## Goal

Написать SQL запросы для всех метрик Milestone 2 и 3.

## Acceptance Criteria

- [ ] SQL запросы для всех 14 метрик Milestone 2
- [ ] SQL запросы для всех 8 метрик Milestone 3
- [ ] Все запросы протестированы на реальных данных
- [ ] Время выполнения каждого запроса < 2 секунд
- [ ] Запросы сохранены в отдельном файле для переиспользования

## Technical Details

### Milestone 2 Queries

```sql
-- Cancellation Rate
SELECT
  COUNT(CASE WHEN is_refunded = true THEN 1 END)::float /
  COUNT(*) * 100 as cancellation_rate
FROM hubspot_deals
WHERE dealstage = 'closedwon';

-- Qualified Rate
SELECT
  COUNT(CASE WHEN qualified_status = 'qualified' THEN 1 END)::float /
  COUNT(*) * 100 as qualified_rate
FROM hubspot_deals;

-- Trial Rate
SELECT
  COUNT(CASE WHEN trial_status = 'started' THEN 1 END)::float /
  COUNT(*) * 100 as trial_rate
FROM hubspot_deals;

-- Average Call Time
SELECT AVG(duration_seconds) / 60 as avg_call_time_minutes
FROM hubspot_calls
WHERE duration_seconds > 0;

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

### Files to Create
- `supabase/queries/milestone-2-metrics.sql`
- `supabase/queries/milestone-3-metrics.sql`

### Dependencies
- Requires: Task #001 (поля должны существовать)
- Supabase tables: hubspot_deals, hubspot_contacts, hubspot_calls

## Testing

- [ ] Запустить каждый запрос в Supabase SQL Editor
- [ ] Сравнить результаты с HubSpot UI
- [ ] Проверить производительность (EXPLAIN ANALYZE)
- [ ] Добавить индексы если нужно

## Notes

Все запросы сохранить в папку `docs/sql-queries.md` для документации.
