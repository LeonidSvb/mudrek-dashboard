require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkPickupRate() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('📞 Проверка Pickup Rate (connected calls / total calls)\n');

  // Получить все звонки с call_disposition
  const { data, error } = await supabase
    .from('hubspot_calls_raw')
    .select('call_disposition, call_duration, call_timestamp')
    .order('call_timestamp', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Проверено звонков: ${data.length}\n`);

  // Уникальные значения call_disposition
  const dispositions = [...new Set(data.map(d => d.call_disposition))].sort();
  console.log('🔍 Уникальные значения call_disposition:');
  console.log(dispositions);

  // Статистика по disposition
  const stats = {};
  data.forEach(d => {
    const disp = d.call_disposition || 'NULL';
    stats[disp] = (stats[disp] || 0) + 1;
  });

  console.log('\n📈 Статистика по disposition:');
  console.table(stats);

  // Определить что считать "connected"
  const connectedKeywords = ['connected', 'answered', 'completed'];
  const connected = data.filter(d => {
    if (!d.call_disposition) return false;
    const disp = d.call_disposition.toLowerCase();
    return connectedKeywords.some(keyword => disp.includes(keyword));
  }).length;

  const total = data.length;
  const pickupRate = total > 0 ? (connected / total * 100).toFixed(2) : 0;

  console.log('\n💡 PICKUP RATE:');
  console.log(`   Connected calls: ${connected}`);
  console.log(`   Total calls: ${total}`);
  console.log(`   Pickup Rate: ${pickupRate}%`);

  // Проверим также по длительности (если звонок > 0, то скорее всего connected)
  const callsWithDuration = data.filter(d => d.call_duration && d.call_duration > 0).length;
  console.log(`\n📞 Звонки с duration > 0: ${callsWithDuration} (${(callsWithDuration/total*100).toFixed(2)}%)`);

  // Проверяем raw_json для понимания что такое call_disposition UUID
  console.log('\n🔎 Проверка raw_json для первых 3 звонков:');
  const sample = await supabase
    .from('hubspot_calls_raw')
    .select('call_disposition, call_duration, raw_json')
    .limit(3);

  if (sample.data) {
    sample.data.forEach((call, idx) => {
      console.log(`\n--- Звонок ${idx + 1} ---`);
      console.log('call_disposition UUID:', call.call_disposition);
      console.log('call_duration:', call.call_duration, 'ms');

      if (call.raw_json && call.raw_json.properties) {
        const props = call.raw_json.properties;
        console.log('Поля с disposition/status/outcome:');
        Object.keys(props).filter(k =>
          k.includes('disposition') ||
          k.includes('status') ||
          k.includes('outcome') ||
          k.includes('connected')
        ).forEach(key => {
          console.log(`  ${key}:`, props[key]);
        });
      }
    });
  }

  // Анализ по длительности для каждого disposition UUID
  console.log('\n📊 Статистика длительности для каждого disposition:');
  const dispStats = {};

  data.forEach(call => {
    const disp = call.call_disposition || 'NULL';
    if (!dispStats[disp]) {
      dispStats[disp] = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0
      };
    }

    const dur = call.call_duration || 0;
    dispStats[disp].count++;
    dispStats[disp].totalDuration += dur;
    dispStats[disp].minDuration = Math.min(dispStats[disp].minDuration, dur);
    dispStats[disp].maxDuration = Math.max(dispStats[disp].maxDuration, dur);
  });

  Object.keys(dispStats).forEach(disp => {
    const stats = dispStats[disp];
    stats.avgDuration = Math.round(stats.totalDuration / stats.count);
    stats.avgDurationMin = (stats.avgDuration / 60000).toFixed(2);
    stats.minDurationSec = (stats.minDuration / 1000).toFixed(1);
    stats.maxDurationMin = (stats.maxDuration / 60000).toFixed(2);
  });

  console.table(Object.entries(dispStats).map(([uuid, stats]) => ({
    disposition_uuid: uuid.substring(0, 13) + '...',
    count: stats.count,
    avg_duration_min: stats.avgDurationMin,
    min_duration_sec: stats.minDurationSec,
    max_duration_min: stats.maxDurationMin
  })));

  console.log('\n💡 РЕКОМЕНДАЦИЯ:');
  console.log('Нужно узнать что означают эти UUID в HubSpot:');
  console.log('- 73a0d17f (58.8%) - вероятно "Connected" или "Answered"');
  console.log('- f240bbac (37.8%) - вероятно "No Answer" или "Busy"');
  console.log('- b2cf5968 (3.4%) - вероятно "Failed" или другой статус');
  console.log('\nМожно трекать Pickup Rate используя disposition UUID или hs_call_status.');
}

checkPickupRate();
