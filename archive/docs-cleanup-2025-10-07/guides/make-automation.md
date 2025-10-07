# 🔄 Make Automation Guide - Настройка для новых полей

*Инструкция по настройке Make сценариев для заполнения созданных полей*
*Дата создания: 2025-01-24*

---

## ✅ **СОЗДАННЫЕ ПОЛЯ В HUBSPOT**

### 💼 **Поля сделок:**
1. **`trial_status`** - Статус пробного периода
   - Опции: `no_trial`, `trial_given`, `trial_converted`, `trial_expired`
2. **`qualified_status`** - Статус квалификации
   - Опции: `not_qualified`, `qualified`, `highly_qualified`

### 👤 **Поля контактов:**
3. **`vsl_watched`** - Статус просмотра VSL
   - Опции: `not_watched`, `started`, `4min`, `18min`, `completed`
4. **`vwo_experiment_id`** - ID эксперимента VWO
   - Тип: текстовое поле

---

## 🎯 **СЦЕНАРИИ MAKE ДЛЯ НАСТРОЙКИ**

### 📞 **Сценарий 1: Kavkom → HubSpot Qualified Status**

**Цель:** Автоматически устанавливать статус квалификации на основе звонков

#### Триггер:
```
Kavkom Webhook → Звонок завершен
```

#### Логика:
```javascript
1. Получить данные звонка (длительность, статус)
2. IF звонок длился > 5 минут AND статус = "connected"
   THEN qualified_status = "qualified"
3. IF звонок длился > 10 минут AND статус = "connected"
   THEN qualified_status = "highly_qualified"
4. ELSE qualified_status = "not_qualified"
```

#### Модули Make:
```
[Kavkom Webhook] → [Router] → [HubSpot: Update Deal]
                            ↓
                   [Condition: Call Duration > 5min]
```

#### Настройки HubSpot модуля:
- **Object Type:** Deal
- **Field:** `qualified_status`
- **Value:** `{{qualified_status_value}}` (из предыдущего модуля)

---

### 🎮 **Сценарий 2: VWO → HubSpot Experiment Tracking**

**Цель:** Автоматически проставлять ID экспериментов VWO

#### Триггер:
```
Periodic: Each hour (для проверки новых тестов)
```

#### Логика:
```javascript
1. Get VWO experiments list
2. Get HubSpot contacts created in last hour
3. Match contacts by UTM source/campaign
4. Update contacts with vwo_experiment_id
```

#### Модули Make:
```
[Schedule] → [VWO: List Experiments] → [HubSpot: List Contacts]
           → [Iterator] → [Filter: UTM Match] → [HubSpot: Update Contact]
```

#### Настройки:
- **VWO API:** Ваш VWO API ключ
- **Filter condition:** `contains(contact.source, experiment.campaign_name)`
- **HubSpot field:** `vwo_experiment_id = {{experiment.id}}`

---

### 🎬 **Сценарий 3: VSL Tracking**

**Цель:** Отслеживать прогресс просмотра VSL видео

#### Если у вас есть трекинг видео:

#### Триггер:
```
Webhook от видео-плеера (YouTube/Vimeo/Custom)
```

#### Логика:
```javascript
1. Получить event от видео-плеера
2. IF watched_time >= 240 seconds (4min)
   THEN vsl_watched = "4min"
3. IF watched_time >= 1080 seconds (18min)
   THEN vsl_watched = "18min"
4. IF watched_percentage >= 90%
   THEN vsl_watched = "completed"
```

#### Если НЕТ трекинга видео (простой вариант):

#### Триггер:
```
HubSpot Contact Created/Updated
```

#### Логика:
```javascript
1. IF source contains "vsl" OR campaign contains "video"
   THEN vsl_watched = "started"
2. IF time_on_page > 4 minutes (из UTM/analytics)
   THEN vsl_watched = "4min"
```

---

### 🧪 **Сценарий 4: Trial Status Automation**

**Цель:** Управлять статусом пробных периодов

#### Триггер:
```
HubSpot Deal Created/Updated
```

#### Логика:
```javascript
1. IF deal.source contains "trial" OR campaign contains "trial"
   THEN trial_status = "trial_given"
   AND set reminder in 24 hours

2. [After 24 hours] Check if deal is closed:
   IF dealstage = "closedwon"
   THEN trial_status = "trial_converted"
   ELSE trial_status = "trial_expired"
```

#### Модули:
```
[HubSpot Trigger] → [Filter: Trial Keywords] → [Update Deal: trial_given]
                                           → [Set Delay: 24 hours]
                                           → [Check Deal Status]
                                           → [Update Final Status]
```

---

## 🔧 **НАСТРОЙКА ПОДКЛЮЧЕНИЙ**

### 1. **HubSpot Connection в Make:**
- Используйте ваш HubSpot API токен с полными правами
- Проверьте что у токена есть права на запись (`crm.objects.*.write`)

### 2. **Kavkom Connection:**
- Webhook URL от Kavkom настройте на Make scenario
- Убедитесь что передаются поля: `call_duration`, `call_status`, `contact_id`

### 3. **VWO Connection:**
- API ключ VWO (если доступен)
- Или используйте UTM параметры для сопоставления

---

## 📊 **ТЕСТИРОВАНИЕ СЦЕНАРИЕВ**

### Для каждого сценария:

1. **Создайте тестовые данные:**
   - 1 тестовый контакт с UTM меткой
   - 1 тестовая сделка с исходником "trial"

2. **Запустите сценарий вручную**

3. **Проверьте результат в HubSpot:**
   ```
   Контакт → Properties → vsl_watched должно быть заполнено
   Сделка → Properties → trial_status должно быть заполнено
   ```

---

## 🚨 **ВАЖНЫЕ МОМЕНТЫ**

### ⚠️ **Не перезаписывайте данные:**
```javascript
// В каждом сценарии добавьте проверку:
IF field_is_empty(qualified_status)
THEN update qualified_status
ELSE skip update
```

### 🔄 **Rate Limits:**
- HubSpot: максимум 100 запросов в 10 секунд
- Добавляйте задержки между обновлениями
- Используйте batch обновления где возможно

### 📝 **Логирование:**
- Логируйте все обновления полей
- Сохраняйте старые и новые значения
- Настройте уведомления об ошибках

---

## 🎯 **ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ**

После настройки всех сценариев:

### ✅ **Автоматическое заполнение:**
- `qualified_status` - на основе длительности звонков
- `trial_status` - на основе типа сделки и её статуса
- `vsl_watched` - на основе источника трафика
- `vwo_experiment_id` - на основе UTM параметров

### 📈 **Готовые метрики:**
- **Trial Rate:** `trial_converted` / `trial_given` * 100%
- **Qualified Rate:** `qualified` / `total_leads` * 100%
- **VSL Effectiveness:** конверсия VSL vs non-VSL трафика
- **VWO Impact:** performance по экспериментам

---

## 🔧 **ДОПОЛНИТЕЛЬНЫЕ СЦЕНАРИИ (опционально)**

### 5. **Time to Contact Tracking:**
```
Trigger: Contact Created
Logic:
- Set timer for 30 minutes
- Check if first_outreach_date is set
- Update first_contact_within_30min = true/false
```

### 6. **Manager Performance:**
```
Trigger: Daily at 9 AM
Logic:
- Calculate pickup_rate for each manager
- Calculate 5min_rate for each manager
- Send daily report to managers
```

### 7. **Real-time Notifications:**
```
Trigger: Deal Closed Won
Logic:
- Send Slack notification
- Update team targets
- Trigger celebration automation
```

---

## 📋 **ЧЕКЛИСТ НАСТРОЙКИ**

### Перед запуском:
- [ ] Все API ключи настроены
- [ ] Webhooks от Kavkom работают
- [ ] Тестовые данные созданы
- [ ] Error handling настроен

### После запуска:
- [ ] Мониторинг ошибок настроен
- [ ] Данные заполняются корректно
- [ ] Rate limits не превышаются
- [ ] Команда обучена работе с новыми полями

---

**🎉 После настройки всех сценариев у вас будет полная автоматизация заполнения новых полей для точного трекинга всех запрошенных метрик!**

---

*Если нужна помощь с настройкой конкретного сценария - дайте знать, создам детальную схему с точными настройками модулей Make.*