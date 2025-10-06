import dotenv from 'dotenv';
import fs from 'fs';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class CallsDataCollector {
    constructor() {
        if (!API_KEY) {
            console.error('Ошибка: HUBSPOT_API_KEY не найден в .env файле');
            process.exit(1);
        }
    }

    async makeRequest(url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
        }

        return await response.json();
    }

    // Получить данные о звонках (engagements типа CALL)
    async getCallEngagements(limit = 100) {
        try {
            console.log('📞 Получение данных о звонках из HubSpot...');

            // Получаем все engagements типа CALL
            const response = await this.makeRequest(
                `${BASE_URL}/crm/v3/objects/calls?limit=${limit}&properties=hs_call_body,hs_call_callee_object_id,hs_call_callee_object_type,hs_call_direction,hs_call_disposition,hs_call_duration,hs_call_from_number,hs_call_recording_url,hs_call_source,hs_call_status,hs_call_title,hs_call_to_number,hs_timestamp,hubspot_owner_id,hs_activity_type`
            );

            console.log(`Найдено звонков: ${response.results.length}`);

            const callsData = {
                total_calls: response.results.length,
                calls: response.results,
                generated_at: new Date().toISOString()
            };

            fs.writeFileSync('calls-data.json', JSON.stringify(callsData, null, 2));
            console.log('✅ Данные о звонках сохранены в calls-data.json');

            return callsData;

        } catch (error) {
            console.error('❌ Ошибка получения данных о звонках:', error.message);
            return null;
        }
    }

    // Получить звонки конкретного контакта
    async getContactCalls(contactId) {
        try {
            console.log(`📞 Получение звонков для контакта ${contactId}...`);

            const response = await this.makeRequest(
                `${BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/calls`
            );

            console.log(`Найдено звонков для контакта: ${response.results.length}`);

            // Получаем детали каждого звонка
            const callDetails = [];
            for (const association of response.results) {
                try {
                    const callDetail = await this.makeRequest(
                        `${BASE_URL}/crm/v3/objects/calls/${association.toObjectId}?properties=hs_call_body,hs_call_direction,hs_call_disposition,hs_call_duration,hs_call_status,hs_timestamp,hubspot_owner_id`
                    );
                    callDetails.push(callDetail);
                } catch (err) {
                    console.log(`Ошибка получения звонка ${association.toObjectId}: ${err.message}`);
                }
            }

            return callDetails;

        } catch (error) {
            console.error('❌ Ошибка получения звонков контакта:', error.message);
            return [];
        }
    }

    // Анализ данных о звонках
    analyzeCallsData(callsData) {
        if (!callsData || !callsData.calls) return null;

        const calls = callsData.calls;

        console.log('\n📊 АНАЛИЗ ДАННЫХ О ЗВОНКАХ:');

        // Общая статистика
        const totalCalls = calls.length;
        const callsWithDuration = calls.filter(call =>
            call.properties.hs_call_duration &&
            parseInt(call.properties.hs_call_duration) > 0
        );

        const totalDuration = callsWithDuration.reduce((sum, call) =>
            sum + parseInt(call.properties.hs_call_duration || 0), 0
        );

        const avgDuration = totalDuration / callsWithDuration.length;

        console.log(`Всего звонков: ${totalCalls}`);
        console.log(`Звонков с длительностью: ${callsWithDuration.length}`);
        console.log(`Общее время: ${Math.round(totalDuration / 1000 / 60)} минут`);
        console.log(`Среднее время: ${Math.round(avgDuration / 1000 / 60)} минут`);

        // Статистика по направлению
        const directions = {};
        calls.forEach(call => {
            const direction = call.properties.hs_call_direction || 'unknown';
            directions[direction] = (directions[direction] || 0) + 1;
        });

        console.log('\nПо направлению:');
        Object.entries(directions).forEach(([direction, count]) => {
            console.log(`  ${direction}: ${count}`);
        });

        // Статистика по статусу
        const statuses = {};
        calls.forEach(call => {
            const status = call.properties.hs_call_disposition || call.properties.hs_call_status || 'unknown';
            statuses[status] = (statuses[status] || 0) + 1;
        });

        console.log('\nПо статусу:');
        Object.entries(statuses).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

        // Звонки длительностью 5+ минут
        const longCalls = callsWithDuration.filter(call =>
            parseInt(call.properties.hs_call_duration) >= 300000
        );

        const fiveMinRate = (longCalls.length / callsWithDuration.length) * 100;
        console.log(`\n5min-reached-rate: ${fiveMinRate.toFixed(2)}%`);

        // По менеджерам
        const byOwner = {};
        calls.forEach(call => {
            const owner = call.properties.hubspot_owner_id || 'unassigned';
            if (!byOwner[owner]) {
                byOwner[owner] = { calls: 0, totalDuration: 0 };
            }
            byOwner[owner].calls++;
            byOwner[owner].totalDuration += parseInt(call.properties.hs_call_duration || 0);
        });

        console.log('\nПо менеджерам:');
        Object.entries(byOwner).forEach(([owner, stats]) => {
            console.log(`  ${owner}: ${stats.calls} звонков, ${Math.round(stats.totalDuration / 1000 / 60)} минут`);
        });

        return {
            total_calls: totalCalls,
            calls_with_duration: callsWithDuration.length,
            total_duration_minutes: Math.round(totalDuration / 1000 / 60),
            avg_duration_minutes: Math.round(avgDuration / 1000 / 60),
            five_min_rate: fiveMinRate,
            directions,
            statuses,
            by_owner: byOwner
        };
    }

    // Основной метод для сбора и анализа
    async collectAndAnalyze() {
        console.log('🔍 СБОР ДАННЫХ О ЗВОНКАХ ИЗ HUBSPOT\n');

        // Получаем общие данные о звонках
        const callsData = await this.getCallEngagements(100);

        if (callsData) {
            // Анализируем данные
            const analysis = this.analyzeCallsData(callsData);

            if (analysis) {
                // Сохраняем анализ
                const report = {
                    summary: analysis,
                    raw_data: callsData,
                    generated_at: new Date().toISOString()
                };

                fs.writeFileSync('calls-analysis-report.json', JSON.stringify(report, null, 2));
                console.log('\n💾 Полный отчет сохранен в calls-analysis-report.json');
            }
        }

        // Также попробуем получить данные для конкретного контакта
        try {
            console.log('\n📋 Получение звонков для контакта 150479232059...');
            const contactCalls = await this.getContactCalls('150479232059');

            if (contactCalls.length > 0) {
                console.log(`✅ Найдено ${contactCalls.length} звонков для этого контакта`);

                contactCalls.forEach((call, index) => {
                    const duration = call.properties.hs_call_duration;
                    const direction = call.properties.hs_call_direction;
                    const status = call.properties.hs_call_disposition;
                    const timestamp = call.properties.hs_timestamp;

                    console.log(`  Звонок ${index + 1}:`);
                    console.log(`    Длительность: ${duration ? Math.round(duration / 1000 / 60) : 'N/A'} минут`);
                    console.log(`    Направление: ${direction || 'N/A'}`);
                    console.log(`    Статус: ${status || 'N/A'}`);
                    console.log(`    Время: ${timestamp || 'N/A'}`);
                });

                fs.writeFileSync('contact-calls-150479232059.json', JSON.stringify(contactCalls, null, 2));
                console.log('\n💾 Звонки контакта сохранены в contact-calls-150479232059.json');
            }
        } catch (error) {
            console.log('⚠️ Не удалось получить звонки конкретного контакта');
        }
    }
}

const collector = new CallsDataCollector();
collector.collectAndAnalyze();