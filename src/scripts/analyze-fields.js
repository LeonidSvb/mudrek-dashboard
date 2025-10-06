import fs from 'fs';

class FieldAnalyzer {
    constructor() {
        this.dealsData = null;
        this.contactsData = null;
        this.loadData();
    }

    loadData() {
        try {
            this.dealsData = JSON.parse(fs.readFileSync('sample-deals.json', 'utf8'));
            this.contactsData = JSON.parse(fs.readFileSync('sample-contacts.json', 'utf8'));
            console.log('Данные загружены успешно');
        } catch (error) {
            console.error('Ошибка загрузки данных:', error.message);
            process.exit(1);
        }
    }

    // Анализ всех доступных полей в сделках
    analyzeDealsFields() {
        console.log('\n=== АНАЛИЗ ПОЛЕЙ СДЕЛОК ===');
        console.log(`Общее количество свойств: ${this.dealsData.properties_count}`);

        // Анализируем фактические данные первой сделки
        if (this.dealsData.deals.length > 0) {
            const firstDeal = this.dealsData.deals[0];
            const properties = firstDeal.properties;

            console.log('\n📊 Доступные свойства в данных сделки:');
            const availableFields = [];

            Object.keys(properties).forEach(key => {
                const value = properties[key];
                if (value !== null && value !== '') {
                    availableFields.push({
                        name: key,
                        value: value,
                        type: typeof value
                    });
                }
            });

            availableFields.sort((a, b) => a.name.localeCompare(b.name));

            console.log(`\nНепустых полей: ${availableFields.length}`);
            availableFields.forEach(field => {
                console.log(`  ${field.name}: ${field.value} (${field.type})`);
            });
        }

        return this.dealsData.available_properties;
    }

    // Анализ всех доступных полей в контактах
    analyzeContactsFields() {
        console.log('\n=== АНАЛИЗ ПОЛЕЙ КОНТАКТОВ ===');
        console.log(`Общее количество свойств: ${this.contactsData.properties_count}`);

        // Анализируем фактические данные первого контакта
        if (this.contactsData.contacts.length > 0) {
            const firstContact = this.contactsData.contacts[0];
            const properties = firstContact.properties;

            console.log('\n👤 Доступные свойства в данных контакта:');
            const availableFields = [];

            Object.keys(properties).forEach(key => {
                const value = properties[key];
                if (value !== null && value !== '') {
                    availableFields.push({
                        name: key,
                        value: value,
                        type: typeof value
                    });
                }
            });

            availableFields.sort((a, b) => a.name.localeCompare(b.name));

            console.log(`\nНепустых полей: ${availableFields.length}`);
            availableFields.forEach(field => {
                console.log(`  ${field.name}: ${field.value} (${field.type})`);
            });
        }

        return this.contactsData.available_properties;
    }

    // Поиск полей связанных с трекингом
    findTrackingFields() {
        console.log('\n=== ПОИСК ПОЛЕЙ ДЛЯ ТРЕКИНГА ===');

        const allProperties = [
            ...this.dealsData.available_properties,
            ...this.contactsData.available_properties
        ];

        const trackingKeywords = [
            'call', 'phone', 'meeting', 'follow', 'contact',
            'source', 'campaign', 'conversion', 'stage',
            'payment', 'amount', 'price', 'trial',
            'video', 'vsl', 'time', 'date', 'duration',
            'qualified', 'offer', 'close', 'pickup',
            'installment', 'revenue', 'owner'
        ];

        const relevantFields = {};

        trackingKeywords.forEach(keyword => {
            relevantFields[keyword] = allProperties.filter(prop =>
                prop.toLowerCase().includes(keyword)
            );
        });

        Object.keys(relevantFields).forEach(keyword => {
            if (relevantFields[keyword].length > 0) {
                console.log(`\n🔍 Поля связанные с "${keyword}":`);
                relevantFields[keyword].forEach(field => {
                    console.log(`  - ${field}`);
                });
            }
        });

        return relevantFields;
    }

    // Проверка кастомных полей, упомянутых в коде
    checkCustomFields() {
        console.log('\n=== ПРОВЕРКА КАСТОМНЫХ ПОЛЕЙ ===');

        const expectedCustomFields = [
            'payment_method',
            'payment_type',
            'deal_whole_amount',
            'the_left_amount',
            'installment_monthly_amount',
            'number_of_installments__months',
            'date_of_last_installment',
            'number_of_already_paid_installments',
            'number_of_left_installments',
            'payment_status',
            'phone_number'
        ];

        const allFields = [
            ...this.dealsData.available_properties,
            ...this.contactsData.available_properties
        ];

        console.log('\n✅ Найденные кастомные поля:');
        const foundFields = [];
        const missingFields = [];

        expectedCustomFields.forEach(field => {
            if (allFields.includes(field)) {
                foundFields.push(field);
                console.log(`  ✓ ${field}`);
            } else {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            console.log('\n❌ Отсутствующие кастомные поля:');
            missingFields.forEach(field => {
                console.log(`  ✗ ${field}`);
            });
        }

        return { foundFields, missingFields };
    }

    // Полный анализ
    analyzeAll() {
        console.log('🔍 ПОЛНЫЙ АНАЛИЗ ПОЛЕЙ HUBSPOT\n');

        const dealsFields = this.analyzeDealsFields();
        const contactsFields = this.analyzeContactsFields();
        const trackingFields = this.findTrackingFields();
        const customFields = this.checkCustomFields();

        // Сохраняем результаты анализа
        const analysis = {
            summary: {
                deals_properties_count: this.dealsData.properties_count,
                contacts_properties_count: this.contactsData.properties_count,
                deals_sample_count: this.dealsData.total,
                contacts_sample_count: this.contactsData.total
            },
            deals_fields: dealsFields,
            contacts_fields: contactsFields,
            tracking_fields: trackingFields,
            custom_fields: customFields,
            generated_at: new Date().toISOString()
        };

        fs.writeFileSync('fields-analysis.json', JSON.stringify(analysis, null, 2));
        console.log('\n💾 Анализ сохранен в fields-analysis.json');

        return analysis;
    }
}

const analyzer = new FieldAnalyzer();
analyzer.analyzeAll();