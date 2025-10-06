import {
    testContactProperties,
    testGetContacts,
    testDealProperties,
    testGetDeals
} from './hubspot-api.js';

(async () => {
    console.log('=== ТЕСТИРОВАНИЕ HUBSPOT API ===\n');
    try {
        await testContactProperties();
        await testGetContacts();
        await testDealProperties();
        await testGetDeals();
        console.log('\n=== ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ ===');
    } catch (error) {
        console.error('Критическая ошибка в тестах:', error);
    }
})();