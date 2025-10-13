const fs = require('fs');

const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr.trim() === '') return null;

  const cleaned = dateStr.trim();

  if (!/^[\x00-\x7F]*$/.test(cleaned)) return null;
  if (cleaned.includes('"') || cleaned.includes('Click')) return null;

  const slashCount = (cleaned.match(/\//g) || []).length;
  if (slashCount !== 2) return null;

  const parts = cleaned.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (monthNum < 1 || monthNum > 12) return null;
  if (yearNum < 2000 || yearNum > 2030) return null;

  const fullYear = year.length === 2 ? `20${year}` : year;
  const dateStr2 = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const testDate = new Date(dateStr2);
  if (isNaN(testDate.getTime())) return null;

  return dateStr2;
}

function parseNumber(str) {
  if (!str || str.trim() === '' || str === 'N/A') return null;
  const num = parseFloat(str.trim());
  return isNaN(num) ? null : num;
}

function parseInteger(str) {
  if (!str || str.trim() === '' || str === 'N/A') return null;
  const num = parseInt(str.trim());
  return isNaN(num) ? null : num;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log(`Total lines in CSV: ${lines.length}\n`);

  const records = [];
  const seenEmails = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);

    const email = cols[3]?.trim().replace(/"/g, '');

    if (!email || !isValidEmail(email)) continue;
    if (seenEmails.has(email)) continue;

    seenEmails.add(email);

    const dealAmount = parseNumber(cols[9]);
    const upfrontPayment = parseNumber(cols[10]);
    const installments = parseInteger(cols[11]);
    const firstPaymentDate = parseDate(cols[14]);
    const lastPaymentDate = parseDate(cols[15]);

    if (!dealAmount && !upfrontPayment && !installments && !firstPaymentDate && !lastPaymentDate) {
      continue;
    }

    records.push({
      email,
      dealAmount,
      upfrontPayment,
      installments,
      firstPaymentDate,
      lastPaymentDate
    });
  }

  console.log(`Valid records: ${records.length}\n`);
  return records;
}

function generateSQL() {
  console.log('=== GENERATING SQL (UPDATE BY EMAIL) ===\n');

  const records = parseCSV(csvPath);

  if (records.length === 0) {
    console.error('No valid records found!');
    process.exit(1);
  }

  let sql = `
-- =====================================================
-- Update deals from CSV data
-- Uses EMAIL to match records
-- =====================================================

CREATE TEMP TABLE csv_updates (
  email TEXT PRIMARY KEY,
  deal_amount NUMERIC,
  upfront_payment NUMERIC,
  installments INTEGER,
  first_payment_date DATE,
  last_payment_date DATE
);

INSERT INTO csv_updates (email, deal_amount, upfront_payment, installments, first_payment_date, last_payment_date) VALUES\n`;

  const values = records.map(r => {
    const email = r.email.replace(/'/g, "''");
    const amount = r.dealAmount !== null ? r.dealAmount : 'NULL';
    const upfront = r.upfrontPayment !== null ? r.upfrontPayment : 'NULL';
    const inst = r.installments !== null ? r.installments : 'NULL';
    const firstDate = r.firstPaymentDate ? `'${r.firstPaymentDate}'` : 'NULL';
    const lastDate = r.lastPaymentDate ? `'${r.lastPaymentDate}'` : 'NULL';

    return `('${email}', ${amount}, ${upfront}, ${inst}, ${firstDate}, ${lastDate})`;
  }).join(',\n');

  sql += values + ';\n\n';

  sql += `
-- Update deals by matching contact email
UPDATE hubspot_deals_raw d
SET
  amount = COALESCE(c.deal_amount, d.amount),
  upfront_payment = COALESCE(c.upfront_payment, d.upfront_payment),
  number_of_installments__months = COALESCE(c.installments, d.number_of_installments__months),
  createdate = COALESCE(c.first_payment_date::timestamp, d.createdate),
  closedate = COALESCE(c.last_payment_date::timestamp, d.closedate)
FROM csv_updates c
WHERE d.dealstage = 'closedwon'
  AND EXISTS (
    SELECT 1 FROM hubspot_contacts_raw con
    WHERE con.email = c.email
      AND con.hubspot_id = d.hubspot_id
  );

-- Show results
SELECT COUNT(*) as updated_deals_count FROM hubspot_deals_raw d
WHERE d.dealstage = 'closedwon'
  AND EXISTS (
    SELECT 1 FROM csv_updates c
    JOIN hubspot_contacts_raw con ON con.email = c.email
    WHERE con.hubspot_id = d.hubspot_id
  );

-- Show closedate range
SELECT
  MIN(closedate)::date as min_closedate,
  MAX(closedate)::date as max_closedate,
  COUNT(DISTINCT DATE(closedate)) as unique_dates
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW daily_metrics_mv;

-- Show view stats
SELECT
  COUNT(DISTINCT metric_date) as unique_dates,
  MIN(metric_date) as min_date,
  MAX(metric_date) as max_date
FROM daily_metrics_mv;

DROP TABLE csv_updates;

SELECT '✓ SUCCESS!' as result;
`;

  const outputPath = 'migrations/UPDATE_DEALS_FROM_CSV.sql';
  fs.writeFileSync(outputPath, sql);

  console.log(`✓ SQL generated: ${outputPath}`);
  console.log(`✓ ${records.length} records\n`);
}

generateSQL();
