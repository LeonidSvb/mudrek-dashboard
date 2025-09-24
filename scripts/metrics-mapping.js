import fs from 'fs';

class MetricsMapper {
    constructor() {
        this.analysisData = JSON.parse(fs.readFileSync('fields-analysis.json', 'utf8'));
        this.dealsData = JSON.parse(fs.readFileSync('sample-deals.json', 'utf8'));
        this.contactsData = JSON.parse(fs.readFileSync('sample-contacts.json', 'utf8'));

        this.allFields = [
            ...this.analysisData.deals_fields,
            ...this.analysisData.contacts_fields
        ];
    }

    // Определение запрошенных метрик
    getRequestedMetrics() {
        return {
            // Основные метрики продаж
            sales_metrics: [
                {
                    name: "Total sales this month",
                    description: "Общие продажи за месяц",
                    required_fields: ["amount", "closedate", "dealstage"]
                },
                {
                    name: "Average deal size",
                    description: "Средний размер сделки",
                    required_fields: ["amount", "dealstage"]
                },
                {
                    name: "Total deals sizes",
                    description: "Общие размеры сделок",
                    required_fields: ["amount", "dealstage"]
                },
                {
                    name: "Upfront cash collected",
                    description: "Собранные предварительные платежи",
                    required_fields: ["payment_method", "amount", "payment_status"]
                }
            ],

            // Метрики коэффициентов
            conversion_metrics: [
                {
                    name: "Cancellation rate",
                    description: "Коэффициент отмены",
                    required_fields: ["dealstage", "closed_lost_reason"]
                },
                {
                    name: "Conversion rate",
                    description: "Коэффициент конверсии",
                    required_fields: ["lifecyclestage", "dealstage", "createdate"]
                },
                {
                    name: "Pickup rate",
                    description: "Коэффициент ответа на звонки",
                    required_fields: ["hs_number_of_inbound_calls", "hs_number_of_outbound_calls", "call_status"]
                },
                {
                    name: "Qualified rate",
                    description: "Коэффициент квалификации",
                    required_fields: ["hs_lead_status", "lifecyclestage"]
                },
                {
                    name: "Offers given & rate",
                    description: "Предложения сделаны и коэффициент",
                    required_fields: ["offer_given", "dealstage"]
                },
                {
                    name: "5min-reached-rate",
                    description: "Коэффициент достижения 5-минутного разговора",
                    required_fields: ["call_duration", "hs_actual_duration"]
                }
            ],

            // Активность и коммуникации
            activity_metrics: [
                {
                    name: "Total calls made",
                    description: "Общее количество звонков",
                    required_fields: ["hs_number_of_outbound_calls", "hubspot_owner_id"]
                },
                {
                    name: "Followup rate",
                    description: "Коэффициент повторных контактов",
                    required_fields: ["num_contacted_notes", "notes_last_contacted"]
                },
                {
                    name: "Average call time",
                    description: "Среднее время звонка",
                    required_fields: ["hs_actual_duration", "hs_average_call_duration"]
                },
                {
                    name: "Total call time",
                    description: "Общее время звонков",
                    required_fields: ["hs_actual_duration", "hubspot_owner_id"]
                }
            ],

            // Платежи и рассрочки
            payment_metrics: [
                {
                    name: "Number of installments",
                    description: "Количество рассрочек (1-9)",
                    required_fields: ["number_of_installments__months", "installments"]
                },
                {
                    name: "Payment tracking",
                    description: "Отслеживание платежей",
                    required_fields: ["payment_method", "payment_status", "installment_monthly_amount"]
                }
            ],

            // Новые метрики для отслеживания
            new_metrics: [
                {
                    name: "Trial rate",
                    description: "Коэффициент пробных периодов",
                    required_fields: ["trial_given", "trial_converted"]
                },
                {
                    name: "Time to sale",
                    description: "Время до продажи",
                    required_fields: ["createdate", "closedate", "first_contact_date"]
                },
                {
                    name: "Time to contact",
                    description: "Время до первого контакта",
                    required_fields: ["createdate", "hs_first_outreach_date"]
                },
                {
                    name: "Average followups per lead",
                    description: "Среднее количество повторных контактов на лида",
                    required_fields: ["num_contacted_notes", "num_notes"]
                }
            ],

            // Воронка и источники
            funnel_metrics: [
                {
                    name: "Sources breakdown",
                    description: "Разбивка по источникам",
                    required_fields: ["hs_analytics_latest_source", "source", "campaign"]
                },
                {
                    name: "VSL effectiveness",
                    description: "Эффективность VSL",
                    required_fields: ["video_watched", "vsl_completion", "dealstage"]
                }
            ]
        };
    }

    // Проверка доступности полей для каждой метрики
    checkMetricAvailability(metrics) {
        const results = {};

        Object.keys(metrics).forEach(category => {
            results[category] = metrics[category].map(metric => {
                const availability = metric.required_fields.map(field => {
                    const isAvailable = this.allFields.includes(field);
                    const actualField = isAvailable ? field : this.findSimilarField(field);

                    return {
                        field,
                        available: isAvailable,
                        alternative: actualField !== field ? actualField : null
                    };
                });

                const availableCount = availability.filter(f => f.available || f.alternative).length;
                const totalCount = availability.length;

                return {
                    ...metric,
                    availability,
                    completeness: `${availableCount}/${totalCount}`,
                    status: availableCount === totalCount ? 'READY' :
                           availableCount > 0 ? 'PARTIAL' : 'MISSING'
                };
            });
        });

        return results;
    }

    // Поиск похожих полей
    findSimilarField(targetField) {
        const synonyms = {
            'call_status': ['hs_number_of_outbound_calls', 'hs_number_of_inbound_calls'],
            'call_duration': ['hs_actual_duration', 'hs_average_call_duration'],
            'first_contact_date': ['hs_first_outreach_date', 'createdate'],
            'offer_given': ['dealstage', 'hs_lead_status'],
            'trial_given': ['lifecyclestage', 'hs_lead_status'],
            'trial_converted': ['dealstage', 'closedate'],
            'video_watched': ['ad', 'campaign'],
            'vsl_completion': ['campaign', 'source'],
            'payment_method': ['installments', 'deal_whole_amount'],
            'payment_status': ['dealstage', 'closedate'],
            'installment_monthly_amount': ['amount', 'deal_whole_amount'],
            'number_of_installments__months': ['installments'],
            'payment_type': ['installments', 'deal_whole_amount']
        };

        if (synonyms[targetField]) {
            for (let alternative of synonyms[targetField]) {
                if (this.allFields.includes(alternative)) {
                    return alternative;
                }
            }
        }

        // Поиск по частичному совпадению
        return this.allFields.find(field =>
            field.toLowerCase().includes(targetField.toLowerCase().split('_')[0])
        ) || targetField;
    }

    // Анализ готовых к использованию метрик
    analyzeReadyMetrics(results) {
        const ready = [];
        const partial = [];
        const missing = [];

        Object.keys(results).forEach(category => {
            results[category].forEach(metric => {
                switch(metric.status) {
                    case 'READY':
                        ready.push({...metric, category});
                        break;
                    case 'PARTIAL':
                        partial.push({...metric, category});
                        break;
                    case 'MISSING':
                        missing.push({...metric, category});
                        break;
                }
            });
        });

        return { ready, partial, missing };
    }

    // Генерация рекомендаций
    generateRecommendations(analysis) {
        const recommendations = [];

        // Рекомендации для готовых метрик
        if (analysis.ready.length > 0) {
            recommendations.push({
                type: 'READY_TO_IMPLEMENT',
                priority: 'HIGH',
                title: 'Готовые к реализации метрики',
                items: analysis.ready.map(metric => ({
                    name: metric.name,
                    description: metric.description,
                    fields: metric.availability.filter(f => f.available).map(f => f.field)
                }))
            });
        }

        // Рекомендации для частично доступных метрик
        if (analysis.partial.length > 0) {
            recommendations.push({
                type: 'NEEDS_ADDITIONAL_FIELDS',
                priority: 'MEDIUM',
                title: 'Требуют дополнительных полей',
                items: analysis.partial.map(metric => ({
                    name: metric.name,
                    description: metric.description,
                    available_fields: metric.availability.filter(f => f.available || f.alternative).map(f => f.field),
                    missing_fields: metric.availability.filter(f => !f.available && !f.alternative).map(f => f.field)
                }))
            });
        }

        // Рекомендации для недоступных метрик
        if (analysis.missing.length > 0) {
            recommendations.push({
                type: 'REQUIRES_NEW_IMPLEMENTATION',
                priority: 'LOW',
                title: 'Требуют новых полей и настроек',
                items: analysis.missing.map(metric => ({
                    name: metric.name,
                    description: metric.description,
                    required_new_fields: metric.required_fields
                }))
            });
        }

        return recommendations;
    }

    // Полный анализ
    analyze() {
        console.log('🎯 АНАЛИЗ СООТВЕТСТВИЯ ЗАПРОШЕННЫХ МЕТРИК\n');

        const requestedMetrics = this.getRequestedMetrics();
        const availability = this.checkMetricAvailability(requestedMetrics);
        const analysis = this.analyzeReadyMetrics(availability);
        const recommendations = this.generateRecommendations(analysis);

        const report = {
            summary: {
                total_metrics: Object.values(requestedMetrics).flat().length,
                ready_count: analysis.ready.length,
                partial_count: analysis.partial.length,
                missing_count: analysis.missing.length,
                readiness_percentage: Math.round((analysis.ready.length / Object.values(requestedMetrics).flat().length) * 100)
            },
            detailed_analysis: availability,
            analysis,
            recommendations,
            generated_at: new Date().toISOString()
        };

        // Вывод в консоль
        console.log(`📊 ОБЩАЯ СТАТИСТИКА:`);
        console.log(`   Всего метрик: ${report.summary.total_metrics}`);
        console.log(`   Готовы к реализации: ${report.summary.ready_count} (${report.summary.readiness_percentage}%)`);
        console.log(`   Частично доступны: ${report.summary.partial_count}`);
        console.log(`   Требуют новых полей: ${report.summary.missing_count}\n`);

        console.log('✅ ГОТОВЫЕ К РЕАЛИЗАЦИИ МЕТРИКИ:');
        analysis.ready.forEach(metric => {
            console.log(`   • ${metric.name} - ${metric.description}`);
        });

        console.log('\n⚠️ ЧАСТИЧНО ДОСТУПНЫЕ МЕТРИКИ:');
        analysis.partial.forEach(metric => {
            console.log(`   • ${metric.name} - ${metric.description} (${metric.completeness})`);
        });

        console.log('\n❌ НЕДОСТУПНЫЕ МЕТРИКИ:');
        analysis.missing.forEach(metric => {
            console.log(`   • ${metric.name} - ${metric.description}`);
        });

        // Сохранение отчета
        fs.writeFileSync('metrics-analysis-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Детальный отчет сохранен в metrics-analysis-report.json');

        return report;
    }
}

const mapper = new MetricsMapper();
mapper.analyze();