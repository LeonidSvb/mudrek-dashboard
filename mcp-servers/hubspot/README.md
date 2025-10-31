# HubSpot MCP Server

Локальный MCP сервер для работы с HubSpot API через Personal Access Token.

## Установка

MCP server настроен и готов к использованию. Конфигурация в `.mcp.json`:

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "node",
      "args": ["mcp-servers/hubspot/server.js"],
      "env": {
        "HUBSPOT_API_KEY": "pat-na1-...",
        "HUBSPOT_PORTAL_ID": "44890341"
      }
    }
  }
}
```

## Использование

### После перезапуска Claude Code используйте:

```
/mcp
```

Вы должны увидеть `hubspot` в списке доступных MCP серверов.

## Доступные инструменты

### 1. hubspot_get_contacts
Получение списка контактов из HubSpot.

**Параметры:**
- `limit` (number, необязательный): Количество контактов для получения (по умолчанию: 10)

**Пример:**
```
Получи 5 контактов из HubSpot
```

### 2. hubspot_get_deals
Получение списка сделок из HubSpot.

**Параметры:**
- `limit` (number, необязательный): Количество сделок для получения (по умолчанию: 10)

**Пример:**
```
Получи 10 сделок из HubSpot
```

### 3. hubspot_search
Поиск записей в HubSpot.

**Параметры:**
- `objectType` (string, обязательный): Тип объекта ('contacts', 'deals', 'companies')
- `query` (string, обязательный): Поисковый запрос

**Пример:**
```
Найди контакты с email содержащим "example.com"
```

### 4. hubspot_get_properties
Получение свойств объекта HubSpot.

**Параметры:**
- `objectType` (string, обязательный): Тип объекта ('contacts', 'deals', 'companies')

**Пример:**
```
Покажи все свойства контактов в HubSpot
```

## Тестирование

Для тестирования MCP server вручную:

```bash
# Инициализация
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node mcp-servers/hubspot/server.js

# Список инструментов
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node mcp-servers/hubspot/server.js

# Получение контактов
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hubspot_get_contacts","arguments":{"limit":2}}}' | node mcp-servers/hubspot/server.js
```

## Безопасность

⚠️ **Важно:**
- `.mcp.json` добавлен в `.gitignore` (содержит API ключ)
- `mcp-servers/` добавлен в `.gitignore`
- Никогда не коммитьте эти файлы в git!

## Поддержка

MCP server использует HubSpot REST API v3:
- Документация: https://developers.hubspot.com/docs/api/overview
- Portal ID: 44890341
