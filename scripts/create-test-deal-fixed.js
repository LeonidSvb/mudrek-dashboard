import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class TestDealCreator {
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

    // Получить Portal ID для ссылки
    async getPortalId() {
        try {
            const accountInfo = await this.makeRequest(`${BASE_URL}/account-info/v3/details`);
            return accountInfo.portalId;
        } catch (error) {
            console.error('Ошибка получения Portal ID:', error.message);
            return null;
        }
    }

    // Создать тестовый контакт (упрощенный)
    async createTestContact() {
        const contactData = {
            properties: {
                firstname: "Тест",
                lastname: "Клиент Дашборда",
                email: `test.dashboard.${Date.now()}@example.com`, // уникальный email
                phone: "+972501234567",

                // Заполняем ТОЛЬКО новые поля (без problematic source)
                vsl_watched: "18min",
                vwo_experiment_id: "EXP_001_VSL_TEST_2025",

                // Базовые поля
                lifecyclestage: "lead"
            }
        };

        try {
            console.log('👤 Создание тестового контакта...');
            const contact = await this.makeRequest(`${BASE_URL}/crm/v3/objects/contacts`, 'POST', contactData);
            console.log(`✅ Контакт создан с ID: ${contact.id}`);
            return contact;
        } catch (error) {
            console.error('❌ Ошибка создания контакта:', error.message);
            return null;
        }
    }

    // Создать тестовую сделку (упрощенная)
    async createTestDeal() {
        const dealData = {
            properties: {
                dealname: `🧪 ТЕСТ Dashboard - ${new Date().toLocaleString('ru')}`,
                amount: "4500",
                dealstage: "qualifiedtobuy",

                // Заполняем ТОЛЬКО новые поля
                trial_status: "trial_converted",
                qualified_status: "highly_qualified",

                // Базовые поля
                deal_whole_amount: "4500",
                closedate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
        };

        try {
            console.log('💼 Создание тестовой сделки...');
            const deal = await this.makeRequest(`${BASE_URL}/crm/v3/objects/deals`, 'POST', dealData);
            console.log(`✅ Сделка создана с ID: ${deal.id}`);
            return deal;
        } catch (error) {
            console.error('❌ Ошибка создания сделки:', error.message);
            return null;
        }
    }

    // Связать контакт со сделкой
    async associateContactToDeal(contactId, dealId) {
        try {
            console.log('🔗 Связывание контакта со сделкой...');

            const associationData = {
                inputs: [{
                    from: { id: dealId },
                    to: { id: contactId },
                    type: "deal_to_contact"
                }]
            };

            await this.makeRequest(
                `${BASE_URL}/crm/v4/associations/deals/contacts/batch/create`,
                'POST',
                associationData
            );

            console.log('✅ Контакт связан со сделкой');
            return true;
        } catch (error) {
            console.error('⚠️ Ошибка связывания:', error.message);
            return false;
        }
    }

    // Основной процесс
    async createFullTestData() {
        console.log('🧪 СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ С НОВЫМИ ПОЛЯМИ\n');

        try {
            // 1. Получаем Portal ID
            const portalId = await this.getPortalId();
            console.log(`🏢 Portal ID: ${portalId}`);

            // 2. Создаем контакт
            const contact = await this.createTestContact();
            if (!contact) throw new Error('Контакт не создан');

            await new Promise(resolve => setTimeout(resolve, 1000));

            // 3. Создаем сделку
            const deal = await this.createTestDeal();
            if (!deal) throw new Error('Сделка не создана');

            await new Promise(resolve => setTimeout(resolve, 1000));

            // 4. Связываем их
            await this.associateContactToDeal(contact.id, deal.id);

            // 5. Формируем ссылки
            const contactUrl = `https://app.hubspot.com/contacts/${portalId}/record/0-1/${contact.id}`;
            const dealUrl = `https://app.hubspot.com/contacts/${portalId}/record/0-3/${deal.id}`;

            // 6. Отчет
            const report = {
                success: true,
                timestamp: new Date().toISOString(),
                portal_id: portalId,
                contact: {
                    id: contact.id,
                    email: contact.properties.email,
                    url: contactUrl,
                    new_fields: {
                        vsl_watched: contact.properties.vsl_watched,
                        vwo_experiment_id: contact.properties.vwo_experiment_id
                    }
                },
                deal: {
                    id: deal.id,
                    name: deal.properties.dealname,
                    url: dealUrl,
                    new_fields: {
                        trial_status: deal.properties.trial_status,
                        qualified_status: deal.properties.qualified_status
                    }
                }
            };

            fs.writeFileSync('test-data-report.json', JSON.stringify(report, null, 2));

            // Результат
            console.log('\n' + '='.repeat(80));
            console.log('🎉 ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ УСПЕШНО!');
            console.log('='.repeat(80));

            console.log(`\n👤 КОНТАКТ: ${contact.properties.firstname} ${contact.properties.lastname}`);
            console.log(`   📧 Email: ${contact.properties.email}`);
            console.log(`   🎬 VSL Watched: ${contact.properties.vsl_watched}`);
            console.log(`   🧪 VWO Experiment: ${contact.properties.vwo_experiment_id}`);
            console.log(`   🔗 Ссылка: ${contactUrl}`);

            console.log(`\n💼 СДЕЛКА: ${deal.properties.dealname}`);
            console.log(`   💰 Сумма: ${deal.properties.amount} ILS`);
            console.log(`   🎯 Trial Status: ${deal.properties.trial_status}`);
            console.log(`   ✅ Qualified Status: ${deal.properties.qualified_status}`);
            console.log(`   🔗 Ссылка: ${dealUrl}`);

            console.log('\n📋 ЧТО ПРОВЕРИТЬ В HUBSPOT:');
            console.log('1️⃣ Откройте ссылку на контакт');
            console.log('2️⃣ Найдите в Properties секции новые поля:');
            console.log('   - VSL Watched = "18min"');
            console.log('   - VWO Experiment ID = "EXP_001_VSL_TEST_2025"');
            console.log('3️⃣ Откройте ссылку на сделку');
            console.log('4️⃣ Найдите в Properties секции новые поля:');
            console.log('   - Trial Status = "trial_converted"');
            console.log('   - Qualified Status = "highly_qualified"');
            console.log('5️⃣ Проверьте что контакт и сделка связаны');

            console.log('\n🎯 ССЫЛКИ ДЛЯ ПРОВЕРКИ:');
            console.log('👤 КОНТАКТ:');
            console.log(contactUrl);
            console.log('\n💼 СДЕЛКА:');
            console.log(dealUrl);

            return report;

        } catch (error) {
            console.error('💥 Ошибка:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Запуск
const creator = new TestDealCreator();
creator.createFullTestData();