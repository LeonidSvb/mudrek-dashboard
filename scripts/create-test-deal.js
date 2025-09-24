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

    // Создать тестовый контакт
    async createTestContact() {
        const contactData = {
            properties: {
                firstname: "Тест",
                lastname: "Клиент Дашборда",
                email: "test.dashboard.client@example.com",
                phone: "+972501234567",
                company: "Test Dashboard Company",

                // Заполняем новые поля
                vsl_watched: "18min",
                vwo_experiment_id: "EXP_001_VSL_TEST_2025",

                // Дополнительные поля для контекста
                lifecyclestage: "lead",
                hs_lead_status: "NEW",
                source: "vsl-landing-page|dashboard-test|make-automation"
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

    // Создать тестовую сделку
    async createTestDeal(contactId = null) {
        const dealData = {
            properties: {
                dealname: "🧪 ТЕСТ: Dashboard Metrics Deal - " + new Date().toLocaleDateString(),
                amount: "4500",
                dealstage: "qualifiedtobuy",
                pipeline: "default",

                // Заполняем новые поля
                trial_status: "trial_converted",
                qualified_status: "highly_qualified",

                // Дополнительные поля для полной картины
                deal_whole_amount: "4500",
                installments: "3",
                payment_method: "installments",
                closedate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // через неделю

                // Поля для анализа
                hs_analytics_latest_source: "DIRECT_TRAFFIC",
                hubspot_owner_assigneddate: new Date().toISOString()
            }
        };

        try {
            console.log('💼 Создание тестовой сделки...');
            const deal = await this.makeRequest(`${BASE_URL}/crm/v3/objects/deals`, 'POST', dealData);
            console.log(`✅ Сделка создана с ID: ${deal.id}`);

            // Если есть контакт - связываем их
            if (contactId) {
                await this.associateContactToDeal(contactId, deal.id);
            }

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
        } catch (error) {
            console.error('⚠️ Ошибка связывания (не критично):', error.message);
        }
    }

    // Создать тестовую активность (звонок)
    async createTestCall(contactId, dealId) {
        try {
            console.log('📞 Создание тестового звонка...');

            // Создаем заметку вместо звонка (проще для тестирования)
            const noteData = {
                properties: {
                    hs_note_body: "🧪 ТЕСТ: Звонок длительностью 12 минут. Клиент заинтересован, предложение дано, высокая квалификация подтверждена. VSL досмотрел до 18 минут. Участвует в A/B тесте EXP_001.",
                    hs_timestamp: new Date().toISOString(),
                    hubspot_owner_id: "682432124" // Используем существующий ID владельца
                }
            };

            const note = await this.makeRequest(`${BASE_URL}/crm/v3/objects/notes`, 'POST', noteData);

            // Связываем с контактом
            if (contactId) {
                const contactAssoc = {
                    inputs: [{
                        from: { id: note.id },
                        to: { id: contactId },
                        type: "note_to_contact"
                    }]
                };
                await this.makeRequest(`${BASE_URL}/crm/v4/associations/notes/contacts/batch/create`, 'POST', contactAssoc);
            }

            // Связываем со сделкой
            if (dealId) {
                const dealAssoc = {
                    inputs: [{
                        from: { id: note.id },
                        to: { id: dealId },
                        type: "note_to_deal"
                    }]
                };
                await this.makeRequest(`${BASE_URL}/crm/v4/associations/notes/deals/batch/create`, 'POST', dealAssoc);
            }

            console.log('✅ Тестовая активность создана');
            return note;

        } catch (error) {
            console.error('⚠️ Ошибка создания активности:', error.message);
            return null;
        }
    }

    // Основной процесс создания
    async createFullTestData() {
        console.log('🧪 СОЗДАНИЕ ПОЛНОГО ТЕСТОВОГО НАБОРА ДАННЫХ\n');

        try {
            // 1. Получаем Portal ID
            const portalId = await this.getPortalId();
            if (!portalId) {
                throw new Error('Не удалось получить Portal ID');
            }
            console.log(`🏢 Portal ID: ${portalId}`);

            // 2. Создаем тестовый контакт
            const contact = await this.createTestContact();
            if (!contact) {
                throw new Error('Не удалось создать контакт');
            }

            // Ждем немного
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. Создаем тестовую сделку
            const deal = await this.createTestDeal(contact.id);
            if (!deal) {
                throw new Error('Не удалось создать сделку');
            }

            // Ждем немного
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Создаем тестовую активность
            await this.createTestCall(contact.id, deal.id);

            // 5. Формируем ссылки
            const contactUrl = `https://app.hubspot.com/contacts/${portalId}/record/0-1/${contact.id}`;
            const dealUrl = `https://app.hubspot.com/contacts/${portalId}/record/0-3/${deal.id}`;

            // 6. Создаем отчет
            const report = {
                success: true,
                timestamp: new Date().toISOString(),
                portal_id: portalId,
                created_objects: {
                    contact: {
                        id: contact.id,
                        url: contactUrl,
                        fields_filled: {
                            vsl_watched: "18min",
                            vwo_experiment_id: "EXP_001_VSL_TEST_2025"
                        }
                    },
                    deal: {
                        id: deal.id,
                        url: dealUrl,
                        fields_filled: {
                            trial_status: "trial_converted",
                            qualified_status: "highly_qualified"
                        }
                    }
                },
                test_data_summary: {
                    scenario: "Высококвалифицированный лид из VSL кампании, конвертировался из пробного периода, участвует в A/B тесте",
                    expected_metrics: {
                        trial_rate: "100% (1/1 конвертация)",
                        qualified_rate: "100% (highly_qualified)",
                        vsl_effectiveness: "Положительная (18min просмотр)",
                        vwo_impact: "Тестируется (EXP_001)"
                    }
                }
            };

            // Сохраняем отчет
            fs.writeFileSync('test-data-report.json', JSON.stringify(report, null, 2));

            // Выводим результат
            console.log('\n' + '='.repeat(70));
            console.log('🎉 ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ УСПЕШНО!');
            console.log('='.repeat(70));

            console.log('\n📋 СОЗДАННЫЕ ОБЪЕКТЫ:');
            console.log(`👤 Контакт: ${contact.properties.firstname} ${contact.properties.lastname}`);
            console.log(`   📧 Email: ${contact.properties.email}`);
            console.log(`   📞 Phone: ${contact.properties.phone}`);
            console.log(`   🎬 VSL Watched: ${contact.properties.vsl_watched}`);
            console.log(`   🧪 VWO Experiment: ${contact.properties.vwo_experiment_id}`);

            console.log(`\n💼 Сделка: ${deal.properties.dealname}`);
            console.log(`   💰 Сумма: ${deal.properties.amount} ILS`);
            console.log(`   📊 Этап: ${deal.properties.dealstage}`);
            console.log(`   🎯 Trial Status: ${deal.properties.trial_status}`);
            console.log(`   ✅ Qualified Status: ${deal.properties.qualified_status}`);

            console.log('\n🔗 ССЫЛКИ ДЛЯ ПРОВЕРКИ:');
            console.log(`👤 Контакт: ${contactUrl}`);
            console.log(`💼 Сделка: ${dealUrl}`);

            console.log('\n📊 ЧТО ПРОВЕРИТЬ В HUBSPOT:');
            console.log('✅ Все новые поля заполнены корректными значениями');
            console.log('✅ Контакт и сделка связаны между собой');
            console.log('✅ Есть активность (заметка о звонке)');
            console.log('✅ Поля видны в Properties разделе');

            console.log('\n💾 Отчет сохранен в test-data-report.json');

            return report;

        } catch (error) {
            console.error('💥 Критическая ошибка при создании тестовых данных:', error);
            return { success: false, error: error.message };
        }
    }
}

// Запуск
const creator = new TestDealCreator();
creator.createFullTestData();