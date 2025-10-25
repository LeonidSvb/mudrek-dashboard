# 🚀 WORKFLOW: Миграции БД

**Обновлено:** 2025-10-21

## 📋 Быстрый Старт

### Ты говоришь мне:
```
"Создай миграцию для добавления новой колонки"
```

### Я делаю:
1. Создаю файл: `npx supabase migration new add_column`
2. Пишу SQL
3. Применяю: `npx supabase db push`
4. Готово! ✅

---

## 🎯 Команды

### 1. Создать миграцию

**Через меня (рекомендуется):**
```
Ты: "Создай миграцию для X"
Я: *создаю + пишу SQL + применяю*
```

**Сам (если хочешь):**
```bash
npx supabase migration new feature_name
# Редактируешь: supabase/migrations/20251022_xxx_feature_name.sql
```

### 2. Применить миграции

**Через меня:**
```
Ты: "Примени миграции"
Я: npx supabase db push
```

**Сам:**
```bash
export SUPABASE_ACCESS_TOKEN="sbp_95f2d6ec74f269247ac312303ec943f7b9d52e2d"
npx supabase db push
```

### 3. Проверить статус

```bash
npx supabase migration list
```

---

## 📁 Структура Файлов

```
project/
├── supabase/                    ← Суpabase CLI
│   ├── config.toml
│   └── migrations/
│       ├── 20251021163342_baseline.sql    ← BASELINE (точка отсчета)
│       ├── 20251022100000_add_feature.sql ← Новая миграция
│       └── ...
│
├── archive/                     ← Старые файлы (НЕ трогать!)
│   ├── BASELINE.md
│   └── old-migrations/
│       └── *.sql (51 файл)
│
└── migrations/                  ← ПУСТАЯ (всё перенесено в archive/)
```

---

## ⚠️ ВАЖНО

### ✅ Правильно:
- Все новые миграции через Supabase CLI
- Файлы в `supabase/migrations/`
- Применение через `npx supabase db push`
- Говорить мне "создай миграцию"

### ❌ НЕ делай:
- НЕ создавай файлы в `migrations/` (используй `supabase/migrations/`)
- НЕ применяй через SQL Editor
- НЕ применяй через MCP вручную
- НЕ трогай `archive/old-migrations/`

---

## 🔄 Типичный Workflow

### Сценарий 1: Добавить колонку

```
Ты: "Добавь колонку email_verified в таблицу contacts"

Я:
1. Создаю: supabase/migrations/20251022_add_email_verified.sql
2. Пишу SQL:
   ALTER TABLE contacts ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
3. Применяю: npx supabase db push
4. ✅ Done!
```

### Сценарий 2: Создать функцию

```
Ты: "Создай функцию для расчёта average deal size"

Я:
1. Создаю: supabase/migrations/20251022_add_avg_deal_size_function.sql
2. Пишу SQL:
   CREATE OR REPLACE FUNCTION get_avg_deal_size() ...
3. Применяю: npx supabase db push
4. ✅ Done!
```

---

## 🆘 Если что-то сломалось

### Проблема: "Migration failed"

```
Ты: "Миграция упала с ошибкой"
Я: *смотрю логи*
Я: *исправляю SQL в файле*
Я: *применяю заново*
```

### Проблема: "Забыл какие миграции применены"

```bash
npx supabase migration list
# Покажет: applied/pending миграции
```

---

## 📞 Поддержка

Если не понятно - просто спроси:
```
"Как применить миграцию?"
"Покажи статус миграций"
"Создай миграцию для X"
```

Я всё сделаю! 🚀
