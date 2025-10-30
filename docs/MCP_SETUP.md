# MCP Setup Guide

## Overview

Этот проект использует **локальную конфигурацию MCP** через `.mcp.json` в корне проекта.

**Почему локальная, а не глобальная?**
- Разные проекты могут использовать разные Supabase аккаунты
- Изоляция конфигурации между проектами
- Легко отследить изменения через Git (`.mcp.json.example`)

---

## Quick Start

### 1. Скопируй example файл

```bash
cp .mcp.json.example .mcp.json
```

### 2. Замени токены

Открой `.mcp.json` и замени:

**Supabase:**
```json
"SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_ACCESS_TOKEN_HERE"
```
На свой токен из `.env`:
```json
"SUPABASE_ACCESS_TOKEN": "sbp_10b4ce..."
```

**GitHub:**
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_TOKEN_HERE"
```
На свой токен с https://github.com/settings/tokens:
```json
"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxx..."
```

### 3. Обнови путь к проекту (если нужно)

Замени:
```json
"ALLOWED_DIRECTORIES": "C:\\Users\\YOUR_USERNAME\\Desktop\\PROJECT_NAME"
```

На актуальный путь.

### 4. Перезапусти VS Code

MCP серверы загружаются при старте Claude Code.

---

## Configuration Files

### Local (этот проект)

```
.mcp.json              # Локальная конфигурация (в .gitignore)
.mcp.json.example      # Template для Git
```

### Global (все проекты)

```
C:\Users\79818\AppData\Roaming\Claude\claude_desktop_config.json
```

**Внимание:** Глобальный конфиг НЕ содержит Supabase и filesystem для этого проекта!

---

## Available MCP Servers

### Supabase
- **Назначение:** Прямой доступ к Supabase БД
- **Токен:** Из `.env` → `SUPABASE_ACCESS_TOKEN`

### Filesystem
- **Назначение:** Доступ к файлам проекта
- **Путь:** `C:\Users\79818\Desktop\Shadi - new`

### GitHub
- **Назначение:** Работа с GitHub репозиториями (issues, PRs, commits)
- **Токен:** Personal Access Token с правами `repo`, `read:org`, `workflow`

---

## Troubleshooting

### MCP не работает?

1. **Проверь файл:**
   ```bash
   cat .mcp.json
   ```

2. **Проверь токен в `.env`:**
   ```bash
   grep SUPABASE_ACCESS_TOKEN .env
   ```

3. **Убедись, что токены совпадают:**
   - `.mcp.json` → `"SUPABASE_ACCESS_TOKEN": "sbp_xxx"`
   - `.env` → `SUPABASE_ACCESS_TOKEN=sbp_xxx`

4. **Перезапусти VS Code**

### Нужен другой токен для другого проекта?

1. Создай новый `.mcp.json` с другим токеном в другом проекте
2. Каждый проект будет использовать свой токен автоматически

---

## История изменений

**2025-10-30 (v2):**
- ✅ Добавлен GitHub MCP в локальный конфиг
- ✅ Удален GitHub из глобального конфига
- ✅ Обновлен токен (новый без срока действия)

**2025-10-30 (v1):**
- ✅ Переход на локальную конфигурацию
- ✅ Удален Supabase из глобального конфига
- ✅ Добавлен `.mcp.json.example` для документации

**2025-10-10:**
- ⚠️ Первая попытка настройки MCP (глобальный конфиг)
- ⚠️ Проблема: конфликт токенов между проектами

---

## See Also

- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers)
