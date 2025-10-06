import { getAllCRMData } from './hubspot-api.js';

(async () => {
    console.log('🚀 РАСШИРЕННОЕ ТЕСТИРОВАНИЕ HUBSPOT API 🚀\n');

    try {
        // Получаем все данные CRM одним вызовом
        const crmData = await getAllCRMData();

        // Выводим сводную информацию
        console.log('\n📊 СВОДКА ДАННЫХ:');

        if (crmData.contactProperties) {
            console.log(`📋 Свойства контактов: ${crmData.contactProperties.length}`);
            console.log('   Примеры свойств:');
            crmData.contactProperties.slice(0, 5).forEach(prop => {
                console.log(`   - ${prop.name}: ${prop.label} (${prop.type})`);
            });
        }

        if (crmData.dealProperties) {
            console.log(`\n💼 Свойства сделок: ${crmData.dealProperties.length}`);
            console.log('   Примеры свойств:');
            crmData.dealProperties.slice(0, 5).forEach(prop => {
                console.log(`   - ${prop.name}: ${prop.label} (${prop.type})`);
            });
        }

        if (crmData.contacts) {
            console.log(`\n👥 Контакты: ${crmData.contacts.length}`);
            console.log('   Примеры контактов:');
            crmData.contacts.slice(0, 3).forEach(contact => {
                const email = contact.properties.email || 'Не указан';
                const firstName = contact.properties.firstname || 'Не указано';
                const lastName = contact.properties.lastname || '';
                console.log(`   - ${firstName} ${lastName} (${email})`);
            });
        }

        if (crmData.deals) {
            console.log(`\n💰 Сделки: ${crmData.deals.length}`);
            console.log('   Примеры сделок:');
            crmData.deals.slice(0, 3).forEach(deal => {
                const name = deal.properties.dealname || 'Без названия';
                const amount = deal.properties.amount || 'Не указана';
                const stage = deal.properties.dealstage || 'Не указана';
                console.log(`   - ${name} (${amount}₽, стадия: ${stage})`);
            });
        }

        if (crmData.errors.length > 0) {
            console.log('\n⚠️  ОШИБКИ:');
            crmData.errors.forEach(error => {
                console.log(`   ❌ ${error}`);
            });
        }

        console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');

        // Сохраняем результат в файл для анализа
        const fs = await import('fs');
        fs.writeFileSync('crm-data-sample.json', JSON.stringify({
            summary: {
                contactPropertiesCount: crmData.contactProperties?.length || 0,
                dealPropertiesCount: crmData.dealProperties?.length || 0,
                contactsCount: crmData.contacts?.length || 0,
                dealsCount: crmData.deals?.length || 0,
                errorsCount: crmData.errors.length
            },
            errors: crmData.errors,
            sampleData: {
                contactProperties: crmData.contactProperties?.slice(0, 10),
                dealProperties: crmData.dealProperties?.slice(0, 10),
                contacts: crmData.contacts?.slice(0, 5),
                deals: crmData.deals?.slice(0, 5)
            }
        }, null, 2));

        console.log('\n💾 Образец данных сохранен в crm-data-sample.json');

    } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
        console.log('\n📋 ВОЗМОЖНЫЕ РЕШЕНИЯ:');
        console.log('1. Проверьте настройки API ключа в .env файле');
        console.log('2. Убедитесь что у приложения есть нужные права доступа');
        console.log('3. См. подробную инструкцию в HUBSPOT_SETUP.md');
    }
})();