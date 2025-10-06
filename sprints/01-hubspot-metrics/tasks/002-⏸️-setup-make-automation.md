# 002 - Setup Make.com Automation

**Status:** ⏸️ Pending

---

## Goal

Настроить 4 автоматизационных сценария в Make.com для автоматического заполнения полей.

## Acceptance Criteria

- [ ] Сценарий 1: Auto-fill trial_status работает
- [ ] Сценарий 2: Auto-fill qualified_status работает
- [ ] Сценарий 3: Track VSL viewing работает
- [ ] Сценарий 4: Track followups работает
- [ ] Все сценарии протестированы на реальных данных

## Technical Details

### Scenario 1: Auto-fill trial_status
```
Trigger: Deal stage changed
Condition: dealstage = 'trial'
Action: UPDATE trial_status = 'started'
```

### Scenario 2: Auto-fill qualified_status
```
Trigger: Deal stage changed
Condition: dealstage = 'qualified'
Action: UPDATE qualified_status = 'qualified'
```

### Scenario 3: Track VSL viewing
```
Trigger: Contact property changed (vsl_watched)
Condition: vsl_watched = true AND vsl_watch_duration >= 18
Action: UPDATE contact_tag = 'vsl_completed'
```

### Scenario 4: Track followups
```
Trigger: New call logged
Action:
  COUNT calls for deal_id
  UPDATE followup_count = count
```

### Dependencies
- Requires: Task #001 (поля должны быть созданы)
- Make.com API ключ
- HubSpot webhook endpoints

## Testing

- [ ] Создать тестовую сделку и перевести в stage 'trial'
- [ ] Проверить что trial_status обновился автоматически
- [ ] Создать тестовый контакт и обновить vsl_watched
- [ ] Залогировать звонок и проверить followup_count

## Notes

Документация Make.com уже есть в `docs/guides/make-automation.md`.
Использовать HubSpot webhook URL для триггеров.
