-- Migration 024: Rollback migration 023 - restore closedate from backup
-- Reason: Migration 023 used WRONG field (Last payment instead of 1st payment)
-- Created: 2025-10-14

-- ======================================================================
-- ROLLBACK MIGRATION 023
-- ======================================================================

-- Restore closedate from backup (before migration 023)
UPDATE hubspot_deals_raw d
SET
  closedate = b.closedate,
  updated_at = NOW()
FROM backup_deals_closedate_20251013 b
WHERE d.hubspot_id = b.hubspot_id;

-- Verification query
SELECT
  'ROLLBACK COMPLETED' as status,
  COUNT(*) as total_deals,
  COUNT(DISTINCT closedate) as unique_dates,
  MIN(closedate) as min_date,
  MAX(closedate) as max_date
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon';
