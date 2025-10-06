import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

// Базовая функция для HTTP запросов к HubSpot API
async function makeHubSpotRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const requestOptions = { ...defaultOptions, ...options };

    console.log(`Запрос к: ${url}`);

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

// Получить все свойства контактов
async function getContactProperties() {
    try {
        console.log('Получаю список свойств контактов...');
        const response = await makeHubSpotRequest('/crm/v3/properties/contacts');
        console.log(`Найдено свойств контактов: ${response.results.length}`);
        return response.results;
    } catch (error) {
        console.error('Ошибка при получении свойств контактов:', error);
        throw error;
    }
}

// Получить все контакты с основными свойствами
async function getAllContacts(limit = 100) {
    try {
        console.log('Получаю список контактов...');
        let allContacts = [];
        let after = null;
        let hasMore = true;

        while (hasMore) {
            let endpoint = `/crm/v3/objects/contacts?limit=${limit}`;
            if (after) {
                endpoint += `&after=${after}`;
            }

            const response = await makeHubSpotRequest(endpoint);
            allContacts = allContacts.concat(response.results);

            if (response.paging && response.paging.next) {
                after = response.paging.next.after;
                console.log(`Получено контактов: ${allContacts.length}, продолжаю...`);
            } else {
                hasMore = false;
            }
        }

        console.log(`Всего получено контактов: ${allContacts.length}`);
        return allContacts;
    } catch (error) {
        console.error('Ошибка при получении контактов:', error);
        throw error;
    }
}

// Тестирование - получить список свойств контактов
async function testContactProperties() {
    try {
        const properties = await getContactProperties();
        console.log('\n=== СВОЙСТВА КОНТАКТОВ ===');
        properties.forEach(prop => {
            console.log(`${prop.name}: ${prop.label} (${prop.type})`);
        });
        return properties;
    } catch (error) {
        console.error('Тест свойств контактов провален:', error);
    }
}

// Тестирование - получить первые 5 контактов
async function testGetContacts() {
    try {
        const contacts = await getAllContacts(5);
        console.log('\n=== ПЕРВЫЕ 5 КОНТАКТОВ ===');
        contacts.forEach(contact => {
            console.log(`ID: ${contact.id}`);
            console.log(`Email: ${contact.properties.email || 'Не указан'}`);
            console.log(`Имя: ${contact.properties.firstname || 'Не указано'} ${contact.properties.lastname || ''}`);
            console.log('---');
        });
        return contacts;
    } catch (error) {
        console.error('Тест получения контактов провален:', error);
    }
}

// Получить все свойства сделок
async function getDealProperties() {
    try {
        console.log('Получаю список свойств сделок...');
        const response = await makeHubSpotRequest('/crm/v3/properties/deals');
        console.log(`Найдено свойств сделок: ${response.results.length}`);
        return response.results;
    } catch (error) {
        console.error('Ошибка при получении свойств сделок:', error);
        throw error;
    }
}

// Получить все сделки с основными свойствами
async function getAllDeals(limit = 100) {
    try {
        console.log('Получаю список сделок...');
        let allDeals = [];
        let after = null;
        let hasMore = true;

        while (hasMore) {
            let endpoint = `/crm/v3/objects/deals?limit=${limit}`;
            if (after) {
                endpoint += `&after=${after}`;
            }

            const response = await makeHubSpotRequest(endpoint);
            allDeals = allDeals.concat(response.results);

            if (response.paging && response.paging.next) {
                after = response.paging.next.after;
                console.log(`Получено сделок: ${allDeals.length}, продолжаю...`);
            } else {
                hasMore = false;
            }
        }

        console.log(`Всего получено сделок: ${allDeals.length}`);
        return allDeals;
    } catch (error) {
        console.error('Ошибка при получении сделок:', error);
        throw error;
    }
}

// Тестирование - получить список свойств сделок
async function testDealProperties() {
    try {
        const properties = await getDealProperties();
        console.log('\n=== СВОЙСТВА СДЕЛОК ===');
        properties.forEach(prop => {
            console.log(`${prop.name}: ${prop.label} (${prop.type})`);
        });
        return properties;
    } catch (error) {
        console.error('Тест свойств сделок провален:', error);
    }
}

// Тестирование - получить первые 5 сделок
async function testGetDeals() {
    try {
        const deals = await getAllDeals(5);
        console.log('\n=== ПЕРВЫЕ 5 СДЕЛОК ===');
        deals.forEach(deal => {
            console.log(`ID: ${deal.id}`);
            console.log(`Название: ${deal.properties.dealname || 'Не указано'}`);
            console.log(`Стадия: ${deal.properties.dealstage || 'Не указана'}`);
            console.log(`Сумма: ${deal.properties.amount || 'Не указана'}`);
            console.log('---');
        });
        return deals;
    } catch (error) {
        console.error('Тест получения сделок провален:', error);
    }
}

// Расширенная функция для получения контактов с выбором свойств
async function getContactsWithProperties(properties = [], limit = 100, includeAssociations = []) {
    try {
        console.log(`Получаю контакты с свойствами: ${properties.join(', ')}`);
        let allContacts = [];
        let after = null;
        let hasMore = true;

        while (hasMore) {
            let endpoint = `/crm/v3/objects/contacts?limit=${limit}`;

            if (properties.length > 0) {
                endpoint += `&properties=${properties.join(',')}`;
            }

            if (includeAssociations.length > 0) {
                endpoint += `&associations=${includeAssociations.join(',')}`;
            }

            if (after) {
                endpoint += `&after=${after}`;
            }

            const response = await makeHubSpotRequest(endpoint);
            allContacts = allContacts.concat(response.results);

            if (response.paging && response.paging.next) {
                after = response.paging.next.after;
                console.log(`Получено контактов: ${allContacts.length}, продолжаю...`);
            } else {
                hasMore = false;
            }
        }

        console.log(`Всего получено контактов: ${allContacts.length}`);
        return allContacts;
    } catch (error) {
        console.error('Ошибка при получении контактов с свойствами:', error);
        throw error;
    }
}

// Расширенная функция для получения сделок с выбором свойств
async function getDealsWithProperties(properties = [], limit = 100, includeAssociations = []) {
    try {
        console.log(`Получаю сделки с свойствами: ${properties.join(', ')}`);
        let allDeals = [];
        let after = null;
        let hasMore = true;

        while (hasMore) {
            let endpoint = `/crm/v3/objects/deals?limit=${limit}`;

            if (properties.length > 0) {
                endpoint += `&properties=${properties.join(',')}`;
            }

            if (includeAssociations.length > 0) {
                endpoint += `&associations=${includeAssociations.join(',')}`;
            }

            if (after) {
                endpoint += `&after=${after}`;
            }

            const response = await makeHubSpotRequest(endpoint);
            allDeals = allDeals.concat(response.results);

            if (response.paging && response.paging.next) {
                after = response.paging.next.after;
                console.log(`Получено сделок: ${allDeals.length}, продолжаю...`);
            } else {
                hasMore = false;
            }
        }

        console.log(`Всего получено сделок: ${allDeals.length}`);
        return allDeals;
    } catch (error) {
        console.error('Ошибка при получении сделок с свойствами:', error);
        throw error;
    }
}

// Пакетное получение данных по ID
async function getBatchContactsByIds(contactIds, properties = []) {
    try {
        console.log(`Пакетное получение ${contactIds.length} контактов`);
        const batchSize = 100; // HubSpot лимит на batch операции
        const allContacts = [];

        for (let i = 0; i < contactIds.length; i += batchSize) {
            const batch = contactIds.slice(i, i + batchSize);
            const requestBody = {
                inputs: batch.map(id => ({ id: id.toString() }))
            };

            if (properties.length > 0) {
                requestBody.properties = properties;
            }

            const response = await makeHubSpotRequest('/crm/v3/objects/contacts/batch/read', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            allContacts.push(...response.results);
            console.log(`Обработано: ${i + batch.length}/${contactIds.length} контактов`);
        }

        return allContacts;
    } catch (error) {
        console.error('Ошибка при пакетном получении контактов:', error);
        throw error;
    }
}

// Пакетное получение сделок по ID
async function getBatchDealsByIds(dealIds, properties = []) {
    try {
        console.log(`Пакетное получение ${dealIds.length} сделок`);
        const batchSize = 100;
        const allDeals = [];

        for (let i = 0; i < dealIds.length; i += batchSize) {
            const batch = dealIds.slice(i, i + batchSize);
            const requestBody = {
                inputs: batch.map(id => ({ id: id.toString() }))
            };

            if (properties.length > 0) {
                requestBody.properties = properties;
            }

            const response = await makeHubSpotRequest('/crm/v3/objects/deals/batch/read', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            allDeals.push(...response.results);
            console.log(`Обработано: ${i + batch.length}/${dealIds.length} сделок`);
        }

        return allDeals;
    } catch (error) {
        console.error('Ошибка при пакетном получении сделок:', error);
        throw error;
    }
}

// Поиск контактов с фильтрами
async function searchContacts(filters = [], properties = [], limit = 100) {
    try {
        console.log('Поиск контактов с фильтрами');
        const requestBody = {
            filterGroups: filters,
            properties: properties,
            limit: limit
        };

        const response = await makeHubSpotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        return response.results;
    } catch (error) {
        console.error('Ошибка при поиске контактов:', error);
        throw error;
    }
}

// Поиск сделок с фильтрами
async function searchDeals(filters = [], properties = [], limit = 100) {
    try {
        console.log('Поиск сделок с фильтрами');
        const requestBody = {
            filterGroups: filters,
            properties: properties,
            limit: limit
        };

        const response = await makeHubSpotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        return response.results;
    } catch (error) {
        console.error('Ошибка при поиске сделок:', error);
        throw error;
    }
}

// Получить все данные (контакты + сделки + свойства) одним вызовом
async function getAllCRMData() {
    try {
        console.log('\n=== ПОЛУЧЕНИЕ ВСЕХ ДАННЫХ CRM ===');

        const results = {
            contactProperties: null,
            dealProperties: null,
            contacts: null,
            deals: null,
            errors: []
        };

        // Получаем свойства параллельно
        try {
            const [contactProps, dealProps] = await Promise.all([
                getContactProperties().catch(err => {
                    results.errors.push(`Свойства контактов: ${err.message}`);
                    return null;
                }),
                getDealProperties().catch(err => {
                    results.errors.push(`Свойства сделок: ${err.message}`);
                    return null;
                })
            ]);

            results.contactProperties = contactProps;
            results.dealProperties = dealProps;
        } catch (error) {
            results.errors.push(`Ошибка получения свойств: ${error.message}`);
        }

        // Получаем данные параллельно
        try {
            const [contacts, deals] = await Promise.all([
                getAllContacts().catch(err => {
                    results.errors.push(`Контакты: ${err.message}`);
                    return null;
                }),
                getAllDeals().catch(err => {
                    results.errors.push(`Сделки: ${err.message}`);
                    return null;
                })
            ]);

            results.contacts = contacts;
            results.deals = deals;
        } catch (error) {
            results.errors.push(`Ошибка получения данных: ${error.message}`);
        }

        console.log('\n=== РЕЗУЛЬТАТЫ ===');
        console.log(`Свойства контактов: ${results.contactProperties ? results.contactProperties.length : 'Ошибка'}`);
        console.log(`Свойства сделок: ${results.dealProperties ? results.dealProperties.length : 'Ошибка'}`);
        console.log(`Контакты: ${results.contacts ? results.contacts.length : 'Ошибка'}`);
        console.log(`Сделки: ${results.deals ? results.deals.length : 'Ошибка'}`);

        if (results.errors.length > 0) {
            console.log(`\nОшибки (${results.errors.length}):`);
            results.errors.forEach(err => console.log(`- ${err}`));
        }

        return results;
    } catch (error) {
        console.error('Критическая ошибка при получении всех данных CRM:', error);
        throw error;
    }
}

export {
    makeHubSpotRequest,
    getContactProperties,
    getAllContacts,
    getDealProperties,
    getAllDeals,
    getContactsWithProperties,
    getDealsWithProperties,
    getBatchContactsByIds,
    getBatchDealsByIds,
    searchContacts,
    searchDeals,
    getAllCRMData,
    testContactProperties,
    testGetContacts,
    testDealProperties,
    testGetDeals
};

// Если файл запущен напрямую - выполнить тесты
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        console.log('=== ТЕСТИРОВАНИЕ HUBSPOT API ===\n');
        await testContactProperties();
        await testGetContacts();
        await testDealProperties();
        await testGetDeals();
    })();
}