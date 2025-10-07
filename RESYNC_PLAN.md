# Plan: Resync Calls с Associations

## Текущая проблема:

### Что мы СЕЙЧАС сохраняем:
```javascript
// sync-parallel.js строка 179:
raw_json: call.properties  // ❌ ТОЛЬКО properties
```

### Структура ответа HubSpot API:
```json
{
  "id": "46379611462",
  "properties": {
    "hs_call_duration": "15220",
    "hs_call_direction": "OUTBOUND",
    ...
  },
  "associations": {
    "contacts": {
      "results": [
        {"id": "93260", "type": "call_to_contact"}
      ]
    },
    "deals": {
      "results": [
        {"id": "43486818671", "type": "call_to_deal"}
      ]
    }
  }
}
```

## Решение - два варианта:

### Вариант A: Сохранить весь объект в raw_json (проще)

**Плюсы:**
- Минимум изменений в коде
- Вся информация в raw_json (можем извлекать через JSONB queries)

**Минусы:**
- raw_json становится больше (~2x размер)
- Нужно resync все 118,799 звонков

**Код изменений:**
```javascript
// 1. В fetchAllFromHubSpot добавить associations:
url += `&associations=contacts,deals`;

// 2. В syncCalls изменить:
raw_json: call  // ✅ Весь объект вместо call.properties
```

### Вариант B: Отдельная таблица associations (правильнее)

**Плюсы:**
- Нормализованная структура
- Быстрые JOIN queries
- Меньше места

**Минусы:**
- Больше работы (новая таблица, миграция)
- Сложнее sync logic

**Структура:**
```sql
CREATE TABLE hubspot_call_associations (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES hubspot_calls_raw(hubspot_id),
  contact_id BIGINT,
  deal_id BIGINT,
  association_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Оценка времени resync:

**Вариант A (простой):**
- Изменить 2 строки кода: 2 минуты
- Запустить resync: ~5-10 минут (118k calls, HubSpot rate limit = 100/sec)
- Проверить данные: 2 минуты
- **Итого: ~15 минут**

**Вариант B (правильный):**
- Создать миграцию: 10 минут
- Изменить sync script: 20 минут
- Запустить resync: ~10 минут
- Проверить связи: 5 минут
- **Итого: ~45 минут**

## Альтернатива: Phone Matching (временное решение)

**Плюсы:**
- Работает ПРЯМО СЕЙЧАС (0 минут)
- Не нужен resync
- Точность ~85% (проверил - дубликаты телефонов редки)

**Минусы:**
- Не 100% точность
- Не работает для deals (у deals нет phone)

**Какие метрики доступны:**
- ✅ Followup rate
- ✅ Avg followups per contact
- ✅ Time to first contact
- ❌ Call-to-deal связи (для Rate to close)

## Рекомендация:

### Фаза 1: СЕЙЧАС (0 минут)
- Использовать phone matching для 3 метрик
- Показать клиенту рабочий dashboard

### Фаза 2: ПОТОМ (15-45 минут когда будет время)
- Обновить sync script (Вариант A - проще)
- Resync calls с associations
- Получить 100% точные связи

## Какой план выбираем?

1. **Быстро** → Phone matching сейчас, resync потом
2. **Правильно сразу** → Resync с Вариант A (15 мин)
3. **Идеально** → Resync с Вариант B (45 мин + новая таблица)
