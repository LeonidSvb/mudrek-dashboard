# Kavkom API Integration

## Обзор

Kavkom предоставляет REST API для работы с данными телефонии, включая историю звонков (CDR), записи разговоров, активные вызовы и CRM.

## Аутентификация

**API Key**: `73caab2e-bd41-4eef-9e6f-3ca9214eebda`

**Домен**: `shadi-mudrek.kavkom.com`

**API Endpoint**: `https://api.kavkom.com`

### Headers для всех запросов:
```
X-API-TOKEN: 73caab2e-bd41-4eef-9e6f-3ca9214eebda
Accept: application/json
Content-Type: application/json
```

## Проблема: Domain UUID

**ВАЖНО**: Все эндпоинты требуют параметр `domain_uuid`, но API не предоставляет метод для его получения программно.

### Где найти domain_uuid:

1. Войти на https://app.kavkom.com с правами администратора
2. Advanced Settings (шестеренка внизу слева)
3. Один из разделов:
   - **Domain Settings** - может отображаться на странице
   - **API Settings** - показывается при создании токенов
   - **Manage Users** - иногда отображается там
4. Или через DevTools:
   - F12 → Network → перейти на Dashboard
   - Найти запросы к `api.kavkom.com`
   - В Query Parameters будет `domain_uuid`

**Текущий статус**: domain_uuid пока не найден (требуется доступ к веб-интерфейсу).

## Доступные эндпоинты

### Call Detail Records (CDR)

#### Получить список звонков
```
GET /api/pbx/v1/cdr/list?domain_uuid={UUID}&limit={100}&page={1}
```

**Query параметры:**
- `domain_uuid` (обязательно) - UUID домена в формате uuid-v4
- `limit` (опционально) - количество записей на страницу (по умолчанию 15)
- `page` (опционально) - номер страницы

**Body параметры (фильтры):**
```json
{
  "filter": {
    "extension_uuid": "string",
    "number": "string",
    "start_date": "2025-01-01 00:00",
    "end_date": "2025-10-25 23:59",
    "call_result": "answered|voicemail|missed|cancelled",
    "caller_id_number": "string",
    "destination_number": "string",
    "caller_id_name": "string"
  }
}
```

**Пример ответа:**
```json
{
  "data": [
    {
      "uuid": "xxx",
      "domain_uuid": "xxx",
      "extension_uuid": "xxx",
      "direction": "inbound|outbound",
      "caller_id_number": "+1234567890",
      "destination_number": "+0987654321",
      "start_stamp": "2025-10-25 12:00:00",
      "duration": 120,
      "call_result": "answered",
      "file": "recording_filename.mp3"
    }
  ],
  "pagination": {
    "page": 1,
    "pages": 10,
    "total": 100
  }
}
```

#### Скачать запись разговора
```
GET /api/pbx/v1/cdr/download?file={filename}
```

**Headers**: Те же + `X-API-TOKEN`

**Возвращает**: Бинарный файл (обычно MP3)

#### Получить ссылку на запись
```
GET /api/pbx/v1/cdr/get_file_link?uuid={call_uuid}&domain_uuid={domain_uuid}
```

**Возвращает**: Зашифрованную ссылку для скачивания записи

### Активные вызовы

#### Список активных звонков
```
GET /api/pbx/v1/active_call/list?domain_uuid={UUID}
```

#### Совершить звонок
```
POST /api/pbx/v1/active_call/call
```

**Body:**
```json
{
  "domain_uuid": "string",
  "src": "extension_number",
  "destination": "phone_number"
}
```

## Утилита для скачивания звонков

Создан скрипт: `scripts/utils/kavkom-api.js`

### Использование:

```bash
# Скачать все звонки
node scripts/utils/kavkom-api.js <DOMAIN_UUID>

# С фильтром по датам
node scripts/utils/kavkom-api.js <DOMAIN_UUID> "2025-01-01 00:00" "2025-10-25 23:59"
```

### Функционал:
- Автоматическая пагинация (скачивает ВСЕ записи)
- Фильтрация по датам
- Сохранение в JSON файл
- Поддержка скачивания аудио-записей

### Пример использования в коде:

```javascript
const KavkomAPI = require('./scripts/utils/kavkom-api.js');

const api = new KavkomAPI('your-api-key');

// Получить все звонки
const calls = await api.getAllCDRs('domain-uuid', {
  startDate: '2025-01-01 00:00',
  endDate: '2025-10-25 23:59',
  callResult: 'answered' // опционально
});

// Скачать запись
await api.downloadRecording('recording.mp3', './downloads/call.mp3');

// Получить ссылку на файл
const link = await api.getFileLink('call-uuid', 'domain-uuid');
```

## Следующие шаги

1. **Найти domain_uuid** через веб-интерфейс Kavkom
2. Протестировать скрипт с реальным domain_uuid
3. Интегрировать в систему синхронизации (если нужно)
4. Настроить регулярное скачивание данных о звонках

## Ссылки

- API Документация: https://api.kavkom.com/docs/
- Help Center: https://help.kavkom.com/en/api-integration/kavkom-api/
- Веб-интерфейс: https://app.kavkom.com

## История изменений

- **2025-10-25**: Первичная настройка API, создание утилиты для скачивания CDR
