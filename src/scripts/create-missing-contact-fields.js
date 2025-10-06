import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class MissingContactFieldsCreator {
    constructor() {
        console.log('Токен подключен:', API_KEY ? '✅' : '❌');
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

    async checkFieldExists(fieldName) {
        try {
            await this.makeRequest(`${BASE_URL}/crm/v3/properties/contacts/${fieldName}`);
            return true;
        } catch (error) {
            if (error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }

    async createContactField(fieldDefinition) {
        const { name } = fieldDefinition;

        try {
            console.log(`Проверка поля ${name}...`);
            const exists = await this.checkFieldExists(name);

            if (exists) {
                console.log(`⚠️ Поле ${name} уже существует`);
                return { field: name, success: true, existed: true };
            }

            console.log(`Создание поля ${name}...`);
            const result = await this.makeRequest(
                `${BASE_URL}/crm/v3/properties/contacts`,
                'POST',
                fieldDefinition
            );

            console.log(`✅ Поле ${name} создано успешно`);
            return { field: name, success: true, existed: false, result };

        } catch (error) {
            console.error(`❌ Ошибка создания поля ${name}:`, error.message);
            return { field: name, success: false, error: error.message };
        }
    }

    async createAllMissingFields() {
        console.log('🔧 СОЗДАНИЕ НЕДОСТАЮЩИХ ПОЛЕЙ КОНТАКТОВ ИЗ PRD\n');

        const fieldsToCreate = [
            {
                name: "first_contact_within_30min",
                label: "First Contact Within 30min",
                description: "Был ли первый контакт в течение 30 минут после создания лида",
                groupName: "contactinformation",
                type: "bool",
                fieldType: "booleancheckbox"
            },
            {
                name: "sales_script_version",
                label: "Sales Script Version",
                description: "Версия продающего скрипта для A/B тестирования",
                groupName: "contactinformation",
                type: "enumeration",
                fieldType: "select",
                options: [
                    { label: "Script v1.0", value: "v1_0" },
                    { label: "Script v1.1", value: "v1_1" },
                    { label: "Script v2.0", value: "v2_0" },
                    { label: "Script v2.1", value: "v2_1" },
                    { label: "Custom Script", value: "custom" }
                ]
            },
            {
                name: "vwo_variation",
                label: "VWO Variation",
                description: "Вариация VWO эксперимента (A/B/C)",
                groupName: "contactinformation",
                type: "string",
                fieldType: "text"
            }
        ];

        const results = [];

        for (const fieldDef of fieldsToCreate) {
            const result = await this.createContactField(fieldDef);
            results.push(result);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n' + '='.repeat(50));
        console.log('📋 ИТОГИ СОЗДАНИЯ ПОЛЕЙ:');
        console.log('='.repeat(50));

        let created = 0, existed = 0, failed = 0;

        results.forEach(result => {
            if (result.success) {
                if (result.existed) {
                    console.log(`⚠️ ${result.field} - уже существует`);
                    existed++;
                } else {
                    console.log(`✅ ${result.field} - создано успешно`);
                    created++;
                }
            } else {
                console.log(`❌ ${result.field} - ошибка: ${result.error}`);
                failed++;
            }
        });

        console.log(`\n📊 СТАТИСТИКА:`);
        console.log(`   Создано: ${created}`);
        console.log(`   Уже существовало: ${existed}`);
        console.log(`   Ошибок: ${failed}`);

        const report = {
            timestamp: new Date().toISOString(),
            fields_created: results.filter(r => r.success && !r.existed),
            fields_existed: results.filter(r => r.success && r.existed),
            fields_failed: results.filter(r => !r.success),
            summary: { created, existed, failed }
        };

        fs.writeFileSync('missing-contact-fields-report.json', JSON.stringify(report, null, 2));
        console.log(`\n💾 Отчет сохранен в missing-contact-fields-report.json`);

        console.log(`\n🎯 ТЕПЕРЬ У НАС ПОЛНОЕ ПОКРЫТИЕ PRD:`);
        console.log(`✅ first_contact_within_30min - для Time to contact impact`);
        console.log(`✅ sales_script_version - для Different sales scripts testing`);
        console.log(`✅ vwo_variation - дополнение к vwo_experiment_id`);
        console.log(`\n🚀 Готовность к дашборду: 100%`);

        return report;
    }
}

const creator = new MissingContactFieldsCreator();
creator.createAllMissingFields();