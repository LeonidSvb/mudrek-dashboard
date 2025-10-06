import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();

// Supabase конфигурация (используем service key для полного доступа)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseSync {
    constructor() {
        console.log('🔗 Инициализация Supabase синхронизации...');
    }

    // Создать таблицы в Supabase
    async createTables() {
        console.log('🏗️  Создаю SQL файлы для таблиц...');

        // Сразу создаем SQL файлы для ручного выполнения
        return await this.createTablesAlternative();
    }

    // Альтернативный способ создания таблиц
    async createTablesAlternative() {
        console.log('📝 Создаю таблицы через SQL Editor...');

        // Сохраняем SQL в файлы для ручного выполнения
        const contactsSQL = `-- Создание таблицы контактов HubSpot
CREATE TABLE IF NOT EXISTS hubspot_contacts (
    id BIGSERIAL PRIMARY KEY,
    hubspot_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Основные поля
    email TEXT,
    firstname TEXT,
    lastname TEXT,
    phone TEXT,
    company TEXT,

    -- Даты
    createdate TIMESTAMP WITH TIME ZONE,
    lastmodifieddate TIMESTAMP WITH TIME ZONE,

    -- Статусы
    lifecyclestage TEXT,
    hs_lead_status TEXT,

    -- Владелец
    hubspot_owner_id TEXT,

    -- Полные данные JSON
    raw_data JSONB
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON hubspot_contacts(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON hubspot_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_updated ON hubspot_contacts(updated_at);`;

        const dealsSQL = `-- Создание таблицы сделок HubSpot
CREATE TABLE IF NOT EXISTS hubspot_deals (
    id BIGSERIAL PRIMARY KEY,
    hubspot_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Основные поля
    dealname TEXT,
    amount NUMERIC,
    dealstage TEXT,
    pipeline TEXT,

    -- Даты
    createdate TIMESTAMP WITH TIME ZONE,
    closedate TIMESTAMP WITH TIME ZONE,
    hs_lastmodifieddate TIMESTAMP WITH TIME ZONE,

    -- Владелец
    hubspot_owner_id TEXT,

    -- Кастомные поля
    payment_method TEXT,
    payment_type TEXT,
    deal_whole_amount NUMERIC,
    the_left_amount NUMERIC,
    installment_monthly_amount NUMERIC,
    number_of_installments__months INTEGER,
    date_of_last_installment DATE,
    number_of_already_paid_installments INTEGER,
    number_of_left_installments INTEGER,
    payment_status TEXT,
    phone_number TEXT,

    -- Полные данные JSON
    raw_data JSONB
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_id ON hubspot_deals(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_deals_amount ON hubspot_deals(amount);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON hubspot_deals(dealstage);
CREATE INDEX IF NOT EXISTS idx_deals_updated ON hubspot_deals(updated_at);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON hubspot_deals(closedate);`;

        // Сохраняем SQL файлы
        fs.writeFileSync('supabase-contacts-table.sql', contactsSQL);
        fs.writeFileSync('supabase-deals-table.sql', dealsSQL);

        console.log('📁 SQL файлы созданы:');
        console.log('   📋 supabase-contacts-table.sql');
        console.log('   💼 supabase-deals-table.sql');
        console.log('');
        console.log('🔧 НУЖНО ВЫПОЛНИТЬ ВРУЧНУЮ:');
        console.log('1. Откройте Supabase → SQL Editor');
        console.log('2. Скопируйте содержимое supabase-contacts-table.sql и выполните');
        console.log('3. Скопируйте содержимое supabase-deals-table.sql и выполните');

        return false; // Требует ручного выполнения
    }

    // Синхронизировать контакты из файла
    async syncContactsFromFile(filename = 'contacts-with-all-properties.json') {
        try {
            console.log(`📋 Синхронизирую контакты из ${filename}...`);

            if (!fs.existsSync(filename)) {
                throw new Error(`Файл ${filename} не найден`);
            }

            const fileData = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const contacts = fileData.contacts || fileData;

            console.log(`Найдено контактов для синхронизации: ${contacts.length}`);

            for (const contact of contacts) {
                const contactData = {
                    hubspot_id: contact.id,
                    email: contact.properties.email,
                    firstname: contact.properties.firstname,
                    lastname: contact.properties.lastname,
                    phone: contact.properties.phone,
                    company: contact.properties.company,
                    createdate: contact.properties.createdate,
                    lastmodifieddate: contact.properties.lastmodifieddate,
                    lifecyclestage: contact.properties.lifecyclestage,
                    hs_lead_status: contact.properties.hs_lead_status,
                    hubspot_owner_id: contact.properties.hubspot_owner_id,
                    raw_data: contact
                };

                const { error } = await supabase
                    .from('hubspot_contacts')
                    .upsert(contactData, { onConflict: 'hubspot_id' });

                if (error) {
                    console.error(`Ошибка синхронизации контакта ${contact.id}:`, error);
                }
            }

            console.log('✅ Контакты синхронизированы!');
            return true;

        } catch (error) {
            console.error('❌ Ошибка синхронизации контактов:', error.message);
            return false;
        }
    }

    // Синхронизировать сделки из файла
    async syncDealsFromFile(filename = 'deals-with-all-properties.json') {
        try {
            console.log(`💼 Синхронизирую сделки из ${filename}...`);

            if (!fs.existsSync(filename)) {
                throw new Error(`Файл ${filename} не найден`);
            }

            const fileData = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const deals = fileData.deals || fileData;

            console.log(`Найдено сделок для синхронизации: ${deals.length}`);

            for (const deal of deals) {
                const dealData = {
                    hubspot_id: deal.id,
                    dealname: deal.properties.dealname,
                    amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
                    dealstage: deal.properties.dealstage,
                    pipeline: deal.properties.pipeline,
                    createdate: deal.properties.createdate,
                    closedate: deal.properties.closedate,
                    hs_lastmodifieddate: deal.properties.hs_lastmodifieddate,
                    hubspot_owner_id: deal.properties.hubspot_owner_id,

                    // Кастомные поля
                    payment_method: deal.properties.payment_method,
                    payment_type: deal.properties.payment_type,
                    deal_whole_amount: deal.properties.deal_whole_amount ? parseFloat(deal.properties.deal_whole_amount) : null,
                    the_left_amount: deal.properties.the_left_amount ? parseFloat(deal.properties.the_left_amount) : null,
                    installment_monthly_amount: deal.properties.installment_monthly_amount ? parseFloat(deal.properties.installment_monthly_amount) : null,
                    number_of_installments__months: deal.properties.number_of_installments__months ? parseInt(deal.properties.number_of_installments__months) : null,
                    date_of_last_installment: deal.properties.date_of_last_installment,
                    number_of_already_paid_installments: deal.properties.number_of_already_paid_installments ? parseInt(deal.properties.number_of_already_paid_installments) : null,
                    number_of_left_installments: deal.properties.number_of_left_installments ? parseInt(deal.properties.number_of_left_installments) : null,
                    payment_status: deal.properties.payment_status,
                    phone_number: deal.properties.phone_number,

                    raw_data: deal
                };

                const { error } = await supabase
                    .from('hubspot_deals')
                    .upsert(dealData, { onConflict: 'hubspot_id' });

                if (error) {
                    console.error(`Ошибка синхронизации сделки ${deal.id}:`, error);
                }
            }

            console.log('✅ Сделки синхронизированы!');
            return true;

        } catch (error) {
            console.error('❌ Ошибка синхронизации сделок:', error.message);
            return false;
        }
    }

    // Тестировать подключение к Supabase
    async testConnection() {
        try {
            console.log('🔍 Тестирую подключение к Supabase...');

            const { data, error } = await supabase
                .from('hubspot_contacts')
                .select('count')
                .limit(1);

            if (error) {
                console.log('⚠️  Таблицы еще не созданы, это нормально');
                return false;
            }

            console.log('✅ Подключение к Supabase работает!');
            return true;

        } catch (error) {
            console.error('❌ Ошибка подключения к Supabase:', error.message);
            return false;
        }
    }

    // Полная синхронизация
    async fullSync() {
        console.log('🚀 ЗАПУСК ПОЛНОЙ СИНХРОНИЗАЦИИ HUBSPOT → SUPABASE\n');

        try {
            // 1. Тестируем подключение
            await this.testConnection();

            // 2. Создаем таблицы
            await this.createTables();

            // 3. Синхронизируем данные
            const contactsSuccess = await this.syncContactsFromFile();
            const dealsSuccess = await this.syncDealsFromFile();

            console.log('\n🎉 СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА!');
            console.log(`📋 Контакты: ${contactsSuccess ? '✅ Успешно' : '❌ Ошибка'}`);
            console.log(`💼 Сделки: ${dealsSuccess ? '✅ Успешно' : '❌ Ошибка'}`);

            return contactsSuccess && dealsSuccess;

        } catch (error) {
            console.error('💥 Ошибка полной синхронизации:', error.message);
            return false;
        }
    }
}

export { SupabaseSync };

// Если файл запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
    const sync = new SupabaseSync();
    sync.fullSync();
}