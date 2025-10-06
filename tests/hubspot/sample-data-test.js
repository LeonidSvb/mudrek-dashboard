import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

async function makeHubSpotRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error: ${response.status} - ${response.statusText}. Response: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('HubSpot API Error:', error);
        throw error;
    }
}

async function getSampleContacts() {
    try {
        console.log('📋 Получаю 10 контактов с всеми полями...\n');

        const response = await makeHubSpotRequest('/crm/v3/objects/contacts?limit=10');

        if (response.results && response.results.length > 0) {
            console.log(`✅ Получено ${response.results.length} контактов\n`);

            // Анализируем первый контакт для понимания структуры
            const firstContact = response.results[0];
            console.log('📊 СТРУКТУРА КОНТАКТА:');
            console.log(`ID: ${firstContact.id}`);
            console.log(`Created: ${firstContact.createdAt}`);
            console.log(`Updated: ${firstContact.updatedAt}\n`);

            console.log('🏷️  ДОСТУПНЫЕ СВОЙСТВА КОНТАКТОВ:');
            const properties = Object.keys(firstContact.properties);
            console.log(`Всего свойств: ${properties.length}\n`);

            properties.forEach((prop, index) => {
                const value = firstContact.properties[prop];
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${prop.padEnd(30)} = ${value || 'null'}`);
            });

            // Показываем примеры данных других контактов
            console.log('\n📋 ПРИМЕРЫ КОНТАКТОВ:');
            response.results.slice(0, 5).forEach((contact, index) => {
                console.log(`\n${index + 1}. ID: ${contact.id}`);
                console.log(`   Email: ${contact.properties.email || 'Не указан'}`);
                console.log(`   Имя: ${contact.properties.firstname || 'Не указано'} ${contact.properties.lastname || ''}`);
                console.log(`   Компания: ${contact.properties.company || 'Не указана'}`);
                console.log(`   Телефон: ${contact.properties.phone || 'Не указан'}`);
                console.log(`   Создан: ${contact.properties.createdate || 'Не указан'}`);
            });

            return response.results;
        }

    } catch (error) {
        console.error('❌ Ошибка при получении контактов:', error.message);
        throw error;
    }
}

async function getSampleDeals() {
    try {
        console.log('\n💼 Получаю 10 сделок с всеми полями...\n');

        const response = await makeHubSpotRequest('/crm/v3/objects/deals?limit=10');

        if (response.results && response.results.length > 0) {
            console.log(`✅ Получено ${response.results.length} сделок\n`);

            // Анализируем первую сделку для понимания структуры
            const firstDeal = response.results[0];
            console.log('💰 СТРУКТУРА СДЕЛКИ:');
            console.log(`ID: ${firstDeal.id}`);
            console.log(`Created: ${firstDeal.createdAt}`);
            console.log(`Updated: ${firstDeal.updatedAt}\n`);

            console.log('🏷️  ДОСТУПНЫЕ СВОЙСТВА СДЕЛОК:');
            const properties = Object.keys(firstDeal.properties);
            console.log(`Всего свойств: ${properties.length}\n`);

            properties.forEach((prop, index) => {
                const value = firstDeal.properties[prop];
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${prop.padEnd(30)} = ${value || 'null'}`);
            });

            // Показываем примеры данных других сделок
            console.log('\n💼 ПРИМЕРЫ СДЕЛОК:');
            response.results.slice(0, 5).forEach((deal, index) => {
                console.log(`\n${index + 1}. ID: ${deal.id}`);
                console.log(`   Название: ${deal.properties.dealname || 'Не указано'}`);
                console.log(`   Сумма: ${deal.properties.amount || 'Не указана'}`);
                console.log(`   Стадия: ${deal.properties.dealstage || 'Не указана'}`);
                console.log(`   Владелец: ${deal.properties.hubspot_owner_id || 'Не указан'}`);
                console.log(`   Дата закрытия: ${deal.properties.closedate || 'Не указана'}`);
                console.log(`   Создана: ${deal.properties.createdate || 'Не указана'}`);
            });

            return response.results;
        }

    } catch (error) {
        console.error('❌ Ошибка при получении сделок:', error.message);
        throw error;
    }
}

async function analyzeSampleData() {
    try {
        console.log('🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ HUBSPOT\n');
        console.log('=' .repeat(80));

        const contacts = await getSampleContacts();
        const deals = await getSampleDeals();

        console.log('\n' + '='.repeat(80));
        console.log('📊 АНАЛИЗ ДЛЯ ДАШБОРДА:');
        console.log('=' .repeat(80));

        // Анализ для дашборда
        if (contacts && contacts.length > 0) {
            console.log('\n📋 КЛЮЧЕВЫЕ ПОЛЯ КОНТАКТОВ ДЛЯ ДАШБОРДА:');
            const keyContactFields = [
                'email', 'firstname', 'lastname', 'company', 'phone',
                'createdate', 'lastmodifieddate', 'hs_lead_status',
                'lifecyclestage', 'hubspot_owner_id'
            ];

            keyContactFields.forEach(field => {
                const hasValue = contacts.some(c => c.properties[field]);
                console.log(`   ${field.padEnd(25)} - ${hasValue ? '✅ Есть данные' : '❌ Пустое'}`);
            });
        }

        if (deals && deals.length > 0) {
            console.log('\n💼 КЛЮЧЕВЫЕ ПОЛЯ СДЕЛОК ДЛЯ ДАШБОРДА:');
            const keyDealFields = [
                'dealname', 'amount', 'dealstage', 'pipeline',
                'closedate', 'createdate', 'hubspot_owner_id',
                'amount_in_home_currency'
            ];

            keyDealFields.forEach(field => {
                const hasValue = deals.some(d => d.properties[field]);
                console.log(`   ${field.padEnd(25)} - ${hasValue ? '✅ Есть данные' : '❌ Пустое'}`);
            });
        }

        console.log('\n🚀 Готов для создания дашборда!');

    } catch (error) {
        console.error('💥 Ошибка анализа:', error.message);
    }
}

// Запускаем анализ
analyzeSampleData();