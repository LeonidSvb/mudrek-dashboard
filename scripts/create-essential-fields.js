import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class EssentialFieldsCreator {
    constructor() {
        if (!API_KEY) {
            console.error('❌ HUBSPOT_API_KEY не найден в .env файле');
            process.exit(1);
        }
        console.log('🔑 Используется токен:', API_KEY.substring(0, 20) + '...');
    }

    async makeRequest(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    }

    // Тестирование подключения
    async testConnection() {
        try {
            console.log('🔍 Тестирую подключение к HubSpot API...');

            // Проверяем доступ к аккаунту
            const accountInfo = await this.makeRequest(`${BASE_URL}/account-info/v3/details`);
            console.log(`✅ Подключение успешно! Аккаунт: ${accountInfo.portalId}`);

            // Проверяем доступ к контактам
            const contactsTest = await this.makeRequest(`${BASE_URL}/crm/v3/objects/contacts?limit=1`);
            console.log(`✅ Доступ к контактам: ${contactsTest.results.length} записей доступно`);

            // Проверяем доступ к сделкам
            const dealsTest = await this.makeRequest(`${BASE_URL}/crm/v3/objects/deals?limit=1`);
            console.log(`✅ Доступ к сделкам: ${dealsTest.results.length} записей доступно`);

            // Проверяем права на создание полей
            const contactProperties = await this.makeRequest(`${BASE_URL}/crm/v3/properties/contacts`);
            console.log(`✅ Доступ к полям контактов: ${contactProperties.results.length} полей`);

            return true;

        } catch (error) {
            console.error('❌ Ошибка подключения:', error.message);
            return false;
        }
    }

    // Проверить существует ли поле
    async fieldExists(objectType, fieldName) {
        try {
            await this.makeRequest(`${BASE_URL}/crm/v3/properties/${objectType}/${fieldName}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Создать поле безопасно
    async createFieldSafely(objectType, fieldConfig) {
        try {
            // Сначала проверяем существует ли поле
            const exists = await this.fieldExists(objectType, fieldConfig.name);

            if (exists) {
                console.log(`⚠️  Поле ${fieldConfig.name} уже существует в ${objectType}`);
                return { success: true, created: false, field: fieldConfig.name };
            }

            // Создаем поле
            console.log(`🔧 Создаю поле ${fieldConfig.name} в ${objectType}...`);
            const result = await this.makeRequest(
                `${BASE_URL}/crm/v3/properties/${objectType}`,
                'POST',
                fieldConfig
            );

            console.log(`✅ Поле ${fieldConfig.name} успешно создано`);
            return { success: true, created: true, field: fieldConfig.name, result };

        } catch (error) {
            console.error(`❌ Ошибка создания поля ${fieldConfig.name}:`, error.message);
            return { success: false, created: false, field: fieldConfig.name, error: error.message };
        }
    }

    // Определение критически важных полей
    getEssentialFields() {
        return {
            deals: [
                {
                    name: "trial_status",
                    label: "Trial Status",
                    description: "Статус пробного периода для трекинга trial rate",
                    groupName: "dealinformation",
                    type: "enumeration",
                    fieldType: "select",
                    options: [
                        { label: "No Trial", value: "no_trial", description: "Пробный период не предоставлялся" },
                        { label: "Trial Given", value: "trial_given", description: "Пробный период предоставлен" },
                        { label: "Trial Converted", value: "trial_converted", description: "Конвертировался из пробного" },
                        { label: "Trial Expired", value: "trial_expired", description: "Пробный период истек" }
                    ]
                },
                {
                    name: "qualified_status",
                    label: "Qualified Status",
                    description: "Статус квалификации лида для трекинга qualified rate",
                    groupName: "dealinformation",
                    type: "enumeration",
                    fieldType: "select",
                    options: [
                        { label: "Not Qualified", value: "not_qualified", description: "Не квалифицирован" },
                        { label: "Qualified", value: "qualified", description: "Квалифицирован" },
                        { label: "Highly Qualified", value: "highly_qualified", description: "Высоко квалифицирован" },
                        { label: "Disqualified", value: "disqualified", description: "Дисквалифицирован" }
                    ]
                },
                {
                    name: "offer_given_date",
                    label: "Offer Given Date",
                    description: "Дата предложения для трекинга offers given rate",
                    groupName: "dealinformation",
                    type: "datetime",
                    fieldType: "date"
                }
            ],
            contacts: [
                {
                    name: "vsl_watched",
                    label: "VSL Watched",
                    description: "Статус просмотра VSL видео для анализа эффективности",
                    groupName: "contactinformation",
                    type: "enumeration",
                    fieldType: "select",
                    options: [
                        { label: "Not Watched", value: "not_watched", description: "Не смотрел" },
                        { label: "Started", value: "started", description: "Начал смотреть" },
                        { label: "4min Reached", value: "4min", description: "Досмотрел до 4 минут" },
                        { label: "18min Reached", value: "18min", description: "Досмотрел до 18 минут" },
                        { label: "Completed", value: "completed", description: "Досмотрел полностью" }
                    ]
                },
                {
                    name: "first_contact_within_30min",
                    label: "First Contact Within 30min",
                    description: "Был ли первый контакт в течение 30 минут после создания лида",
                    groupName: "contactinformation",
                    type: "bool",
                    fieldType: "booleancheckbox"
                },
                {
                    name: "vwo_experiment_id",
                    label: "VWO Experiment ID",
                    description: "ID эксперимента VWO для A/B тестирования",
                    groupName: "contactinformation",
                    type: "string",
                    fieldType: "text"
                }
            ]
        };
    }

    // Создание всех критически важных полей
    async createEssentialFields() {
        console.log('🎯 СОЗДАНИЕ КРИТИЧЕСКИ ВАЖНЫХ ПОЛЕЙ ДЛЯ МЕТРИК\n');

        const fields = this.getEssentialFields();
        const results = {
            deals: [],
            contacts: [],
            summary: { created: 0, existed: 0, failed: 0 }
        };

        // Создаем поля для сделок
        console.log('💼 Создание полей для сделок:');
        for (const fieldConfig of fields.deals) {
            const result = await this.createFieldSafely('deals', fieldConfig);
            results.deals.push(result);

            if (result.success && result.created) results.summary.created++;
            else if (result.success && !result.created) results.summary.existed++;
            else results.summary.failed++;

            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n👤 Создание полей для контактов:');
        for (const fieldConfig of fields.contacts) {
            const result = await this.createFieldSafely('contacts', fieldConfig);
            results.contacts.push(result);

            if (result.success && result.created) results.summary.created++;
            else if (result.success && !result.created) results.summary.existed++;
            else results.summary.failed++;

            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    // Тестирование созданных полей
    async testCreatedFields() {
        console.log('\n🧪 ТЕСТИРОВАНИЕ СОЗДАННЫХ ПОЛЕЙ:');

        const fields = this.getEssentialFields();
        const testResults = {
            deals: [],
            contacts: []
        };

        // Тестируем поля сделок
        for (const fieldConfig of fields.deals) {
            try {
                const field = await this.makeRequest(`${BASE_URL}/crm/v3/properties/deals/${fieldConfig.name}`);
                testResults.deals.push({ name: fieldConfig.name, status: 'OK', type: field.type });
                console.log(`✅ deals.${fieldConfig.name}: ${field.type}`);
            } catch (error) {
                testResults.deals.push({ name: fieldConfig.name, status: 'ERROR', error: error.message });
                console.log(`❌ deals.${fieldConfig.name}: ${error.message}`);
            }
        }

        // Тестируем поля контактов
        for (const fieldConfig of fields.contacts) {
            try {
                const field = await this.makeRequest(`${BASE_URL}/crm/v3/properties/contacts/${fieldConfig.name}`);
                testResults.contacts.push({ name: fieldConfig.name, status: 'OK', type: field.type });
                console.log(`✅ contacts.${fieldConfig.name}: ${field.type}`);
            } catch (error) {
                testResults.contacts.push({ name: fieldConfig.name, status: 'ERROR', error: error.message });
                console.log(`❌ contacts.${fieldConfig.name}: ${error.message}`);
            }
        }

        return testResults;
    }

    // Основной метод
    async run() {
        console.log('🚀 СОЗДАНИЕ КРИТИЧЕСКИ ВАЖНЫХ ПОЛЕЙ HUBSPOT\n');

        // 1. Тестируем подключение
        const connectionOK = await this.testConnection();
        if (!connectionOK) {
            console.log('\n❌ Подключение не удалось. Проверьте токен и права доступа.');
            return;
        }

        console.log('\n' + '='.repeat(60));

        // 2. Создаем поля
        const results = await this.createEssentialFields();

        console.log('\n' + '='.repeat(60));
        console.log('📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
        console.log(`✅ Создано новых полей: ${results.summary.created}`);
        console.log(`⚠️  Уже существовало: ${results.summary.existed}`);
        console.log(`❌ Ошибок: ${results.summary.failed}`);

        // 3. Тестируем созданные поля
        if (results.summary.created > 0 || results.summary.existed > 0) {
            console.log('\n' + '='.repeat(60));
            await this.testCreatedFields();
        }

        // 4. Сохраняем результаты
        const report = {
            timestamp: new Date().toISOString(),
            connection_test: connectionOK,
            creation_results: results,
            fields_created: this.getEssentialFields()
        };

        const fs = await import('fs');
        fs.writeFileSync('field-creation-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Отчет сохранен в field-creation-report.json');

        console.log('\n🎉 СОЗДАНИЕ ПОЛЕЙ ЗАВЕРШЕНО!');
        console.log('📋 Следующий шаг: настройте Make для заполнения этих полей');

        return report;
    }
}

// Запуск если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    const creator = new EssentialFieldsCreator();
    creator.run().catch(error => {
        console.error('💥 Критическая ошибка:', error);
        process.exit(1);
    });
}