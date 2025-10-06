import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class BooleanFieldFixer {
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

    async createBooleanField() {
        console.log('🔧 Создание boolean поля с правильной конфигурацией...\n');

        const booleanFieldDef = {
            name: "first_contact_within_30min",
            label: "First Contact Within 30min",
            description: "Был ли первый контакт в течение 30 минут после создания лида",
            groupName: "contactinformation",
            type: "enumeration",
            fieldType: "booleancheckbox",
            options: [
                { label: "No", value: "false" },
                { label: "Yes", value: "true" }
            ]
        };

        try {
            console.log('Создание поля first_contact_within_30min...');
            const result = await this.makeRequest(
                `${BASE_URL}/crm/v3/properties/contacts`,
                'POST',
                booleanFieldDef
            );

            console.log('✅ Поле first_contact_within_30min создано успешно');
            console.log(`   Тип: ${result.type}`);
            console.log(`   Опции: ${result.options.length}`);
            result.options.forEach(opt => {
                console.log(`   - ${opt.label}: ${opt.value}`);
            });

            return { success: true, result };

        } catch (error) {
            console.error('❌ Ошибка создания поля:', error.message);
            return { success: false, error: error.message };
        }
    }
}

const fixer = new BooleanFieldFixer();
fixer.createBooleanField();