import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

async function testConnection() {
    console.log('🔑 Токен:', API_KEY ? API_KEY.substring(0, 20) + '...' : 'НЕ НАЙДЕН');

    if (!API_KEY) {
        console.error('❌ HUBSPOT_API_KEY не найден в .env файле');
        return false;
    }

    try {
        console.log('🔍 Тестирую подключение к HubSpot API...');

        const response = await fetch(`${BASE_URL}/crm/v3/objects/contacts?limit=1`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка API:', errorText);
            return false;
        }

        const data = await response.json();
        console.log('✅ Подключение успешно!');
        console.log('📊 Контакты доступны:', data.results?.length || 0);

        return true;

    } catch (error) {
        console.error('❌ Ошибка подключения:', error.message);
        return false;
    }
}

testConnection();