# 004 - Dashboard Integration

**Status:** ⏸️ Pending

---

## Goal

Интегрировать все метрики Milestone 2 и 3 в Next.js дашборд.

## Acceptance Criteria

- [ ] Все метрики Milestone 2 отображаются на дашборде
- [ ] Все метрики Milestone 3 отображаются на дашборде
- [ ] Данные обновляются в реальном времени
- [ ] UI адаптивный (desktop + mobile)
- [ ] Добавлены фильтры по датам

## Technical Details

### API Routes to Create

```typescript
// src/app/api/metrics/cancellation-rate/route.ts
// src/app/api/metrics/qualified-rate/route.ts
// src/app/api/metrics/trial-rate/route.ts
// src/app/api/metrics/call-stats/route.ts
// src/app/api/metrics/vsl-effectiveness/route.ts
```

### Components to Update

```typescript
// src/components/MetricsGrid.tsx - добавить новые метрики
// src/components/VSLChart.tsx - график эффективности VSL
// src/components/CallStatsCard.tsx - статистика звонков
```

### Dependencies
- Requires: Task #003 (SQL запросы готовы)
- Next.js app уже настроен
- Supabase client library

## Testing

- [ ] Проверить что все метрики загружаются без ошибок
- [ ] Проверить фильтры по датам
- [ ] Тест на мобильном устройстве
- [ ] Проверить что данные соответствуют SQL запросам

## Notes

Использовать существующие компоненты из `src/components/` где возможно.
Следовать существующему стилю дашборда.
