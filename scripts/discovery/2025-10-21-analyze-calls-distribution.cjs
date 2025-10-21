const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ncsyuddcnnmatzxyjgwp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3l1ZGRjbm5tYXR6eHlqZ3dwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY3NDUwMCwiZXhwIjoyMDc1MjUwNTAwfQ.n6aHoPOxM2LK8VXEqtOxBi4-qZRhxu2WhwNsxuQpkTI'
);

(async () => {
  console.log('=== РАСПРЕДЕЛЕНИЕ ЗВОНКОВ ПО ДНЯМ ===\n');

  // Get calls grouped by date (last 10 days)
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        DATE(hs_timestamp) as call_date,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE call_duration >= 300000) as calls_5min_plus
      FROM hubspot_calls_raw
      WHERE hs_timestamp >= CURRENT_DATE - INTERVAL '10 days'
      GROUP BY DATE(hs_timestamp)
      ORDER BY call_date DESC
    `
  });

  if (error) {
    console.error('Error executing SQL:', error);

    // Try alternative query without execute_sql
    console.log('\nПробую альтернативный способ...\n');

    const { data: calls, error: callsError } = await supabase
      .from('hubspot_calls_raw')
      .select('hs_timestamp, call_duration')
      .gte('hs_timestamp', '2025-10-11T00:00:00Z')
      .order('hs_timestamp', { ascending: false });

    if (callsError) {
      console.error('Error fetching calls:', callsError);
    } else {
      console.log('Всего звонков за последние 10 дней:', calls.length);

      // Group by date manually
      const byDate = {};
      calls.forEach(call => {
        const date = call.hs_timestamp.split('T')[0];
        if (!byDate[date]) {
          byDate[date] = { total: 0, fiveMinPlus: 0 };
        }
        byDate[date].total++;
        if (call.call_duration >= 300000) {
          byDate[date].fiveMinPlus++;
        }
      });

      console.log('\nРаспределение по дням:');
      Object.keys(byDate).sort().reverse().forEach(date => {
        const stats = byDate[date];
        console.log(date + ': ' + stats.total + ' звонков (5min+: ' + stats.fiveMinPlus + ')');
      });
    }
  } else {
    console.log('Результат SQL запроса:');
    console.log(JSON.stringify(data, null, 2));
  }

  console.log('\n=== ПРОВЕРКА МАТЕРИАЛИЗОВАННЫХ VIEWS ===\n');

  // Check call_contact_matches_mv
  const { data: mvData, error: mvError } = await supabase
    .from('call_contact_matches_mv')
    .select('call_timestamp, hubspot_owner_id')
    .gte('call_timestamp', '2025-10-20T00:00:00Z')
    .lt('call_timestamp', '2025-10-21T00:00:00Z')
    .limit(10);

  if (mvError) {
    console.error('Error checking materialized view:', mvError);
  } else {
    console.log('Записей в call_contact_matches_mv за 2025-10-20:', mvData.length);
    if (mvData.length > 0) {
      console.log('Первые несколько записей:');
      mvData.forEach(row => {
        console.log('  ' + row.call_timestamp + ' | Owner: ' + row.hubspot_owner_id);
      });
    }
  }

  console.log('\n=== ПРОВЕРКА ПОСЛЕДНИХ ЗВОНКОВ ===\n');

  const { data: recentCalls, error: recentError } = await supabase
    .from('hubspot_calls_raw')
    .select('hs_timestamp, call_duration, call_from_number')
    .order('hs_timestamp', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('Error:', recentError);
  } else {
    console.log('Последние 10 звонков в hubspot_calls_raw:');
    recentCalls.forEach(call => {
      const date = new Date(call.hs_timestamp);
      console.log('  ' + date.toISOString() + ' (' + date.toLocaleDateString('ru-RU') + ')');
    });
  }
})();
