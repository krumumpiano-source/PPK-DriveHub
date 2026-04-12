-- Import historical repair data for 40-0158 (Toyota Coaster)
-- 8 repair records from Toyota Phayao (1994) service center
-- Data period: 2022-03-31 to 2026-02-26, mileage 3,846 to 39,704 km

PRAGMA foreign_keys = OFF;

-- ============================================================
-- REPAIR LOG (8 records)
-- ============================================================

-- 1. Check 10,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-001', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2022-03-31', '2022-03-31', 'completed',
  'เช็คระยะ 10,000 กม. / 6 เดือน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  3846, 3846, 'สมชาย', 'สมชาย',
  0.00, 2774.00, 0.00, 194.18, 2968.18,
  'REP22-01048', '2022-03-31T12:00:00Z', '2022-03-31T12:00:00Z'
);

-- 2. Check 20,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-002', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2022-07-27', '2022-07-27', 'completed',
  'เช็คระยะ 20,000 กม. / 12 เดือน, ล้างหัวฉีด, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  5913, 5913, 'สมชาย', 'สมชาย',
  0.00, 3620.00, 0.00, 253.40, 3873.40,
  'REP22-02206', '2022-07-27T12:00:00Z', '2022-07-27T12:00:00Z'
);

-- 3. Check 30,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-003', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2022-12-11', '2022-12-11', 'completed',
  'เช็คระยะ 30,000 กม., พ่นน้ำยาทำความสะอาดห้องโดยสาร', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  8436, 8436, 'กัญญารัตน์ ดวงศรี', 'กัญญารัตน์ ดวงศรี',
  0.00, 3002.00, 0.00, 210.14, 3212.14,
  'REP22-03494', '2022-12-11T12:00:00Z', '2022-12-11T12:00:00Z'
);

-- 4. Check 40,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-004', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2023-08-04', '2023-08-04', 'completed',
  'เช็คระยะ 40,000 กม. / 24 เดือน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  12477, 12477, 'ชนิษฐา ป่วงงาม', 'ชนิษฐา ป่วงงาม',
  0.00, 4259.00, 0.00, 298.13, 4557.13,
  'REP23-02058', '2023-08-04T12:00:00Z', '2023-08-04T12:00:00Z'
);

-- 5. Check 50,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-005', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2024-03-12', '2024-03-12', 'completed',
  'เช็คระยะ 50,000 กม. / 30 เดือน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  16339, 16339, 'ชนิษฐา ป่วงงาม', 'ชนิษฐา ป่วงงาม',
  0.00, 3002.00, 0.00, 210.14, 3212.14,
  'REP24-00609', '2024-03-12T12:00:00Z', '2024-03-12T12:00:00Z'
);

-- 6. Check 60,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-006', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2024-07-26', '2024-07-26', 'completed',
  'เช็คระยะ 60,000 กม., ล้างหัวฉีด, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  20581, 20581, 'ชนิษฐา ป่วงงาม', 'ชนิษฐา ป่วงงาม',
  2400.00, 3986.00, 0.00, 447.02, 6833.02,
  'REP24-01676', '2024-07-26T12:00:00Z', '2024-07-26T12:00:00Z'
);

-- 7. Check 90,000 km (battery replacement)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-007', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2025-07-10', '2025-07-10', 'completed',
  'เปลี่ยนแบตเตอรี่ 2 ลูก, ล้างหัวฉีด, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  29506, 29506, 'ชนิษฐา ป่วงงาม', 'ชนิษฐา ป่วงงาม',
  416.00, 11685.00, 0.00, 847.07, 12948.07,
  'REP25-01428', '2025-07-10T12:00:00Z', '2025-07-10T12:00:00Z'
);

-- 8. Check 100,000 km
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out, reporter_name, taken_by,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-0158-008', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  '2026-02-26', '2026-02-26', 'completed',
  'เช็คระยะ 100,000 กม., ล้างระบบแอร์ Fresh Car, ล้างวาล์ว', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  39704, 39704, 'สมชาย', 'สมชาย',
  1185.60, 3078.00, 0.00, 298.45, 4562.05,
  'REP26-00394', '2026-02-26T12:00:00Z', '2026-02-26T12:00:00Z'
);

-- ============================================================
-- REPAIR ITEMS (all items for 8 records)
-- ============================================================

-- === Record 1: 10,000 km (rep-0158-001) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-001-01', 'rep-0158-001', '10000', 'เช็คระยะ 10,000 กม.', 1, 0.00, 0.00, 0.00, 'service');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-001-02', 'rep-0158-001', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 240.00, 0.00, 480.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-001-03', 'rep-0158-001', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1385.00, 0.00, 1385.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-001-04', 'rep-0158-001', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 895.00, 0.00, 895.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-001-05', 'rep-0158-001', 'A-90080-43030', 'ปะเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 14.00, 0.00, 14.00, 'part');

-- === Record 2: 20,000 km (rep-0158-002) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-01', 'rep-0158-002', '20000', 'เช็คระยะ 20,000 กม.', 1, 0.00, 0.00, 0.00, 'service');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-02', 'rep-0158-002', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 374.00, 0.00, 374.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-03', 'rep-0158-002', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 530.00, 0.00, 530.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-04', 'rep-0158-002', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 251.00, 0.00, 502.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-05', 'rep-0158-002', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1445.00, 0.00, 1445.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-06', 'rep-0158-002', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 750.00, 0.00, 750.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-002-07', 'rep-0158-002', 'A-90080-43030', 'ปะเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 19.00, 0.00, 19.00, 'part');

-- === Record 3: 30,000 km (rep-0158-003) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-003-01', 'rep-0158-003', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 251.00, 0.00, 502.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-003-02', 'rep-0158-003', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1445.00, 0.00, 1445.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-003-03', 'rep-0158-003', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 975.00, 0.00, 975.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-003-04', 'rep-0158-003', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-003-05', 'rep-0158-003', 'CS0019', 'พ่นน้ำยาทำความสะอาดในห้องโดยสาร', 1, 0.00, 0.00, 0.00, 'service');

-- === Record 4: 40,000 km (rep-0158-004) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-004-01', 'rep-0158-004', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-004-02', 'rep-0158-004', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-004-03', 'rep-0158-004', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 995.00, 0.00, 995.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-004-04', 'rep-0158-004', 'A-23390-YZZE4', 'ไส้กรองน้ำมันเชื้อเพลิง', 1, 1195.00, 0.00, 1195.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-004-05', 'rep-0158-004', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part');

-- === Record 5: 50,000 km (rep-0158-005) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-005-01', 'rep-0158-005', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-005-02', 'rep-0158-005', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-005-03', 'rep-0158-005', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 975.00, 0.00, 975.00, 'part');

-- === Record 6: 60,000 km (rep-0158-006) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-006-01', 'rep-0158-006', '20000', 'ค่าแรงเช็คระยะ 20,000 กม.', 1, 2400.00, 0.00, 2400.00, 'service');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-006-02', 'rep-0158-006', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 374.00, 0.00, 374.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-006-03', 'rep-0158-006', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 530.00, 0.00, 530.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-006-04', 'rep-0158-006', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 995.00, 0.00, 995.00, 'part');

-- === Record 7: 90,000 km — battery (rep-0158-007) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-007-01', 'rep-0158-007', 'A-28800-YZZRV', 'แบตเตอรี่ 105D31R MF', 2, 3850.00, 0.00, 7700.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-007-02', 'rep-0158-007', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 1010.00, 0.00, 1010.00, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-007-03', 'rep-0158-007', '190011', 'เปลี่ยนแบตเตอรี่ (ค่าแรง)', 1, 156.00, 0.00, 156.00, 'labour');

-- === Record 8: 100,000 km (rep-0158-008) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-008-01', 'rep-0158-008', '12099', 'น้ำยาทำความสะอาดเครื่องยนต์', 1, 462.80, 0.00, 462.80, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-008-02', 'rep-0158-008', '14199', 'น้ำยาทำความสะอาดวาล์ว', 1, 462.80, 0.00, 462.80, 'part');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type)
VALUES ('ri-0158-008-03', 'rep-0158-008', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part');

-- ============================================================
-- UPDATE current_mileage
-- ============================================================
UPDATE cars SET current_mileage = 39704 WHERE id = '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3' AND (current_mileage IS NULL OR current_mileage < 39704);

-- ============================================================
-- SYNC vehicle_maintenance from repair history
-- ============================================================

-- engine_oil: last at 39,704 km (2026-02-26) — every 10,000 km / 6 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-0158-engine_oil', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3', 'engine_oil', 39704, '2026-02-26', 49704, '2026-08-26', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- oil_filter: last at 39,704 km (2026-02-26) — every 10,000 km / 6 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-0158-oil_filter', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3', 'oil_filter', 39704, '2026-02-26', 49704, '2026-08-26', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- fuel_filter: last at 12,477 km (2023-08-04) — every 20,000 km / 12 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-0158-fuel_filter', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3', 'fuel_filter', 12477, '2023-08-04', 32477, '2024-08-04', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- injector_cleaning: last at 29,506 km (2025-07-10) — every 20,000 km / 12 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-0158-injector_cleaning', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3', 'injector_cleaning', 29506, '2025-07-10', 49506, '2026-07-10', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- battery: last at 29,506 km (2025-07-10) — every 24 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-0158-battery', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3', 'battery', 29506, '2025-07-10', NULL, '2027-07-10', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- ac_service: last at 39,704 km (2026-02-26) — every 12 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-0158-ac_service', '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3', 'ac_service', 39704, '2026-02-26', NULL, '2027-02-26', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

PRAGMA foreign_keys = ON;
