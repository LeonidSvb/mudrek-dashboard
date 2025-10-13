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

  // Skip if contains non-ASCII characters
  if (!/^[\x00-\x7F]*$/.test(cleaned)) return null;

  // Skip if contains quotes or special characters
  if (cleaned.includes('"') || cleaned.includes('Click')) return null;

  // Must contain exactly 2 slashes for DD/MM/YYYY format
  const slashCount = (cleaned.match(/\//g) || []).length;
  if (slashCount !== 2) return null;

  const parts = cleaned.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  // Validate all parts are numbers
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (monthNum < 1 || monthNum > 12) return null;
  if (yearNum < 2000 || yearNum > 2030) return null;

  const fullYear = year.length === 2 ? `20${year}` : year;

  // Validate final date string
  const dateStr2 = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  // Check if valid date
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
  const errors = {
    invalidEmail: 0,
    noEmail: 0,
    duplicateEmail: 0,
    invalidNumbers: 0,
    total: 0
  };

  const seenEmails = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);

    // Validate email (column 3)
    const email = cols[3]?.trim().replace(/"/g, '');

    if (!email) {
      errors.noEmail++;
      errors.total++;
      continue;
    }

    if (!isValidEmail(email)) {
      errors.invalidEmail++;
      errors.total++;
      console.log(`Line ${i}: Invalid email: "${email}"`);
      continue;
    }

    // Check for duplicates
    if (seenEmails.has(email)) {
      errors.duplicateEmail++;
      errors.total++;
      console.log(`Line ${i}: Duplicate email: ${email}`);
      continue;
    }

    seenEmails.add(email);

    // Parse numbers
    const dealAmount = parseNumber(cols[9]);
    const upfrontPayment = parseNumber(cols[10]);
    const installments = parseInteger(cols[11]);

    // Parse dates
    const firstPaymentDate = parseDate(cols[14]);
    const lastPaymentDate = parseDate(cols[15]);

    // Validate at least some data is present
    if (!dealAmount && !upfrontPayment && !installments && !firstPaymentDate && !lastPaymentDate) {
      errors.invalidNumbers++;
      errors.total++;
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

  console.log('=== PARSING ERRORS ===');
  console.log(`No email: ${errors.noEmail}`);
  console.log(`Invalid email: ${errors.invalidEmail}`);
  console.log(`Duplicate email: ${errors.duplicateEmail}`);
  console.log(`No valid data: ${errors.invalidNumbers}`);
  console.log(`Total errors: ${errors.total}`);
  console.log(`Valid records: ${records.length}\n`);

  return records;
}

function generateSQL() {
  console.log('=== GENERATING ROBUST SQL ===\n');

  const records = parseCSV(csvPath);

  if (records.length === 0) {
    console.error('No valid records found!');
    process.exit(1);
  }

  // Statistics
  const stats = {
    withDates: records.filter(r => r.firstPaymentDate || r.lastPaymentDate).length,
    withAmount: records.filter(r => r.dealAmount).length,
    withUpfront: records.filter(r => r.upfrontPayment).length,
    withInstallments: records.filter(r => r.installments).length
  };

  console.log('=== DATA STATISTICS ===');
  console.log(`Records with dates: ${stats.withDates}`);
  console.log(`Records with deal amount: ${stats.withAmount}`);
  console.log(`Records with upfront payment: ${stats.withUpfront}`);
  console.log(`Records with installments: ${stats.withInstallments}\n`);

  let sql = `
-- =====================================================
-- Update deals from CSV data (ROBUST VERSION)
-- =====================================================
-- Generated from ${records.length} valid CSV records
-- ${stats.withDates} records have dates
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
-- Show what we're about to update
SELECT
  'CSV records loaded' as step,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE first_payment_date IS NOT NULL OR last_payment_date IS NOT NULL) as with_dates,
  COUNT(*) FILTER (WHERE deal_amount IS NOT NULL) as with_amounts
FROM csv_updates;

-- Update deals from CSV data
UPDATE hubspot_deals_raw d
SET
  amount = COALESCE(c.deal_amount, d.amount),
  upfront_payment = COALESCE(c.upfront_payment, d.upfront_payment),
  number_of_installments__months = COALESCE(c.installments, d.number_of_installments__months),
  createdate = COALESCE(c.first_payment_date::timestamp, d.createdate),
  closedate = COALESCE(c.last_payment_date::timestamp, d.closedate)
FROM csv_updates c
JOIN hubspot_contacts_raw con ON con.email = c.email
WHERE d.associated_contact_id = con.hubspot_id
  AND d.dealstage = 'closedwon';

-- Show update results
SELECT 'Deals updated' as step, COUNT(*) as count FROM hubspot_deals_raw d
JOIN hubspot_contacts_raw con ON d.associated_contact_id = con.hubspot_id
JOIN csv_updates c ON c.email = con.email
WHERE d.dealstage = 'closedwon';

-- Show closedate range after update
SELECT
  'Closedate range' as step,
  MIN(closedate)::date as min_closedate,
  MAX(closedate)::date as max_closedate,
  COUNT(DISTINCT DATE(closedate)) as unique_dates
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW daily_metrics_mv;

-- Show view stats after refresh
SELECT
  'Materialized view' as step,
  COUNT(DISTINCT metric_date) as unique_dates,
  MIN(metric_date) as min_date,
  MAX(metric_date) as max_date,
  SUM(daily_sales)::bigint as total_sales,
  SUM(daily_deals_won) as total_deals
FROM daily_metrics_mv;

-- Sample data from view
SELECT * FROM daily_metrics_mv
ORDER BY metric_date DESC
LIMIT 10;

-- Cleanup
DROP TABLE csv_updates;

-- Final message
SELECT '✓ SUCCESS! Dashboard ready. Press F5 to refresh.' as result;
`;

  const outputPath = 'migrations/UPDATE_DEALS_FROM_CSV.sql';
  fs.writeFileSync(outputPath, sql);

  console.log(`✓ SQL generated: ${outputPath}`);
  console.log(`✓ ${records.length} valid records will be processed`);
  console.log('\n🚀 Run this SQL in Supabase SQL Editor!\n');
}

generateSQL();
