# Discovery Scripts Archive

**Archived:** 2025-10-10
**Reason:** One-time discovery and testing scripts, no longer needed in active codebase

## Archived Scripts

### Migration Helpers
- `run-migration-003.js` - Execute migration 003 (phone matching views)
- `run-migration-005.js` - Execute migration 005 (metrics SQL function)
- `create-associations-table.js` - Create associations table (unused approach)

### Data Analysis
- `check-closedate.js` - Analyze closedate field in deals
- `check-deals-schema.js` - Inspect deals schema and fields
- `verify-views-and-metrics.js` - Verify all VIEWs working correctly
- `test-phone-matching.js` - Test phone number matching logic
- `test-all-metrics.js` - Test all 22 metrics calculations

### Testing
- `sync-call-associations.js` - Sync call associations (experimental)
- `monitor-sync.js` - Monitor sync process
- `test-sql-function.js` - Test get_all_metrics SQL function

## When to Use

These scripts are **archived**, not deleted:
- Keep for reference if similar issues arise
- Can be used to understand past decisions
- NOT meant for regular use

## Active Scripts (in src/)

Production scripts still in use:
- `src/hubspot/sync-parallel.js` - Main sync script
- `src/hubspot/api.js` - HubSpot API client

---

**Note:** All discovery/testing should be done through Prisma or inline code now, not temporary scripts.
