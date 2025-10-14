# GitHub Actions Setup

## Добавить secrets в GitHub

1. Открой репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Нажми "New repository secret"
4. Добавь 3 секрета:

### HUBSPOT_API_KEY
```
pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
(Твой HubSpot API key из Settings → Integrations → Private Apps)

### SUPABASE_URL
```
https://xxxxx.supabase.co
```
(Твой Supabase project URL из Settings → API)

### SUPABASE_SERVICE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
```
(Service role key из Settings → API → service_role secret)

## Готово!

После добавления secrets:
- ✅ Автоматическая синхронизация каждые 2 часа
- ✅ Кнопка "Run workflow" в Actions для ручного запуска
- ✅ Логи каждой синхронизации

## Проверить работу

1. Actions → HubSpot Incremental Sync → Run workflow
2. Дождись завершения (1-2 минуты)
3. Проверь логи синхронизации
