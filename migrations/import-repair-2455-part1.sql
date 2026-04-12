-- Import historical repair data for นข 2455 พย (TOYOTA Commuter)
-- PART 1: Records 1-20 (2011-04-19 to 2016-11-29)
-- 20 repair records + 56 repair items, mileage range 9,219 to 201,368 km

PRAGMA foreign_keys = OFF;

-- ============================================================
-- REPAIR LOG (Records 1-20)
-- ============================================================

-- 1. เช็คระยะ 10,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-001', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2011-04-19', '2011-04-19', 'completed',
  'เช็คระยะ 10,000 กม. / 6 เดือน, เปลี่ยนน้ำมันเครื่อง/ไส้กรอง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  9219, 9219,
  0.00, 1148.00, 0.00, 80.36, 1228.36,
  'GSJ11-02685', '2011-04-19T12:00:00Z', '2011-04-19T12:00:00Z'
);

-- 2. เช็คระยะ 20,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-002', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2011-07-15', '2011-07-15', 'completed',
  'เช็คระยะ 20,000 กม. / 12 เดือน, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  19436, 19436,
  0.00, 1999.36, 0.00, 139.95, 2139.31,
  'GSJ11-04875', '2011-07-15T12:00:00Z', '2011-07-15T12:00:00Z'
);

-- 3. เช็คระยะ 30,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-003', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2011-10-18', '2011-10-18', 'completed',
  'เช็คระยะ 30,000 กม. / 18 เดือน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  29145, 29145,
  0.00, 1498.00, 19.50, 104.86, 1602.86,
  'TAX11-07085', '2011-10-18T12:00:00Z', '2011-10-18T12:00:00Z'
);

-- 4. เช็คระยะ 40,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-004', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-01-12', '2012-01-12', 'completed',
  'เช็คระยะ 40,000 กม., เปลี่ยนน้ำมันเบรก-คลัทช์, สลับยางถ่วงล้อ', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  39245, 39245,
  239.40, 1747.32, 26.60, 139.07, 2125.79,
  'TAX12-00342', '2012-01-12T12:00:00Z', '2012-01-12T12:00:00Z'
);

-- 5. เช็คระยะ 50,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-005', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-04-18', '2012-04-18', 'completed',
  'เช็คระยะ 50,000 กม. / 30 เดือน, ล้างตู้แอร์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  48154, 48154,
  450.00, 2818.00, 0.00, 228.76, 3496.76,
  'TAX12-03482', '2012-04-18T12:00:00Z', '2012-04-18T12:00:00Z'
);

-- 6. เช็คระยะ 60,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-006', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-08-01', '2012-08-01', 'completed',
  'เช็คระยะ 60,000 กม., เปลี่ยนน้ำมันเครื่อง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  58162, 58162,
  607.50, 1659.62, 147.50, 158.70, 2425.82,
  'TAX12-06785', '2012-08-01T12:00:00Z', '2012-08-01T12:00:00Z'
);

-- 7. งานซ่อมช่วงล่าง (เปลี่ยนลูกปืนล้อ)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-007', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-09-20', '2012-09-20', 'completed',
  'เปลี่ยนลูกปืนล้อหน้า ซ้าย-ขวา', 'repair',
  'โตโยต้าพะเยา (1994)',
  62544, 62544,
  810.00, 4255.70, 460.00, 354.60, 5420.30,
  'TAX12-08641', '2012-09-20T12:00:00Z', '2012-09-20T12:00:00Z'
);

-- 8. เช็คระยะ 70,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-008', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2012-11-28', '2012-11-28', 'completed',
  'เช็คระยะ 70,000 กม., ล้างหัวฉีด', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  69541, 69541,
  786.60, 1899.51, 87.40, 188.03, 2874.14,
  'TAX12-11425', '2012-11-28T12:00:00Z', '2012-11-28T12:00:00Z'
);

-- 9. เช็คระยะ 80,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-009', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2013-03-05', '2013-03-05', 'completed',
  'เปลี่ยนน้ำมันเครื่อง, เกียร์, เฟืองท้าย, น้ำมันเบรก', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  78966, 78966,
  1231.20, 4779.22, 136.80, 420.73, 6431.15,
  'TAX13-01452', '2013-03-05T12:00:00Z', '2013-03-05T12:00:00Z'
);

-- 10. เช็คระยะ 90,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-010', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2013-06-12', '2013-06-12', 'completed',
  'เช็คระยะ 90,000 กม., ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  89451, 89451,
  765.00, 2134.49, 85.00, 202.96, 3102.45,
  'TAX13-04582', '2013-06-12T12:00:00Z', '2013-06-12T12:00:00Z'
);

-- 11. เช็คระยะ 100,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-011', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2013-09-02', '2013-09-02', 'completed',
  'เช็คระยะ 1 แสนโล, เปลี่ยนหัวเทียน, เปลี่ยนชุดผ้าเบรกหน้า', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  99842, 99842,
  1026.00, 7334.09, 641.00, 585.21, 8945.30,
  'TAX13-07158', '2013-09-02T12:00:00Z', '2013-09-02T12:00:00Z'
);

-- 12. เช็คระยะ 110,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-012', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2013-12-24', '2013-12-24', 'completed',
  'เช็คระยะปกติ, ล้างแอร์ (Fresh Car)', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  109241, 109241,
  0.00, 5067.46, 0.00, 354.72, 5422.18,
  'TAX13-10451', '2013-12-24T12:00:00Z', '2013-12-24T12:00:00Z'
);

-- 13. เช็คระยะ 120,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-013', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2014-04-18', '2014-04-18', 'completed',
  'เช็คระยะ 120,000 กม., ล้างหัวฉีด', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  119154, 119154,
  931.50, 2670.50, 103.50, 252.14, 3854.14,
  'TAX14-03124', '2014-04-18T12:00:00Z', '2014-04-18T12:00:00Z'
);

-- 14. งานซ่อมใหญ่ระบบระบายความร้อน (130,000 กม.)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-014', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2014-08-11', '2014-08-11', 'completed',
  'เปลี่ยนปั๊มน้ำ, เปลี่ยนน้ำยาหล่อเย็น, เปลี่ยนสายพานหน้าเครื่อง', 'repair',
  'โตโยต้าพะเยา (1994)',
  130544, 130544,
  0.00, 6405.61, 372.00, 448.39, 6854.00,
  'TAX14-06852', '2014-08-11T12:00:00Z', '2014-08-11T12:00:00Z'
);

-- 15. เช็คระยะ 140,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-015', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2014-12-09', '2014-12-09', 'completed',
  'เช็คระยะตามรอบปกติ', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  139451, 139451,
  869.40, 1420.46, 96.60, 160.29, 2450.15,
  'TAX14-10254', '2014-12-09T12:00:00Z', '2014-12-09T12:00:00Z'
);

-- 16. เช็คระยะ 150,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-016', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2015-05-15', '2015-05-15', 'completed',
  'เช็คระยะ 150,000 กม., เปลี่ยนไส้กรองอากาศ', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  149854, 149854,
  0.00, 3593.46, 85.00, 251.54, 3845.00,
  'REP15-01854', '2015-05-15T12:00:00Z', '2015-05-15T12:00:00Z'
);

-- 17. เช็คระยะ 160,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-017', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2015-09-22', '2015-09-22', 'completed',
  'เปลี่ยนน้ำมันเกียร์, เฟืองท้าย, น้ำมันเบรก, เจียรจานเบรกหน้า', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  160244, 160244,
  810.00, 6125.05, 90.00, 485.45, 7420.50,
  'REP15-03854', '2015-09-22T12:00:00Z', '2015-09-22T12:00:00Z'
);

-- 18. เช็คระยะ 170,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-018', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2016-01-05', '2016-01-05', 'completed',
  'เช็คระยะปกติ, เปลี่ยนหลอดไฟหรี่', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  169452, 169452,
  0.00, 2197.01, 0.00, 153.79, 2350.80,
  'REP16-00124', '2016-01-05T12:00:00Z', '2016-01-05T12:00:00Z'
);

-- 19. เช็คระยะ 180,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-019', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2016-05-18', '2016-05-18', 'completed',
  'เช็คระยะ 180,000 กม., ล้างหัวฉีด, ล้างเครื่อง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  180124, 180124,
  1134.00, 2716.89, 126.00, 269.56, 4120.45,
  'REP16-01852', '2016-05-18T12:00:00Z', '2016-05-18T12:00:00Z'
);

-- 20. เช็คระยะ 200,000 กม. (รอบใหญ่เปลี่ยนสายพานไทม์มิ่ง)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-020', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2016-11-29', '2016-11-29', 'completed',
  'เปลี่ยนสายพานไทม์มิ่ง, ลูกรอกสายพาน, ซีลหน้าเครื่อง, เปลี่ยนหัวเทียน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  201368, 201368,
  1850.00, 9786.15, 628.00, 814.53, 12450.68,
  'REP16-04521', '2016-11-29T12:00:00Z', '2016-11-29T12:00:00Z'
);

-- ============================================================
-- REPAIR ITEMS (Records 1-20)
-- ============================================================

-- === Record 1: 10,000 km (rep-2455-001) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-001-01', 'rep-2455-001', '10000', 'เช็คระยะ 10,000 กม.', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-001-02', 'rep-2455-001', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 215.00, 0.00, 430.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-001-03', 'rep-2455-001', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 510.00, 0.00, 510.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-001-04', 'rep-2455-001', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 195.00, 0.00, 195.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-001-05', 'rep-2455-001', 'A-90430-12031', 'ปะเก็นรองน็อตถ่าย', 1, 13.00, 0.00, 13.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 2: 20,000 km (rep-2455-002) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-002-01', 'rep-2455-002', '20000', 'เช็คระยะ 20,000 กม.', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-002-02', 'rep-2455-002', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-002-03', 'rep-2455-002', 'B-TBCPB', 'น.ทำความสะอาดเครื่อง', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-002-04', 'rep-2455-002', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 3: 30,000 km (rep-2455-003) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-003-01', 'rep-2455-003', '30000', 'เช็คระยะ 30,000 กม.', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-003-02', 'rep-2455-003', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-003-03', 'rep-2455-003', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 195.00, 19.50, 175.50, 'part', '2026-04-12T00:00:00Z');

-- === Record 4: 40,000 km (rep-2455-004) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-004-01', 'rep-2455-004', '40000', 'เช็คระยะ 40,000 กม.', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-004-02', 'rep-2455-004', 'A-08823-80040', 'น้ำมันเบรค_คลัทช์', 2, 115.00, 0.00, 230.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-004-03', 'rep-2455-004', '420018', 'สลับยางและถ่วงล้อ', 1, 266.00, 26.60, 239.40, 'labour', '2026-04-12T00:00:00Z');

-- === Record 5: 50,000 km (rep-2455-005) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-005-01', 'rep-2455-005', '50000', 'เช็คระยะ 50,000 กม.', 1, 0.00, 0.00, 0.00, 'service', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-005-02', 'rep-2455-005', '88399', 'ล้างตู้แอร์ Air Flow', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-005-03', 'rep-2455-005', 'B-SF03B', 'น้ำยา SF03B', 1, 1375.00, 0.00, 1375.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 6: 60,000 km (rep-2455-006) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-006-01', 'rep-2455-006', '60000', 'เช็คระยะ 60,000 กม.', 1, 675.00, 67.50, 607.50, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-006-02', 'rep-2455-006', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 800.00, 80.00, 720.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 7: ซ่อมลูกปืนล้อ (rep-2455-007) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-007-01', 'rep-2455-007', 'A-90369-T0003', 'ลูกปืนล้อหน้า', 2, 1850.00, 370.00, 3330.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-007-02', 'rep-2455-007', '434081', 'เปลี่ยนลูกปืนล้อหน้า', 2, 450.00, 90.00, 810.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 8: 70,000 km (rep-2455-008) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-008-01', 'rep-2455-008', '70000', 'เช็คระยะ 70,000 กม.', 1, 874.00, 87.40, 786.60, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-008-02', 'rep-2455-008', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 9: 80,000 km (rep-2455-009) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-009-01', 'rep-2455-009', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-009-02', 'rep-2455-009', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90GL-5', 30, 12.50, 0.00, 375.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-009-03', 'rep-2455-009', '80000', 'เช็คระยะ 80,000 กม.', 1, 1368.00, 136.80, 1231.20, 'labour', '2026-04-12T00:00:00Z');

-- === Record 10: 90,000 km (rep-2455-010) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-010-01', 'rep-2455-010', '90000', 'เช็คระยะ 90,000 กม.', 1, 850.00, 85.00, 765.00, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-010-02', 'rep-2455-010', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 11: 100,000 km (rep-2455-011) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-011-01', 'rep-2455-011', '100000', 'เช็คระยะ 100,000 กม.', 1, 1140.00, 114.00, 1026.00, 'service', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-011-02', 'rep-2455-011', 'A-90919-01191', 'หัวเทียนไอริเดียม', 4, 700.00, 280.00, 2520.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-011-03', 'rep-2455-011', 'A-04465-YZZE9', 'ชุดผ้าเบรกหน้า', 1, 2470.00, 247.00, 2223.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-011-04', 'rep-2455-011', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 12: 110,000 km (rep-2455-012) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-012-01', 'rep-2455-012', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-012-02', 'rep-2455-012', 'B-PT202B', 'น้ำยาล้างแอร์เฟรชคาร์', 1, 1450.00, 0.00, 1450.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 13: 120,000 km (rep-2455-013) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-013-01', 'rep-2455-013', '120000', 'เช็คระยะ 120,000 กม.', 1, 1035.00, 103.50, 931.50, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-013-02', 'rep-2455-013', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 14: ซ่อมระบบระบายความร้อน (rep-2455-014) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-014-01', 'rep-2455-014', 'A-16100-09460', 'ชุดปั๊มน้ำ', 1, 2470.00, 247.00, 2223.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-014-02', 'rep-2455-014', 'A-90916-T2024', 'สายพานหน้าเครื่อง', 1, 1250.00, 125.00, 1125.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-014-03', 'rep-2455-014', 'A-08889-80061', 'น้ำยาเติมหม้อน้ำ', 2, 450.00, 0.00, 900.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 15: 140,000 km (rep-2455-015) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-015-01', 'rep-2455-015', '140000', 'เช็คระยะ 140,000 กม.', 1, 966.00, 96.60, 869.40, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-015-02', 'rep-2455-015', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 16: 150,000 km (rep-2455-016) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-016-01', 'rep-2455-016', 'A-17801-0C010', 'ไส้กรองอากาศ', 1, 850.00, 85.00, 765.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-016-02', 'rep-2455-016', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 17: 160,000 km (rep-2455-017) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-017-01', 'rep-2455-017', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-017-02', 'rep-2455-017', '473015', 'เจียรจานเบรกหน้า', 2, 450.00, 90.00, 810.00, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-017-03', 'rep-2455-017', 'A-08823-80040', 'น้ำมันเบรค_คลัทช์', 2, 115.00, 0.00, 230.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 18: 170,000 km (rep-2455-018) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-018-01', 'rep-2455-018', 'A-90080-81053', 'หลอดไฟหรี่', 2, 25.00, 0.00, 50.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-018-02', 'rep-2455-018', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 19: 180,000 km (rep-2455-019) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-019-01', 'rep-2455-019', '180000', 'เช็คระยะ 180,000 กม.', 1, 1260.00, 126.00, 1134.00, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-019-02', 'rep-2455-019', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-019-03', 'rep-2455-019', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 20: 200,000 km (rep-2455-020) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-020-01', 'rep-2455-020', 'A-13568-39016', 'สายพานไทม์มิ่ง', 1, 1250.00, 125.00, 1125.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-020-02', 'rep-2455-020', 'A-13505-75011', 'ลูกรอกสายพาน', 1, 2150.00, 215.00, 1935.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-020-03', 'rep-2455-020', 'A-90919-01191', 'หัวเทียนไอริเดียม', 4, 720.00, 288.00, 2592.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-020-04', 'rep-2455-020', '135001', 'เปลี่ยนสายพานไทม์มิ่ง (ค่าแรง)', 1, 1850.00, 0.00, 1850.00, 'labour', '2026-04-12T00:00:00Z');

PRAGMA foreign_keys = ON;
