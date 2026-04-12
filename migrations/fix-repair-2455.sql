-- Fix historical repair data for นข 2455 พย (TOYOTA Commuter KDH222R-LEMDYT)
-- Verified against 20 T-Connect invoice images from Toyota Phayao (1994)
-- Vehicle: d5685d4b-914f-4140-8de6-6050a514ae9b
-- Car delivered: 26/10/2011 (reg 13110)

PRAGMA foreign_keys = OFF;

-- ============================================================
-- 1. FIX rep-2455-001 (10K service)
-- Invoice: TAX12-00535 / GSJ12-00488
-- Was: 2011-04-19, 9219 km (WRONG - before car delivery!)
-- Real: 2012-01-19, 6222 km
-- ============================================================
UPDATE repair_log SET
  date_reported = '2012-01-19',
  date_completed = '2012-01-19',
  mileage_at_repair = 6222,
  mileage_out = 6222,
  parts_cost = 1198.00,
  discount_amount = 21.30,
  vat_amount = 82.37,
  grand_total = 1259.07,
  invoice_number = 'GSJ12-00488',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-001';

-- ============================================================
-- 2. FIX rep-2455-002 (20K service)
-- Invoice: TAX12-04080 / GSJ12-04208
-- Was: 2011-07-15, 19436 km
-- Real: 2012-05-16, 24530 km
-- ============================================================
UPDATE repair_log SET
  date_reported = '2012-05-16',
  date_completed = '2012-05-16',
  mileage_at_repair = 24530,
  mileage_out = 24530,
  parts_cost = 2193.00,
  discount_amount = 37.30,
  vat_amount = 150.90,
  grand_total = 2306.60,
  invoice_number = 'GSJ12-04208',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-002';

-- ============================================================
-- 3. FIX rep-2455-004 (40K service) - date only
-- From warranty schedule: 40000 กม. [23/07/2012]
-- Was: 2012-01-12 (wrong)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2012-07-23',
  date_completed = '2012-07-23',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-004';

-- ============================================================
-- 4. FIX rep-2455-005 (50K service)
-- Invoice: REP12-03762 / GSJ12-10269 (page 1 of 2)
-- Was: 2012-04-18, 48154 km
-- Real: 2012-10-04, 47161 km
-- Items from page 1 only - totals computed from visible items
-- ============================================================
UPDATE repair_log SET
  date_reported = '2012-10-04',
  date_completed = '2012-10-04',
  mileage_at_repair = 47161,
  mileage_out = 47161,
  issue_description = 'เช็คระยะ 50,000 กม. / 30 เดือน, ตัดกิ่งไม้',
  labour_cost = 42.00,
  parts_cost = 1833.00,
  discount_amount = 0.00,
  vat_amount = 131.25,
  grand_total = 2006.25,
  invoice_number = 'GSJ12-10269',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-005';

-- Delete old items for 005
DELETE FROM repair_items WHERE repair_id = 'rep-2455-005';

-- Insert correct items from invoice REP12-03762
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-005-01', 'rep-2455-005', '50000', 'เช็คระยะ 50,000 กม. / 30 เดือน', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-005-02', 'rep-2455-005', 'A-08883-81750', 'น้ำมันเครื่องดีเซล สีแดง_L', 1, 145.00, 0.00, 145.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-005-03', 'rep-2455-005', 'A-08883-81751', 'น้ำมันเครื่องดีเซล สีแดง_G', 1, 840.00, 0.00, 840.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-005-04', 'rep-2455-005', 'A-90430-12031-1', 'ประเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 0.00, 18.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-005-05', 'rep-2455-005', 'A-90915-20003', 'ไส้กรองน้ำมันเครื่อง', 1, 365.00, 0.00, 365.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-005-06', 'rep-2455-005', 'B-TBCPB', 'น.ทำความสะอาดเครื่อง', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-005-07', 'rep-2455-005', '47399', 'งานอื่นๆ ตัดกิ่งไม้บนรถ', 1, 42.00, 0.00, 42.00, 'labour', '2026-04-12T00:00:00Z');

-- ============================================================
-- 5. INSERT new minor records (checks between 50K-60K)
-- ============================================================

-- 5a. GSJ12-11566 (REP12-04291) - check + น้ำกลั่น
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-057', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-11-01', '2012-11-01', 'completed',
  'ตรวจเช็ค, เติมน้ำกลั่น', 'repair',
  'โตโยต้าพะเยา (1994)',
  47200, 47200,
  0.00, 8.00, 0.00, 0.56, 8.56,
  'GSJ12-11566', '2026-04-12T12:00:00Z', '2026-04-12T12:00:00Z'
);
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-057-01', 'rep-2455-057', '17299', 'งานอื่นๆ ตรวจเช็ค 1 รายการ', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-057-02', 'rep-2455-057', 'B-W00018', 'น้ำกลั่น', 1, 8.00, 0.00, 8.00, 'part', '2026-04-12T00:00:00Z');

-- 5b. GSJ12-11708 (REP12-04352) - cancel/check + น้ำกลั่น
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-058', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-11-05', '2012-11-05', 'completed',
  'ตรวจเช็ค 17 รายการ, เติมน้ำกลั่น', 'repair',
  'โตโยต้าพะเยา (1994)',
  47202, 47202,
  0.00, 8.00, 0.00, 0.56, 8.56,
  'GSJ12-11708', '2026-04-12T12:00:00Z', '2026-04-12T12:00:00Z'
);
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-058-01', 'rep-2455-058', 'Z1199', 'ยกเลิกการใช้งาน เช็ค 17 รายการ', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-058-02', 'rep-2455-058', 'B-W00018', 'น้ำกลั่น', 1, 8.00, 0.00, 8.00, 'part', '2026-04-12T00:00:00Z');

-- 5c. GSJ12-12975 (REP12-04995) - cancel/check + น้ำกลั่น
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-059', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-11-24', '2012-11-24', 'completed',
  'ตรวจเช็ค 17 รายการ, เติมน้ำกลั่น', 'repair',
  'โตโยต้าพะเยา (1994)',
  53600, 53600,
  0.00, 8.00, 0.00, 0.56, 8.56,
  'GSJ12-12975', '2026-04-12T12:00:00Z', '2026-04-12T12:00:00Z'
);
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-059-01', 'rep-2455-059', 'Z1199', 'ยกเลิกการใช้งาน เช็ค 17 รายการ', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-059-02', 'rep-2455-059', 'B-W00018', 'น้ำกลั่น', 1, 8.00, 0.00, 8.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 6. FIX rep-2455-006 (→ invoice at 59259 km)
-- Invoice: REP12-05514 / GSJ12-14113
-- Was: 2012-08-01, 58162 km, grand 2425.82
-- Real: 2012-12-17, 59259 km, grand 3771.75
-- Item details not visible (only C1216183)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2012-12-17',
  date_completed = '2012-12-17',
  mileage_at_repair = 59259,
  mileage_out = 59259,
  issue_description = 'ซ่อมบำรุง (C1216183)',
  labour_cost = 1302.00,
  parts_cost = 2223.00,
  discount_amount = 0.00,
  vat_amount = 246.75,
  grand_total = 3771.75,
  invoice_number = 'GSJ12-14113',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-006';

-- Delete old items (were fabricated)
DELETE FROM repair_items WHERE repair_id = 'rep-2455-006';

-- ============================================================
-- 7. FIX rep-2455-008 (70K → 29TF at 69352 km)
-- Invoice: REP13-01572 / GSJ13-03369
-- Was: 2012-11-28, 69541 km, grand 2874.14
-- Real: 2013-03-04, 69352 km, grand 1624.26
-- Items: COMPLETE from invoice
-- ============================================================
UPDATE repair_log SET
  date_reported = '2013-03-04',
  date_completed = '2013-03-04',
  mileage_at_repair = 69352,
  mileage_out = 69352,
  issue_description = 'เช็คระยะ 29TF เปลี่ยนถ่ายน้ำมันเครื่อง/ไส้กรอง',
  service_type = 'scheduled_maintenance',
  labour_cost = 150.00,
  parts_cost = 1368.00,
  discount_amount = 0.00,
  vat_amount = 106.26,
  grand_total = 1624.26,
  invoice_number = 'GSJ13-03369',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-008';

DELETE FROM repair_items WHERE repair_id = 'rep-2455-008';
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-008-01', 'rep-2455-008', '29TF', 'เช็คระยะ 29TF เปลี่ยนถ่ายน้ำมันเครื่อง/ไส้กรอง', 1, 150.00, 0.00, 150.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-008-02', 'rep-2455-008', 'A-08883-81750', 'น้ำมันเครื่องดีเซล สีแดง_L', 1, 145.00, 0.00, 145.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-008-03', 'rep-2455-008', 'A-08883-81751', 'น้ำมันเครื่องดีเซล สีแดง_G', 1, 840.00, 0.00, 840.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-008-04', 'rep-2455-008', 'A-90430-12031-1', 'ประเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 0.00, 18.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-008-05', 'rep-2455-008', 'A-90915-20003', 'ไส้กรองน้ำมันเครื่อง', 1, 365.00, 0.00, 365.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 8. FIX rep-2455-009 (80K at 80206 km)
-- Invoice: REP13-03122 / GSJ13-08469
-- Was: 2013-03-05, 78966 km, grand 6431.15
-- Real: 2013-06-03, 80206 km, grand 7794.95
-- Items: partial (page 1 visible, more items on other pages)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2013-06-03',
  date_completed = '2013-06-03',
  mileage_at_repair = 80206,
  mileage_out = 80206,
  issue_description = 'เปลี่ยนน้ำมัน ATM, เกียร์, เฟืองท้าย, ทำความสะอาดเครื่อง',
  labour_cost = 1512.00,
  parts_cost = 5773.00,
  discount_amount = 0.00,
  vat_amount = 509.95,
  grand_total = 7794.95,
  invoice_number = 'GSJ13-08469',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-009';

DELETE FROM repair_items WHERE repair_id = 'rep-2455-009';
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-009-01', 'rep-2455-009', 'A-PZT01-8702L', 'น้ำมันATM/น้ำมันพาวเวอร์', 1, 195.00, 0.00, 195.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-009-02', 'rep-2455-009', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90GL-5', 30, 12.50, 0.00, 375.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-009-03', 'rep-2455-009', 'A-PZT01-8752L', 'น้ำมันเกียร์ธรรมชาติ/transfer', 3, 395.00, 0.00, 1185.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-009-04', 'rep-2455-009', 'B-TBCPB', 'น.ทำความสะอาดเครื่อง', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 9. FIX rep-2455-010 (90K → 29TF + headlight at 84078 km)
-- Invoice: REP13-04477 / GSJ13-12065
-- Was: 2013-06-12, 89451 km, grand 3102.45
-- Real: 2013-08-06, 84078 km, grand 3111.56
-- Items: COMPLETE from invoice (2 pages)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2013-08-06',
  date_completed = '2013-08-06',
  mileage_at_repair = 84078,
  mileage_out = 84078,
  issue_description = 'เช็คระยะ 29TF เปลี่ยนน้ำมันเครื่อง/ไส้กรอง, เปลี่ยนหลอดไฟใหญ่, เติมน้ำยาหม้อน้ำ',
  service_type = 'scheduled_maintenance',
  labour_cost = 150.00,
  parts_cost = 2758.00,
  discount_amount = 0.00,
  vat_amount = 203.56,
  grand_total = 3111.56,
  invoice_number = 'GSJ13-12065',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-010';

DELETE FROM repair_items WHERE repair_id = 'rep-2455-010';
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-010-01', 'rep-2455-010', '29TF', 'เช็คระยะ 29TF เปลี่ยนถ่ายน้ำมันเครื่อง/ไส้กรอง', 1, 150.00, 0.00, 150.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-010-02', 'rep-2455-010', 'A-08883-81750', 'น้ำมันเครื่องดีเซล สีแดง_L', 1, 145.00, 0.00, 145.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-010-03', 'rep-2455-010', 'A-08883-81751', 'น้ำมันเครื่องดีเซล สีแดง_G', 1, 840.00, 0.00, 840.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-010-04', 'rep-2455-010', 'A-08889-80061', 'น้ำยาหม้อน้ำ', 1, 450.00, 0.00, 450.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-010-05', 'rep-2455-010', 'A-90430-12031-1', 'ประเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 0.00, 18.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-010-06', 'rep-2455-010', 'A-90915-20003', 'ไส้กรองน้ำมันเครื่อง', 1, 365.00, 0.00, 365.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-010-07', 'rep-2455-010', 'A-90981-13058', 'หลอดไฟใหญ่', 1, 940.00, 0.00, 940.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 10. FIX rep-2455-013 (120K → service at 123179 km)
-- Invoice: REP14-05003 / GSJ14-10945
-- Was: 2014-04-18, 119154 km, grand 3854.14
-- Real: 2014-06-17, 123179 km, grand 4217.94
-- Items: only page 2 visible (main items on page 1 not available)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2014-06-17',
  date_completed = '2014-06-17',
  mileage_at_repair = 123179,
  mileage_out = 123179,
  labour_cost = 1125.00,
  parts_cost = 2817.00,
  discount_amount = 0.00,
  vat_amount = 275.94,
  grand_total = 4217.94,
  invoice_number = 'GSJ14-10945',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-013';

-- ============================================================
-- 11. INSERT new record: repair at 123852 km
-- Invoice: REP14-05034 / GSJ14-11108
-- งานตัดกิ่งไม้ + ชุดประเก็น
-- ============================================================
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-060', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2014-06-21', '2014-06-21', 'completed',
  'งานอื่นๆ ตัดกิ่งไม้, เปลี่ยนชุดประเก็น', 'repair',
  'โตโยต้าพะเยา (1994)',
  123852, 123852,
  450.00, 875.00, 0.00, 92.75, 1417.75,
  'GSJ14-11108', '2026-04-12T12:00:00Z', '2026-04-12T12:00:00Z'
);
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-060-01', 'rep-2455-060', '47399', 'งานอื่นๆ ตัดกิ่งไม้บนรถ', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z'),
  ('ri-2455-060-02', 'rep-2455-060', 'A-04941-26010', 'ชุดประเก็นเปิดแบมเซ็นหลัง', 1, 875.00, 0.00, 875.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 12. INSERT new record: 29TL oil change at 159438 km
-- Invoice: TAX15-10214 / GSJ15-08787
-- Small service with labour + parts discount
-- ============================================================
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-061', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2015-06-15', '2015-06-15', 'completed',
  'เช็คระยะ 29TL เปลี่ยนน้ำมันเครื่อง, วิเคราะห์ปัญหาเครื่องปรับอากาศ', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  159438, 159438,
  265.00, 840.00, 475.00, 44.10, 674.10,
  'GSJ15-08787', '2026-04-12T12:00:00Z', '2026-04-12T12:00:00Z'
);
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-061-01', 'rep-2455-061', '29TL', 'เช็คระยะ 29TL เปลี่ยนถ่ายน้ำมันเครื่อง', 1, 175.00, 0.00, 175.00, 'service', '2026-04-12T00:00:00Z'),
  ('ri-2455-061-02', 'rep-2455-061', '88999', 'งานวิเคราะห์ปัญหาเครื่องปรับอากาศ', 1, 90.00, 0.00, 90.00, 'labour', '2026-04-12T00:00:00Z'),
  ('ri-2455-061-03', 'rep-2455-061', 'A-08883-81751', 'น้ำมันเครื่องดีเซล สีแดง_G', 1, 840.00, 210.00, 630.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 13. FIX rep-2455-017 (160K → service at 167359 km)
-- Invoice: REP15-02649 / GSJ15-09106
-- Was: 2015-09-22, 160244 km, grand 7420.50
-- Real: 2015-06-19, 167359 km, grand 3353.38
-- No items visible
-- ============================================================
UPDATE repair_log SET
  date_reported = '2015-06-19',
  date_completed = '2015-06-19',
  mileage_at_repair = 167359,
  mileage_out = 167359,
  labour_cost = 1035.00,
  parts_cost = 2099.00,
  discount_amount = 0.00,
  vat_amount = 219.38,
  grand_total = 3353.38,
  invoice_number = 'GSJ15-09106',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-017';

-- ============================================================
-- 14. FIX rep-2455-019 (180K → 190K service at 188610 km)
-- Invoice: REP15-04105 / GSJ15-21698
-- Was: 2016-05-18, 180124 km, grand 4120.45
-- Real: 2015-12-14, 188610 km, grand 2856.90
-- Items: COMPLETE from invoice (2 pages)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2015-12-14',
  date_completed = '2015-12-14',
  mileage_at_repair = 188610,
  mileage_out = 188610,
  issue_description = 'เช็คระยะ 190,000 กม. / ทุก 6 เดือน, เปลี่ยนน้ำมันเครื่อง/ไส้กรอง',
  labour_cost = 1035.00,
  parts_cost = 1635.00,
  discount_amount = 0.00,
  vat_amount = 186.90,
  grand_total = 2856.90,
  invoice_number = 'GSJ15-21698',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-019';

DELETE FROM repair_items WHERE repair_id = 'rep-2455-019';
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-019-01', 'rep-2455-019', '190000', 'เช็คระยะ 190,000 กม. / ทุก 6 เดือน', 1, 1035.00, 0.00, 1035.00, 'labour', '2026-04-12T00:00:00Z'),
  ('ri-2455-019-02', 'rep-2455-019', 'A-08813-80011', 'น้ำยาล้างภายในเครื่องยนต์', 1, 370.00, 0.00, 370.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-019-03', 'rep-2455-019', 'A-08883-81750', 'น้ำมันเครื่องดีเซล สีแดง_L', 1, 145.00, 0.00, 145.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-019-04', 'rep-2455-019', 'A-08883-81751', 'น้ำมันเครื่องดีเซล สีแดง_G', 1, 840.00, 0.00, 840.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-019-05', 'rep-2455-019', 'A-90430-12031-1', 'ประเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-019-06', 'rep-2455-019', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 200.00, 0.00, 200.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-019-07', 'rep-2455-019', 'B-PZT00', 'น้ำยาล้างเมนบรถ', 2, 30.00, 0.00, 60.00, 'part', '2026-04-12T00:00:00Z');

-- ============================================================
-- 15. FIX rep-2455-021 (210K service at 209857 km)
-- Invoice: REP16-01336 / GSJ16-08462
-- Was: 2017-03-24, 211245 km, grand 3215.14
-- Real: 2016-06-09, 209857 km
-- Items from page 1 (totals computed from visible items)
-- ============================================================
UPDATE repair_log SET
  date_reported = '2016-06-09',
  date_completed = '2016-06-09',
  mileage_at_repair = 209857,
  mileage_out = 209857,
  issue_description = 'เช็คระยะ 210,000 กม., เปลี่ยนน้ำมันเครื่อง/ไส้กรอง, สารเพิ่มคุณภาพ',
  labour_cost = 1035.00,
  parts_cost = 2720.00,
  discount_amount = 0.00,
  vat_amount = 262.85,
  grand_total = 4017.85,
  invoice_number = 'GSJ16-08462',
  updated_at = '2026-04-12T12:00:00Z'
WHERE id = 'rep-2455-021';

DELETE FROM repair_items WHERE repair_id = 'rep-2455-021';
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at) VALUES
  ('ri-2455-021-01', 'rep-2455-021', '210000', 'เช็คระยะ 210,000 กม.', 1, 1035.00, 0.00, 1035.00, 'labour', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-02', 'rep-2455-021', 'A-08814-80040', 'น้ำยาจัดทำราวเครื่องยนต์', 1, 530.00, 0.00, 530.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-03', 'rep-2455-021', 'A-08883-81750', 'น้ำมันเครื่องดีเซล สีแดง_L', 1, 145.00, 0.00, 145.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-04', 'rep-2455-021', 'A-08883-81751', 'น้ำมันเครื่องดีเซล สีแดง_G', 1, 840.00, 0.00, 840.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-05', 'rep-2455-021', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-06', 'rep-2455-021', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 200.00, 0.00, 200.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-07', 'rep-2455-021', 'B-8W5E', 'สารเพิ่มคุณภาพรักษาเครื่องยนต์', 1, 460.00, 0.00, 460.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-08', 'rep-2455-021', 'B-PZT00', 'น้ำยาล้างเมนบรถ', 2, 30.00, 0.00, 60.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-021-09', 'rep-2455-021', 'B-TBVL', 'แผ่นเลีย/ผลิตภัณฑ์ล้างตะกอน', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');
