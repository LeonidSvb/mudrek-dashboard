# 🔧 Настройка HubSpot API

## ❌ Текущая проблема

API подключение работает, но приложению не хватает прав доступа (scopes) для чтения данных CRM.

**Ошибка**: `403 Forbidden - This app hasn't been granted all required scopes`

## ✅ Что нужно сделать

### 1. Создать Private App в HubSpot

1. Войдите в ваш HubSpot аккаунт
2. Перейдите в **Settings** (Настройки) → **Integrations** → **Private Apps**
3. Нажмите **"Create a private app"**
4. Укажите название: `Dashboard API`
5. Добавьте описание: `API для получения данных CRM для дашборда`

### 2. Настроить права доступа (Scopes)

В разделе **Scopes** отметьте следующие права:

#### 📋 CRM - Contacts (Контакты)
- `crm.objects.contacts.read` - Чтение контактов
- `crm.schemas.contacts.read` - Чтение структуры контактов

#### 💼 CRM - Deals (Сделки)
- `crm.objects.deals.read` - Чтение сделок
- `crm.schemas.deals.read` - Чтение структуры сделок

#### 🏢 CRM - Companies (Компании) - Опционально
- `crm.objects.companies.read` - Чтение компаний
- `crm.schemas.companies.read` - Чтение структуры компаний

#### 🎫 CRM - Tickets (Тикеты) - Опционально
- `tickets` - Доступ к тикетам

### 3. Получить новый Access Token

1. Создайте приложение с нужными правами
2. Скопируйте **Access Token** (начинается с `pat-`)
3. Замените в файле `.env`:

```env
HUBSPOT_API_KEY=pat-ваш-новый-токен-здесь
```

### 4. Обновить код для Private App

Если используете Private App токен, нужно изменить авторизацию:

```javascript
// Вместо hapikey в URL используйте Bearer token в headers
headers: {
    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
    'Content-Type': 'application/json'
}
```

## 🧪 Проверка настройки

После настройки запустите тест:

```bash
node test.js
```

Если все настроено правильно, вы должны увидеть:
- ✅ Список свойств контактов
- ✅ Список свойств сделок
- ✅ Данные контактов
- ✅ Данные сделок

## 📝 Альтернативный вариант

Если Private App не работает, можно использовать:

1. **Legacy API Key** - но он имеет ограничения
2. **OAuth App** - для публичных интеграций
3. **Webhook Subscriptions** - для получения обновлений в реальном времени

## 🆘 Решение проблем

### Ошибка 401 Unauthorized
- Проверьте правильность API ключа
- Убедитесь что используете правильный формат авторизации

### Ошибка 403 Forbidden
- Добавьте нужные scopes в настройках приложения
- Пересоздайте токен после добавления прав

### Ошибка 429 Rate Limited
- Добавьте задержки между запросами
- Используйте batch операции для массовых данных

## 🚀 Готовые функции API

После настройки доступны следующие функции:

```javascript
import {
    getAllCRMData,           // Получить все данные CRM
    getContactsWithProperties, // Контакты с выбором свойств
    getDealsWithProperties,   // Сделки с выбором свойств
    searchContacts,          // Поиск контактов
    searchDeals,             // Поиск сделок
    getBatchContactsByIds,   // Пакетное получение контактов
    getBatchDealsByIds       // Пакетное получение сделок
} from './hubspot-api.js';

// Получить все данные одним вызовом
const allData = await getAllCRMData();
```

---

**💡 Совет**: После настройки сохраните токен в безопасном месте и никогда не делитесь им публично!