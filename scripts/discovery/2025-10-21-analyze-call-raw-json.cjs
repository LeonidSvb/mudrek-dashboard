require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function analyzeCallRawJson() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔍 Анализ raw_json звонков для точного определения connected calls\n');

  // Получить разнообразные звонки (не сортируем, берем последние по времени)
  const { data: calls, error } = await supabase
    .from('hubspot_calls_raw')
    .select('hubspot_id, call_disposition, call_duration, call_timestamp, raw_json')
    .order('call_timestamp', { ascending: false })
    .limit(500);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Группировка по длительности
  const buckets = {
    'very_short_0_10s': [],
    'short_10_30s': [],
    'medium_30_60s': [],
    'normal_1_3min': [],
    'long_3_10min': [],
    'very_long_10plus': []
  };

  calls.forEach(call => {
    const durSec = call.call_duration / 1000;
    if (durSec < 10) buckets.very_short_0_10s.push(call);
    else if (durSec < 30) buckets.short_10_30s.push(call);
    else if (durSec < 60) buckets.medium_30_60s.push(call);
    else if (durSec < 180) buckets.normal_1_3min.push(call);
    else if (durSec < 600) buckets.long_3_10min.push(call);
    else buckets.very_long_10plus.push(call);
  });

  // Анализ каждой группы
  console.log('📊 Статистика по группам длительности:\n');
  console.table(Object.entries(buckets).map(([name, calls]) => ({
    group: name,
    count: calls.length,
    avg_duration_sec: calls.length > 0
      ? (calls.reduce((sum, c) => sum + c.call_duration, 0) / calls.length / 1000).toFixed(1)
      : 0
  })));

  // Подробный анализ каждой группы
  console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ КАЖДОЙ ГРУППЫ:\n');

  for (const [groupName, groupCalls] of Object.entries(buckets)) {
    if (groupCalls.length === 0) continue;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${groupName.toUpperCase()} (${groupCalls.length} звонков)`);
    console.log('='.repeat(70));

    // Берем первый звонок из группы для анализа
    const sample = groupCalls[0];
    const props = sample.raw_json?.properties || {};

    console.log('\n📋 Доступные поля в raw_json.properties:');

    // Фильтруем интересные поля
    const interestingFields = Object.keys(props).filter(key =>
      key.includes('call') ||
      key.includes('disposition') ||
      key.includes('status') ||
      key.includes('outcome') ||
      key.includes('connected') ||
      key.includes('answered') ||
      key.includes('duration') ||
      key.includes('recording') ||
      key.includes('body')
    );

    interestingFields.forEach(key => {
      const value = props[key];
      if (value) {
        console.log(`  ${key}: ${JSON.stringify(value).substring(0, 100)}`);
      }
    });

    // Показать 2-3 примера из группы
    console.log(`\n📞 Примеры звонков из этой группы (первые 3):`);
    groupCalls.slice(0, 3).forEach((call, idx) => {
      const durSec = (call.call_duration / 1000).toFixed(1);
      const callProps = call.raw_json?.properties || {};

      console.log(`\n  Пример ${idx + 1}:`);
      console.log(`    Duration: ${durSec}s`);
      console.log(`    Disposition: ${call.call_disposition}`);
      console.log(`    Status: ${callProps.hs_call_status || 'N/A'}`);
      console.log(`    Title: ${callProps.hs_call_title || 'N/A'}`);
      console.log(`    Body: ${(callProps.hs_call_body || 'N/A').substring(0, 80)}`);

      // Проверить есть ли recording
      if (callProps.hs_call_recording_url) {
        console.log(`    Recording: ✅ YES`);
      }
    });
  }

  // Финальная рекомендация
  console.log('\n\n' + '='.repeat(70));
  console.log('💡 РЕКОМЕНДАЦИИ ДЛЯ PICKUP RATE:');
  console.log('='.repeat(70));

  // Проверить разные thresholds
  const thresholds = [10, 20, 30, 45, 60, 90, 120];
  console.log('\n📊 Pickup Rate при разных threshold длительности:\n');

  const totalCalls = calls.length;
  thresholds.forEach(threshold => {
    const connected = calls.filter(c => c.call_duration >= threshold * 1000).length;
    const rate = (connected / totalCalls * 100).toFixed(2);
    console.log(`  >= ${threshold}s: ${connected}/${totalCalls} = ${rate}%`);
  });

  // Проверить по disposition UUID
  console.log('\n📊 Pickup Rate по disposition UUID:\n');
  const dispStats = {};
  calls.forEach(call => {
    const disp = call.call_disposition;
    if (!dispStats[disp]) {
      dispStats[disp] = {
        count: 0,
        avgDuration: 0,
        totalDuration: 0
      };
    }
    dispStats[disp].count++;
    dispStats[disp].totalDuration += call.call_duration;
  });

  Object.entries(dispStats).forEach(([uuid, stats]) => {
    stats.avgDuration = (stats.totalDuration / stats.count / 1000).toFixed(1);
    console.log(`  ${uuid.substring(0, 13)}...: ${stats.count} calls, avg ${stats.avgDuration}s`);
  });
}

analyzeCallRawJson();
