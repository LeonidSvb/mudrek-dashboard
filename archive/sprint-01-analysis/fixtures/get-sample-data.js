import dotenv from 'dotenv';
import fs from 'fs';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class SampleDataCollector {
    constructor() {
        if (!API_KEY) {
            console.error('Ошибка: HUBSPOT_API_KEY не найден в .env файле');
            process.exit(1);
        }
    }

    async makeRequest(url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
        }

        return await response.json();
    }

    async getDealsProperties() {
        try {
            const response = await this.makeRequest(`${BASE_URL}/crm/v3/properties/deals`);
            return response.results.map(prop => prop.name);
        } catch (error) {
            console.error('Ошибка получения свойств сделок:', error);
            return [];
        }
    }

    async getContactsProperties() {
        try {
            const response = await this.makeRequest(`${BASE_URL}/crm/v3/properties/contacts`);
            return response.results.map(prop => prop.name);
        } catch (error) {
            console.error('Ошибка получения свойств контактов:', error);
            return [];
        }
    }

    async getSampleDeals(limit = 10) {
        try {
            console.log('Получение свойств сделок...');
            const properties = await this.getDealsProperties();

            console.log(`Получение ${limit} примеров сделок...`);
            const propertiesParam = properties.join(',');

            const response = await this.makeRequest(
                `${BASE_URL}/crm/v3/objects/deals?limit=${limit}&properties=${propertiesParam}`
            );

            const sampleData = {
                total: response.results.length,
                properties_count: properties.length,
                available_properties: properties.slice(0, 50), // Первые 50 для обзора
                deals: response.results
            };

            fs.writeFileSync('sample-deals.json', JSON.stringify(sampleData, null, 2));
            console.log(`Сохранено ${response.results.length} примеров сделок в sample-deals.json`);

            return sampleData;
        } catch (error) {
            console.error('Ошибка получения примеров сделок:', error);
            return null;
        }
    }

    async getSampleContacts(limit = 10) {
        try {
            console.log('Получение свойств контактов...');
            const properties = await this.getContactsProperties();

            console.log(`Получение ${limit} примеров контактов...`);
            const propertiesParam = properties.join(',');

            const response = await this.makeRequest(
                `${BASE_URL}/crm/v3/objects/contacts?limit=${limit}&properties=${propertiesParam}`
            );

            const sampleData = {
                total: response.results.length,
                properties_count: properties.length,
                available_properties: properties.slice(0, 50), // Первые 50 для обзора
                contacts: response.results
            };

            fs.writeFileSync('sample-contacts.json', JSON.stringify(sampleData, null, 2));
            console.log(`Сохранено ${response.results.length} примеров контактов в sample-contacts.json`);

            return sampleData;
        } catch (error) {
            console.error('Ошибка получения примеров контактов:', error);
            return null;
        }
    }

    async collectAll() {
        console.log('🔍 Сбор примеров данных из HubSpot...\n');

        const deals = await this.getSampleDeals(10);
        const contacts = await this.getSampleContacts(10);

        if (deals && contacts) {
            console.log('\n✅ Данные успешно собраны:');
            console.log(`📄 sample-deals.json: ${deals.total} сделок, ${deals.properties_count} свойств`);
            console.log(`📄 sample-contacts.json: ${contacts.total} контактов, ${contacts.properties_count} свойств`);
        } else {
            console.log('❌ Ошибка при сборе данных');
        }
    }
}

const collector = new SampleDataCollector();
collector.collectAll();