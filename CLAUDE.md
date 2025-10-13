# Claude Coding Guidelines

## Communication Rules

### No Markdown Files for Explanations
- **NEVER create .md files** for explanations, plans, or analysis unless explicitly requested
- All explanations should be given in conversation directly
- User prefers to understand concepts through dialogue, not reading docs
- Only create docs when user explicitly asks: "create a document about X"

---

## Root Directory Rules - STRICT

### What MUST be in Project Root

**ONLY these files and folders are allowed in root:**

```
project/
├── .git/ .gitignore .env .claude/ .mcp.json
├── README.md CHANGELOG.md CLAUDE.md
├── package.json package-lock.json node_modules/
├── src/                   # Backend source code
├── frontend/              # Frontend Next.js app
├── scripts/               # Scripts folder
│   ├── discovery/         # One-time discovery scripts
│   └── utils/             # Reusable utility scripts
├── migrations/            # Database migrations
├── tests/                 # Test files
├── docs/                  # Documentation (max 3-5 files!)
└── archive/               # Old code/docs (for reference)
```

### What is FORBIDDEN in Root

**⛔ ABSOLUTELY FORBIDDEN - NEVER CREATE THESE FILES IN ROOT:**

**Discovery/test scripts (MUST be inline or in scripts/discovery/):**
- `check-*.js`, `check-*.cjs`, `check-*.ts` (e.g., check-schema.js)
- `test-*.js`, `test-*.cjs`, `test-*.ts` (e.g., test-api.js)
- `verify-*.js`, `verify-*.cjs`, `verify-*.ts` (e.g., verify-data.js)
- `debug-*.js`, `debug-*.cjs`, `debug-*.ts` (e.g., debug-query.js)
- `analyze-*.js`, `analyze-*.cjs`, `analyze-*.ts` (e.g., analyze-contacts.js)
- `compare-*.js`, `compare-*.cjs`, `compare-*.ts` (e.g., compare-csv.js)
- `count-*.js`, `count-*.cjs`, `count-*.ts` (e.g., count-records.js)
- `execute-*.js`, `execute-*.cjs`, `execute-*.ts` (e.g., execute-migration.js)
- `match-*.js`, `match-*.cjs`, `match-*.ts` (e.g., match-emails.js)
- `update-*.js`, `update-*.cjs`, `update-*.ts` (e.g., update-deals.js)
- `refresh-*.js`, `refresh-*.cjs`, `refresh-*.ts` (e.g., refresh-view.js)

**Temporary files (DELETE immediately):**
- `*.tmp`, `*.temp`, `*.log`, `*.bak`
- `nul`, `temp.txt`, `debug.log`

**Documentation (put in CHANGELOG.md):**
- `ANALYSIS.md`, `REPORT.md`, `SUMMARY.md`
- `PLAN.md`, `NEXT_SESSION.md`, `TODO.md`

---

### ✅ WHAT TO DO INSTEAD:

**For one-time checks/tests (PREFERRED):**
```bash
# Run inline - NO FILE CREATED
node -e "console.log('check')"

# Multi-line heredoc
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
// ... code here ...
EOF
```

**If file MUST be saved:**
```bash
# Create in scripts/discovery/ with date prefix
scripts/discovery/2025-10-13-check-schema.cjs
```

**For reusable scripts:**
```bash
# Only if used multiple times
scripts/utils/sync-contacts.js
```

---

### 🚨 ENFORCEMENT CHECKLIST:

**Before creating ANY .js/.cjs/.ts/.sql file in root, check:**

1. ❌ Does filename start with forbidden prefix?
   (check-, test-, verify-, debug-, analyze-, compare-, count-, execute-, match-, update-, refresh-)
   → **STOP! Run inline or create in scripts/discovery/**

2. ❌ Is this one-time use?
   → **STOP! Run inline with node -e or heredoc**

3. ❌ Is this temporary output?
   → **STOP! Use tmp/ directory or don't save at all**

4. ✅ Is this reusable utility mentioned in docs?
   → OK to create in scripts/utils/

5. ✅ Is this production code?
   → OK to create in src/ or frontend/

**NEVER compromise. Root MUST stay clean. If in doubt → DON'T create it in root!**

---

## tmp/ Directory for Temporary Files

```
project/
├── tmp/                  # All temporary files go here (gitignored)
├── scripts/
│   ├── dev/              # Reusable dev utilities
│   ├── discovery/        # Archived one-time scripts (with dates)
│   └── tmp/              # Temporary scripts (gitignored)
```

**Rules:**
- EVERYTHING in `tmp/` can be deleted anytime
- ALWAYS gitignored
- Used for: logs, debug output, temporary analysis files
- NO production code in tmp/

**Discovery scripts naming:** `YYYY-MM-DD-description.js` in `scripts/discovery/`

---

## Core Principles

### Simplicity First
- Always prefer simple solutions over complex ones
- Avoid over-engineering or premature optimization
- Choose straightforward implementations

### DRY (Don't Repeat Yourself)
- Avoid duplication of code whenever possible
- Before writing new functionality, check for similar existing code
- Refactor common patterns into reusable utilities

### Environment Awareness
- Write code that works consistently across dev, test, and prod
- Use environment variables for configuration differences
- Avoid hardcoding values that might differ between environments

### Focused Changes
- Only make changes that are requested or directly related to the task
- Be confident that changes are well understood and necessary
- Avoid scope creep or tangential improvements unless requested

### Conservative Technology Choices
- When fixing issues, exhaust all options within existing implementation first
- Avoid introducing new patterns without strong justification
- If new patterns introduced, remove old implementations
- Maintain consistency with existing codebase patterns

---

## File Management

### File Size Limits
- Keep files under 200-300 lines of code
- Refactor larger files by splitting them into smaller modules

### Naming Conventions
- Use descriptive, self-documenting names
- Follow language/framework conventions (camelCase for JS, PascalCase for components)
- Avoid abbreviations unless industry standard
- Use consistent naming patterns across the project

### One-time Scripts Policy

**ARCHIVE (не DELETE):**
- Discovery scripts (check-*, verify-*, test-*)
- Migration helpers
- Data analysis scripts
→ Move to `scripts/discovery/` with README

**KEEP in root:**
- Reusable utilities
- Scripts used in CI/CD
- Scripts mentioned in documentation

**DELETE:**
- Temporary debugging files
- Scripts with hardcoded credentials
- Duplicate functionality

---

## Data and Testing

### No Fake Data in Production
- Mocking data only acceptable for tests
- Never add stubbing or fake data affecting dev or prod
- Use real data sources and proper error handling

### Environment Files
- Never overwrite `.env` files without explicit permission
- Always ask before modifying environment configuration
- Back up existing environment files when changes necessary

---

## Git and Version Control

### Commit Standards
- Write clear, descriptive commit messages: "fix user login bug", not "fix"
- Make atomic commits - one commit = one feature/fix
- Review changes before committing via git diff
- Never commit secrets, .env files, or temporary files

### Branch Management
- Use descriptive branch names: feature/add-auth, fix/login-crash
- One branch = one task, don't mix different features
- Delete merged branches to keep repository clean
- For solo projects can work in main, but make frequent commits

---

## Code Quality

### Error Handling
- Always wrap API calls in try-catch blocks
- Write meaningful error messages with context
- Don't swallow errors - log them or show to user
- Fail fast and clearly

### Performance Considerations
- Optimize for readability first, performance second
- Don't add libraries without necessity
- Profile before optimizing, don't guess at bottlenecks
- For small projects: readability > performance

---

## Batch Processing Optimization

- Plan changes in advance - what needs to be changed across all files
- Make massive changes in one batch, not file by file
- Use find/replace, regex for mass edits
- Commit batches of changes, not each file separately

---

## Documentation Standards - Rule of Minimalism

### ✅ WHAT TO KEEP

**Essential Docs (only 3-4 files!):**
- `README.md` - How to run the project
- `CHANGELOG.md` - Current state & version history (**SOURCE OF TRUTH**)
- `CLAUDE.md` - Coding guidelines (this file)
- `docs/ADR.md` - Architecture Decision Records (optional)

### ❌ WHAT NOT TO CREATE

**Never create without explicit client request:**
- "Analysis reports" (analyze, but don't save as MD)
- "Migration plans" (plan in TODO list, not MD file)
- "Summary documents" (results go in CHANGELOG)
- "Explained" docs (code should be self-documenting)
- "Setup summaries" (once setup is done, delete it)
- One-time discovery scripts (run inline or archive immediately)

### 📝 CHANGELOG.md = Source of Truth

**CHANGELOG.md is the ONLY documentation that matters:**
- Current project state
- What was done in each session
- What needs to be done next
- Technical decisions & their outcomes

### 🔄 When Documentation Is Needed

**ASK FIRST:**
Before creating any MD file, ask:
1. Will this be read more than once?
2. Is this for external stakeholders (client, team)?
3. Can this go in CHANGELOG.md instead?

**If answer is NO to all → Don't create MD file!**

---

## Database Schema - Source of Truth

### ❌ NEVER Maintain Manual Schema Docs

**Database IS the Source of Truth:**
- ✅ **Live Database** (Supabase) - ALWAYS up-to-date
- ✅ **Prisma schema.prisma** - Generated from DB, version controlled
- ✅ **SQL Migrations** - History of changes
- ❌ **MD documentation** - Gets outdated, DO NOT MAINTAIN

### Workflow for Schema Changes

```bash
# 1. Change database (Supabase UI or migration)
# 2. Update Prisma schema
cd frontend && npx prisma db pull

# 3. Regenerate types
npx prisma generate

# 4. Types are now updated! No MD file needed.
```

---

## Code Examples & Patterns

**For detailed code examples, see:**
- `docs/backend-patterns.md` - Node.js, Supabase, HubSpot examples
- `docs/frontend-patterns.md` - React, Next.js, TypeScript examples

**Technology-specific rules:**
- Backend rules: `src/CLAUDE.md`
- Frontend rules: `frontend/CLAUDE.md`

---

## Summary: Clean Codebase Rules

### Keep Only:
1. ✅ Source code (`src/`, `frontend/`)
2. ✅ CHANGELOG.md (source of truth)
3. ✅ README.md (how to run)
4. ✅ CLAUDE.md files (this + subdirectories)
5. ✅ Prisma schema.prisma (auto-generated)

### Delete or Avoid:
1. ❌ Analysis/summary MD files
2. ❌ One-time discovery scripts in root
3. ❌ Manual schema documentation
4. ❌ "Explained" documents
5. ❌ Duplicate documentation

### Philosophy:
- **Code is documentation** (write self-documenting code)
- **Database is schema source of truth** (introspect, don't document)
- **CHANGELOG is project source of truth** (not scattered MD files)
- **Less is more** (every file is maintenance burden)
