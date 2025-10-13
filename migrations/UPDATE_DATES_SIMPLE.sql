-- =====================================================
-- Update closedate from CSV (SIMPLE VERSION)
-- Just update deals where we can match by email
-- =====================================================

-- Check structure first
SELECT 'Deals columns with email/contact' as check_step;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'hubspot_deals_raw'
AND (column_name LIKE '%email%' OR column_name LIKE '%contact%')
LIMIT 10;

-- Sample deal to see structure
SELECT 'Sample deal' as check_step;
SELECT hubspot_id, dealstage, closedate, email FROM hubspot_deals_raw
WHERE dealstage = 'closedwon' LIMIT 1;

-- Sample contact
SELECT 'Sample contact' as check_step;
SELECT hubspot_id, email FROM hubspot_contacts_raw LIMIT 1;

-- Now let's try to update by email if deals have email column
-- If this fails, we know deals don't have email column

CREATE TEMP TABLE csv_dates (
  email TEXT,
  last_payment_date DATE
);

INSERT INTO csv_dates (email, last_payment_date) VALUES
('Waelmak2@gmail.com', '2023-06-20'),
('helana.fee48@icloud.com', '2023-06-20'),
('samarqawasmi2019@gmail.com', '2023-06-20'),
('julaniebrahim@gmail.com', '2023-04-01'),
('b.haj873@gmail.com', '2023-04-26'),
('agd.aldulaimi@gmail.com', '2023-09-28'),
('alyan.dalia99@gmail.com', '2023-05-04'),
('nadia.reshiq@mail.huji.ac.il', '2023-05-06'),
('Manar@m-tawfik.com', '2023-09-07'),
('nouraldeanj@gmail.com', '2023-10-10');

-- Try direct email match in deals table
UPDATE hubspot_deals_raw d
SET closedate = c.last_payment_date::timestamp
FROM csv_dates c
WHERE d.email = c.email
  AND d.dealstage = 'closedwon';

SELECT 'Updated via direct email match' as result, COUNT(*) as count
FROM hubspot_deals_raw d
JOIN csv_dates c ON d.email = c.email
WHERE d.dealstage = 'closedwon';

DROP TABLE csv_dates;
