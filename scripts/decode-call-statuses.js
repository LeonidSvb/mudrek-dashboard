import dotenv from 'dotenv';
import fs from 'fs';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

class CallStatusDecoder {
    constructor() {
        this.statusMappings = {};
        this.callsData = JSON.parse(fs.readFileSync('calls-data.json', 'utf8'));
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

    // Получить все возможные значения call disposition
    async getCallDispositions() {
        try {
            console.log('🔍 Получение расшифровки статусов звонков...');

            const response = await this.makeRequest(
                `${BASE_URL}/crm/v3/properties/calls/hs_call_disposition`
            );

            if (response.options) {
                console.log('📋 Найденные статусы звонков:');
                response.options.forEach(option => {
                    this.statusMappings[option.value] = option.label;
                    console.log(`  ${option.value} = "${option.label}"`);
                });
            }

            return this.statusMappings;

        } catch (error) {
            console.error('❌ Ошибка получения статусов:', error.message);
            return {};
        }
    }

    // Анализ реальных данных о звонках с расшифровкой
    analyzeCallsWithStatuses() {
        console.log('\n📊 ДЕТАЛЬНЫЙ АНАЛИЗ ЗВОНКОВ С РАСШИФРОВКОЙ:');

        const calls = this.callsData.calls;
        let totalDuration = 0;
        let callsWithDuration = 0;
        let longCalls = 0; // 5+ минут
        let connectedCalls = 0;

        const stats = {
            byStatus: {},
            byDirection: {},
            byOwner: {},
            byDay: {},
            kavkomIntegration: {
                withRecordings: 0,
                totalRecordings: 0
            }
        };

        calls.forEach(call => {
            const props = call.properties;

            // Статистика по статусам
            const statusId = props.hs_call_disposition;
            const statusLabel = this.statusMappings[statusId] || statusId || 'unknown';
            if (!stats.byStatus[statusLabel]) {
                stats.byStatus[statusLabel] = { count: 0, totalDuration: 0 };
            }
            stats.byStatus[statusLabel].count++;

            // Длительность
            const duration = parseInt(props.hs_call_duration) || 0;
            if (duration > 0) {
                callsWithDuration++;
                totalDuration += duration;
                stats.byStatus[statusLabel].totalDuration += duration;

                // 5+ минут
                if (duration >= 300000) {
                    longCalls++;
                }

                // Считаем соединенными звонки длительностью >30 сек
                if (duration > 30000) {
                    connectedCalls++;
                }
            }

            // Направление
            const direction = props.hs_call_direction || 'unknown';
            stats.byDirection[direction] = (stats.byDirection[direction] || 0) + 1;

            // Менеджеры
            const owner = props.hubspot_owner_id || 'unassigned';
            if (!stats.byOwner[owner]) {
                stats.byOwner[owner] = { calls: 0, duration: 0, longCalls: 0 };
            }
            stats.byOwner[owner].calls++;
            stats.byOwner[owner].duration += duration;
            if (duration >= 300000) stats.byOwner[owner].longCalls++;

            // По дням
            const date = props.hs_timestamp ? props.hs_timestamp.split('T')[0] : 'unknown';
            stats.byDay[date] = (stats.byDay[date] || 0) + 1;

            // Kavkom интеграция
            if (props.hs_call_recording_url) {
                stats.kavkomIntegration.withRecordings++;
                if (props.hs_call_recording_url.includes('kavkom.com')) {
                    stats.kavkomIntegration.totalRecordings++;
                }
            }
        });

        // Выводим статистику
        console.log(`\n📈 ОСНОВНЫЕ МЕТРИКИ:`);
        console.log(`  Всего звонков: ${calls.length}`);
        console.log(`  Звонков с длительностью: ${callsWithDuration}`);
        console.log(`  Общее время: ${Math.round(totalDuration / 1000 / 60)} минут`);
        console.log(`  Среднее время: ${Math.round(totalDuration / callsWithDuration / 1000 / 60)} минут`);
        console.log(`  Звонков 5+ минут: ${longCalls} (${(longCalls/callsWithDuration*100).toFixed(1)}%)`);
        console.log(`  Pickup rate: ${(connectedCalls/calls.length*100).toFixed(1)}%`);

        console.log(`\n📋 ПО СТАТУСАМ:`);
        Object.entries(stats.byStatus).forEach(([status, data]) => {
            const avgDuration = data.totalDuration > 0 ? Math.round(data.totalDuration / data.count / 1000 / 60) : 0;
            console.log(`  "${status}": ${data.count} звонков, среднее ${avgDuration} мин`);
        });

        console.log(`\n📞 ПО НАПРАВЛЕНИЮ:`);
        Object.entries(stats.byDirection).forEach(([direction, count]) => {
            console.log(`  ${direction}: ${count} звонков`);
        });

        console.log(`\n👨‍💼 ПО МЕНЕДЖЕРАМ:`);
        Object.entries(stats.byOwner).forEach(([owner, data]) => {
            console.log(`  ${owner}: ${data.calls} звонков, ${Math.round(data.duration/1000/60)} мин, ${data.longCalls} длинных`);
        });

        console.log(`\n🎙️ KAVKOM ИНТЕГРАЦИЯ:`);
        console.log(`  Звонков с записями: ${stats.kavkomIntegration.withRecordings}`);
        console.log(`  Kavkom записей: ${stats.kavkomIntegration.totalRecordings}`);
        console.log(`  Процент с записями: ${(stats.kavkomIntegration.withRecordings/calls.length*100).toFixed(1)}%`);

        return {
            totalCalls: calls.length,
            callsWithDuration,
            totalDurationMinutes: Math.round(totalDuration / 1000 / 60),
            avgDurationMinutes: Math.round(totalDuration / callsWithDuration / 1000 / 60),
            fiveMinRate: (longCalls/callsWithDuration*100).toFixed(1),
            pickupRate: (connectedCalls/calls.length*100).toFixed(1),
            stats
        };
    }

    // Создать SQL запросы для дашборда
    generateDashboardQueries(analysis) {
        console.log('\n🔧 SQL ЗАПРОСЫ ДЛЯ ДАШБОРДА:');

        const queries = {
            // 1. Total calls made (ежедневно)
            totalCallsDaily: `
-- Total calls made (ежедневно)
SELECT
  DATE(hs_timestamp) as call_date,
  hubspot_owner_id,
  COUNT(*) as calls_made,
  COUNT(*) FILTER (WHERE CAST(hs_call_duration AS INTEGER) > 30000) as connected_calls,
  ROUND(
    COUNT(*) FILTER (WHERE CAST(hs_call_duration AS INTEGER) > 30000) * 100.0 / COUNT(*),
    1
  ) as pickup_rate
FROM hubspot_calls
GROUP BY DATE(hs_timestamp), hubspot_owner_id
ORDER BY call_date DESC;`,

            // 2. 5min-reached-rate (ежедневно)
            fiveMinRateDaily: `
-- 5min-reached-rate (ежедневно)
SELECT
  DATE(hs_timestamp) as call_date,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE CAST(hs_call_duration AS INTEGER) >= 300000) as long_calls,
  ROUND(
    COUNT(*) FILTER (WHERE CAST(hs_call_duration AS INTEGER) >= 300000) * 100.0 / COUNT(*),
    1
  ) as five_min_rate
FROM hubspot_calls
WHERE hs_call_duration IS NOT NULL
GROUP BY DATE(hs_timestamp)
ORDER BY call_date DESC;`,

            // 3. Average call time
            avgCallTime: `
-- Average call time
SELECT
  hubspot_owner_id,
  COUNT(*) as total_calls,
  ROUND(AVG(CAST(hs_call_duration AS INTEGER) / 1000.0 / 60), 1) as avg_minutes,
  ROUND(SUM(CAST(hs_call_duration AS INTEGER) / 1000.0 / 3600), 1) as total_hours
FROM hubspot_calls
WHERE hs_call_duration IS NOT NULL
  AND CAST(hs_call_duration AS INTEGER) > 0
GROUP BY hubspot_owner_id;`,

            // 4. Pickup rate анализ
            pickupRateAnalysis: `
-- Pickup rate анализ (connected = длительность >30 сек)
SELECT
  DATE(hs_timestamp) as call_date,
  hs_call_disposition,
  COUNT(*) as attempts,
  COUNT(*) FILTER (WHERE CAST(hs_call_duration AS INTEGER) > 30000) as connected,
  ROUND(
    COUNT(*) FILTER (WHERE CAST(hs_call_duration AS INTEGER) > 30000) * 100.0 / COUNT(*),
    1
  ) as success_rate
FROM hubspot_calls
GROUP BY DATE(hs_timestamp), hs_call_disposition
ORDER BY call_date DESC, success_rate DESC;`,

            // 5. Followup rate анализ
            followupAnalysis: `
-- Followup rate (по контактам с множественными звонками)
SELECT
  contact_id,
  COUNT(*) as total_calls,
  COUNT(DISTINCT DATE(hs_timestamp)) as call_days,
  ROUND(AVG(CAST(hs_call_duration AS INTEGER) / 1000.0 / 60), 1) as avg_minutes
FROM hubspot_calls c
JOIN hubspot_contacts_calls cc ON c.id = cc.call_id
GROUP BY contact_id
HAVING COUNT(*) > 1
ORDER BY total_calls DESC;`
        };

        Object.entries(queries).forEach(([name, query]) => {
            console.log(`\n=== ${name.toUpperCase()} ===`);
            console.log(query);
        });

        return queries;
    }

    async analyzeAll() {
        console.log('🎯 ПОЛНЫЙ АНАЛИЗ ДАННЫХ О ЗВОНКАХ\n');

        // 1. Получаем расшифровку статусов
        await this.getCallDispositions();

        // 2. Анализируем данные
        const analysis = this.analyzeCallsWithStatuses();

        // 3. Генерируем SQL запросы
        const queries = this.generateDashboardQueries(analysis);

        // 4. Сохраняем полный отчет
        const report = {
            summary: analysis,
            status_mappings: this.statusMappings,
            dashboard_queries: queries,
            sample_call_data: this.callsData.calls.slice(0, 3), // Примеры
            generated_at: new Date().toISOString()
        };

        fs.writeFileSync('calls-complete-analysis.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Полный анализ звонков сохранен в calls-complete-analysis.json');

        return report;
    }
}

const decoder = new CallStatusDecoder();
decoder.analyzeAll();