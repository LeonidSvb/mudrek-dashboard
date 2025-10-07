# 001 - Create HubSpot Fields

**Status:** ⏸️ Pending

---

## Goal

Создать все недостающие поля в HubSpot для трекинга метрик Milestone 2 и 3.

## Acceptance Criteria

- [ ] Созданы все поля для Milestone 2 (8 новых полей)
- [ ] Созданы все поля для Milestone 3 (3 новых поля)
- [ ] Все поля видны в HubSpot UI
- [ ] Протестировано заполнение полей вручную

## Technical Details

### Milestone 2 Fields

```javascript
// Cancellation tracking
cancellation_reason (dropdown)
is_refunded (checkbox)

// Followup tracking
followup_count (number)
days_between_stages (number)

// Installments
installment_count (number)
installment_plan (dropdown: 1x, 3x, 6x, 12x)

// Sales scripts
sales_script_version (dropdown: Script A, Script B, Script C)

// VSL tracking
vsl_watch_duration (number)
```

### Milestone 3 Fields

```javascript
// Upfront payment
upfront_payment (number)

// Offers
offer_given (checkbox)
offer_accepted (checkbox)
```

### Files to Create
- `hubspot/create-milestone-2-fields.js`
- `hubspot/create-milestone-3-fields.js`
- `hubspot/verify-fields.js`

### Dependencies
- HubSpot API токен в .env
- Existing: `qualified_status`, `trial_status`, `vsl_watched`, `vwo_experiment_id`

## Testing

- [ ] Создать тестовую сделку и заполнить все новые поля
- [ ] Проверить что поля видны в UI
- [ ] Проверить что данные сохраняются через API

## Notes

Используем существующий паттерн из `hubspot/create-essential-fields.js`.
Не забыть добавить поля в правильные группы (dealinformation, contactinformation).
