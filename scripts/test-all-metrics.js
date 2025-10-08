/**
 * Test All 21 Metrics
 *
 * This script validates all metrics by fetching real data
 * and displaying results in readable format.
 *
 * Run: node scripts/test-all-metrics.js
 */

import http from 'http';

// Helper to make HTTP request
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
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

    req.on('error', (error) => {
      reject(new Error(`Connection error: ${error.message}. Is dev server running?`));
    });
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error('Request timeout after 45 seconds'));
    });
    req.end();
  });
}

// Helper to format currency
function formatCurrency(value) {
  return '₪' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Helper to format percentage
function formatPercent(value) {
  return value.toFixed(2) + '%';
}

// Helper to format number
function formatNumber(value) {
  return value.toLocaleString('en-US');
}

async function testMetrics() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TESTING ALL 21 METRICS - Mudrek Dashboard               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('📡 Fetching metrics from API: GET /api/metrics\n');

    const metrics = await makeRequest('/api/metrics');

    if (metrics.error) {
      console.error('❌ API Error:', metrics.error);
      console.error('Details:', metrics.details);
      return;
    }

    console.log('✅ Metrics received successfully!\n');
    console.log('═'.repeat(70));

    // Category 1: Sales Metrics
    console.log('\n📊 CATEGORY 1: SALES METRICS (4)\n');
    console.log('1.  Total Sales:           ', formatCurrency(metrics.totalSales));
    console.log('2.  Average Deal Size:     ', formatCurrency(metrics.avgDealSize));
    console.log('3.  Total Deals:           ', formatNumber(metrics.totalDeals));
    console.log('4.  Conversion Rate:       ', formatPercent(metrics.conversionRate));

    // Category 2: Call Metrics
    console.log('\n═'.repeat(70));
    console.log('\n📞 CATEGORY 2: CALL METRICS (4)\n');
    console.log('5.  Total Calls:           ', formatNumber(metrics.totalCalls));
    console.log('6.  Average Call Time:     ', metrics.avgCallTime.toFixed(2), 'minutes');
    console.log('7.  Total Call Time:       ', metrics.totalCallTime.toFixed(2), 'hours');
    console.log('8.  5-Min Reached Rate:    ', formatPercent(metrics.fiveMinReachedRate));

    // Category 3: Conversion Metrics
    console.log('\n═'.repeat(70));
    console.log('\n🎯 CATEGORY 3: CONVERSION METRICS (3)\n');
    console.log('9.  Qualified Rate:        ', formatPercent(metrics.qualifiedRate));
    console.log('10. Trial Rate:            ', formatPercent(metrics.trialRate));
    console.log('11. Cancellation Rate:     ', formatPercent(metrics.cancellationRate));

    // Category 4: Payment Metrics
    console.log('\n═'.repeat(70));
    console.log('\n💰 CATEGORY 4: PAYMENT METRICS (2)\n');
    console.log('12. Upfront Cash Collected:', formatCurrency(metrics.upfrontCashCollected));
    console.log('13. Average Installments:  ', metrics.avgInstallments.toFixed(1), 'months');

    // Category 5: Followup Metrics
    console.log('\n═'.repeat(70));
    console.log('\n🔄 CATEGORY 5: FOLLOWUP METRICS (3)\n');
    console.log('14. Followup Rate:         ', formatPercent(metrics.followupRate));
    console.log('15. Average Followups:     ', metrics.avgFollowups.toFixed(1), 'calls');
    console.log('16. Time to First Contact: ', metrics.timeToFirstContact.toFixed(1), 'days');

    // Category 6: A/B Testing Metrics
    console.log('\n═'.repeat(70));
    console.log('\n🧪 CATEGORY 6: A/B TESTING METRICS (2)\n');

    console.log('17. Sales Script Testing:');
    if (metrics.salesScriptStats && metrics.salesScriptStats.length > 0) {
      metrics.salesScriptStats.forEach((stat, i) => {
        console.log(`    - ${stat.version}: ${formatPercent(stat.conversionRate)} (${stat.conversions}/${stat.totalContacts})`);
      });
    } else {
      console.log('    ⚠️  No data (sales_script_version not set in contacts)');
    }

    console.log('\n18. VSL Watch → Close Rate:');
    if (metrics.vslWatchStats && metrics.vslWatchStats.length > 0) {
      metrics.vslWatchStats.forEach((stat, i) => {
        const label = stat.watched === 'yes' ? 'Watched' : stat.watched === 'no' ? 'Not watched' : stat.watched;
        console.log(`    - ${label}: ${formatPercent(stat.conversionRate)} (${stat.conversions}/${stat.totalContacts})`);
      });
    } else {
      console.log('    ⚠️  No data (vsl_watched not set in contacts)');
    }

    // Category 7: Offer Metrics
    console.log('\n═'.repeat(70));
    console.log('\n💼 CATEGORY 7: OFFER METRICS (2)\n');
    console.log('19. Offers Given Rate:     ', formatPercent(metrics.offersGivenRate));
    console.log('20. Offer → Close Rate:    ', formatPercent(metrics.offerCloseRate));

    // Category 8: Time Metrics
    console.log('\n═'.repeat(70));
    console.log('\n⏱️  CATEGORY 8: TIME METRICS (2)\n');
    console.log('21. Time to Sale:          ', metrics.timeToSale.toFixed(1), 'days');
    console.log('    (Time to First Contact already shown in Followup Metrics)');

    // Summary
    console.log('\n═'.repeat(70));
    console.log('\n📋 SUMMARY\n');

    const zeroMetrics = [];
    const workingMetrics = [];

    // Check which metrics are zero
    const metricsToCheck = [
      { name: 'Total Sales', value: metrics.totalSales },
      { name: 'Total Deals', value: metrics.totalDeals },
      { name: 'Conversion Rate', value: metrics.conversionRate },
      { name: 'Total Calls', value: metrics.totalCalls },
      { name: 'Qualified Rate', value: metrics.qualifiedRate },
      { name: 'Trial Rate', value: metrics.trialRate },
      { name: 'Cancellation Rate', value: metrics.cancellationRate },
      { name: 'Upfront Cash', value: metrics.upfrontCashCollected },
      { name: 'Avg Installments', value: metrics.avgInstallments },
      { name: 'Followup Rate', value: metrics.followupRate },
      { name: 'Offers Given Rate', value: metrics.offersGivenRate },
      { name: 'Offer Close Rate', value: metrics.offerCloseRate },
    ];

    metricsToCheck.forEach(metric => {
      if (metric.value === 0 || metric.value === null || metric.value === undefined) {
        zeroMetrics.push(metric.name);
      } else {
        workingMetrics.push(metric.name);
      }
    });

    console.log('✅ Metrics with data:     ', workingMetrics.length, '/', metricsToCheck.length);
    console.log('⚠️  Metrics with zero:    ', zeroMetrics.length, '/', metricsToCheck.length);

    if (zeroMetrics.length > 0) {
      console.log('\n⚠️  Zero metrics (need data or field population):');
      zeroMetrics.forEach(name => {
        console.log('   -', name);
      });
    }

    // Check data quality
    console.log('\n📊 DATA QUALITY CHECKS:\n');

    // Check 1: Conversion rate makes sense
    const expectedConversionRate = (metrics.totalDeals / (31636)) * 100; // total contacts known
    const conversionRateDiff = Math.abs(metrics.conversionRate - expectedConversionRate);
    if (conversionRateDiff < 0.1) {
      console.log('✅ Conversion rate calculation: CORRECT');
    } else {
      console.log('⚠️  Conversion rate calculation: CHECK (diff:', conversionRateDiff.toFixed(2), '%)');
    }

    // Check 2: Average deal size makes sense
    if (metrics.totalDeals > 0) {
      const calculatedAvg = metrics.totalSales / metrics.totalDeals;
      const avgDiff = Math.abs(metrics.avgDealSize - calculatedAvg);
      if (avgDiff < 1) {
        console.log('✅ Average deal size calculation: CORRECT');
      } else {
        console.log('⚠️  Average deal size calculation: CHECK (diff: ₪', avgDiff.toFixed(2), ')');
      }
    }

    // Check 3: Followup rate makes sense
    if (metrics.followupRate > 0 && metrics.followupRate <= 100) {
      console.log('✅ Followup rate range: VALID (0-100%)');
    } else if (metrics.followupRate > 100) {
      console.log('❌ Followup rate range: INVALID (>100%)');
    }

    // Check 4: Phone matching working
    if (metrics.followupRate > 0) {
      console.log('✅ Phone matching (VIEWs): WORKING');
    } else {
      console.log('⚠️  Phone matching (VIEWs): No data or not working');
    }

    console.log('\n═'.repeat(70));
    console.log('\n🎯 RECOMMENDATIONS:\n');

    if (metrics.qualifiedRate === 0) {
      console.log('📌 Set qualified_status = "yes" for deals in HubSpot to see Qualified Rate');
    }
    if (metrics.trialRate === 0) {
      console.log('📌 Set trial_status = "yes" for deals in HubSpot to see Trial Rate');
    }
    if (metrics.offersGivenRate === 0) {
      console.log('📌 Set offer_given = "yes" for deals in HubSpot to see Offer metrics');
    }
    if (metrics.avgInstallments === 0) {
      console.log('📌 Fill number_of_installments__months field in deals for installment data');
    }
    if (metrics.upfrontCashCollected === 0) {
      console.log('📌 Fill n1st_payment field in deals for upfront cash data');
    }

    if (metrics.salesScriptStats.length === 0) {
      console.log('📌 Set sales_script_version in contacts for A/B testing data');
    }

    console.log('\n═'.repeat(70));
    console.log('\n✨ TEST COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nMake sure:');
    console.error('1. Next.js dev server is running: cd frontend && npm run dev');
    console.error('2. API endpoint is accessible: http://localhost:3000/api/metrics');
    console.error('3. Database connection is configured (.env file)');
  }
}

// Run the test
console.log('Starting metrics test...\n');
console.log('⚠️  Make sure Next.js dev server is running:');
console.log('   cd frontend && npm run dev\n');

setTimeout(() => {
  testMetrics();
}, 1000);
