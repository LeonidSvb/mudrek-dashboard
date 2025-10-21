# BASELINE - 2025-10-21

## Что произошло

**Дата:** 2025-10-21
**Причина:** Переход на Supabase CLI для управления миграциями

## До baseline

### Проблема
- 51 файл миграций в `migrations/`
- Только 17 применено в Supabase
- Хаос: какие применены, какие нет?
- Применение вручную через SQL Editor и MCP
- Нет tracking системы

### Применённые миграции в Supabase (17):

1. 20251013124740 - update_closedate_from_csv_safe
2. 20251014073011 - dashboard_overview_with_cron
3. 20251014073603 - dashboard_overview_with_owner_filter
4. 20251014074135 - deals_breakdown_aggregation
5. 20251014074459 - fix_deals_breakdown_ambiguous_column
6. 20251014140237 - add_call_metrics_to_dashboard
7. 20251015090047 - fix_dashboard_overview_performance
8. 20251016085646 - modular_metrics_functions
9. 20251016093433 - cleanup_legacy_and_fix_conversion_rate
10. 20251017024236 - add_contact_stage_column
11. 20251017024349 - create_sales_funnel_function
12. 20251017025041 - update_sales_funnel_with_correct_stages
13. 20251021134838 - fix_timeline_owner_filter_for_calls
14. 20251021135850 - add_pickup_rate_to_call_metrics
15. 20251021140755 - call_to_close_metrics
16. 20251021140757 - update_pickup_rate_use_disposition_uuid
17. 20251021155234 - fix_column_names_in_metrics_functions

### Состояние БД на момент baseline:

**Таблицы:**
- hubspot_contacts_raw
- hubspot_deals_raw
- hubspot_calls_raw
- hubspot_call_associations
- И другие...

**Materialized Views:**
- call_contact_matches_mv
- daily_metrics_mv

**Функции:**
- get_sales_metrics()
- get_call_metrics()
- get_conversion_metrics()
- get_payment_metrics()
- get_offer_metrics()
- get_time_metrics()
- get_sales_funnel()
- get_call_to_close_metrics()

## После baseline

### Новая структура:

```
supabase/
└── migrations/
    └── 20251021163342_baseline.sql  ← ТОЧКА ОТСЧЕТА

archive/
└── old-migrations/
    └── *.sql  ← Все старые миграции (51 файл)
```

### Новый workflow:

1. **Создать миграцию:**
   ```bash
   npx supabase migration new feature_name
   ```

2. **Применить:**
   ```bash
   export SUPABASE_ACCESS_TOKEN="xxx"
   npx supabase db push
   ```

3. **Проверить:**
   ```bash
   npx supabase migration list
   ```

## Важно

- ✅ Все старые миграции ПРИМЕНЕНЫ в БД
- ✅ Файлы в `archive/old-migrations/` - только для истории
- ✅ НЕ нужно re-apply старые миграции
- ✅ С этого момента - только через Supabase CLI
