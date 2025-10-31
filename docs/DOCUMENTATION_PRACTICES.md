# Documentation Best Practices

**Project:** Mudrek Dashboard
**Last Updated:** 2025-10-31

---

## TL;DR

**Золотое правило:** Документация стареет ВСЕГДА. Борьба с этим = автоматизация + минимализм.

---

## 🎯 Наш Подход (Production-Proven)

### 1. **Автоматическая Генерация Где Возможно**

```
YAML (Source of Truth) → Auto-Generate → TypeScript + Markdown
```

**Примеры:**
- `docs/metrics-schema.yaml` → `METRICS_GUIDE.generated.md`
- `docs/metrics-schema.yaml` → `lib/metric-definitions.generated.ts`

**Почему работает:**
- ✅ Одно место для обновления (YAML)
- ✅ Нет ручной синхронизации
- ✅ Невозможно забыть обновить документацию

**Как использовать:**
```bash
# Обновили метрики в YAML?
npm run docs:generate

# Готово! И код, и документация обновлены
```

---

### 2. **Documentation as Code**

**Принцип:** Документация живет в той же репе, что и код

**Структура:**
```
docs/
├── ARCHITECTURE.md        # Системный дизайн (РУЧНОЙ, редко меняется)
├── ADR.md                 # Architecture Decision Records (APPEND-ONLY)
├── LOGGING.md             # Observability (РУЧНОЙ, редко меняется)
├── METRICS_GUIDE.generated.md  # AUTO-GENERATED (через YAML)
├── DOCUMENTATION_PRACTICES.md  # Этот файл (META-DOC)
└── setup/                 # Руководства по настройке (РУЧНЫЕ)
    ├── HUBSPOT_SETUP.md
    ├── SUPABASE_REPORTING_WITH_MAKE.md
    └── MCP_SETUP.md
```

**Правила:**
- ✅ Документация в Git (версионируется вместе с кодом)
- ✅ Pull Request = код + документация вместе
- ✅ Code Review проверяет и документацию

---

### 3. **ADR (Architecture Decision Records)**

**Что это:** Файл, куда ДОБАВЛЯЮТСЯ решения (НИКОГДА НЕ РЕДАКТИРУЮТСЯ старые)

**Формат ADR:**
```markdown
### X. Why [Decision Name]?

**Decision:** [What we chose]

**Context:**
- [Why we needed this]
- [What problem we're solving]

**Alternatives Considered:**
1. ❌ Option A (why rejected)
2. ✅ **Option B** (chosen)
3. ❌ Option C (why rejected)

**Implementation:**
[Code snippets / config]

**Benefits:**
- ✅ Benefit 1
- ✅ Benefit 2

**Trade-offs:**
- ➖ Downside 1
- ➕ But acceptable because...
```

**Почему ADR?**
- ✅ **Append-only**: Добавляем новые решения, старые не трогаем
- ✅ **История**: Видим почему решения принимались
- ✅ **Context**: Новые разработчики понимают "почему"
- ✅ **Не стареет**: Исторические решения всегда актуальны

**Пример:** `docs/ADR.md#9-why-hybrid-materialized-views-refresh-strategy`

---

### 4. **Timestamp + Version Control**

**Каждый документ имеет:**
```markdown
**Last Updated:** 2025-10-31
```

**Зачем:**
- ⚠️ Видишь "Last Updated: 2023-05-10" → осторожно, может устареть
- ✅ Видишь "Last Updated: 2025-10-31" → свежая документация

**Git Log = бесплатный audit trail:**
```bash
# Кто и когда обновлял документацию
git log --oneline docs/ARCHITECTURE.md

# Что изменилось в документации
git diff HEAD~5 docs/ARCHITECTURE.md
```

---

### 5. **Минимализм > Перфекционизм**

**Правило:** Лучше 100 строк актуальной документации, чем 1000 строк устаревшей

**Что НЕ документировать:**
- ❌ Obvious code (код сам себя документирует)
- ❌ Детали реализации (читай код)
- ❌ Временные workarounds (они исчезнут)

**Что НУЖНО документировать:**
- ✅ **Почему** (ADR)
- ✅ **Архитектура** (ARCHITECTURE.md)
- ✅ **Observability** (LOGGING.md)
- ✅ **Setup** (setup/*.md)

---

### 6. **Schema-First Approach**

**Принцип:** Database schema + YAML schema = источник истины

**Примеры:**

1. **Metrics Schema (YAML):**
```yaml
# docs/metrics-schema.yaml
totalSales:
  title: "Total Sales"
  sql: "SELECT SUM(amount) FROM deals WHERE dealstage = 'closedwon'"
```

2. **Database Schema (Supabase):**
```sql
-- Migrations = документация структуры БД
-- supabase/migrations/20251031_create_mv_refresh.sql
CREATE FUNCTION refresh_materialized_views() ...
```

**Почему работает:**
- ✅ Schema менее volatile чем код
- ✅ Schema читаемы людьми
- ✅ Schema можно auto-validate
- ✅ Schema можно auto-generate docs

---

## 📋 Maintenance Checklist

### Когда обновлять документацию?

**Всегда:**
- ✅ Добавили новую метрику → обновить `metrics-schema.yaml` + `npm run docs:generate`
- ✅ Приняли архитектурное решение → добавить ADR в `ADR.md`
- ✅ Изменили структуру БД → migration файл = документация
- ✅ Изменили deployment → обновить `setup/*.md`

**Опционально:**
- 🔄 Раз в 3 месяца: прочитать `ARCHITECTURE.md`, проверить актуальность
- 🔄 Раз в месяц: проверить setup guides работают на чистой машине
- 🔄 При onboarding нового разработчика: проверить документация помогает

---

## 🚨 Признаки Устаревшей Документации

### Red Flags:
- ⚠️ "Last Updated" > 6 месяцев назад
- ⚠️ В документации есть код, который не работает
- ⚠️ Новый разработчик не может setup проект по docs
- ⚠️ Документация противоречит реальному коду

### Что делать:
1. **Быстро:** Удалить устаревшую часть (лучше без документации, чем ложная)
2. **Правильно:** Обновить документацию + commit вместе с кодом
3. **Идеально:** Перевести на auto-generation (если возможно)

---

## 🎓 Уроки из Industry

### What Works (доказано в боевых условиях):

1. **Stripe:**
   - API Reference auto-generated from OpenAPI schema
   - Code samples tested automatically
   - Docs versioned with API

2. **GitLab:**
   - Documentation в той же репе что и код
   - Docs changes = part of MR (Merge Request)
   - ADR для всех архитектурных решений

3. **Shopify:**
   - Schema-first approach (GraphQL schema = docs)
   - Migration guides auto-generated
   - Deprecated features marked with dates

### What Doesn't Work:

❌ **Separate wiki** (отделяется от кода, устаревает)
❌ **Manual API docs** (не синхронизируются с кодом)
❌ **README с 1000 строк** (никто не читает, никто не обновляет)
❌ **Confluence/Notion** (access control проблемы, не версионируется)

---

## 🛠️ Tools We Use

### Documentation Generation:
```bash
# Generate metrics documentation
npm run docs:generate
```

### Documentation Validation (будущее):
```bash
# TODO: Add documentation linter
# - Check all code snippets are valid
# - Check all links work
# - Check timestamps updated
```

---

## 📚 Иерархия Документации (по важности)

### Tier 1: Нельзя потерять (critical)
1. **ADR.md** - архитектурные решения
2. **ARCHITECTURE.md** - системный дизайн
3. **setup/*.md** - как запустить проект

### Tier 2: Важно (important)
4. **LOGGING.md** - observability
5. **METRICS_GUIDE.generated.md** - метрики (auto-generated)
6. **README.md** - обзор проекта

### Tier 3: Полезно (nice-to-have)
7. **backend-patterns.md** - примеры кода
8. **frontend-patterns.md** - примеры кода
9. **DOCUMENTATION_PRACTICES.md** - этот файл

---

## 🔄 Update Frequency

| Document | Update Frequency | Method |
|----------|-----------------|--------|
| metrics-schema.yaml | Per new metric | Manual edit + auto-gen |
| ADR.md | Per architectural decision | Append-only |
| ARCHITECTURE.md | Per major change | Manual edit |
| LOGGING.md | Rarely (stable system) | Manual edit |
| setup/*.md | Per deployment change | Manual edit |
| METRICS_GUIDE.generated.md | Auto | `npm run docs:generate` |
| README.md | Rarely (project overview) | Manual edit |

---

## ✅ Success Criteria

**Документация работает, если:**
- ✅ Новый разработчик может setup проект за 30 минут
- ✅ При code review видно когда документация устарела
- ✅ Auto-generated документация всегда актуальна
- ✅ ADR объясняет "почему" для сложных решений
- ✅ Setup guides работают на чистой машине

---

## 🎯 TL;DR (снова)

**Как поддерживать документацию актуальной:**

1. **Автоматизация:** YAML → auto-generate (метрики, типы)
2. **ADR:** Append-only, никогда не редактируем старые решения
3. **Timestamps:** "Last Updated" в каждом файле
4. **Минимализм:** Меньше документации = легче поддерживать
5. **Schema-First:** Database/API schema = источник истины
6. **Documentation as Code:** Docs в Git, PR = code + docs
7. **Периодическая проверка:** Раз в 3 месяца читать ARCHITECTURE.md

**Главное:** Не пытайтесь документировать ВСЁ. Документируйте "почему" (ADR) и "как начать" (setup). Остальное код сам расскажет.

---

## Related Documentation

- [ADR.md](./ADR.md) - Architecture decisions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [README.md](./README.md) - Project overview
