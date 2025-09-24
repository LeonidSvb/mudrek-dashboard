import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class DealFieldChecker {
    constructor() {
        this.dealId = '44396763167'; // ID созданной сделки
        this.contactId = '158039844455'; // ID созданного контакта
    }

    async makeRequest(url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    }

    // Получить все поля сделки
    async getDealDetails() {
        try {
            console.log(`🔍 Проверяю сделку ID: ${this.dealId}\n`);

            // Получаем ВСЕ свойства сделки
            const deal = await this.makeRequest(`${BASE_URL}/crm/v3/objects/deals/${this.dealId}?properties=trial_status,qualified_status,dealname,amount,dealstage`);

            console.log('📊 РЕЗУЛЬТАТ GET ЗАПРОСА:');
            console.log('=====================================');
            console.log('ID сделки:', deal.id);
            console.log('Название:', deal.properties.dealname);
            console.log('Сумма:', deal.properties.amount);
            console.log('Этап:', deal.properties.dealstage);

            console.log('\n🎯 НОВЫЕ ПОЛЯ:');
            console.log('trial_status:', deal.properties.trial_status || 'НЕ ЗАПОЛНЕНО');
            console.log('qualified_status:', deal.properties.qualified_status || 'НЕ ЗАПОЛНЕНО');

            console.log('\n🔧 ВСЕ СВОЙСТВА СДЕЛКИ:');
            Object.entries(deal.properties).forEach(([key, value]) => {
                if (value !== null && value !== '') {
                    console.log(`${key}: ${value}`);
                }
            });

            return deal;

        } catch (error) {
            console.error('❌ Ошибка получения сделки:', error.message);
            return null;
        }
    }

    // Получить все поля контакта
    async getContactDetails() {
        try {
            console.log(`\n🔍 Проверяю контакт ID: ${this.contactId}\n`);

            const contact = await this.makeRequest(`${BASE_URL}/crm/v3/objects/contacts/${this.contactId}?properties=vsl_watched,vwo_experiment_id,firstname,lastname,email`);

            console.log('👤 РЕЗУЛЬТАТ GET ЗАПРОСА КОНТАКТА:');
            console.log('=====================================');
            console.log('ID контакта:', contact.id);
            console.log('Имя:', contact.properties.firstname, contact.properties.lastname);
            console.log('Email:', contact.properties.email);

            console.log('\n🎯 НОВЫЕ ПОЛЯ КОНТАКТА:');
            console.log('vsl_watched:', contact.properties.vsl_watched || 'НЕ ЗАПОЛНЕНО');
            console.log('vwo_experiment_id:', contact.properties.vwo_experiment_id || 'НЕ ЗАПОЛНЕНО');

            return contact;

        } catch (error) {
            console.error('❌ Ошибка получения контакта:', error.message);
            return null;
        }
    }

    // Проверить все созданные поля в системе
    async checkCreatedFields() {
        console.log('\n🔍 ПРОВЕРКА СОЗДАННЫХ ПОЛЕЙ В СИСТЕМЕ:\n');

        // Проверяем поля сделок
        console.log('💼 ПОЛЯ СДЕЛОК:');
        const dealFields = ['trial_status', 'qualified_status'];

        for (const fieldName of dealFields) {
            try {
                const field = await this.makeRequest(`${BASE_URL}/crm/v3/properties/deals/${fieldName}`);
                console.log(`✅ ${fieldName}:`);
                console.log(`   Label: ${field.label}`);
                console.log(`   Type: ${field.type}`);
                console.log(`   Options: ${field.options?.length || 0} вариантов`);
                if (field.options) {
                    field.options.forEach(option => {
                        console.log(`     - ${option.label} (${option.value})`);
                    });
                }
            } catch (error) {
                console.log(`❌ ${fieldName}: ПОЛЕ НЕ НАЙДЕНО`);
            }
        }

        // Проверяем поля контактов
        console.log('\n👤 ПОЛЯ КОНТАКТОВ:');
        const contactFields = ['vsl_watched', 'vwo_experiment_id'];

        for (const fieldName of contactFields) {
            try {
                const field = await this.makeRequest(`${BASE_URL}/crm/v3/properties/contacts/${fieldName}`);
                console.log(`✅ ${fieldName}:`);
                console.log(`   Label: ${field.label}`);
                console.log(`   Type: ${field.type}`);
                console.log(`   Options: ${field.options?.length || 0} вариантов`);
                if (field.options) {
                    field.options.forEach(option => {
                        console.log(`     - ${option.label} (${option.value})`);
                    });
                }
            } catch (error) {
                console.log(`❌ ${fieldName}: ПОЛЕ НЕ НАЙДЕНО`);
            }
        }
    }

    // Попробовать обновить поля принудительно
    async updateDealFields() {
        try {
            console.log('\n🔧 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ПОЛЕЙ СДЕЛКИ:\n');

            const updateData = {
                properties: {
                    trial_status: 'trial_converted',
                    qualified_status: 'highly_qualified'
                }
            };

            const response = await fetch(`${BASE_URL}/crm/v3/objects/deals/${this.dealId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const updatedDeal = await response.json();
                console.log('✅ Сделка обновлена успешно');
                console.log('trial_status:', updatedDeal.properties.trial_status);
                console.log('qualified_status:', updatedDeal.properties.qualified_status);
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ Ошибка обновления:', errorText);
                return false;
            }

        } catch (error) {
            console.error('❌ Ошибка при обновлении:', error.message);
            return false;
        }
    }

    async runFullCheck() {
        console.log('🧪 ПОЛНАЯ ПРОВЕРКА СОЗДАННЫХ ДАННЫХ\n');

        // 1. Проверяем что поля созданы в системе
        await this.checkCreatedFields();

        // 2. Получаем данные сделки
        await this.getDealDetails();

        // 3. Получаем данные контакта
        await this.getContactDetails();

        // 4. Пробуем принудительно обновить поля
        console.log('\n' + '='.repeat(60));
        await this.updateDealFields();

        // 5. Перепроверяем сделку после обновления
        console.log('\n🔄 ПЕРЕПРОВЕРКА ПОСЛЕ ОБНОВЛЕНИЯ:');
        await this.getDealDetails();

        console.log('\n🎯 ИТОГОВЫЕ ССЫЛКИ:');
        console.log(`Сделка: https://app.hubspot.com/contacts/44890341/record/0-3/${this.dealId}`);
        console.log(`Контакт: https://app.hubspot.com/contacts/44890341/record/0-1/${this.contactId}`);
    }
}

const checker = new DealFieldChecker();
checker.runFullCheck();