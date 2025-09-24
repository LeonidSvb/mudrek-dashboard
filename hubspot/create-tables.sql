-- SQL для создания таблиц HubSpot в Supabase
-- Выполните этот код в Supabase SQL Editor

-- Создание таблицы контактов HubSpot
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

-- Индексы для контактов
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON hubspot_contacts(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON hubspot_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_updated ON hubspot_contacts(updated_at);

-- Создание таблицы сделок HubSpot
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

    -- Ваши кастомные поля
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

-- Индексы для сделок
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_id ON hubspot_deals(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_deals_amount ON hubspot_deals(amount);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON hubspot_deals(dealstage);
CREATE INDEX IF NOT EXISTS idx_deals_updated ON hubspot_deals(updated_at);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON hubspot_deals(closedate);