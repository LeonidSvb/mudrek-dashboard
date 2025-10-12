/**
 * АНАЛИЗ: Какие колонки нужны для 22 метрик
 *
 * Задача: Определить минимальный набор колонок для дашборда
 */

const METRICS_REQUIREMENTS = {
  // ═══════════════════════════════════════════════
  // SALES METRICS (4)
  // ═══════════════════════════════════════════════
  'Total Sales': {
    tables: ['deals'],
    columns: ['amount', 'dealstage', 'closedate', 'hubspot_owner_id'],
    filters: ['owner', 'date']
  },
  'Average Deal Size': {
    tables: ['deals'],
    columns: ['amount', 'dealstage'],
    filters: ['owner', 'date']
  },
  'Total Deals': {
    tables: ['deals'],
    columns: ['dealstage', 'closedate'],
    filters: ['owner', 'date']
  },
  'Conversion Rate': {
    tables: ['contacts', 'deals'],
    columns: {
      contacts: ['hubspot_id', 'hubspot_owner_id'],
      deals: ['dealstage', 'hubspot_owner_id']
    },
    filters: ['owner', 'date']
  },

  // ═══════════════════════════════════════════════
  // CALL METRICS (4)
  // ═══════════════════════════════════════════════
  'Total Calls': {
    tables: ['calls'],
    columns: ['call_timestamp'],
    filters: ['date', 'owner'] // через phone matching
  },
  'Average Call Time': {
    tables: ['calls'],
    columns: ['call_duration', 'call_timestamp'],
    filters: ['date']
  },
  'Total Call Time': {
    tables: ['calls'],
    columns: ['call_duration', 'call_timestamp'],
    filters: ['date']
  },
  '5min Reached Rate': {
    tables: ['calls'],
    columns: ['call_duration', 'call_timestamp'],
    filters: ['date']
  },

  // ═══════════════════════════════════════════════
  // CONVERSION METRICS (3)
  // ═══════════════════════════════════════════════
  'Qualified Rate': {
    tables: ['deals'],
    columns: ['qualified_status', 'hubspot_owner_id'],
    filters: ['owner'],
    status: 'MISSING DATA (0%)'
  },
  'Trial Rate': {
    tables: ['deals'],
    columns: ['trial_status', 'hubspot_owner_id'],
    filters: ['owner'],
    status: 'MISSING DATA (0%)'
  },
  'Cancellation Rate': {
    tables: ['deals'],
    columns: ['dealstage', 'hubspot_owner_id'],
    filters: ['owner']
  },

  // ═══════════════════════════════════════════════
  // PAYMENT METRICS (2)
  // ═══════════════════════════════════════════════
  'Upfront Cash Collected': {
    tables: ['deals'],
    columns: ['upfront_payment', 'dealstage', 'closedate'],
    filters: ['owner', 'date'],
    status: 'MISSING DATA (0%)'
  },
  'Average Installments': {
    tables: ['deals'],
    columns: ['number_of_installments__months', 'dealstage'],
    filters: ['owner', 'date'],
    status: 'MISSING DATA (0%)'
  },

  // ═══════════════════════════════════════════════
  // FOLLOWUP METRICS (3) - через phone matching VIEW
  // ═══════════════════════════════════════════════
  'Followup Rate': {
    tables: ['contacts', 'calls'],
    columns: {
      contacts: ['hubspot_id', 'phone', 'hubspot_owner_id'],
      calls: ['call_to_number', 'call_timestamp']
    },
    filters: ['owner'],
    via: 'contact_call_stats VIEW'
  },
  'Avg Followups': {
    tables: ['contacts', 'calls'],
    columns: {
      contacts: ['hubspot_id', 'phone'],
      calls: ['call_to_number', 'call_timestamp']
    },
    filters: ['owner'],
    via: 'contact_call_stats VIEW'
  },
  'Time to First Contact': {
    tables: ['contacts', 'calls'],
    columns: {
      contacts: ['hubspot_id', 'phone', 'createdate'],
      calls: ['call_to_number', 'call_timestamp']
    },
    filters: ['owner'],
    via: 'contact_call_stats VIEW'
  },

  // ═══════════════════════════════════════════════
  // OFFER METRICS (2)
  // ═══════════════════════════════════════════════
  'Offers Given Rate': {
    tables: ['deals'],
    columns: ['offer_given', 'hubspot_owner_id'],
    filters: ['owner']
  },
  'Offer → Close Rate': {
    tables: ['deals'],
    columns: ['offer_given', 'offer_accepted', 'dealstage'],
    filters: ['owner']
  },

  // ═══════════════════════════════════════════════
  // TIME METRICS (1)
  // ═══════════════════════════════════════════════
  'Time to Sale': {
    tables: ['deals'],
    columns: ['createdate', 'closedate', 'dealstage'],
    filters: ['owner', 'date']
  },

  // ═══════════════════════════════════════════════
  // A/B TESTING METRICS (2)
  // ═══════════════════════════════════════════════
  'Sales Script Performance': {
    tables: ['contacts'],
    columns: ['sales_script_version', 'lifecyclestage'],
    filters: [],
    status: 'MISSING DATA (0%)'
  },
  'VSL Watch Impact': {
    tables: ['contacts'],
    columns: ['vsl_watched', 'lifecyclestage'],
    filters: []
  }
};

// ═══════════════════════════════════════════════
// АНАЛИЗ: Какие колонки обязательны?
// ═══════════════════════════════════════════════

function analyzeRequiredColumns() {
  console.log('🎯 АНАЛИЗ ТРЕБОВАНИЙ К КОЛОНКАМ\n');
  console.log('═══════════════════════════════════════════════\n');

  const requiredColumns = {
    contacts: new Set(),
    deals: new Set(),
    calls: new Set()
  };

  // Собираем все используемые колонки
  Object.entries(METRICS_REQUIREMENTS).forEach(([metric, req]) => {
    if (Array.isArray(req.columns)) {
      req.tables.forEach(table => {
        req.columns.forEach(col => {
          requiredColumns[table]?.add(col);
        });
      });
    } else if (typeof req.columns === 'object') {
      Object.entries(req.columns).forEach(([table, cols]) => {
        cols.forEach(col => {
          requiredColumns[table]?.add(col);
        });
      });
    }
  });

  // Выводим результаты
  console.log('📊 CONTACTS - Обязательные колонки:\n');
  const contactCols = Array.from(requiredColumns.contacts).sort();
  contactCols.forEach(col => {
    console.log(`  ✓ ${col}`);
  });

  console.log('\n💼 DEALS - Обязательные колонки:\n');
  const dealCols = Array.from(requiredColumns.deals).sort();
  dealCols.forEach(col => {
    console.log(`  ✓ ${col}`);
  });

  console.log('\n📞 CALLS - Обязательные колонки:\n');
  const callCols = Array.from(requiredColumns.calls).sort();
  callCols.forEach(col => {
    console.log(`  ✓ ${col}`);
  });

  console.log('\n═══════════════════════════════════════════════');
  console.log('📋 ТЕКУЩЕЕ СОСТОЯНИЕ VS ТРЕБОВАНИЯ\n');

  // Текущие колонки
  const currentColumns = {
    contacts: [
      'hubspot_id', 'email', 'phone', 'firstname', 'lastname',
      'createdate', 'lifecyclestage', 'hubspot_owner_id',
      'sales_script_version', 'vsl_watched', 'vsl_watch_duration'
    ],
    deals: [
      'hubspot_id', 'amount', 'dealstage', 'dealname', 'pipeline',
      'createdate', 'closedate', 'hubspot_owner_id', 'qualified_status',
      'trial_status', 'payment_status', 'number_of_installments__months',
      'cancellation_reason', 'is_refunded', 'installment_plan',
      'upfront_payment', 'offer_given', 'offer_accepted'
    ],
    calls: [
      'hubspot_id', 'call_duration', 'call_direction', 'call_to_number',
      'call_from_number', 'call_timestamp', 'call_disposition'
    ]
  };

  const currentStats = {
    contacts: {
      email: 0,
      phone: 100,
      firstname: 51,
      lastname: 0,
      createdate: 100,
      lifecyclestage: 100,
      hubspot_owner_id: 22,
      sales_script_version: 0,
      vsl_watched: 100,
      vsl_watch_duration: 0
    },
    deals: {
      amount: 100,
      dealstage: 100,
      dealname: 100,
      pipeline: 100,
      createdate: 100,
      closedate: 100,
      hubspot_owner_id: 100,
      qualified_status: 0,
      trial_status: 0,
      payment_status: 0,
      number_of_installments__months: 0,
      cancellation_reason: 0,
      is_refunded: 100,
      installment_plan: 0,
      upfront_payment: 0,
      offer_given: 100,
      offer_accepted: 100
    },
    calls: {
      call_duration: 99,
      call_direction: 100,
      call_to_number: 99,
      call_from_number: 99,
      call_timestamp: 100,
      call_disposition: 100
    }
  };

  ['contacts', 'deals', 'calls'].forEach(table => {
    console.log(`\n${table.toUpperCase()}:\n`);

    currentColumns[table].forEach(col => {
      if (col === 'hubspot_id') return; // всегда нужен

      const required = requiredColumns[table].has(col);
      const percent = currentStats[table][col] || 100;

      let status = '';
      if (!required && percent === 0) status = '🗑️ УДАЛИТЬ (не нужен, 0% данных)';
      else if (!required && percent < 50) status = '⚠️ УДАЛИТЬ? (не нужен, мало данных)';
      else if (!required) status = '❓ НЕ НУЖЕН (но есть данные)';
      else if (required && percent === 0) status = '❌ НУЖЕН! (но 0% данных)';
      else if (required && percent < 50) status = '⚠️ НУЖЕН (мало данных)';
      else status = '✅ НУЖЕН И ЗАПОЛНЕН';

      console.log(`  ${col}: ${status}`);
    });
  });

  console.log('\n═══════════════════════════════════════════════');
  console.log('📝 РЕКОМЕНДАЦИИ:\n');

  console.log('CONTACTS:');
  console.log('  🗑️ Удалить: lastname (0% данных, не используется)');
  console.log('  🗑️ Удалить: vsl_watch_duration (0% данных, не используется)');
  console.log('  ❓ Оставить?: firstname (51% данных, для UI)');
  console.log('  ❓ Оставить?: sales_script_version (0% сейчас, но нужен для A/B)');
  console.log('  ✓ Извлечь: email из raw_json (hs_full_name_or_email)');
  console.log('');

  console.log('DEALS:');
  console.log('  🗑️ Удалить: dealname (не используется)');
  console.log('  🗑️ Удалить: pipeline (не используется)');
  console.log('  🗑️ Удалить: payment_status (0% данных, не используется)');
  console.log('  🗑️ Удалить: cancellation_reason (0% данных, только для анализа)');
  console.log('  🗑️ Удалить: is_refunded (не используется)');
  console.log('  🗑️ Удалить: installment_plan (0% данных, не используется)');
  console.log('  ❌ Нужны (0% данных): qualified_status, trial_status, upfront_payment, number_of_installments__months');
  console.log('');

  console.log('CALLS:');
  console.log('  🗑️ Удалить?: call_direction (не используется)');
  console.log('  🗑️ Удалить?: call_from_number (не используется)');
  console.log('  ❓ Оставить?: call_disposition (может для pickup rate?)');
  console.log('');

  console.log('═══════════════════════════════════════════════');
}

analyzeRequiredColumns();
