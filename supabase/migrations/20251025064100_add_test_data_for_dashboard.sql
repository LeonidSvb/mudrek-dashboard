-- Migration: Add Comprehensive Test Data for Dashboard
-- Purpose: Test all metrics with realistic data
-- Period: October 2025
-- Covers: All metric categories (sales, calls, conversion, payments, offers, time)

-- ================================================================
-- CONTACTS (10 test contacts with different lifecycle stages)
-- ================================================================

INSERT INTO hubspot_contacts_raw (
  hubspot_id,
  email,
  phone,
  firstname,
  lastname,
  createdate,
  lifecyclestage,
  hubspot_owner_id,
  contact_stage,
  qualified,
  status,
  raw_json,
  sync_batch_id
) VALUES
-- Owner 1: TEST_MANAGER_1 (5 contacts)
('TEST_CONTACT_001', 'test1@example.com', '+972501234001', 'Test', 'Customer 1', '2025-10-01T08:00:00Z', 'customer', 'TEST_MANAGER_1', 'closed_won', 'true', 'active', '{"id": "TEST_CONTACT_001", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_002', 'test2@example.com', '+972501234002', 'Test', 'Customer 2', '2025-10-03T10:00:00Z', 'customer', 'TEST_MANAGER_1', 'closed_won', 'true', 'active', '{"id": "TEST_CONTACT_002", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_003', 'test3@example.com', '+972501234003', 'Test', 'Lead 1', '2025-10-05T12:00:00Z', 'lead', 'TEST_MANAGER_1', 'qualified', 'true', 'active', '{"id": "TEST_CONTACT_003", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_004', 'test4@example.com', '+972501234004', 'Test', 'Lead 2', '2025-10-07T14:00:00Z', 'lead', 'TEST_MANAGER_1', 'new', 'false', 'active', '{"id": "TEST_CONTACT_004", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_005', 'test5@example.com', '+972501234005', 'Test', 'Customer 3', '2025-10-09T16:00:00Z', 'customer', 'TEST_MANAGER_1', 'closed_won', 'true', 'active', '{"id": "TEST_CONTACT_005", "properties": {}}', 'test-batch-001'),

-- Owner 2: TEST_MANAGER_2 (5 contacts)
('TEST_CONTACT_006', 'test6@example.com', '+972501234006', 'Test', 'Customer 4', '2025-10-11T08:00:00Z', 'customer', 'TEST_MANAGER_2', 'closed_won', 'true', 'active', '{"id": "TEST_CONTACT_006", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_007', 'test7@example.com', '+972501234007', 'Test', 'Customer 5', '2025-10-13T10:00:00Z', 'customer', 'TEST_MANAGER_2', 'closed_won', 'true', 'active', '{"id": "TEST_CONTACT_007", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_008', 'test8@example.com', '+972501234008', 'Test', 'Lead 3', '2025-10-15T12:00:00Z', 'lead', 'TEST_MANAGER_2', 'trial', 'true', 'trial', '{"id": "TEST_CONTACT_008", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_009', 'test9@example.com', '+972501234009', 'Test', 'Customer 6', '2025-10-17T14:00:00Z', 'customer', 'TEST_MANAGER_2', 'closed_won', 'true', 'active', '{"id": "TEST_CONTACT_009", "properties": {}}', 'test-batch-001'),
('TEST_CONTACT_010', 'test10@example.com', '+972501234010', 'Test', 'Lead 4', '2025-10-19T16:00:00Z', 'lead', 'TEST_MANAGER_2', 'new', 'false', 'new', '{"id": "TEST_CONTACT_010", "properties": {}}', 'test-batch-001')

ON CONFLICT (hubspot_id) DO NOTHING;

-- ================================================================
-- DEALS (8 closedwon + 1 trial + 1 closedlost = 10 total)
-- ================================================================

INSERT INTO hubspot_deals_raw (
  hubspot_id,
  amount,
  dealstage,
  dealname,
  createdate,
  closedate,
  qualified_status,
  trial_status,
  payment_status,
  number_of_installments__months,
  cancellation_reason,
  is_refunded,
  installment_plan,
  upfront_payment,
  offer_given,
  offer_accepted,
  hubspot_owner_id,
  raw_json,
  sync_batch_id
) VALUES
-- Owner 1: TEST_MANAGER_1 (5 deals: 4 won + 1 lost)
('TEST_DEAL_001', 5000.00, 'closedwon', 'Test Deal 001 - Premium Package', '2025-10-01T08:00:00Z', '2025-10-05T10:00:00Z', 'qualified', 'active', 'paid', 12, NULL, false, 'monthly', 1000.00, true, true, 'TEST_MANAGER_1', '{"id": "TEST_DEAL_001", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_002', 3000.00, 'closedwon', 'Test Deal 002 - Standard Package', '2025-10-03T10:00:00Z', '2025-10-08T12:00:00Z', 'qualified', 'active', 'paid', 6, NULL, false, 'monthly', 500.00, true, true, 'TEST_MANAGER_1', '{"id": "TEST_DEAL_002", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_003', 8000.00, 'closedwon', 'Test Deal 003 - Enterprise', '2025-10-05T12:00:00Z', '2025-10-12T14:00:00Z', 'qualified', 'active', 'paid', 24, NULL, false, 'monthly', 2000.00, true, true, 'TEST_MANAGER_1', '{"id": "TEST_DEAL_003", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_004', 2000.00, 'closedwon', 'Test Deal 004 - Basic', '2025-10-07T14:00:00Z', '2025-10-15T16:00:00Z', 'qualified', 'active', 'paid', 3, NULL, false, 'monthly', 500.00, true, true, 'TEST_MANAGER_1', '{"id": "TEST_DEAL_004", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_005', 4500.00, 'closedlost', 'Test Deal 005 - Lost', '2025-10-09T16:00:00Z', '2025-10-18T18:00:00Z', 'qualified', 'cancelled', 'unpaid', NULL, 'price_too_high', false, NULL, NULL, true, false, 'TEST_MANAGER_1', '{"id": "TEST_DEAL_005", "properties": {}}', 'test-batch-001'),

-- Owner 2: TEST_MANAGER_2 (5 deals: 4 won + 1 trial)
('TEST_DEAL_006', 6000.00, 'closedwon', 'Test Deal 006 - Premium Plus', '2025-10-11T08:00:00Z', '2025-10-16T10:00:00Z', 'qualified', 'active', 'paid', 12, NULL, false, 'monthly', 1500.00, true, true, 'TEST_MANAGER_2', '{"id": "TEST_DEAL_006", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_007', 3500.00, 'closedwon', 'Test Deal 007 - Standard Plus', '2025-10-13T10:00:00Z', '2025-10-18T12:00:00Z', 'qualified', 'active', 'paid', 6, NULL, false, 'monthly', 700.00, true, true, 'TEST_MANAGER_2', '{"id": "TEST_DEAL_007", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_008', 2500.00, 'closedwon', 'Test Deal 008 - Fast Close', '2025-10-15T12:00:00Z', '2025-10-16T14:00:00Z', 'qualified', 'active', 'paid', 3, NULL, false, 'monthly', 800.00, false, false, 'TEST_MANAGER_2', '{"id": "TEST_DEAL_008", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_009', 7000.00, 'closedwon', 'Test Deal 009 - Big Win', '2025-10-17T14:00:00Z', '2025-10-22T16:00:00Z', 'qualified', 'active', 'paid', 12, NULL, false, 'monthly', 1500.00, true, true, 'TEST_MANAGER_2', '{"id": "TEST_DEAL_009", "properties": {}}', 'test-batch-001'),
('TEST_DEAL_010', 4000.00, 'qualifiedtobuy', 'Test Deal 010 - In Trial', '2025-10-19T16:00:00Z', NULL, 'qualified', 'trial', 'pending', 6, NULL, false, 'monthly', NULL, true, false, 'TEST_MANAGER_2', '{"id": "TEST_DEAL_010", "properties": {}}', 'test-batch-001')

ON CONFLICT (hubspot_id) DO NOTHING;

-- ================================================================
-- CALLS (30 calls - 3 per contact)
-- ================================================================

INSERT INTO hubspot_calls_raw (
  hubspot_id,
  call_duration,
  call_direction,
  call_to_number,
  call_from_number,
  call_timestamp,
  call_disposition,
  raw_json,
  sync_batch_id
) VALUES
-- Contact 1 calls (3 calls, progressing quality)
('TEST_CALL_001_1', 120, 'OUTBOUND', '+972501234001', '+972501111111', '2025-10-01T09:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_001_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_001_2', 300, 'OUTBOUND', '+972501234001', '+972501111111', '2025-10-02T10:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_001_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_001_3', 600, 'OUTBOUND', '+972501234001', '+972501111111', '2025-10-03T11:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_001_3", "properties": {}}', 'test-batch-001'),

-- Contact 2 calls
('TEST_CALL_002_1', 180, 'OUTBOUND', '+972501234002', '+972501111111', '2025-10-03T11:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_002_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_002_2', 420, 'OUTBOUND', '+972501234002', '+972501111111', '2025-10-04T12:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_002_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_002_3', 540, 'OUTBOUND', '+972501234002', '+972501111111', '2025-10-05T13:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_002_3", "properties": {}}', 'test-batch-001'),

-- Contact 3 calls
('TEST_CALL_003_1', 90, 'OUTBOUND', '+972501234003', '+972501111111', '2025-10-05T13:00:00Z', 'NO_ANSWER', '{"id": "TEST_CALL_003_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_003_2', 240, 'OUTBOUND', '+972501234003', '+972501111111', '2025-10-06T14:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_003_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_003_3', 360, 'OUTBOUND', '+972501234003', '+972501111111', '2025-10-07T15:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_003_3", "properties": {}}', 'test-batch-001'),

-- Contact 4 calls
('TEST_CALL_004_1', 60, 'OUTBOUND', '+972501234004', '+972501111111', '2025-10-07T15:00:00Z', 'NO_ANSWER', '{"id": "TEST_CALL_004_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_004_2', 150, 'OUTBOUND', '+972501234004', '+972501111111', '2025-10-08T16:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_004_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_004_3', 180, 'OUTBOUND', '+972501234004', '+972501111111', '2025-10-09T17:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_004_3", "properties": {}}', 'test-batch-001'),

-- Contact 5 calls
('TEST_CALL_005_1', 240, 'OUTBOUND', '+972501234005', '+972501111111', '2025-10-09T17:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_005_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_005_2', 480, 'OUTBOUND', '+972501234005', '+972501111111', '2025-10-10T18:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_005_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_005_3', 720, 'OUTBOUND', '+972501234005', '+972501111111', '2025-10-11T19:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_005_3", "properties": {}}', 'test-batch-001'),

-- Contact 6 calls
('TEST_CALL_006_1', 180, 'OUTBOUND', '+972501234006', '+972501111111', '2025-10-11T09:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_006_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_006_2', 360, 'OUTBOUND', '+972501234006', '+972501111111', '2025-10-12T10:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_006_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_006_3', 540, 'OUTBOUND', '+972501234006', '+972501111111', '2025-10-13T11:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_006_3", "properties": {}}', 'test-batch-001'),

-- Contact 7 calls
('TEST_CALL_007_1', 120, 'OUTBOUND', '+972501234007', '+972501111111', '2025-10-13T11:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_007_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_007_2', 300, 'OUTBOUND', '+972501234007', '+972501111111', '2025-10-14T12:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_007_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_007_3', 600, 'OUTBOUND', '+972501234007', '+972501111111', '2025-10-15T13:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_007_3", "properties": {}}', 'test-batch-001'),

-- Contact 8 calls
('TEST_CALL_008_1', 90, 'OUTBOUND', '+972501234008', '+972501111111', '2025-10-15T13:00:00Z', 'NO_ANSWER', '{"id": "TEST_CALL_008_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_008_2', 180, 'OUTBOUND', '+972501234008', '+972501111111', '2025-10-16T14:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_008_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_008_3', 300, 'OUTBOUND', '+972501234008', '+972501111111', '2025-10-17T15:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_008_3", "properties": {}}', 'test-batch-001'),

-- Contact 9 calls
('TEST_CALL_009_1', 180, 'OUTBOUND', '+972501234009', '+972501111111', '2025-10-17T15:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_009_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_009_2', 420, 'OUTBOUND', '+972501234009', '+972501111111', '2025-10-18T16:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_009_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_009_3', 660, 'OUTBOUND', '+972501234009', '+972501111111', '2025-10-19T17:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_009_3", "properties": {}}', 'test-batch-001'),

-- Contact 10 calls
('TEST_CALL_010_1', 60, 'OUTBOUND', '+972501234010', '+972501111111', '2025-10-19T17:00:00Z', 'NO_ANSWER', '{"id": "TEST_CALL_010_1", "properties": {}}', 'test-batch-001'),
('TEST_CALL_010_2', 120, 'OUTBOUND', '+972501234010', '+972501111111', '2025-10-20T18:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_010_2", "properties": {}}', 'test-batch-001'),
('TEST_CALL_010_3', 240, 'OUTBOUND', '+972501234010', '+972501111111', '2025-10-21T19:00:00Z', 'ANSWERED', '{"id": "TEST_CALL_010_3", "properties": {}}', 'test-batch-001')

ON CONFLICT (hubspot_id) DO NOTHING;

-- ================================================================
-- SUMMARY
-- ================================================================
-- Contacts: 10 (6 customers + 4 leads)
-- Deals: 10 (8 closedwon + 1 closedlost + 1 trial)
-- Calls: 30 (20 answered + 10 no answer)
-- Owners: 2 (TEST_MANAGER_1, TEST_MANAGER_2)
--
-- Expected Metrics (Oct 1-25, 2025):
-- - Total Sales: $41,500 (8 closedwon deals)
-- - Total Deals: 8
-- - Avg Deal Size: $5,187.50
-- - Conversion Rate: 60% (6 customers / 10 contacts)
-- - Avg Installments: 9.75 months
-- - Upfront Cash: $8,500
-- - Total Calls: 30
-- - Pickup Rate: 66.67% (20/30)
-- - Qualified Rate: 80% (8/10 contacts qualified)
-- - Cancellation Rate: 11.11% (1/9 total closed deals)
-- - Offers Given Rate: 80% (8/10 deals)
-- - Offer Close Rate: 87.5% (7/8 offers closed)
