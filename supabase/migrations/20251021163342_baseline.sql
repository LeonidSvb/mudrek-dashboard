/**
 * =====================================================================
 * BASELINE MIGRATION
 * =====================================================================
 *
 * 0B0: 2025-10-21
 *
 * -B> baseline <83@0F8O - B>G:0 >BAG5B0 4;O =>2>9 A8AB5<K <83@0F89.
 *
 * '" # !",   (4> MB>9 <83@0F88):
 * - A5 B01;8FK (hubspot_contacts_raw, hubspot_deals_raw, hubspot_calls_raw 8 B.4.)
 * - A5 materialized views (call_contact_matches_mv, daily_metrics_mv)
 * - A5 DC=:F88 (get_sales_metrics, get_call_metrics, get_conversion_metrics 8 B.4.)
 * - A5 8=45:AK
 * - 17 <83@0F89 ?@8<5=5=> 2@CG=CN G5@57 SQL Editor 8 MCP
 *
 * ! -" ":
 * - A5 =>2K5 <83@0F88 G5@57 Supabase CLI
 * - $09;K: supabase/migrations/
 * - @8<5=5=85: npx supabase db push
 *
 * !" +  &:
 * - 5@5=5A5=K 2 archive/old-migrations/
 * - !<. archive/BASELINE.md 4;O 45B0;59
 *
 * =====================================================================
 */

-- -B0 <83@0F8O ?CAB0O - 2A5 87<5=5=8O C65 ?@8<5=5=K 2 
-- @>AB> >B<5G05< B>G:C >BAG5B0

SELECT 'Baseline migration applied' AS status;
