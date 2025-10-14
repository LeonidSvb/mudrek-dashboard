import { test, expect } from '@playwright/test';

test.describe('Dashboard Metrics API', () => {

  test('GET /api/metrics - all 22 metrics', async ({ request }) => {
    console.log('\n========================================');
    console.log('🧪 TESTING: /api/metrics');
    console.log('========================================\n');

    const startTime = Date.now();

    const response = await request.get('/api/metrics');

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms\n`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Log all metrics with categories
    console.log('📊 SALES METRICS (4):');
    console.log(`   totalSales: ₪${data.totalSales?.toLocaleString() || 0}`);
    console.log(`   avgDealSize: ₪${data.avgDealSize?.toLocaleString() || 0}`);
    console.log(`   totalDeals: ${data.totalDeals || 0}`);
    console.log(`   conversionRate: ${data.conversionRate || 0}%\n`);

    console.log('📞 CALL METRICS (4):');
    console.log(`   totalCalls: ${data.totalCalls || 0}`);
    console.log(`   avgCallTime: ${data.avgCallTime || 0} min`);
    console.log(`   totalCallTime: ${data.totalCallTime || 0} hours`);
    console.log(`   fiveMinReachedRate: ${data.fiveMinReachedRate || 0}%\n`);

    console.log('🎯 CONVERSION METRICS (3):');
    console.log(`   qualifiedRate: ${data.qualifiedRate || 0}%`);
    console.log(`   trialRate: ${data.trialRate || 0}%`);
    console.log(`   cancellationRate: ${data.cancellationRate || 0}%\n`);

    console.log('💰 PAYMENT METRICS (2):');
    console.log(`   upfrontCashCollected: ₪${data.upfrontCashCollected?.toLocaleString() || 0}`);
    console.log(`   avgInstallments: ${data.avgInstallments || 0} months\n`);

    console.log('📧 FOLLOWUP METRICS (3):');
    console.log(`   followupRate: ${data.followupRate || 0}%`);
    console.log(`   avgFollowups: ${data.avgFollowups || 0}`);
    console.log(`   timeToFirstContact: ${data.timeToFirstContact || 0} days\n`);

    console.log('🎁 OFFER METRICS (2):');
    console.log(`   offersGivenRate: ${data.offersGivenRate || 0}%`);
    console.log(`   offerCloseRate: ${data.offerCloseRate || 0}%\n`);

    console.log('⏰ TIME METRICS (1):');
    console.log(`   timeToSale: ${data.timeToSale || 0} days\n`);

    console.log('🧪 A/B TESTING METRICS (2):');
    console.log(`   salesScriptStats: ${data.salesScriptStats?.length || 0} versions`);
    if (data.salesScriptStats && data.salesScriptStats.length > 0) {
      data.salesScriptStats.forEach((stat: any, idx: number) => {
        console.log(`     ${idx + 1}. ${stat.version}: ${stat.conversions}/${stat.totalContacts} = ${stat.conversionRate}%`);
      });
    }
    console.log(`   vslWatchStats: ${data.vslWatchStats?.length || 0} groups`);
    if (data.vslWatchStats && data.vslWatchStats.length > 0) {
      data.vslWatchStats.forEach((stat: any, idx: number) => {
        console.log(`     ${idx + 1}. ${stat.watched}: ${stat.conversions}/${stat.totalContacts} = ${stat.conversionRate}%`);
      });
    }
    console.log('');

    console.log('📊 METADATA:');
    console.log(`   totalContacts: ${data.totalContacts || 0}\n`);

    // Assertions - все 22 метрики должны существовать
    expect(data).toHaveProperty('totalSales');
    expect(data).toHaveProperty('avgDealSize');
    expect(data).toHaveProperty('totalDeals');
    expect(data).toHaveProperty('conversionRate');

    expect(data).toHaveProperty('totalCalls');
    expect(data).toHaveProperty('avgCallTime');
    expect(data).toHaveProperty('totalCallTime');
    expect(data).toHaveProperty('fiveMinReachedRate');

    expect(data).toHaveProperty('qualifiedRate');
    expect(data).toHaveProperty('trialRate');
    expect(data).toHaveProperty('cancellationRate');

    expect(data).toHaveProperty('upfrontCashCollected');
    expect(data).toHaveProperty('avgInstallments');

    expect(data).toHaveProperty('followupRate');
    expect(data).toHaveProperty('avgFollowups');
    expect(data).toHaveProperty('timeToFirstContact');

    expect(data).toHaveProperty('offersGivenRate');
    expect(data).toHaveProperty('offerCloseRate');

    expect(data).toHaveProperty('timeToSale');

    expect(data).toHaveProperty('salesScriptStats');
    expect(data).toHaveProperty('vslWatchStats');

    expect(data).toHaveProperty('totalContacts');

    // Validate types
    expect(typeof data.totalSales).toBe('number');
    expect(typeof data.totalDeals).toBe('number');
    expect(typeof data.totalCalls).toBe('number');
    expect(Array.isArray(data.salesScriptStats)).toBeTruthy();
    expect(Array.isArray(data.vslWatchStats)).toBeTruthy();

    console.log('✅ All 22 metrics validated successfully!\n');
  });

  test('GET /api/metrics/timeline - sales and calls timeline', async ({ request }) => {
    console.log('\n========================================');
    console.log('🧪 TESTING: /api/metrics/timeline');
    console.log('========================================\n');

    // Test with last 90 days
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`📅 Date range: ${dateFrom} to ${dateTo}`);
    console.log(`📊 Expected granularity: weekly (90 days)\n`);

    const startTime = Date.now();

    const response = await request.get(`/api/metrics/timeline?date_from=${dateFrom}&date_to=${dateTo}`);

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms\n`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    console.log('📈 TIMELINE DATA:');
    console.log(`   Sales data points: ${data.sales?.length || 0}`);
    console.log(`   Calls data points: ${data.calls?.length || 0}\n`);

    if (data.sales && data.sales.length > 0) {
      console.log('💰 Sales Timeline (first 5 points):');
      data.sales.slice(0, 5).forEach((point: any, idx: number) => {
        console.log(`     ${idx + 1}. ${point.date}: ₪${point.value?.toLocaleString() || 0}`);
      });
      console.log('');
    }

    if (data.calls && data.calls.length > 0) {
      console.log('📞 Calls Timeline (first 5 points):');
      data.calls.slice(0, 5).forEach((point: any, idx: number) => {
        console.log(`     ${idx + 1}. ${point.date}: ${point.value || 0} calls`);
      });
      console.log('');
    }

    // Assertions
    expect(data).toHaveProperty('sales');
    expect(data).toHaveProperty('calls');
    expect(Array.isArray(data.sales)).toBeTruthy();
    expect(Array.isArray(data.calls)).toBeTruthy();

    // Validate structure if data exists
    if (data.sales.length > 0) {
      expect(data.sales[0]).toHaveProperty('date');
      expect(data.sales[0]).toHaveProperty('value');
    }

    if (data.calls.length > 0) {
      expect(data.calls[0]).toHaveProperty('date');
      expect(data.calls[0]).toHaveProperty('value');
    }

    console.log('✅ Timeline data validated successfully!\n');
  });

  test('GET /api/metrics with filters - owner_id', async ({ request }) => {
    console.log('\n========================================');
    console.log('🧪 TESTING: /api/metrics with owner_id filter');
    console.log('========================================\n');

    // Test with owner filter (example owner_id)
    const ownerId = '682432124';

    console.log(`👤 Filter: owner_id = ${ownerId}\n`);

    const startTime = Date.now();

    const response = await request.get(`/api/metrics?owner_id=${ownerId}`);

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms\n`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    console.log('📊 FILTERED METRICS:');
    console.log(`   totalSales: ₪${data.totalSales?.toLocaleString() || 0}`);
    console.log(`   totalDeals: ${data.totalDeals || 0}`);
    console.log(`   totalCalls: ${data.totalCalls || 0}`);
    console.log(`   totalContacts: ${data.totalContacts || 0}\n`);

    expect(data).toHaveProperty('totalSales');
    expect(data).toHaveProperty('totalDeals');

    console.log('✅ Filtered metrics validated successfully!\n');
  });

  test('GET /api/metrics with date range', async ({ request }) => {
    console.log('\n========================================');
    console.log('🧪 TESTING: /api/metrics with date range');
    console.log('========================================\n');

    // Test with last 30 days
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`📅 Date range: ${dateFrom} to ${dateTo}\n`);

    const startTime = Date.now();

    const response = await request.get(`/api/metrics?date_from=${dateFrom}&date_to=${dateTo}`);

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms\n`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    console.log('📊 DATE-FILTERED METRICS:');
    console.log(`   totalSales: ₪${data.totalSales?.toLocaleString() || 0}`);
    console.log(`   totalDeals: ${data.totalDeals || 0}`);
    console.log(`   avgDealSize: ₪${data.avgDealSize?.toLocaleString() || 0}\n`);

    expect(data).toHaveProperty('totalSales');
    expect(data).toHaveProperty('totalDeals');

    console.log('✅ Date-filtered metrics validated successfully!\n');
  });
});
