# Database Migrations - Philosophy & Best Practices

**Дата создания:** 15 октября 2025
**Основано на:** Реальный опыт рассинхронизации миграций

---

## 🎯 Главные принципы

### 1. Database is Source of Truth

```
Git (код) можно откатывать ← → База данных только вперёд
     ↓                                    ↓
 git reset --hard                  Forward-only migrations
 git revert                        Нельзя удалить миграцию из середины
```

**Правило:** Если база и код рассинхронизировались - **подгоняй код под базу**, не наоборот.

---

## 📋 Что такое миграция?

**Миграция = изменение схемы базы данных в определённый момент времени**

```
Миграция ≠ Сущность
Миграция = Событие в истории

Пример:
- Таблица deals = сущность (живёт всегда)
- Migration 001 = "Создать таблицу deals" (событие 1 октября)
- Migration 015 = "Добавить поле status" (событие 10 октября)
- Migration 027 = "Добавить индекс на status" (событие 13 октября)

Одна таблица → много миграций в разное время
```

---

## 🔄 Git vs Database Migrations

| Аспект | Git Commits | Database Migrations |
|--------|-------------|---------------------|
| **Откат** | ✅ Легко (`git reset`, `git revert`) | ⚠️ Сложно (может потерять данные) |
| **Изменение истории** | ✅ Можно (`git rebase`) | ❌ Нельзя (история immutable) |
| **Удаление из середины** | ✅ Можно | ❌ Нельзя (нарушит зависимости) |
| **Безопасность** | ✅ Только файлы | ⚠️ Реальные данные пользователей |

---

## ⚙️ Workflow: Правильный порядок действий

### ✅ ПРАВИЛЬНО:

```bash
# 1. Создать миграцию
touch migrations/035_add_user_roles.sql

# 2. Написать SQL
cat > migrations/035_add_user_roles.sql << 'EOF'
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL
);
EOF

# 3. Закоммитить ФАЙЛ миграции
git add migrations/035_add_user_roles.sql
git commit -m "Migration 035: Add user roles table"

# 4. Применить в базу через MCP/CLI
# (запишется в supabase_migrations.schema_migrations)

# 5. Обновить код под новую схему
# ... изменения в коде ...

# 6. Закоммитить код
git add .
git commit -m "feat: Add user roles feature (migration 035)"

# 7. Пуш
git push
```

### ❌ НЕПРАВИЛЬНО:

```bash
# 1. Открыть SQL Editor
# 2. CREATE TABLE user_roles ...
# 3. Run

# ❌ Миграция не записалась в schema_migrations!
# ❌ Нет версионирования
# ❌ Git не знает об изменении
# ❌ При откате кода база будет рассинхронизирована
```

---

## 🛠️ Инструменты для миграций

### 1. Supabase CLI (рекомендуется)

```bash
# Установка
npm install -g supabase

# Инициализация
supabase init

# Линк к проекту
supabase link --project-ref YOUR_PROJECT_ID

# Создать миграцию
supabase migration new add_user_roles

# Применить все миграции
supabase db push

# Откатить последнюю
supabase migration revert

# Посмотреть diff с production
supabase db diff
```

**Плюсы:**
- ✅ Автоматическое версионирование
- ✅ Local development database
- ✅ Rollback support
- ✅ Diff с production

### 2. MCP Tool (для Claude Code)

```bash
# Применить миграцию
mcp__supabase__apply_migration(
  project_id: "xxx",
  name: "035_add_user_roles",
  query: "CREATE TABLE ..."
)

# Посмотреть список
mcp__supabase__list_migrations(project_id: "xxx")
```

**Плюсы:**
- ✅ Интеграция с Claude
- ✅ Записывается в schema_migrations
- ✅ Можно использовать из чата

**Минусы:**
- ⚠️ Нет rollback
- ⚠️ Нет local database

### 3. SQL Editor (ТОЛЬКО для анализа!)

**✅ Используй для:**
- Debugging (SELECT запросы)
- Analytics (отчёты)
- Hotfix (срочный фикс, потом оформить миграцией!)
- Testing SQL перед созданием миграции

**❌ НЕ используй для:**
- CREATE TABLE / ALTER TABLE
- CREATE INDEX
- CREATE FUNCTION
- Любых изменений схемы

---

## 📝 Версионирование миграций

### Где Supabase хранит историю:

```sql
-- Таблица для отслеживания миграций
SELECT * FROM supabase_migrations.schema_migrations;

-- Колонки:
-- version          : "20251014140237" (timestamp создания)
-- name             : "034_add_call_metrics_to_dashboard"
-- statements       : [массив SQL команд]
-- created_by       : "leo@systemhustle.com"
-- idempotency_key  : уникальный ключ
```

### Проверка что записано:

```sql
-- Все применённые миграции
SELECT
  version,
  name,
  created_by
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Проверить конкретную миграцию
SELECT EXISTS (
  SELECT 1
  FROM supabase_migrations.schema_migrations
  WHERE name = '035_add_user_roles'
) as is_applied;
```

---

## 🚨 Что делать при рассинхронизации?

### Ситуация: Откатил код, но база осталась

```
Git:      [commit abc123] ← откатился, код старый
Database: [migration 035 applied] ← база новая

Результат: MISMATCH → 500 error
```

### ✅ Решение: Forward-only подход

**НЕ откатывай базу!** Подгони код под базу:

```bash
# 1. Восстановить файл миграции из истории
git show <commit>:migrations/035_xxx.sql > migrations/035_xxx.sql

# 2. Восстановить код под новую схему
git show <commit>:path/to/file.ts > path/to/file.ts

# 3. Закоммитить
git add .
git commit -m "fix: Restore code to match database schema (migration 035)"

# 4. Пуш
git push
```

**Когда МОЖНО откатывать базу:**
- ⚠️ Критическая ошибка с потерей данных
- ⚠️ Полное падение production
- ⚠️ Миграция только что применена (< 5 минут назад)
- ✅ Есть свежий бэкап

---

## 🔧 Практические советы

### 1. Одна миграция = одна фича

```
✅ ПРАВИЛЬНО:
035_add_user_roles.sql          (только роли)
036_add_user_permissions.sql    (только permissions)

❌ НЕПРАВИЛЬНО:
035_add_everything.sql          (роли + permissions + indexes + ...)
```

### 2. Миграции должны быть idempotent

```sql
-- ✅ ПРАВИЛЬНО: можно применить повторно
CREATE TABLE IF NOT EXISTS users (...);
CREATE OR REPLACE FUNCTION get_users() ...;

-- ❌ НЕПРАВИЛЬНО: упадёт при повторном запуске
CREATE TABLE users (...);  -- ERROR: relation already exists
```

### 3. Тестируй локально перед production

```bash
# 1. Создай миграцию
supabase migration new test_feature

# 2. Примени локально
supabase db reset

# 3. Проверь что работает
# 4. Только потом push в production
supabase db push
```

### 4. Бэкапы перед крупными миграциями

```bash
# В Supabase UI:
Database → Backups → Create backup

# Или pg_dump:
pg_dump -h db.xxx.supabase.co -U postgres > backup.sql
```

### 5. Никогда не редактируй применённые миграции

```
МОЖНО редактировать:
✅ ДО применения в production (локально)

НЕЛЬЗЯ редактировать:
❌ ПОСЛЕ применения в production
   → Создай НОВУЮ миграцию
```

---

## 📚 История нашего проекта

### Что было сделано неправильно:

```
Миграции 001-022:
❌ Применены через SQL Editor
❌ НЕ записаны в schema_migrations
❌ Нет версионирования

Результат:
- База содержит изменения
- Но нет истории миграций
- Сложно откатывать
```

### Что исправили:

```
Миграции 023, 029-034:
✅ Применены через MCP
✅ Записаны в schema_migrations
✅ Версионируются

Workflow:
✅ Создаём файл миграции
✅ git commit
✅ Применяем через MCP
✅ Проверяем
✅ git push
```

### Урок из рассинхронизации (14-15 окт 2025):

```
Проблема:
1. Создали migration 034 + код
2. Применили в базу
3. git push
4. Потом: git reset --hard (откатили код)
5. База осталась с migration 034
6. Код ждёт старую схему
   → 500 error

Решение:
✅ Восстановили код под базу (forward-only)
❌ НЕ откатывали базу (могла бы потеря данных)
```

---

## 🎯 Checklist перед миграцией

```
□ Файл миграции создан в migrations/
□ SQL протестирован в SQL Editor (SELECT для проверки)
□ git commit файла миграции
□ Применил через MCP/CLI (НЕ через SQL Editor!)
□ Проверил что записалось в schema_migrations
□ Обновил код под новую схему
□ git commit изменений кода
□ Протестировал локально
□ git push
□ Проверил в production
```

---

## 📖 Дополнительные ресурсы

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Database Migrations Best Practices](https://www.prisma.io/dataguide/types/relational/migration-strategies)
- [Forward-only migrations](https://flywaydb.org/documentation/concepts/migrations)

---

## 🔄 Полезные скрипты

### Проверка применённых миграций

```sql
-- scripts/utils/check-migrations.sql

-- Все миграции
SELECT
  version,
  name,
  created_by
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Последняя миграция
SELECT
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 1;

-- Посчитать сколько применено
SELECT COUNT(*) as total_migrations
FROM supabase_migrations.schema_migrations;
```

### Сверка локальных файлов с базой

```bash
# scripts/utils/verify-migrations.sh

# Список файлов
ls -1 migrations/*.sql | wc -l

# Список в базе
psql -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations"

# Разница = применены через SQL Editor (не отслеживаются)
```

---

**Последнее обновление:** 15 октября 2025
**Автор:** Основано на реальном опыте проекта mudrek-dashboard
