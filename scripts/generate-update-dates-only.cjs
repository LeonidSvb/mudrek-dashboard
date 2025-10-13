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
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

  const records = [];
  const seenEmails = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const email = cols[3]?.trim().replace(/"/g, '');

    if (!email || !isValidEmail(email)) continue;
    if (seenEmails.has(email)) continue;

    seenEmails.add(email);

    const firstPaymentDate = parseDate(cols[14]);
    const lastPaymentDate = parseDate(cols[15]);

    if (!firstPaymentDate && !lastPaymentDate) continue;

    records.push({ email, firstPaymentDate, lastPaymentDate });
  }

  console.log(`Valid records with dates: ${records.length}\n`);
  return records;
}

function generateSQL() {
  console.log('=== UPDATE ONLY DATES FROM CSV ===\n');

  const records = parseCSV(csvPath);

  if (records.length === 0) {
    console.error('No valid records with dates found!');
    process.exit(1);
  }

  let sql = `
-- =====================================================
-- Update ONLY dates from CSV
-- Does NOT touch: amount, upfront_payment, installments
-- =====================================================

CREATE TEMP TABLE csv_dates (
  email TEXT PRIMARY KEY,
  first_payment_date DATE,
  last_payment_date DATE
);

INSERT INTO csv_dates (email, first_payment_date, last_payment_date) VALUES\n`;

  const values = records.map(r => {
    const email = r.email.replace(/'/g, "''");
    const firstDate = r.firstPaymentDate ? `'${r.firstPaymentDate}'` : 'NULL';
    const lastDate = r.lastPaymentDate ? `'${r.lastPaymentDate}'` : 'NULL';
    return `('${email}', ${firstDate}, ${lastDate})`;
  }).join(',\n');

  sql += values + ';\n\n';

  sql += `
-- Update ONLY createdate and closedate
UPDATE hubspot_deals_raw d
SET
  createdate = COALESCE(c.first_payment_date::timestamp, d.createdate),
  closedate = COALESCE(c.last_payment_date::timestamp, d.closedate)
FROM csv_dates c
WHERE d.dealstage = 'closedwon'
  AND d.hubspot_id IN (
    SELECT con.hubspot_id FROM hubspot_contacts_raw con WHERE con.email = c.email
  );

-- Results
SELECT COUNT(*) as updated FROM hubspot_deals_raw d
WHERE d.dealstage = 'closedwon'
  AND EXISTS (
    SELECT 1 FROM csv_dates c
    JOIN hubspot_contacts_raw con ON con.email = c.email
    WHERE d.hubspot_id = con.hubspot_id
  );

-- Closedate range
SELECT
  MIN(closedate)::date as min_date,
  MAX(closedate)::date as max_date,
  COUNT(DISTINCT DATE(closedate)) as unique_dates
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- Refresh view
REFRESH MATERIALIZED VIEW daily_metrics_mv;

-- View stats
SELECT
  COUNT(DISTINCT metric_date) as unique_dates,
  MIN(metric_date) as min,
  MAX(metric_date) as max
FROM daily_metrics_mv;

DROP TABLE csv_dates;
`;

  const outputPath = 'migrations/UPDATE_DEALS_FROM_CSV.sql';
  fs.writeFileSync(outputPath, sql);

  console.log(`✓ SQL generated: ${outputPath}`);
  console.log(`✓ ${records.length} records with dates\n`);
}

generateSQL();
