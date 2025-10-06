import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class SafeFieldCreator {
    constructor() {
        console.log('🔑 Токен подключен:', API_KEY ? '✅' : '❌');
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

    // Проверить существует ли поле
    async fieldExists(objectType, fieldName) {
        try {
            await this.makeRequest(`${BASE_URL}/crm/v3/properties/${objectType}/${fieldName}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Безопасное создание поля
    async createField(objectType, fieldConfig) {
        try {
            console.log(`\n🔧 Создание поля: ${objectType}.${fieldConfig.name}`);

            // Проверяем существование
            const exists = await this.fieldExists(objectType, fieldConfig.name);
            if (exists) {
                console.log(`   ⚠️ Поле уже существует - пропускаем`);
                return { success: true, existed: true };
            }

            // Создаем поле
            const result = await this.makeRequest(
                `${BASE_URL}/crm/v3/properties/${objectType}`,
                'POST',
                fieldConfig
            );

            console.log(`   ✅ Поле создано успешно`);
            return { success: true, existed: false, result };

        } catch (error) {
            console.log(`   ❌ Ошибка: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Критически важные поля для метрик
    getEssentialFields() {
        return {
            // Поля для сделок
            deals: [
                {
                    name: "trial_status",
                    label: "Trial Status",
                    description: "Статус пробного периода для метрики Trial Rate",
                    groupName: "dealinformation",
                    type: "enumeration",
                    fieldType: "select",
                    options: [
                        { label: "No Trial", value: "no_trial" },
                        { label: "Trial Given", value: "trial_given" },
                        { label: "Trial Converted", value: "trial_converted" },
                        { label: "Trial Expired", value: "trial_expired" }
                    ]
                },
                {
                    name: "qualified_status",
                    label: "Qualified Status",
                    description: "Статус квалификации лида для метрики Qualified Rate",
                    groupName: "dealinformation",
                    type: "enumeration",
                    fieldType: "select",
                    options: [
                        { label: "Not Qualified", value: "not_qualified" },
                        { label: "Qualified", value: "qualified" },
                        { label: "Highly Qualified", value: "highly_qualified" }
                    ]
                }
            ],
            // Поля для контактов
            contacts: [
                {
                    name: "vsl_watched",
                    label: "VSL Watched",
                    description: "Статус просмотра VSL видео для анализа эффективности",
                    groupName: "contactinformation",
                    type: "enumeration",
                    fieldType: "select",
                    options: [
                        { label: "Not Watched", value: "not_watched" },
                        { label: "Started", value: "started" },
                        { label: "4min Reached", value: "4min" },
                        { label: "18min Reached", value: "18min" },
                        { label: "Completed", value: "completed" }
                    ]
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

    // Создание всех полей
    async createAllFields() {
        console.log('🎯 СОЗДАНИЕ КРИТИЧЕСКИ ВАЖНЫХ ПОЛЕЙ\n');

        const fields = this.getEssentialFields();
        const results = {
            deals: [],
            contacts: [],
            summary: { created: 0, existed: 0, failed: 0 }
        };

        // Создаем поля для сделок
        console.log('💼 ПОЛЯ ДЛЯ СДЕЛОК:');
        for (const field of fields.deals) {
            const result = await this.createField('deals', field);
            results.deals.push({ field: field.name, ...result });

            if (result.success && !result.existed) results.summary.created++;
            else if (result.success && result.existed) results.summary.existed++;
            else results.summary.failed++;

            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 секунды между запросами
        }

        // Создаем поля для контактов
        console.log('\n👤 ПОЛЯ ДЛЯ КОНТАКТОВ:');
        for (const field of fields.contacts) {
            const result = await this.createField('contacts', field);
            results.contacts.push({ field: field.name, ...result });

            if (result.success && !result.existed) results.summary.created++;
            else if (result.success && result.existed) results.summary.existed++;
            else results.summary.failed++;

            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 секунды между запросами
        }

        return results;
    }

    // Проверка созданных полей
    async verifyFields() {
        console.log('\n🧪 ПРОВЕРКА СОЗДАННЫХ ПОЛЕЙ:\n');

        const fields = this.getEssentialFields();
        const verification = { deals: [], contacts: [] };

        // Проверяем поля сделок
        console.log('💼 Проверка полей сделок:');
        for (const field of fields.deals) {
            try {
                const fieldData = await this.makeRequest(`${BASE_URL}/crm/v3/properties/deals/${field.name}`);
                console.log(`   ✅ ${field.name}: ${fieldData.type} (${fieldData.options?.length || 0} опций)`);
                verification.deals.push({ name: field.name, status: 'OK', type: fieldData.type });
            } catch (error) {
                console.log(`   ❌ ${field.name}: ${error.message}`);
                verification.deals.push({ name: field.name, status: 'ERROR', error: error.message });
            }
        }

        // Проверяем поля контактов
        console.log('\n👤 Проверка полей контактов:');
        for (const field of fields.contacts) {
            try {
                const fieldData = await this.makeRequest(`${BASE_URL}/crm/v3/properties/contacts/${field.name}`);
                console.log(`   ✅ ${field.name}: ${fieldData.type} (${fieldData.options?.length || 0} опций)`);
                verification.contacts.push({ name: field.name, status: 'OK', type: fieldData.type });
            } catch (error) {
                console.log(`   ❌ ${field.name}: ${error.message}`);
                verification.contacts.push({ name: field.name, status: 'ERROR', error: error.message });
            }
        }

        return verification;
    }

    // Основной процесс
    async run() {
        console.log('🚀 БЕЗОПАСНОЕ СОЗДАНИЕ КРИТИЧЕСКИ ВАЖНЫХ ПОЛЕЙ\n');

        try {
            // 1. Создаем поля
            const results = await this.createAllFields();

            // 2. Выводим итог
            console.log('\n📊 ИТОГИ СОЗДАНИЯ:');
            console.log(`✅ Создано: ${results.summary.created} полей`);
            console.log(`⚠️ Уже было: ${results.summary.existed} полей`);
            console.log(`❌ Ошибок: ${results.summary.failed} полей`);

            // 3. Проверяем все поля
            const verification = await this.verifyFields();

            // 4. Сохраняем отчет
            const report = {
                timestamp: new Date().toISOString(),
                results,
                verification,
                fields_definition: this.getEssentialFields()
            };

            fs.writeFileSync('field-creation-report.json', JSON.stringify(report, null, 2));

            console.log('\n💾 Отчет сохранен в field-creation-report.json');
            console.log('🎉 СОЗДАНИЕ ПОЛЕЙ ЗАВЕРШЕНО!');

            return report;

        } catch (error) {
            console.error('💥 Критическая ошибка:', error);
            return null;
        }
    }
}

// Запуск
const creator = new SafeFieldCreator();
creator.run();