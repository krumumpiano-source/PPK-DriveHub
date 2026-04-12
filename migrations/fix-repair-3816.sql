-- Fix repair data for นข 3816 พย — verified against T-Connect invoices
-- Issues: missing repair_items in records 3-7, wrong descriptions, wrong maintenance tracking
-- Date: 2026-04-12

PRAGMA foreign_keys = OFF;

-- ============================================================
-- A. FIX repair_log descriptions
-- ============================================================

-- Record 4 (50K): add สลับยาง, ล้างคอยล์เย็น
UPDATE repair_log SET
  issue_description = 'เปลี่ยนน้ำมันเครื่อง, ล้างหัวฉีด, ล้างเครื่องยนต์, สลับยาง, ล้างตู้แอร์, ล้างคอยล์เย็น',
  updated_at = '2026-04-12T00:00:00Z'
WHERE id = 'rep-3816-004';

-- Record 5 (60K): add สลับยาง, ล้างคอยล์เย็น
UPDATE repair_log SET
  issue_description = 'ล้างหัวฉีด, ล้างเครื่องยนต์, สลับยาง, ล้างตู้แอร์, ล้างคอยล์เย็น',
  updated_at = '2026-04-12T00:00:00Z'
WHERE id = 'rep-3816-005';

-- Record 7 (80K): invoice has no gearbox oil, fix description
UPDATE repair_log SET
  issue_description = 'เปลี่ยนน้ำมันเครื่อง, เปลี่ยนน้ำมันเบรก-คลัทช์, สลับยาง',
  updated_at = '2026-04-12T00:00:00Z'
WHERE id = 'rep-3816-007';

-- ============================================================
-- B. FIX repair_items — delete records 3-7 items and re-insert complete set
-- ============================================================

DELETE FROM repair_items WHERE repair_id IN (
  'rep-3816-003', 'rep-3816-004', 'rep-3816-005', 'rep-3816-006', 'rep-3816-007'
);

-- === Record 3: 20,000 km (rep-3816-003) — REP24-01279 ===
-- Parts: 4,937 | Labour: 356 | VAT: 370.51 | Grand: 5,663.51
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-01', 'rep-3816-003', 'A-08808-80230', 'น้ำยาทำความสะอาดกระจก', 1, 140.00, 0.00, 140.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-02', 'rep-3816-003', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 374.00, 0.00, 374.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-03', 'rep-3816-003', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 530.00, 0.00, 530.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-04', 'rep-3816-003', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-05', 'rep-3816-003', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-06', 'rep-3816-003', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-07', 'rep-3816-003', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 205.00, 0.00, 205.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-08', 'rep-3816-003', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-09', 'rep-3816-003', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1601.00, 0.00, 1601.00, 'part', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-10', 'rep-3816-003', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2024-06-04T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-11', 'rep-3816-003', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', '2024-06-04T12:00:00Z');

-- === Record 4: 50,000 km (rep-3816-004) — REP25-00593 ===
-- Parts: 4,844 | Labour: 356 | VAT: 364.00 | Grand: 5,564.00
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-01', 'rep-3816-004', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 375.00, 0.00, 375.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-02', 'rep-3816-004', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-03', 'rep-3816-004', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-04', 'rep-3816-004', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-05', 'rep-3816-004', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-06', 'rep-3816-004', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-07', 'rep-3816-004', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-08', 'rep-3816-004', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1602.00, 0.00, 1602.00, 'part', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-09', 'rep-3816-004', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2025-03-22T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-10', 'rep-3816-004', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', '2025-03-22T12:00:00Z');

-- === Record 5: 60,000 km (rep-3816-005) — REP25-01427 ===
-- Parts: 4,985 | Labour: 1,506 | VAT: 454.37 | Grand: 6,945.37
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-01', 'rep-3816-005', '60000', 'เช็คระยะ 60,000 กม.', 1, 1150.00, 0.00, 1150.00, 'service', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-02', 'rep-3816-005', 'A-08808-80230', 'น้ำยาทำความสะอาดกระจก', 1, 141.00, 0.00, 141.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-03', 'rep-3816-005', 'A-08813-80005', 'น้ำยาล้างหัวฉีดดีเซล', 1, 375.00, 0.00, 375.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-04', 'rep-3816-005', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-05', 'rep-3816-005', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-06', 'rep-3816-005', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-07', 'rep-3816-005', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-08', 'rep-3816-005', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-09', 'rep-3816-005', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-10', 'rep-3816-005', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1602.00, 0.00, 1602.00, 'part', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-11', 'rep-3816-005', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2025-07-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-12', 'rep-3816-005', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', '2025-07-10T12:00:00Z');

-- === Record 6: 70,000 km (rep-3816-006) — REP25-02121 ===
-- Parts: 2,867 | Labour: 1,668.80 | VAT: 317.51 | Grand: 4,853.31
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-01', 'rep-3816-006', '70000', 'เช็คระยะ 70,000 กม.', 1, 1050.00, 0.00, 1050.00, 'service', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-02', 'rep-3816-006', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-03', 'rep-3816-006', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-04', 'rep-3816-006', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-05', 'rep-3816-006', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-06', 'rep-3816-006', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-07', 'rep-3816-006', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-08', 'rep-3816-006', '14199', 'งานอื่นๆ', 1, 462.80, 0.00, 462.80, 'labour', '2025-10-10T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-09', 'rep-3816-006', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2025-10-10T12:00:00Z');

-- === Record 7: 80,000 km (rep-3816-007) — REP26-00229 ===
-- Parts: 3,101 | Labour: 1,656 | VAT: 332.99 | Grand: 5,089.99
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-01', 'rep-3816-007', '80000', 'เช็คระยะ 80,000 กม.', 1, 1500.00, 0.00, 1500.00, 'service', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-02', 'rep-3816-007', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-03', 'rep-3816-007', 'A-08823-80170', 'น้ำมันเบรก-คลัทช์', 2, 117.00, 0.00, 234.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-04', 'rep-3816-007', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-05', 'rep-3816-007', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-06', 'rep-3816-007', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-07', 'rep-3816-007', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-08', 'rep-3816-007', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2026-02-02T12:00:00Z');
INSERT INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-09', 'rep-3816-007', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2026-02-02T12:00:00Z');

-- ============================================================
-- C. FIX vehicle_maintenance — engine_oil & oil_filter last changed at 80K
-- ============================================================

-- engine_oil: was at every service including 80K (A-08880-83932/83933)
UPDATE vehicle_maintenance SET
  last_km = 80558, last_date = '2026-02-02',
  next_km = 90558, next_date = '2026-08-02',
  updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'df5fd5a5-287e-4e10-a8d0-f6818daa6522' AND item_key = 'engine_oil';

-- oil_filter: was at every service including 80K (A-90915-YZZD2)
UPDATE vehicle_maintenance SET
  last_km = 80558, last_date = '2026-02-02',
  next_km = 90558, next_date = '2026-08-02',
  updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'df5fd5a5-287e-4e10-a8d0-f6818daa6522' AND item_key = 'oil_filter';
