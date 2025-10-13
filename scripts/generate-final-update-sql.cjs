const fs = require('fs');

const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';

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

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
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

    const lastPaymentDate = parseDate(cols[15]);
    if (!lastPaymentDate) continue;

    records.push({ email: email.replace(/'/g, "''"), closedate: lastPaymentDate });
  }

  console.log(`Valid records with dates: ${records.length}\n`);
  return records;
}

function generateSQL() {
  console.log('=== GENERATING FULL UPDATE SQL ===\n');

  const records = parseCSV(csvPath);

  if (records.length === 0) {
    console.error('No valid records!');
    process.exit(1);
  }

  let sql = `-- Update closedate from CSV (${records.length} records)
-- Links: CSV email -> contact hubspot_id -> deal associations

CREATE TEMP TABLE csv_dates (
  email TEXT PRIMARY KEY,
  closedate DATE
);

INSERT INTO csv_dates (email, closedate) VALUES\n`;

  const values = records.map(r => `('${r.email}', '${r.closedate}')`).join(',\n');
  sql += values + ';\n\n';

  sql += `-- Update deals closedate via contact association
UPDATE hubspot_deals_raw d
SET closedate = csv.closedate::timestamp
FROM csv_dates csv
JOIN hubspot_contacts_raw con ON con.email = csv.email
WHERE d.dealstage = 'closedwon'
  AND (d.raw_json->'associations'->'contacts'->'results'->0->>'id') = con.hubspot_id;

-- Results
SELECT COUNT(*) as updated_deals FROM hubspot_deals_raw d
WHERE d.dealstage = 'closedwon'
  AND EXISTS (
    SELECT 1 FROM csv_dates csv
    JOIN hubspot_contacts_raw con ON con.email = csv.email
    WHERE (d.raw_json->'associations'->'contacts'->'results'->0->>'id') = con.hubspot_id
  );

-- Closedate range after update
SELECT
  MIN(closedate)::date as min_closedate,
  MAX(closedate)::date as max_closedate,
  COUNT(DISTINCT DATE(closedate)) as unique_dates
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW daily_metrics_mv;

-- View stats after refresh
SELECT
  COUNT(DISTINCT metric_date) as unique_dates,
  MIN(metric_date) as min_date,
  MAX(metric_date) as max_date,
  SUM(daily_sales)::bigint as total_sales
FROM daily_metrics_mv;

DROP TABLE csv_dates;

SELECT 'SUCCESS! Dashboard ready.' as result;
`;

  fs.writeFileSync('UPDATE_CLOSEDATE_FULL.sql', sql);
  console.log(`✓ Generated: UPDATE_CLOSEDATE_FULL.sql`);
  console.log(`✓ ${records.length} records\n`);
  console.log('Run this in Supabase SQL Editor!\n');
}

generateSQL();
