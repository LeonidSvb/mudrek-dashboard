# Documentation Structure

Этот проект использует **hierarchical CLAUDE.md structure** для оптимальной работы с Claude Code.

---

## Как это работает

### 📂 Структура CLAUDE.md файлов

```
project/
├── CLAUDE.md                # Core principles + File management (288 строк)
├── src/CLAUDE.md            # Backend Node.js rules (175 строк)
├── frontend/CLAUDE.md       # Frontend React/Next.js rules (275 строк)
└── docs/
    ├── backend-patterns.md  # Code examples для backend
    └── frontend-patterns.md # Code examples для frontend
```

### 🎯 Принцип работы

**Claude автоматически загружает релевантные CLAUDE.md файлы:**

- Работаешь в **root** → загружает `CLAUDE.md`
- Работаешь в **src/** → загружает `CLAUDE.md` + `src/CLAUDE.md`
- Работаешь в **frontend/** → загружает `CLAUDE.md` + `frontend/CLAUDE.md`

**Это означает:**
- ✅ Экономия токенов (не загружаются frontend правила при работе с backend)
- ✅ Быстрая навигация (релевантные правила всегда под рукой)
- ✅ Легче поддерживать (каждый файл < 300 строк)

---

## Что где находится

### Root CLAUDE.md (288 строк) - ALWAYS LOADED

**Contains:**
- Communication rules (no MD files for explanations)
- Root directory rules (что можно/нельзя в корне)
- File management (tmp/, scripts/discovery/)
- Core principles (DRY, Simplicity, etc.)
- Git standards
- Documentation minimalism

**Who needs it:** Everyone working on project

---

### src/CLAUDE.md (175 строк) - Backend specific

**Contains:**
- JavaScript/Node.js best practices
- HubSpot API integration rules
- Supabase integration (Node.js)
- Error handling patterns
- Logging standards
- Batch processing rules

**Who needs it:** Backend developers working in `src/`

**Loaded:** Only when working with files in `src/` directory

---

### frontend/CLAUDE.md (275 строк) - Frontend specific

**Contains:**
- TypeScript standards (interface over type, no enums)
- Next.js App Router rules (Server Components default)
- Supabase integration (Next.js with @supabase/ssr)
- Tailwind CSS + shadcn/ui
- Component patterns
- State management (nuqs, Zustand)

**Who needs it:** Frontend developers working in `frontend/`

**Loaded:** Only when working with files in `frontend/` directory

---

## Code Examples (НЕ загружаются автоматически)

### docs/backend-patterns.md

**Contains:**
- Полные примеры кода для HubSpot API
- Batch processing examples
- Supabase queries
- Error handling examples

**How to use:**
- Manual reference when needed
- Claude can read it via `@docs/backend-patterns.md`

### docs/frontend-patterns.md

**Contains:**
- TypeScript examples (interfaces, discriminated unions)
- Next.js components (Server/Client)
- Supabase client setup
- Component structure templates

**How to use:**
- Manual reference when needed
- Claude can read it via `@docs/frontend-patterns.md`

---

## 📊 Size Comparison

**Before:**
- 1 file: 1537 lines (all rules + examples)
- Загружалось в каждой сессии целиком

**After:**
- Root: 288 lines (core principles)
- Backend: 175 lines (loaded only when working in src/)
- Frontend: 275 lines (loaded only when working in frontend/)
- **Total:** 738 lines active rules
- **Examples:** Moved to docs/ (not loaded by default)

**Savings:**
- 52% less tokens used
- Релевантные правила всегда под рукой
- Examples доступны по запросу

---

## 🚀 How to Work with This

### Backend Developer Workflow

1. Open file in `src/hubspot/api.js`
2. Claude automatically loads:
   - `CLAUDE.md` (core principles)
   - `src/CLAUDE.md` (backend rules)
3. If need examples: Reference `@docs/backend-patterns.md`

### Frontend Developer Workflow

1. Open file in `frontend/app/page.tsx`
2. Claude automatically loads:
   - `CLAUDE.md` (core principles)
   - `frontend/CLAUDE.md` (frontend rules)
3. If need examples: Reference `@docs/frontend-patterns.md`

### Full-stack Work

- Claude loads relevant CLAUDE.md based on current file location
- Switch between src/ and frontend/ → rules auto-update
- No manual file attachments needed!

---

## 🔄 Updating Rules

### When to update Root CLAUDE.md
- Project-wide conventions change
- File management rules
- Git workflow updates

### When to update src/CLAUDE.md
- New backend patterns
- API integration changes
- Database schema conventions

### When to update frontend/CLAUDE.md
- New UI patterns
- Component structure changes
- State management updates

### When to update docs/*.md
- New code examples
- Complex patterns that need illustration
- Reference implementations

---

## 📋 Backup Copy

All examples are also saved in:
```
C:\Users\79818\Desktop\code - templates\
├── backend-patterns.md
└── frontend-patterns.md
```

For quick reference in future projects.

---

## Summary

**Rules:** CLAUDE.md files (loaded automatically)
**Examples:** docs/*.md files (loaded on demand)

**Result:** Faster, more efficient, context-aware AI assistance.
