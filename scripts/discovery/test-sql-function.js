/**
 * Test SQL function get_all_metrics() with different filters
 *
 * Tests:
 * 1. All data (no filters)
 * 2. By manager (Shadi)
 * 3. By date range (7d, 30d, 90d)
 * 4. By manager + date range
 *
 * Run: node scripts/test-sql-function.js
 */

import http from 'http';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

function formatCurrency(value) {
  return '₪' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function testSqlFunction() {
  console.log('═'.repeat(80));
  console.log('TESTING SQL FUNCTION get_all_metrics()');
  console.log('═'.repeat(80));
  console.log('');

  const tests = [
    {
      name: 'Test 1: All data (no filters)',
      path: '/api/metrics',
      expected: 'All historical data'
    },
    {
      name: 'Test 2: Shadi (owner_id=682432124)',
      path: '/api/metrics?owner_id=682432124',
      expected: 'Shadi deals only'
    },
    {
      name: 'Test 3: Last 7 days',
      path: '/api/metrics?range=7d',
      expected: 'Recent sales (likely 0)'
    },
    {
      name: 'Test 4: Last 30 days',
      path: '/api/metrics?range=30d',
      expected: '30 days of data'
    },
    {
      name: 'Test 5: Last 90 days',
      path: '/api/metrics?range=90d',
      expected: '90 days of data'
    },
    {
      name: 'Test 6: Shadi + Last 30 days',
      path: '/api/metrics?owner_id=682432124&range=30d',
      expected: 'Shadi deals in last 30 days'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log(`Path: ${test.path}`);
    console.log(`Expected: ${test.expected}`);
    console.log('-'.repeat(80));

    try {
      const startTime = Date.now();
      const metrics = await makeRequest(test.path);
      const duration = Date.now() - startTime;

      console.log(`✓ Success (${duration}ms)`);
      console.log('');
      console.log('Key Metrics:');
      console.log(`  Total Sales:      ${formatCurrency(metrics.totalSales)}`);
      console.log(`  Total Deals:      ${metrics.totalDeals}`);
      console.log(`  Conversion Rate:  ${metrics.conversionRate}%`);
      console.log(`  Total Calls:      ${metrics.totalCalls.toLocaleString()}`);
      console.log(`  Total Contacts:   ${metrics.totalContacts.toLocaleString()}`);

      results.push({
        test: test.name,
        success: true,
        duration,
        sales: metrics.totalSales,
        deals: metrics.totalDeals,
        calls: metrics.totalCalls,
        contacts: metrics.totalContacts
      });

    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
  }

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log('');

  console.log('┌─────────────────────────────────────┬──────────┬─────────┬────────┐');
  console.log('│ Test                                │ Sales    │ Deals   │ Calls  │');
  console.log('├─────────────────────────────────────┼──────────┼─────────┼────────┤');

  results.forEach(r => {
    if (r.success) {
      const testName = r.test.padEnd(35);
      const sales = formatCurrency(r.sales).padStart(8);
      const deals = String(r.deals).padStart(7);
      const calls = r.calls.toLocaleString().padStart(6);
      console.log(`│ ${testName} │ ${sales} │ ${deals} │ ${calls} │`);
    } else {
      const testName = r.test.padEnd(35);
      console.log(`│ ${testName} │ FAILED: ${r.error.substring(0, 30)} │`);
    }
  });

  console.log('└─────────────────────────────────────┴──────────┴─────────┴────────┘');

  console.log('\n');
  console.log('ANALYSIS:');
  console.log('');

  const allData = results.find(r => r.test.includes('All data'));
  const last7d = results.find(r => r.test.includes('Last 7 days'));
  const last30d = results.find(r => r.test.includes('Last 30 days'));
  const last90d = results.find(r => r.test.includes('Last 90 days'));

  if (allData && last7d && last30d && last90d) {
    console.log(`1. Historical data: ${allData.sales > 0 ? '✓' : '✗'} (${formatCurrency(allData.sales)})`);
    console.log(`2. Recent activity (7d): ${last7d.sales === 0 ? '⚠ No recent sales' : '✓ Has recent sales'}`);
    console.log(`3. Date filters working: ${last7d.sales <= last30d.sales && last30d.sales <= last90d.sales ? '✓' : '✗'}`);

    if (last30d.sales === last90d.sales) {
      console.log('   ⚠ Warning: 30d = 90d (all sales older than 90 days)');
    }
  }

  const shadiTest = results.find(r => r.test.includes('Shadi'));
  if (shadiTest && allData) {
    console.log(`4. Manager filter: ${shadiTest.deals <= allData.deals ? '✓' : '✗'}`);
    const shadiPercent = ((shadiTest.deals / allData.deals) * 100).toFixed(1);
    console.log(`   Shadi has ${shadiPercent}% of all deals`);
  }

  console.log('\n');
  console.log('✓ SQL function test complete!');
  console.log('');
}

testSqlFunction().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
