-- =====================================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ ПРОВЕРКИ МИГРАЦИЙ
-- =====================================================

-- 1. Все примененные миграции (по дате)
SELECT
  version,
  name,
  created_by,
  TO_TIMESTAMP(version::BIGINT) as applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- 2. Последняя миграция
SELECT
  version,
  name,
  TO_TIMESTAMP(version::BIGINT) as applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 1;

-- 3. Проверить есть ли конкретная миграция
SELECT EXISTS (
  SELECT 1
  FROM supabase_migrations.schema_migrations
  WHERE name = '034_add_call_metrics_to_dashboard'
) as is_applied;

-- 4. Сколько миграций применено
SELECT COUNT(*) as total_migrations
FROM supabase_migrations.schema_migrations;

-- 5. Миграции за последние 24 часа
SELECT
  version,
  name,
  TO_TIMESTAMP(version::BIGINT) as applied_at
FROM supabase_migrations.schema_migrations
WHERE TO_TIMESTAMP(version::BIGINT) > NOW() - INTERVAL '24 hours'
ORDER BY version DESC;
