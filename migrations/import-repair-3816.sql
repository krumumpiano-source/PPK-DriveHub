-- Import historical repair data for นข 3816 พย (Toyota Commuter)
-- 7 repair records from Toyota Phayao (1994)
-- Data period: 2023-05-18 to 2026-02-02, mileage 712 to 80,558 km

PRAGMA foreign_keys = OFF;

-- ============================================================
-- REPAIR LOG (7 records)
-- ============================================================

-- 1. เช็คระยะ 1,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-001', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2023-05-18', '2023-05-18', 'completed',
  'เช็คระยะ 1,000 กม. / 1 เดือน, พ่นน้ำยาทำความสะอาดในห้องโดยสาร', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  712, 712, NULL,
  0.00, 0.00, 0.00, 0.00, 0.00,
  NULL, '2023-05-18T12:00:00Z', '2023-05-18T12:00:00Z'
);

-- 2. เช็คระยะ 10,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-002', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2023-11-21', '2023-11-21', 'completed',
  'เปลี่ยนน้ำมันเครื่อง/ไส้กรอง, ตรวจเช็คระบบเบรก/ช่วงล่าง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  12360, 12360, 'กันต์กวี',
  0.00, 2272.00, 0.00, 159.04, 2431.04,
  'TAX23-25407', '2023-11-21T12:00:00Z', '2023-11-21T12:00:00Z'
);

-- 3. เช็คระยะ 20,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-003', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2024-06-04', '2024-06-04', 'completed',
  'ล้างหัวฉีดดีเซล, ล้างเครื่องยนต์, สลับยาง-ถ่วงล้อ, ล้างคอยล์เย็น', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  22667, 22667, NULL,
  356.00, 4937.00, 0.00, 370.51, 5663.51,
  'REP24-01279', '2024-06-04T12:00:00Z', '2024-06-04T12:00:00Z'
);

-- 4. เช็คระยะ 50,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-004', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2025-03-22', '2025-03-22', 'completed',
  'เปลี่ยนน้ำมันเครื่อง, ล้างหัวฉีด, ล้างเครื่องยนต์, สลับยาง, ล้างตู้แอร์, ล้างคอยล์เย็น', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  53714, 53714, NULL,
  356.00, 4844.00, 0.00, 364.00, 5564.00,
  'REP25-00593', '2025-03-22T12:00:00Z', '2025-03-22T12:00:00Z'
);

-- 5. เช็คระยะ 60,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-005', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2025-07-10', '2025-07-10', 'completed',
  'ล้างหัวฉีด, ล้างเครื่องยนต์, สลับยาง, ล้างตู้แอร์, ล้างคอยล์เย็น', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  62884, 62884, NULL,
  1506.00, 4985.00, 0.00, 454.37, 6945.37,
  'REP25-01427', '2025-07-10T12:00:00Z', '2025-07-10T12:00:00Z'
);

-- 6. เช็คระยะ 70,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-006', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2025-10-10', '2025-10-10', 'completed',
  'เช็คระยะ 70,000 กม., ทำความสะอาดกลไกวาล์ว, สลับยาง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  71422, 71422, NULL,
  1668.80, 2867.00, 0.00, 317.51, 4853.31,
  'REP25-02121', '2025-10-10T12:00:00Z', '2025-10-10T12:00:00Z'
);

-- 7. เช็คระยะ 80,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-3816-007', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
  '2026-02-02', '2026-02-02', 'completed',
  'เปลี่ยนน้ำมันเครื่อง, เปลี่ยนน้ำมันเบรก-คลัทช์, สลับยาง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  80558, 80558, NULL,
  1656.00, 3101.00, 0.00, 332.99, 5089.99,
  'REP26-00229', '2026-02-02T12:00:00Z', '2026-02-02T12:00:00Z'
);

-- ============================================================
-- REPAIR ITEMS
-- ============================================================

-- === Record 1: 1,000 km (rep-3816-001) — no parts ===

-- === Record 2: 10,000 km (rep-3816-002) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-002-01', 'rep-3816-002', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2023-11-21T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-002-02', 'rep-3816-002', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1475.00, 0.00, 1475.00, 'part', '2023-11-21T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-002-03', 'rep-3816-002', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', '2023-11-21T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-002-04', 'rep-3816-002', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 205.00, 0.00, 205.00, 'part', '2023-11-21T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-002-05', 'rep-3816-002', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2023-11-21T12:00:00Z');

-- === Record 3: 20,000 km (rep-3816-003) — REP24-01279 ===
-- Parts: 4,937 | Labour: 356
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-01', 'rep-3816-003', 'A-08808-80230', 'น้ำยาทำความสะอาดกระจก', 1, 140.00, 0.00, 140.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-02', 'rep-3816-003', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 374.00, 0.00, 374.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-03', 'rep-3816-003', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 530.00, 0.00, 530.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-04', 'rep-3816-003', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-05', 'rep-3816-003', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-06', 'rep-3816-003', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-07', 'rep-3816-003', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 205.00, 0.00, 205.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-08', 'rep-3816-003', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-09', 'rep-3816-003', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1601.00, 0.00, 1601.00, 'part', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-10', 'rep-3816-003', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2024-06-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-003-11', 'rep-3816-003', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', '2024-06-04T12:00:00Z');

-- === Record 4: 50,000 km (rep-3816-004) — REP25-00593 ===
-- Parts: 4,844 | Labour: 356
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-01', 'rep-3816-004', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 375.00, 0.00, 375.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-02', 'rep-3816-004', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-03', 'rep-3816-004', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-04', 'rep-3816-004', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-05', 'rep-3816-004', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-06', 'rep-3816-004', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-07', 'rep-3816-004', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-08', 'rep-3816-004', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1602.00, 0.00, 1602.00, 'part', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-09', 'rep-3816-004', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2025-03-22T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-004-10', 'rep-3816-004', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', '2025-03-22T12:00:00Z');

-- === Record 5: 60,000 km (rep-3816-005) — REP25-01427 ===
-- Parts: 4,985 | Labour: 1,506
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-01', 'rep-3816-005', '60000', 'เช็คระยะ 60,000 กม.', 1, 1150.00, 0.00, 1150.00, 'service', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-02', 'rep-3816-005', 'A-08808-80230', 'น้ำยาทำความสะอาดกระจก', 1, 141.00, 0.00, 141.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-03', 'rep-3816-005', 'A-08813-80005', 'น้ำยาล้างหัวฉีดดีเซล', 1, 375.00, 0.00, 375.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-04', 'rep-3816-005', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-05', 'rep-3816-005', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-06', 'rep-3816-005', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-07', 'rep-3816-005', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-08', 'rep-3816-005', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-09', 'rep-3816-005', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-10', 'rep-3816-005', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1602.00, 0.00, 1602.00, 'part', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-11', 'rep-3816-005', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-005-12', 'rep-3816-005', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', '2025-07-10T12:00:00Z');

-- === Record 6: 70,000 km (rep-3816-006) — REP25-02121 ===
-- Parts: 2,867 | Labour: 1,668.80
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-01', 'rep-3816-006', '70000', 'เช็คระยะ 70,000 กม.', 1, 1050.00, 0.00, 1050.00, 'service', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-02', 'rep-3816-006', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-03', 'rep-3816-006', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-04', 'rep-3816-006', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-05', 'rep-3816-006', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-06', 'rep-3816-006', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-07', 'rep-3816-006', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-08', 'rep-3816-006', '14199', 'งานอื่นๆ', 1, 462.80, 0.00, 462.80, 'labour', '2025-10-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-006-09', 'rep-3816-006', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2025-10-10T12:00:00Z');

-- === Record 7: 80,000 km (rep-3816-007) — REP26-00229 ===
-- Parts: 3,101 | Labour: 1,656
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-01', 'rep-3816-007', '80000', 'เช็คระยะ 80,000 กม.', 1, 1500.00, 0.00, 1500.00, 'service', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-02', 'rep-3816-007', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-03', 'rep-3816-007', 'A-08823-80170', 'น้ำมันเบรก-คลัทช์', 2, 117.00, 0.00, 234.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-04', 'rep-3816-007', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-05', 'rep-3816-007', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-06', 'rep-3816-007', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-07', 'rep-3816-007', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-08', 'rep-3816-007', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', '2026-02-02T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-3816-007-09', 'rep-3816-007', '420018', 'สลับยางและถ่วงล้อ', 1, 156.00, 0.00, 156.00, 'labour', '2026-02-02T12:00:00Z');

-- ============================================================
-- UPDATE current_mileage
-- ============================================================
UPDATE cars SET current_mileage = 80558 WHERE id = 'df5fd5a5-287e-4e10-a8d0-f6818daa6522' AND (current_mileage IS NULL OR current_mileage < 80558);

-- ============================================================
-- SYNC vehicle_maintenance from repair history
-- ============================================================

-- engine_oil: last at 80,558 km (2026-02-02) — record 7 had oil change
-- Commuter default: every 10,000 km / 6 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-engine_oil', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'engine_oil', 80558, '2026-02-02', 90558, '2026-08-02', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- oil_filter: last at 80,558 km (2026-02-02) — record 7 had filter change
-- every 10,000 km / 6 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-oil_filter', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'oil_filter', 80558, '2026-02-02', 90558, '2026-08-02', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- injector_cleaning: last at 62,884 km (2025-07-10) — record 5
-- every 20,000 km / 12 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-injector_cleaning', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'injector_cleaning', 62884, '2025-07-10', 82884, '2026-07-10', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- tire_rotation: last at 80,558 km (2026-02-02) — record 7
-- every 10,000 km / 6 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-tire_rotation', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'tire_rotation', 80558, '2026-02-02', 90558, '2026-08-02', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- gear_oil: last at 80,558 km (2026-02-02) — record 7
-- every 40,000 km / 24 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-gear_oil', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'gear_oil', 80558, '2026-02-02', 120558, '2028-02-02', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- brake_fluid: last at 80,558 km (2026-02-02) — record 7 (น้ำมันเบรก_คลัทช์)
-- every 40,000 km / 24 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-brake_fluid', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'brake_fluid', 80558, '2026-02-02', 120558, '2028-02-02', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- ac_service: last at 62,884 km (2025-07-10) — record 5 (ล้างตู้แอร์)
-- every 12 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-3816-ac_service', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'ac_service', 62884, '2025-07-10', NULL, '2026-07-10', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

PRAGMA foreign_keys = ON;
