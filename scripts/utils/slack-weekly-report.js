#!/usr/bin/env node
/**
 * Weekly Metrics Report to Slack
 *
 * Использует готовые RPC функции из Supabase (8 функций)
 * Отправляет еженедельный отчет по всем метрикам в Slack
 *
 * Usage:
 *   node scripts/utils/slack-weekly-report.js               (за прошлую неделю)
 *   node scripts/utils/slack-weekly-report.js --date=2025-10-30  (неделя, заканчивающаяся 30 октября)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE credentials in .env');
  process.exit(1);
}

if (!SLACK_WEBHOOK_URL) {
  console.error('Missing SLACK_WEBHOOK_URL in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseArgs() {
  const args = process.argv.slice(2);
  let date = null;

  args.forEach(arg => {
    if (arg.startsWith('--date=')) {
      date = arg.split('=')[1];
    }
  });

  return date;
}

function getWeekRange(argDate) {
  let endDate;

  if (argDate) {
    endDate = new Date(argDate);
  } else {
    endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
  }

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

function formatValue(value, key) {
  if (value === null || value === undefined || value === 0) {
    return '0';
  }

  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('rate') || lowerKey.includes('conversion')) {
    return `${parseFloat(value).toFixed(1)}%`;
  }

  if (lowerKey.includes('time') && key !== 'totalCallTime') {
    return `${parseFloat(value).toFixed(1)} min`;
  }

  if (key === 'totalCallTime') {
    return `${parseFloat(value).toFixed(1)} hrs`;
  }

  if (lowerKey.includes('sales') || lowerKey.includes('cash') || lowerKey.includes('collected') || lowerKey.includes('size')) {
    return `₪${Math.round(parseFloat(value)).toLocaleString('en-US')}`;
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString('en-US');
  }

  return parseFloat(value).toFixed(1);
}

async function fetchAllMetrics(dateFrom, dateTo) {
  console.log(`Fetching metrics for ${dateFrom} to ${dateTo}...`);

  const params = {
    p_owner_id: null,
    p_date_from: dateFrom,
    p_date_to: dateTo
  };

  const [
    salesResult,
    callsResult,
    conversionResult,
    paymentResult,
    followupResult,
    offersResult,
    timeResult
  ] = await Promise.all([
    supabase.rpc('get_sales_metrics', params),
    supabase.rpc('get_call_metrics', params),
    supabase.rpc('get_conversion_metrics', params),
    supabase.rpc('get_payment_metrics', params),
    supabase.rpc('get_followup_metrics', params),
    supabase.rpc('get_offer_metrics', params),
    supabase.rpc('get_time_metrics', params)
  ]);

  const errors = [
    salesResult.error,
    callsResult.error,
    conversionResult.error,
    paymentResult.error,
    followupResult.error,
    offersResult.error,
    timeResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error('Errors:', errors);
  }

  return {
    sales: salesResult.data || {},
    calls: callsResult.data || {},
    conversion: conversionResult.data || {},
    payment: paymentResult.data || {},
    followup: followupResult.data || {},
    offers: offersResult.data || {},
    time: timeResult.data || {}
  };
}

function buildSlackBlocks(metrics, dateFrom, dateTo) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Weekly Metrics Report - ${dateFrom} to ${dateTo}`
      }
    },
    {
      type: 'divider'
    }
  ];

  const categories = [
    {
      title: 'Sales Metrics',
      data: metrics.sales,
      fields: [
        { key: 'totalSales', label: 'Total Sales' },
        { key: 'totalDeals', label: 'Closed Deals' },
        { key: 'avgDealSize', label: 'Avg Deal Size' },
        { key: 'conversionRate', label: 'Conversion Rate' },
        { key: 'totalContactsCreated', label: 'New Contacts' }
      ]
    },
    {
      title: 'Call Performance',
      data: metrics.calls,
      fields: [
        { key: 'totalCalls', label: 'Total Calls' },
        { key: 'avgCallTime', label: 'Avg Call Time' },
        { key: 'totalCallTime', label: 'Total Call Time' },
        { key: 'pickupRate', label: 'Pickup Rate' },
        { key: 'fiveMinReachedRate', label: '5+ Min Calls' }
      ]
    },
    {
      title: 'Conversion Metrics',
      data: metrics.conversion,
      fields: [
        { key: 'qualifiedRate', label: 'Qualified Rate' },
        { key: 'trialRate', label: 'Trial Rate' },
        { key: 'cancellationRate', label: 'Cancellation Rate' }
      ]
    },
    {
      title: 'Payment Metrics',
      data: metrics.payment,
      fields: [
        { key: 'upfrontCashCollected', label: 'Upfront Cash' },
        { key: 'avgInstallments', label: 'Avg Installments' }
      ]
    },
    {
      title: 'Followup Metrics',
      data: metrics.followup,
      fields: [
        { key: 'followupRate', label: 'Followup Rate' },
        { key: 'avgFollowups', label: 'Avg Followups' },
        { key: 'timeToFirstContact', label: 'Time to 1st Contact' }
      ]
    },
    {
      title: 'Offer Metrics',
      data: metrics.offers,
      fields: [
        { key: 'offersGivenRate', label: 'Offers Given' },
        { key: 'offerCloseRate', label: 'Offer Close Rate' }
      ]
    },
    {
      title: 'Time Metrics',
      data: metrics.time,
      fields: [
        { key: 'timeToSale', label: 'Time to Sale (days)' }
      ]
    }
  ];

  categories.forEach(category => {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${category.title}*`
      }
    });

    const metricsText = category.fields
      .map(field => {
        const value = category.data[field.key];
        const formatted = formatValue(value, field.key);
        return `*${field.label}:* ${formatted}`;
      })
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: metricsText
      }
    });

    blocks.push({
      type: 'divider'
    });
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Generated: ${new Date().toISOString().split('T')[0]} | Mudrek Dashboard`
      }
    ]
  });

  return blocks;
}

async function sendToSlack(blocks) {
  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack error: ${response.status}\n${text}`);
  }

  return response;
}

async function main() {
  console.log('=== Weekly Metrics Report to Slack ===\n');

  const argDate = parseArgs();
  const { start, end } = getWeekRange(argDate);

  console.log(`Report Period: ${start} to ${end}\n`);

  const metrics = await fetchAllMetrics(start, end);

  console.log('Building Slack message...');
  const blocks = buildSlackBlocks(metrics, start, end);

  console.log('Sending to Slack...');
  await sendToSlack(blocks);

  console.log('\n✅ Weekly report sent successfully to #test-logs!');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
