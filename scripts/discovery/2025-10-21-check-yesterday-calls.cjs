const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ncsyuddcnnmatzxyjgwp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3l1ZGRjbm5tYXR6eHlqZ3dwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY3NDUwMCwiZXhwIjoyMDc1MjUwNTAwfQ.n6aHoPOxM2LK8VXEqtOxBi4-qZRhxu2WhwNsxuQpkTI'
);

(async () => {
  console.log('=== ПРОВЕРКА ЗВОНКОВ В БАЗЕ ===\n');

  // Check latest calls
  const { data: latestCalls, error: latestError } = await supabase
    .from('hubspot_calls_raw')
    .select('id, hs_timestamp, call_duration')
    .order('hs_timestamp', { ascending: false })
    .limit(20);

  if (latestError) {
    console.error('Error:', latestError);
  } else {
    console.log('Последние 20 звонков в базе:');
    latestCalls.forEach(call => {
      const date = new Date(call.hs_timestamp);
      console.log(date.toISOString() + ' | Duration: ' + call.call_duration + 'ms');
    });
  }

  console.log('\n=== ПРОВЕРКА ЗВОНКОВ ЗА 2025-10-20 (UTC) ===\n');

  const { data: oct20Calls, error } = await supabase
    .from('hubspot_calls_raw')
    .select('id, hs_timestamp')
    .gte('hs_timestamp', '2025-10-20T00:00:00Z')
    .lt('hs_timestamp', '2025-10-21T00:00:00Z')
    .order('hs_timestamp', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Звонков за 2025-10-20: ' + oct20Calls.length);
    if (oct20Calls.length > 0) {
      oct20Calls.slice(0, 5).forEach(call => {
        console.log('  ' + call.hs_timestamp);
      });
    }
  }

  console.log('\n=== ТЕСТ SQL ФУНКЦИИ get_call_metrics() ===\n');

  // Test with "вчера" date range
  const { data: metricsYesterday, error: metricsError } = await supabase.rpc('get_call_metrics', {
    p_owner_id: null,
    p_date_from: '2025-10-20',
    p_date_to: '2025-10-20'
  });

  if (metricsError) {
    console.error('Error calling get_call_metrics:', metricsError);
  } else {
    console.log('Метрики за "вчера" (2025-10-20):');
    console.log(JSON.stringify(metricsYesterday, null, 2));
  }

  console.log('\n=== ТЕСТ SQL ФУНКЦИИ get_call_metrics() за последние 7 дней ===\n');

  const { data: metrics7d, error: metrics7dError } = await supabase.rpc('get_call_metrics', {
    p_owner_id: null,
    p_date_from: '2025-10-14',
    p_date_to: '2025-10-21'
  });

  if (metrics7dError) {
    console.error('Error:', metrics7dError);
  } else {
    console.log('Метрики за последние 7 дней:');
    console.log(JSON.stringify(metrics7d, null, 2));
  }

  console.log('\n=== ПРОВЕРКА TIMEZONE ПРОБЛЕМЫ ===\n');

  console.log('Текущая дата/время:');
  const now = new Date();
  console.log('  Local: ' + now.toString());
  console.log('  ISO: ' + now.toISOString());
  console.log('  toISOString().split("T")[0]: ' + now.toISOString().split('T')[0]);

  console.log('\nДата "вчера" в календаре:');
  const yesterday = new Date('2025-10-20');
  console.log('  Local: ' + yesterday.toString());
  console.log('  ISO: ' + yesterday.toISOString());
  console.log('  toISOString().split("T")[0]: ' + yesterday.toISOString().split('T')[0]);
})();
