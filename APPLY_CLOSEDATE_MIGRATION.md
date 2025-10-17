# Инструкция: Применение миграции closedate

## Что было сделано

✅ **Исправлен sync код** (`app/api/sync/route.ts`)
- Теперь для существующих `closedwon` deals closedate НЕ перезаписывается при синхронизации
- Добавлен комментарий TECHNICAL DEBT с объяснением
- Для новых deals и deals в других статусах closedate обновляется нормально

## Что нужно сделать вручную

❗ **Применить миграцию с правильными датами closedate из CSV**

### Шаги:

1. **Откройте Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ncsyuddcnnmatzxyjgwp/sql/new
   ```

2. **Скопируйте содержимое файла:**
   ```
   migrations/UPDATE_DEALS_FROM_CSV.sql
   ```

3. **Вставьте SQL в редактор и нажмите "Run"**

4. **Проверьте результат:**
   - В конце миграции будет SELECT с количеством обновленных deals
   - Должно быть обновлено ~550 deals
   - Даты должны быть в диапазоне от 2023-03-20 до 2026-03-11

### Что делает миграция:

- Создает временную таблицу с правильными датами (first_payment_date, last_payment_date) для 550+ deals
- Обновляет `createdate` и `closedate` в таблице `hubspot_deals_raw` для `closedwon` deals
- Сопоставление происходит через email контакта
- НЕ трогает amount, upfront_payment и другие payment поля

### После применения:

✅ В Supabase будут правильные closedate
✅ Sync не будет их перезаписывать (код исправлен)
✅ Dashboard покажет корректные даты

### Дополнительно (опционально):

Если хотите обновить closedate в HubSpot тоже (чтобы данные совпадали):
- Используйте скрипт `scripts/apply-closedate-migration.js` (нужно добавить все 550 записей)
- Или обновите через HubSpot API вручную

## Проверка после миграции

Запустите этот SQL в Supabase:

```sql
-- Проверка количества уникальных дат
SELECT
  COUNT(DISTINCT closedate::date) as unique_dates,
  MIN(closedate::date) as min_date,
  MAX(closedate::date) as max_date,
  COUNT(*) as total_closedwon
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;
```

**Ожидаемый результат:**
- unique_dates: ~550 (много разных дат, а не 1-2)
- min_date: 2023-03-20
- max_date: 2026-03-11
- total_closedwon: 1000+

## Если что-то пошло не так

1. Миграция безопасна - она обновляет только closedate и createdate
2. Данные сопоставляются через email, поэтому deals без email в contact не обновятся
3. Можно запустить миграцию повторно - она идемпотентна
4. Если хотите откатить - просто запустите sync заново (но лучше не надо, т.к. он вернет неправильные даты из HubSpot)

## Technical Debt

📝 В будущем нужно:
1. Обновить closedate в HubSpot через API
2. Удалить workaround из sync кода (строки 254-277 в app/api/sync/route.ts)
3. Синхронизация снова будет обновлять closedate нормально для всех deals
