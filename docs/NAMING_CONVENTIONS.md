# Project Naming Conventions

**Version:** 1.0
**Last Updated:** 2025-10-06
**Status:** Active Standard

---

## Overview

Unified naming standard for all files and folders in the project to eliminate chaos and ensure consistency.

---

## Core Principles

1. **Consistency** - Same pattern everywhere
2. **Readability** - Clear what file contains
3. **Sortability** - Files naturally grouped
4. **Industry Standards** - Follow common practices

---

## File Naming Rules

### Rule 1: Root Config Files
**Location:** Project root only
**Pattern:** `UPPERCASE.md` or `lowercase.json`

**Examples:**
```
✅ README.md
✅ CHANGELOG.md
✅ CLAUDE.md
✅ package.json
✅ .env
```

**Why:** Industry standard - all major projects use this

---

### Rule 2: Documentation Files
**Location:** `docs/`, `docs/*/`
**Pattern:** `kebab-case.md` OR `CAPS.md` (only for main docs)

**Main docs (CAPS):**
```
✅ docs/README.md
✅ docs/ADR.md
✅ docs/PRD.md
```

**Sub-docs (kebab-case):**
```
✅ docs/guides/hubspot-setup.md
✅ docs/reports/field-recommendations.md
✅ docs/analysis/calls-analysis-report.json
```

**Why:**
- CAPS = important main documentation
- kebab-case = descriptive, readable, web-friendly

---

### Rule 3: Code Files
**Location:** `src/`, `tests/`
**Pattern:** `kebab-case.js` or `camelCase.js`

**Preferred: kebab-case**
```
✅ src/hubspot/api.js
✅ src/scripts/analyze-fields.js
✅ tests/hubspot/advanced-test.js
```

**Why:** JavaScript community standard

---

### Rule 4: Test Files
**Location:** `tests/`
**Pattern:** `name.test.js` or `descriptive-name.test.js`

**Examples:**
```
✅ tests/supabase/connection.test.js
✅ tests/hubspot/api.test.js
✅ tests/fixtures/sample-data.json
```

**Why:** Jest/Vitest standard

---

### Rule 5: JSON Data Files
**Location:** `docs/analysis/`, `tests/fixtures/`
**Pattern:** `kebab-case-name.json`

**Examples:**
```
✅ calls-analysis-report.json
✅ fields-analysis.json
✅ sample-contacts.json
```

**Why:** Consistent with docs naming

---

### Rule 6: Report Files
**Location:** `docs/reports/`
**Pattern:** `YYYY-MM-DD-topic.md` OR `topic-name.md`

**Date-based reports:**
```
✅ 2024-09-24-client-report.md
✅ 2025-10-06-restructuring.md
```

**Topic reports:**
```
✅ field-recommendations.md
✅ tracking-analysis.md
```

**Why:** Date prefix = chronological sorting, easy to find

---

### Rule 7: Task Files
**Location:** `sprints/*/tasks/`
**Pattern:** `NN-task-name.md` (numbered, sequential)

**Examples:**
```
✅ 00-tasks-runbook.md
✅ 01-setup-nextjs-app.md
✅ 02-create-supabase-schema.md
```

**Why:** Numbered = shows order/priority

---

### Rule 8: Folders
**Pattern:** Always `lowercase` or `kebab-case`

**Examples:**
```
✅ src/
✅ docs/
✅ tests/
✅ docs/analysis/
✅ sprints/01-hubspot-metrics/
```

**Why:** Unix/Linux standard, no escaping needed

---

## Full Naming Matrix

| Type | Location | Pattern | Example |
|------|----------|---------|---------|
| **Root config** | `/` | `UPPERCASE.md` | `README.md` |
| **Root package** | `/` | `lowercase.json` | `package.json` |
| **Main docs** | `docs/` | `UPPERCASE.md` | `ADR.md` |
| **Sub docs** | `docs/*/` | `kebab-case.md` | `hubspot-setup.md` |
| **Code** | `src/` | `kebab-case.js` | `api.js` |
| **Tests** | `tests/` | `name.test.js` | `connection.test.js` |
| **Fixtures** | `tests/fixtures/` | `kebab-case.json` | `sample-data.json` |
| **Reports** | `docs/reports/` | `YYYY-MM-DD-name.md` | `2025-10-06-report.md` |
| **Analysis** | `docs/analysis/` | `kebab-case.json` | `calls-analysis.json` |
| **Tasks** | `sprints/*/tasks/` | `NN-task-name.md` | `01-setup-app.md` |
| **Folders** | anywhere | `lowercase` | `hubspot/` |

---

## What to Change

### Current Issues Found:

#### 1. docs/ - Mixed CAPS and lowercase ❌
```
❌ docs/MIGRATION_ANALYSIS_REPORT.txt
❌ docs/RESTRUCTURING_REPORT.md
```

**Fix:**
```
✅ docs/reports/2025-10-06-migration-analysis.txt
✅ docs/reports/2025-10-06-restructuring.md
```

---

#### 2. docs/reports/ - Nested reports/ folder ❌
```
❌ docs/reports/reports/field-creation-report.json
❌ docs/reports/reports/missing-contact-fields-report.json
```

**Fix:**
```
✅ docs/reports/field-creation.json
✅ docs/reports/missing-contact-fields.json
```

---

#### 3. docs/analysis/ - Inconsistent naming ❌
```
❌ contact-calls-150479232059.json (what is 150479232059?)
```

**Fix:**
```
✅ contact-calls-sample.json
```

---

#### 4. docs/reports/ - Date format inconsistent ❌
```
❌ 2024-09-24-client-report.md (good)
❌ tracking-analysis.md (no date)
❌ tracking-analysis-updated.md (what is "updated"?)
```

**Fix:**
```
✅ 2024-09-24-client-report.md (keep)
✅ 2024-09-XX-tracking-analysis.md (add date)
✅ 2024-09-XX-tracking-analysis-v2.md (version, not "updated")
```

---

#### 5. sprints/tasks/ - Double nesting ❌
```
❌ sprints/01-hubspot-metrics/tasks/tasks/
```

**Fix:**
```
✅ sprints/01-hubspot-metrics/tasks/
```

---

#### 6. sprints/tasks/ - Emoji in filenames ❌
```
❌ 001-⏸️-create-hubspot-fields.md
```

**Fix:**
```
✅ 001-create-hubspot-fields.md
```

---

#### 7. docs/guides/ - Inconsistent language suffix ❌
```
❌ make-automation.md
❌ make-automation-en.md
```

**Fix (choose one approach):**
```
Option A: No language suffix (default English)
✅ make-automation.md

Option B: Always suffix
✅ make-automation-en.md
✅ make-automation-ru.md
```

---

## Quick Reference Card

**When creating a new file, ask:**

1. **Is it a main doc?** → `CAPS.md` (ADR, PRD, README)
2. **Is it code?** → `kebab-case.js`
3. **Is it a test?** → `name.test.js`
4. **Is it a report?** → `YYYY-MM-DD-topic.md`
5. **Is it data/analysis?** → `kebab-case.json`
6. **Is it a task?** → `NN-task-name.md`
7. **Is it a folder?** → `lowercase`

---

## Migration Checklist

- [ ] Move RESTRUCTURING_REPORT.md → docs/reports/2025-10-06-restructuring.md
- [ ] Move MIGRATION_ANALYSIS_REPORT.txt → docs/reports/2025-10-06-migration-analysis.txt
- [ ] Fix docs/reports/reports/ → docs/reports/
- [ ] Remove emoji from task filenames
- [ ] Fix sprints/tasks/tasks/ → sprints/tasks/
- [ ] Rename contact-calls-150479232059.json → contact-calls-sample.json
- [ ] Add dates to tracking-analysis files
- [ ] Decide on language suffix strategy for guides

---

## Industry References

These conventions follow standards from:
- **JavaScript:** Airbnb Style Guide
- **React/Next.js:** Vercel/Next.js conventions
- **Python:** PEP 8
- **Git:** GitHub naming best practices
- **Testing:** Jest/Vitest standards

---

## Enforcement

**All new files MUST follow these conventions.**

If you see a file that doesn't match:
1. Check this document
2. Rename it properly
3. Update references

**No exceptions.**

---

**Document Owner:** Claude Code
**Approved by:** Leo (pending)
**Next Review:** After all files renamed
