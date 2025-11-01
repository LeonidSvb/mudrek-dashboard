-- Auto-sync owner phone numbers from calls
-- Created: 2025-10-31
-- Purpose: Automatically extract and sync manager phone numbers from call data

-- Function 1: Extract phone numbers from calls
CREATE OR REPLACE FUNCTION extract_owner_phone_numbers()
RETURNS TABLE(
  owner_id TEXT,
  owner_name TEXT,
  detected_phones TEXT[],
  total_calls_from_phones BIGINT
)
LANGUAGE SQL
AS $$
  WITH recent_calls AS (
    -- Берём последние 30000 звонков для ускорения
    SELECT call_from_number, call_to_number
    FROM hubspot_calls_raw
    WHERE call_from_number IS NOT NULL
    AND call_to_number IS NOT NULL
    ORDER BY call_timestamp DESC NULLS LAST
    LIMIT 30000
  ),
  owner_contact_phones AS (
    -- Получаем телефоны контактов для каждого owner
    SELECT
      o.owner_id,
      o.owner_name,
      c.phone
    FROM hubspot_owners o
    LEFT JOIN hubspot_contacts_raw c ON c.hubspot_owner_id = o.owner_id
    WHERE c.phone IS NOT NULL
  ),
  phone_matches AS (
    -- Находим звонки, где call_to_number совпадает с phone контакта
    SELECT
      ocp.owner_id,
      ocp.owner_name,
      rc.call_from_number,
      COUNT(*) as call_count
    FROM owner_contact_phones ocp
    INNER JOIN recent_calls rc ON rc.call_to_number = ocp.phone
    GROUP BY ocp.owner_id, ocp.owner_name, rc.call_from_number
  ),
  ranked_phones AS (
    SELECT
      owner_id,
      owner_name,
      call_from_number,
      call_count,
      ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY call_count DESC) as rank
    FROM phone_matches
  )
  SELECT
    owner_id,
    owner_name,
    array_agg(call_from_number ORDER BY call_count DESC) as detected_phones,
    SUM(call_count) as total_calls_from_phones
  FROM ranked_phones
  WHERE rank <= 10
  GROUP BY owner_id, owner_name;
$$;

COMMENT ON FUNCTION extract_owner_phone_numbers() IS
'Автоматически извлекает номера телефонов менеджеров из звонков.
Анализирует последние 30000 звонков и находит наиболее частые call_from_number для каждого owner.
Возвращает топ-10 номеров для каждого менеджера.';

-- Function 2: Sync phone numbers to hubspot_owners table
CREATE OR REPLACE FUNCTION sync_owner_phone_numbers()
RETURNS TABLE(
  owner_id TEXT,
  owner_name TEXT,
  old_phones TEXT[],
  new_phones TEXT[],
  action TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH extracted AS (
    SELECT * FROM extract_owner_phone_numbers()
  ),
  updates AS (
    UPDATE hubspot_owners o
    SET
      phone_numbers = e.detected_phones,
      updated_at = NOW()
    FROM extracted e
    WHERE o.owner_id = e.owner_id
    AND (
      o.phone_numbers IS NULL
      OR o.phone_numbers != e.detected_phones
    )
    RETURNING
      o.owner_id,
      o.owner_name,
      o.phone_numbers as old_phones,
      e.detected_phones as new_phones,
      CASE
        WHEN o.phone_numbers IS NULL THEN 'inserted'
        ELSE 'updated'
      END as action
  )
  SELECT * FROM updates;
END;
$$;

COMMENT ON FUNCTION sync_owner_phone_numbers() IS
'Синхронизирует номера телефонов менеджеров в таблице hubspot_owners.
Автоматически извлекает номера из звонков и обновляет таблицу.
Возвращает список изменённых записей.
Используется в скрипте scripts/sync-owners.js';
