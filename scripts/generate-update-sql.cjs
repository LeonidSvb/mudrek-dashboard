const fs = require('fs');

const csvPath = 'C:\\Users\\79818\\Downloads\\Mudrek - Sales Summary - Customers (4).csv';

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A') return null;

  // Skip if contains non-ASCII characters (Arabic text, etc.)
  if (!/^[\x00-\x7F]*$/.test(dateStr)) return null;

  // Skip if contains quotes or special characters
  if (dateStr.includes('"') || dateStr.includes('و') || dateStr.includes('سيتم')) return null;

  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) return null;

  // Validate numbers
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (monthNum < 1 || monthNum > 12) return null;

  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');

    const email = cols[3]?.trim().replace(/'/g, "''");
    const dealAmount = parseFloat(cols[9]?.trim()) || null;
    const upfrontPayment = parseFloat(cols[10]?.trim()) || null;
    const installments = parseInt(cols[11]?.trim()) || null;
    const firstPaymentDate = parseDate(cols[14]?.trim());
    const lastPaymentDate = parseDate(cols[15]?.trim());

    if (!email) continue;

    records.push({
      email,
      dealAmount,
      upfrontPayment,
      installments,
      firstPaymentDate,
      lastPaymentDate
    });
  }

  return records;
}

function generateSQL() {
  console.log('=== GENERATING SQL ===\n');

  const records = parseCSV(csvPath);
  console.log(`Loaded ${records.length} records from CSV\n`);

  let sql = `
-- =====================================================
-- Update deals from CSV data
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
    return `('${r.email}', ${r.dealAmount || 'NULL'}, ${r.upfrontPayment || 'NULL'}, ${r.installments || 'NULL'}, ${r.firstPaymentDate ? `'${r.firstPaymentDate}'` : 'NULL'}, ${r.lastPaymentDate ? `'${r.lastPaymentDate}'` : 'NULL'})`;
  }).join(',\n');

  sql += values + ';\n\n';

  sql += `
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

-- Show results
SELECT COUNT(*) as updated_deals FROM hubspot_deals_raw d
JOIN hubspot_contacts_raw con ON d.associated_contact_id = con.hubspot_id
JOIN csv_updates c ON c.email = con.email
WHERE d.dealstage = 'closedwon';

-- Show closedate range
SELECT
  MIN(closedate) as min_closedate,
  MAX(closedate) as max_closedate,
  COUNT(DISTINCT DATE(closedate)) as unique_dates
FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' AND closedate IS NOT NULL;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW daily_metrics_mv;

-- Show view stats
SELECT COUNT(DISTINCT metric_date) as unique_dates,
       MIN(metric_date) as min_date,
       MAX(metric_date) as max_date
FROM daily_metrics_mv;

DROP TABLE csv_updates;
`;

  const outputPath = 'migrations/UPDATE_DEALS_FROM_CSV.sql';
  fs.writeFileSync(outputPath, sql);

  console.log(`✓ SQL generated: ${outputPath}`);
  console.log(`✓ ${records.length} records will be updated`);
  console.log('\nNow run this SQL in Supabase SQL Editor:\n');
  console.log(`migrations/UPDATE_DEALS_FROM_CSV.sql\n`);
}

generateSQL();
