# Triple Logging System

Complete guide to understanding logging and observability in Mudrek Dashboard.

**Philosophy:** "Observability for Engineers, Clarity for Clients"

---

## Table of Contents

- [Overview](#overview)
- [1. Console Logging](#1-console-logging-stdout)
- [2. JSON File Logging](#2-json-file-logging)
- [3. Supabase Logging](#3-supabase-logging)
- [Database Schema](#database-schema)
- [Examples](#examples)
- [Monitoring](#monitoring)

---

## Overview

### Why Triple Logging?

**Problem:** Single logging destination creates conflict:
- Engineers need **all events** for debugging
- Clients need **only important events** for status

**Solution:** 3 parallel logging streams with different purposes

```
┌─────────────────────────────────────────────┐
│         Sync Script Execution               │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────▼─────────────┐
    │  SyncLogger                │
    │  (lib/sync/logger.js)      │
    └─────────────┬──────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐   ┌─────────┐   ┌──────────┐
│Console │   │JSON File│   │ Supabase │
│(stdout)│   │(local)  │   │  (logs)  │
└────────┘   └─────────┘   └──────────┘

 ALWAYS      ALWAYS         FILTERED
(all logs)  (all logs)   (important only)
```

---

## 1. Console Logging (stdout)

### What It Logs

**ALL** events in real-time

### Format

```
[LEVEL] STEP: message
```

### Who Uses It

Engineers monitoring real-time execution (GitHub Actions, terminal)

### Example Output

```bash
[INFO] START: Contacts sync started with options: {"all":false}
[INFO] FETCH: Incremental sync: fetching contacts since 2025-10-25T10:30:00Z
[INFO] SYNC: Found 236 contacts to process
[INFO] UPSERT: Batch 0-236: 232 new, 4 updated
[INFO] END: Contacts sync completed: 236 fetched, 232 new, 4 updated
```

### Log Levels

- `[INFO]` - Normal events
- `[WARNING]` - Non-critical issues
- `[ERROR]` - Critical failures

---

## 2. JSON File Logging

### What It Logs

**ALL** events (raw stream)

### Format

**JSONL** (JSON Lines) - one JSON object per line

### File Location

```
logs/
├── 2025-10-30.jsonl
├── 2025-10-31.jsonl
└── 2025-11-01.jsonl
```

### Rotation

Daily (industry standard: AWS CloudWatch, Datadog, ELK)

### Who Uses It

Engineers for debugging, audit trail, post-mortem analysis

### Example Content

```json
{"run_id":"ed72494f...","timestamp":"2025-10-30T14:50:41.466Z","level":"INFO","step":"START","message":"Contacts sync started...","meta":{}}
{"run_id":"ed72494f...","timestamp":"2025-10-30T14:50:42.831Z","level":"INFO","step":"FETCH","message":"Incremental sync: fetching contacts since...","meta":{}}
{"run_id":"ed72494f...","timestamp":"2025-10-30T14:50:47.700Z","level":"INFO","step":"END","message":"Contacts sync completed: 236 fetched...","meta":{}}
```

### Why JSONL?

- ✅ Industry standard (AWS, Datadog, ELK)
- ✅ Each line = valid JSON (easy to parse)
- ✅ Streamable in real-time
- ✅ No JSON array overhead

### Usage

```bash
# View today's logs
cat logs/2025-10-30.jsonl

# Filter by run_id
cat logs/2025-10-30.jsonl | grep "ed72494f"

# Filter by step
cat logs/2025-10-30.jsonl | grep '"step":"ERROR"'

# Count errors
cat logs/2025-10-30.jsonl | grep '"level":"ERROR"' | wc -l
```

---

## 3. Supabase Logging

### What It Logs

**ONLY important events** (filtered for client clarity)

### Philosophy

> "Noise kills trust" - Clients see status, not technical details

### Filter Logic

**Saved to Supabase:**
- ✅ `START` - sync started
- ✅ `END` - results (how many records)
- ✅ `ERROR` - critical errors
- ✅ `WARNING` - warnings
- ✅ `TIMEOUT` - exceeded time limit

**Filtered out (technical noise):**
- ❌ `FETCH` - "fetching contacts since..."
- ❌ `SYNC` - "Found 236 contacts"
- ❌ `UPSERT` - "232 new, 4 updated"
- ❌ `BATCH` - "Processing batch 0-500"

### Implementation

`lib/sync/logger.js` lines 60-66:

```javascript
const shouldLogToSupabase =
  level === 'ERROR' ||
  level === 'WARNING' ||
  step === 'START' ||
  step === 'END' ||
  step === 'TIMEOUT';
```

### Who Uses It

Clients/managers viewing status dashboard at `/logs`

---

## Database Schema

### Table: `logs`

Detailed event logs (filtered)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| run_id | uuid | FK to runs table (correlation ID) |
| timestamp | timestamptz | When event occurred |
| level | text | INFO, ERROR, WARNING |
| step | text | START, END, ERROR, TIMEOUT |
| message | text | Event description |
| meta | jsonb | Additional context |

### Table: `runs`

Sync metrics (for dashboard)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (run_id) |
| script_name | text | sync-contacts/deals/calls |
| status | text | running, success, failed |
| started_at | timestamptz | Start time |
| finished_at | timestamptz | End time |
| duration_ms | int | Duration in milliseconds |
| records_fetched | int | How many fetched from HubSpot |
| records_inserted | int | How many inserted to Supabase |
| records_updated | int | How many updated in Supabase |
| error_message | text | Error if failed |

**Relationship:** `logs.run_id → runs.id` (many-to-one)

---

## Examples

### Successful Sync

**Terminal (Console):**
```bash
[INFO] START: Contacts sync started
[INFO] FETCH: Incremental sync: fetching contacts since 2025-10-25
[INFO] SYNC: Found 236 contacts to process
[INFO] UPSERT: Batch 0-236: 232 new, 4 updated
[INFO] END: Contacts sync completed: 236 fetched, 232 new, 4 updated
```

**JSON File (`logs/2025-10-30.jsonl`):**
```json
{"step":"START",...}   ← saved
{"step":"FETCH",...}   ← saved
{"step":"SYNC",...}    ← saved
{"step":"UPSERT",...}  ← saved
{"step":"END",...}     ← saved
```

**Supabase (`logs` table):**
```
START: Contacts sync started           ← saved
FETCH: Incremental sync...             ← FILTERED OUT
SYNC: Found 236 contacts               ← FILTERED OUT
UPSERT: 232 new, 4 updated             ← FILTERED OUT
END: Contacts sync completed           ← saved
```

**Result:**
- ✅ Engineer sees all 5 events in JSON file
- ✅ Client sees 2 events in Supabase dashboard (START + END)
- ✅ Less noise in UI, easier to understand status

### Failed Sync (Error)

**All destinations receive ERROR:**

Console:
```bash
[INFO] START: Contacts sync started
[INFO] FETCH: Incremental sync...
[ERROR] FETCH: HubSpot API error: Rate limit exceeded (429)
```

JSON File:
```json
{"step":"START",...}
{"step":"FETCH",...}
{"step":"ERROR","level":"ERROR","message":"HubSpot API error: Rate limit exceeded",...}
```

Supabase:
```
START: Contacts sync started  ← saved
ERROR: HubSpot API error      ← saved (ERROR always logged!)
```

**Client sees:** Clear error message without technical noise

---

## Monitoring

### View Logs in Frontend

Go to [http://localhost:3000/logs](http://localhost:3000/logs)

Shows:
- All sync runs with status
- Duration, records count
- Error messages if failed

### SQL Queries

**Recent sync runs:**
```sql
SELECT * FROM runs
WHERE script_name = 'sync-contacts'
ORDER BY started_at DESC
LIMIT 10;
```

**Logs for specific run:**
```sql
SELECT * FROM logs
WHERE run_id = 'ed72494f-7d65-4715-9010-3c3d557eeecd'
ORDER BY timestamp;
```

**Success rate (last 7 days):**
```sql
SELECT
  script_name,
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM runs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY script_name;
```

**Average duration:**
```sql
SELECT
  script_name,
  AVG(duration_ms) / 1000 as avg_seconds
FROM runs
WHERE status = 'success'
  AND started_at > NOW() - INTERVAL '7 days'
GROUP BY script_name;
```

### JSON File Analysis

**Count errors in logs:**
```bash
cat logs/2025-10-30.jsonl | grep '"level":"ERROR"' | wc -l
```

**Extract all error messages:**
```bash
cat logs/2025-10-30.jsonl | grep '"level":"ERROR"' | jq -r '.message'
```

**Find slow syncs (>60s):**
```bash
cat logs/2025-10-30.jsonl | jq 'select(.meta.duration_ms > 60000)'
```

---

## Benefits

### For Engineers

- ✅ **Full visibility**: All events in console + JSON
- ✅ **Debugging**: JSON files for post-mortem
- ✅ **Real-time**: Console streaming
- ✅ **Audit trail**: Immutable JSON logs

### For Clients

- ✅ **Clarity**: Only important events in dashboard
- ✅ **No noise**: Technical details filtered out
- ✅ **Trust**: Clear status (success/failed/running)
- ✅ **Simplicity**: Easy to understand

### For Both

- ✅ **Correlation**: `run_id` links all logging streams
- ✅ **Troubleshooting**: Multiple ways to debug
- ✅ **Industry standard**: JSONL + structured logs
- ✅ **Scalability**: Daily rotation prevents file growth

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Sync system architecture
- [ADR.md](./ADR.md) - Why triple logging?
