/**
 * =====================================================================
 * Migration 021: Daily Metrics Materialized View
 * =====================================================================
 *
 * Создает materialized view с предрасчитанными метриками по дням.
 * Это как "Excel таблица" - данные рассчитаны заранее, чтение ОЧЕНЬ быстрое.
 *
 * СТРУКТУРА:
 *   - Каждая строка = 1 день + 1 менеджер
 *   - Все метрики предрасчитаны
 *   - Индексы для быстрого фильтра по датам и owner_id
 *
 * ОБНОВЛЕНИЕ:
 *   После загрузки новых данных из HubSpot запустить:
 *   REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;
 *
 * РАЗМЕР:
 *   ~730 дней × 10 менеджеров × 160 bytes = ~1.2 MB
 *   (очень мало!)
 *
 * VERSION: 1.0
 * =====================================================================
 */

-- Удаляем старый view если есть
DROP MATERIALIZED VIEW IF EXISTS daily_metrics_mv CASCADE;

-- Создаем materialized view
CREATE MATERIALIZED VIEW daily_metrics_mv AS
SELECT
  -- ================================================================
  -- КЛЮЧИ (для фильтрации и группировки)
  -- ================================================================
  DATE(d.closedate) as metric_date,
  d.hubspot_owner_id as owner_id,

  -- ================================================================
  -- SALES METRICS (4 метрики)
  -- ================================================================
  -- Сумма продаж за день (closedwon)
  SUM(CASE WHEN d.dealstage = 'closedwon' THEN d.amount ELSE 0 END) as daily_sales,

  -- Количество закрытых сделок
  COUNT(*) FILTER (WHERE d.dealstage = 'closedwon') as daily_deals_won,

  -- Сумма всех amount (для AVG расчета)
  SUM(CASE WHEN d.dealstage = 'closedwon' AND d.amount > 0 THEN d.amount ELSE 0 END) as daily_sales_sum_for_avg,

  -- Количество сделок с amount > 0 (для AVG расчета)
  COUNT(*) FILTER (WHERE d.dealstage = 'closedwon' AND d.amount > 0) as daily_deals_count_for_avg,

  -- ================================================================
  -- CONVERSION METRICS (3 метрики)
  -- ================================================================
  -- Количество квалифицированных сделок
  COUNT(*) FILTER (WHERE d.qualified_status = 'yes') as daily_qualified,

  -- Количество триальных сделок
  COUNT(*) FILTER (WHERE d.trial_status = 'yes') as daily_trials,

  -- Количество отменённых сделок
  COUNT(*) FILTER (WHERE d.dealstage = 'closedlost') as daily_lost,

  -- Общее количество всех сделок (для % расчетов)
  COUNT(*) as daily_total_deals,

  -- ================================================================
  -- PAYMENT METRICS (2 метрики)
  -- ================================================================
  -- Сумма первых платежей
  SUM(CASE WHEN d.upfront_payment > 0 AND d.dealstage = 'closedwon'
    THEN d.upfront_payment ELSE 0 END) as daily_upfront_cash,

  -- Сумма рассрочек (для AVG)
  SUM(CASE WHEN d.number_of_installments__months > 0 AND d.dealstage = 'closedwon'
    THEN d.number_of_installments__months ELSE 0 END) as daily_installments_sum,

  -- Количество рассрочек (для AVG)
  COUNT(*) FILTER (
    WHERE d.number_of_installments__months > 0
      AND d.dealstage = 'closedwon'
  ) as daily_installments_count,

  -- ================================================================
  -- OFFER METRICS (2 метрики)
  -- ================================================================
  -- Количество отправленных офферов
  COUNT(*) FILTER (WHERE d.offer_given = 'yes') as daily_offers_given,

  -- Количество принятых офферов + closedwon
  COUNT(*) FILTER (
    WHERE d.offer_given = 'yes'
      AND d.offer_accepted = 'yes'
      AND d.dealstage = 'closedwon'
  ) as daily_offers_closed,

  -- ================================================================
  -- TIME METRICS (1 метрика)
  -- ================================================================
  -- Сумма дней от создания до закрытия (для AVG)
  SUM(
    CASE
      WHEN d.dealstage = 'closedwon'
        AND d.closedate IS NOT NULL
        AND d.createdate IS NOT NULL
      THEN EXTRACT(EPOCH FROM (d.closedate::timestamp - d.createdate::timestamp)) / 86400
      ELSE 0
    END
  ) as daily_time_to_sale_sum,

  -- Количество сделок с временем (для AVG)
  COUNT(*) FILTER (
    WHERE d.dealstage = 'closedwon'
      AND d.closedate IS NOT NULL
      AND d.createdate IS NOT NULL
  ) as daily_time_to_sale_count

FROM hubspot_deals_raw d
WHERE d.closedate IS NOT NULL
GROUP BY DATE(d.closedate), d.hubspot_owner_id;

-- ================================================================
-- ИНДЕКСЫ (для быстрой фильтрации)
-- ================================================================
CREATE UNIQUE INDEX idx_daily_metrics_date_owner
  ON daily_metrics_mv (metric_date, owner_id);

CREATE INDEX idx_daily_metrics_date
  ON daily_metrics_mv (metric_date);

CREATE INDEX idx_daily_metrics_owner
  ON daily_metrics_mv (owner_id);

-- ================================================================
-- ПРОВЕРКА
-- ================================================================
-- Сколько строк в view?
-- SELECT COUNT(*) FROM daily_metrics_mv;

-- Пример данных
-- SELECT * FROM daily_metrics_mv LIMIT 10;

-- Размер view
-- SELECT pg_size_pretty(pg_total_relation_size('daily_metrics_mv'));
