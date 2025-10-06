import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

// Усиленная функция для HTTP запросов с retry логикой
async function makeHubSpotRequestWithRetry(endpoint, options = {}, maxRetries = 3, delay = 1000) {
    const url = `${BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 секунд таймаут
    };

    const requestOptions = { ...defaultOptions, ...options };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Попытка ${attempt}] Запрос к: ${url}`);

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}. Response: ${errorText}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Ошибка на попытке ${attempt}:`, error.message);

            if (attempt === maxRetries) {
                throw error;
            }

            // Экспоненциальная задержка между попытками
            const retryDelay = delay * Math.pow(2, attempt - 1);
            console.log(`Ожидание ${retryDelay}ms перед следующей попыткой...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

// Загрузчик с сохранением прогресса и возможностью продолжения
class HubSpotBulkLoader {
    constructor() {
        this.progressFile = 'loading-progress.json';
        this.contactsFile = 'all-contacts.json';
        this.dealsFile = 'all-deals.json';
        this.batchSize = 100;
        this.delayBetweenRequests = 500; // 500ms между запросами
    }

    // Загрузить прогресс из файла
    loadProgress() {
        try {
            if (fs.existsSync(this.progressFile)) {
                const data = fs.readFileSync(this.progressFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.log('Не удалось загрузить прогресс, начинаем сначала');
        }

        return {
            contacts: { loaded: 0, after: null, completed: false },
            deals: { loaded: 0, after: null, completed: false },
            startTime: Date.now()
        };
    }

    // Сохранить прогресс в файл
    saveProgress(progress) {
        fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
    }

    // Загрузить все контакты с возможностью продолжения
    async loadAllContacts() {
        const progress = this.loadProgress();
        let allContacts = [];

        // Загружаем уже сохраненные контакты если есть
        if (fs.existsSync(this.contactsFile)) {
            try {
                const savedData = JSON.parse(fs.readFileSync(this.contactsFile, 'utf8'));
                allContacts = savedData;
                console.log(`📋 Найдено ${allContacts.length} уже загруженных контактов`);
            } catch (error) {
                console.log('Не удалось загрузить сохраненные контакты');
            }
        }

        if (progress.contacts.completed) {
            console.log('✅ Контакты уже полностью загружены');
            return allContacts;
        }

        console.log(`🚀 Загружаю контакты... Уже загружено: ${progress.contacts.loaded}`);

        let after = progress.contacts.after;
        let hasMore = true;

        while (hasMore) {
            try {
                let endpoint = `/crm/v3/objects/contacts?limit=${this.batchSize}`;
                if (after) {
                    endpoint += `&after=${after}`;
                }

                const response = await makeHubSpotRequestWithRetry(endpoint);

                if (response.results && response.results.length > 0) {
                    allContacts = allContacts.concat(response.results);
                    progress.contacts.loaded = allContacts.length;

                    console.log(`📊 Загружено контактов: ${allContacts.length}`);

                    // Сохраняем данные каждые 1000 записей
                    if (allContacts.length % 1000 === 0) {
                        fs.writeFileSync(this.contactsFile, JSON.stringify(allContacts, null, 2));
                        console.log(`💾 Промежуточное сохранение: ${allContacts.length} контактов`);
                    }
                }

                if (response.paging && response.paging.next) {
                    after = response.paging.next.after;
                    progress.contacts.after = after;
                    this.saveProgress(progress);
                } else {
                    hasMore = false;
                    progress.contacts.completed = true;
                    progress.contacts.after = null;
                }

                // Задержка между запросами
                await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));

            } catch (error) {
                console.error('❌ Ошибка при загрузке контактов:', error.message);
                console.log('💾 Сохраняю прогресс перед остановкой...');
                this.saveProgress(progress);
                fs.writeFileSync(this.contactsFile, JSON.stringify(allContacts, null, 2));
                throw error;
            }
        }

        // Финальное сохранение
        fs.writeFileSync(this.contactsFile, JSON.stringify(allContacts, null, 2));
        this.saveProgress(progress);

        console.log(`✅ Все контакты загружены: ${allContacts.length}`);
        return allContacts;
    }

    // Загрузить все сделки с возможностью продолжения
    async loadAllDeals() {
        const progress = this.loadProgress();
        let allDeals = [];

        // Загружаем уже сохраненные сделки если есть
        if (fs.existsSync(this.dealsFile)) {
            try {
                const savedData = JSON.parse(fs.readFileSync(this.dealsFile, 'utf8'));
                allDeals = savedData;
                console.log(`💼 Найдено ${allDeals.length} уже загруженных сделок`);
            } catch (error) {
                console.log('Не удалось загрузить сохраненные сделки');
            }
        }

        if (progress.deals.completed) {
            console.log('✅ Сделки уже полностью загружены');
            return allDeals;
        }

        console.log(`🚀 Загружаю сделки... Уже загружено: ${progress.deals.loaded}`);

        let after = progress.deals.after;
        let hasMore = true;

        while (hasMore) {
            try {
                let endpoint = `/crm/v3/objects/deals?limit=${this.batchSize}`;
                if (after) {
                    endpoint += `&after=${after}`;
                }

                const response = await makeHubSpotRequestWithRetry(endpoint);

                if (response.results && response.results.length > 0) {
                    allDeals = allDeals.concat(response.results);
                    progress.deals.loaded = allDeals.length;

                    console.log(`💰 Загружено сделок: ${allDeals.length}`);

                    // Сохраняем данные каждые 500 записей
                    if (allDeals.length % 500 === 0) {
                        fs.writeFileSync(this.dealsFile, JSON.stringify(allDeals, null, 2));
                        console.log(`💾 Промежуточное сохранение: ${allDeals.length} сделок`);
                    }
                }

                if (response.paging && response.paging.next) {
                    after = response.paging.next.after;
                    progress.deals.after = after;
                    this.saveProgress(progress);
                } else {
                    hasMore = false;
                    progress.deals.completed = true;
                    progress.deals.after = null;
                }

                // Задержка между запросами
                await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));

            } catch (error) {
                console.error('❌ Ошибка при загрузке сделок:', error.message);
                console.log('💾 Сохраняю прогресс перед остановкой...');
                this.saveProgress(progress);
                fs.writeFileSync(this.dealsFile, JSON.stringify(allDeals, null, 2));
                throw error;
            }
        }

        // Финальное сохранение
        fs.writeFileSync(this.dealsFile, JSON.stringify(allDeals, null, 2));
        this.saveProgress(progress);

        console.log(`✅ Все сделки загружены: ${allDeals.length}`);
        return allDeals;
    }

    // Загрузить все данные
    async loadAllData() {
        console.log('🚀 ЗАПУСК ПОЛНОЙ ЗАГРУЗКИ CRM ДАННЫХ 🚀\n');
        const startTime = Date.now();

        try {
            // Загружаем параллельно
            console.log('📊 Начинаю загрузку...');

            const [contacts, deals] = await Promise.all([
                this.loadAllContacts(),
                this.loadAllDeals()
            ]);

            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);

            console.log('\n🎉 ЗАГРУЗКА ЗАВЕРШЕНА! 🎉');
            console.log(`📋 Контакты: ${contacts.length}`);
            console.log(`💼 Сделки: ${deals.length}`);
            console.log(`⏱️  Время: ${duration} секунд`);

            // Создаем сводный файл
            const summary = {
                loadedAt: new Date().toISOString(),
                duration: duration,
                contactsCount: contacts.length,
                dealsCount: deals.length,
                files: {
                    contacts: this.contactsFile,
                    deals: this.dealsFile
                }
            };

            fs.writeFileSync('data-summary.json', JSON.stringify(summary, null, 2));

            return { contacts, deals, summary };

        } catch (error) {
            console.error('💥 Ошибка при загрузке:', error.message);
            console.log('\n🔄 Вы можете перезапустить скрипт - он продолжит с того места где остановился');
            throw error;
        }
    }

    // Показать статус загрузки
    showStatus() {
        const progress = this.loadProgress();

        console.log('\n📊 СТАТУС ЗАГРУЗКИ:');
        console.log(`📋 Контакты: ${progress.contacts.loaded} (${progress.contacts.completed ? 'Завершено ✅' : 'В процессе 🔄'})`);
        console.log(`💼 Сделки: ${progress.deals.loaded} (${progress.deals.completed ? 'Завершено ✅' : 'В процессе 🔄'})`);

        if (progress.startTime) {
            const elapsed = Math.round((Date.now() - progress.startTime) / 1000);
            console.log(`⏱️  Время: ${elapsed} секунд`);
        }
    }

    // Очистить прогресс и начать заново
    reset() {
        if (fs.existsSync(this.progressFile)) fs.unlinkSync(this.progressFile);
        if (fs.existsSync(this.contactsFile)) fs.unlinkSync(this.contactsFile);
        if (fs.existsSync(this.dealsFile)) fs.unlinkSync(this.dealsFile);
        console.log('🧹 Прогресс очищен, можно начинать заново');
    }
}

export { HubSpotBulkLoader };

// Если файл запущен напрямую - начать загрузку
if (import.meta.url === `file://${process.argv[1]}`) {
    const loader = new HubSpotBulkLoader();

    // Проверяем аргументы командной строки
    const args = process.argv.slice(2);

    if (args.includes('--reset')) {
        loader.reset();
    } else if (args.includes('--status')) {
        loader.showStatus();
    } else {
        loader.loadAllData().catch(console.error);
    }
}