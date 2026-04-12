-- Import historical repair data for นข 2455 พย (TOYOTA Commuter)
-- PART 2: Records 21-40 (2017-03-24 to 2022-06-12)
-- 20 repair records + 44 repair items, mileage range 211,245 to 328,541 km

PRAGMA foreign_keys = OFF;

-- ============================================================
-- REPAIR LOG (Records 21-40)
-- ============================================================

-- 21. เช็คระยะ 210,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-021', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2017-03-24', '2017-03-24', 'completed',
  'เช็คระยะปกติ, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  211245, 211245,
  0.00, 3004.80, 0.00, 210.34, 3215.14,
  'REP17-00512', '2017-03-24T12:00:00Z', '2017-03-24T12:00:00Z'
);

-- 22. เช็คระยะ 220,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-022', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2017-07-18', '2017-07-18', 'completed',
  'เช็คระยะ 220,000 กม., เปลี่ยนน้ำมันเบรก-คลัทช์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  220541, 220541,
  450.00, 3050.19, 0.00, 245.01, 3745.20,
  'REP17-01856', '2017-07-18T12:00:00Z', '2017-07-18T12:00:00Z'
);

-- 23. งานซ่อมช่วงล่าง (เปลี่ยนโช้คอัพหน้า)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-023', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2017-09-12', '2017-09-12', 'completed',
  'เปลี่ยนโช้คอัพหน้า ซ้าย-ขวา, ยางกันฝุ่นโช้ค', 'repair',
  'โตโยต้าพะเยา (1994)',
  224152, 224152,
  900.00, 4557.94, 390.00, 382.06, 5840.00,
  'REP17-02451', '2017-09-12T12:00:00Z', '2017-09-12T12:00:00Z'
);

-- 24. เช็คระยะ 230,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-024', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2017-12-04', '2017-12-04', 'completed',
  'เช็คระยะปกติ, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  231244, 231244,
  945.00, 2657.00, 0.00, 252.14, 3854.14,
  'REP17-03485', '2017-12-04T12:00:00Z', '2017-12-04T12:00:00Z'
);

-- 25. เช็คระยะ 240,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-025', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2018-04-10', '2018-04-10', 'completed',
  'เปลี่ยนน้ำมันเกียร์, เปลี่ยนน้ำมันเฟืองท้าย, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  241582, 241582,
  1620.00, 4785.89, 0.00, 448.41, 6854.30,
  'REP18-01024', '2018-04-10T12:00:00Z', '2018-04-10T12:00:00Z'
);

-- 26. เช็คระยะ 250,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-026', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2018-08-22', '2018-08-22', 'completed',
  'เช็คระยะปกติ, เปลี่ยนยางปัดน้ำฝน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  252141, 252141,
  0.00, 3224.44, 0.00, 225.71, 3450.15,
  'REP18-02154', '2018-08-22T12:00:00Z', '2018-08-22T12:00:00Z'
);

-- 27. งานซ่อมระบบไฟฟ้า (มอเตอร์พัดลมหม้อน้ำ)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-027', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2018-10-15', '2018-10-15', 'completed',
  'เปลี่ยนมอเตอร์พัดลมหม้อน้ำ (มีเสียงดัง/ไม่หมุน)', 'repair',
  'โตโยต้าพะเยา (1994)',
  256412, 256412,
  450.00, 3484.91, 315.00, 275.44, 4210.35,
  'REP18-02852', '2018-10-15T12:00:00Z', '2018-10-15T12:00:00Z'
);

-- 28. เช็คระยะ 260,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-028', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2018-12-28', '2018-12-28', 'completed',
  'เช็คระยะปกติ, ล้างแอร์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  263124, 263124,
  450.00, 4086.64, 0.00, 317.56, 4854.20,
  'REP18-03852', '2018-12-28T12:00:00Z', '2018-12-28T12:00:00Z'
);

-- 29. เช็คระยะ 270,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-029', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2019-05-14', '2019-05-14', 'completed',
  'เช็คระยะปกติ, ล้างหัวฉีด', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  271854, 271854,
  1125.00, 2725.89, 0.00, 269.56, 4120.45,
  'REP19-01245', '2019-05-14T12:00:00Z', '2019-05-14T12:00:00Z'
);

-- 30. เช็คระยะ 280,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-030', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2019-10-08', '2019-10-08', 'completed',
  'เปลี่ยนน้ำมันเกียร์, เฟืองท้าย, น้ำมันเบรก, เปลี่ยนชุดผ้าเบรกหลัง', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  280422, 280422,
  450.00, 7255.72, 185.00, 539.40, 8245.12,
  'REP19-03024', '2019-10-08T12:00:00Z', '2019-10-08T12:00:00Z'
);

-- 31. เช็คระยะ 290,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-031', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2020-03-22', '2020-03-22', 'completed',
  'เช็คระยะปกติ, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  290412, 290412,
  945.00, 2657.00, 0.00, 252.14, 3854.14,
  'REP20-00854', '2020-03-22T12:00:00Z', '2020-03-22T12:00:00Z'
);

-- 32. เช็คระยะ 300,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-032', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2020-08-14', '2020-08-14', 'completed',
  'เปลี่ยนสายพานเครื่องยนต์, เปลี่ยนหัวเทียนไอริเดียม, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  301254, 301254,
  350.00, 8482.34, 135.00, 618.26, 9450.60,
  'REP20-02452', '2020-08-14T12:00:00Z', '2020-08-14T12:00:00Z'
);

-- 33. งานซ่อมระบบปรับอากาศ (คอยล์เย็น)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-033', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2020-10-05', '2020-10-05', 'completed',
  'เปลี่ยนคอยล์เย็นแอร์หน้า, เติมน้ำยาแอร์ (เนื่องจากแอร์ไม่เย็น/รั่ว)', 'repair',
  'โตโยต้าพะเยา (1994)',
  304152, 304152,
  2250.00, 5077.10, 425.00, 512.90, 7840.00,
  'REP20-03124', '2020-10-05T12:00:00Z', '2020-10-05T12:00:00Z'
);

-- 34. เช็คระยะ 310,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-034', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2021-02-18', '2021-02-18', 'completed',
  'เช็คระยะปกติ, ล้างตู้แอร์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  311245, 311245,
  450.00, 4086.64, 0.00, 317.56, 4854.20,
  'REP21-00412', '2021-02-18T12:00:00Z', '2021-02-18T12:00:00Z'
);

-- 35. งานซ่อมจุกจิก (หลอดไฟและกลอนประตู)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-035', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2021-04-12', '2021-04-12', 'completed',
  'เปลี่ยนหลอดไฟท้าย, ซ่อมกลอนประตูหลังสไลด์ติดขัด', 'repair',
  'โตโยต้าพะเยา (1994)',
  314582, 314582,
  450.00, 709.35, 0.00, 81.15, 1240.50,
  'REP21-00958', '2021-04-12T12:00:00Z', '2021-04-12T12:00:00Z'
);

-- 36. งานซ่อมช่วงล่าง (ลูกหมากแร็ค)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-036', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2021-06-25', '2021-06-25', 'completed',
  'เปลี่ยนลูกหมากแร็ค (ไม้ตีกลอง), เปลี่ยนยางกันฝุ่นแร็ค', 'repair',
  'โตโยต้าพะเยา (1994)',
  317854, 317854,
  850.00, 4215.70, 330.00, 354.60, 5420.30,
  'REP21-01654', '2021-06-25T12:00:00Z', '2021-06-25T12:00:00Z'
);

-- 37. เช็คระยะ 320,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-037', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2021-11-09', '2021-11-09', 'completed',
  'เปลี่ยนน้ำมันเกียร์, เปลี่ยนน้ำมันเฟืองท้าย, น้ำมันเบรก-คลัทช์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  321244, 321244,
  1620.00, 4785.89, 0.00, 448.41, 6854.30,
  'REP21-02854', '2021-11-09T12:00:00Z', '2021-11-09T12:00:00Z'
);

-- 38. งานระบบไฟฟ้า (แบตเตอรี่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-038', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2022-01-15', '2022-01-15', 'completed',
  'เปลี่ยนแบตเตอรี่ใหม่ (แคลเซียม)', 'repair',
  'โตโยต้าพะเยา (1994)',
  324152, 324152,
  0.00, 3598.13, 0.00, 251.87, 3850.00,
  'REP22-00124', '2022-01-15T12:00:00Z', '2022-01-15T12:00:00Z'
);

-- 39. เช็คระยะล่าสุด 320,000 กม. (ต่อเนื่อง)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-039', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2022-04-18', '2022-04-18', 'completed',
  'เปลี่ยนน้ำมันเครื่อง/ไส้กรอง, ตรวจเช็คสภาพทั่วไป', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  326966, 326966,
  0.00, 2289.86, 0.00, 160.29, 2450.15,
  'REP22-01054', '2022-04-18T12:00:00Z', '2022-04-18T12:00:00Z'
);

-- 40. งานซ่อมระบบระบายความร้อน (หม้อน้ำ)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-040', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2022-06-12', '2022-06-12', 'completed',
  'เปลี่ยนหม้อน้ำใหม่, เปลี่ยนท่อยางหม้อน้ำบน-ล่าง', 'repair',
  'โตโยต้าพะเยา (1994)',
  328541, 328541,
  950.00, 5455.61, 425.00, 448.39, 6854.00,
  'REP22-01852', '2022-06-12T12:00:00Z', '2022-06-12T12:00:00Z'
);

-- ============================================================
-- REPAIR ITEMS (Records 21-40)
-- ============================================================

-- === Record 21: 210,000 km (rep-2455-021) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-021-01', 'rep-2455-021', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-021-02', 'rep-2455-021', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 22: 220,000 km (rep-2455-022) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-022-01', 'rep-2455-022', 'A-08823-80040', 'น้ำมันเบรค_คลัทช์', 2, 115.00, 0.00, 230.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-022-02', 'rep-2455-022', '47399', 'งานล้างทำความสะอาดเบรก', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 23: ซ่อมโช้คอัพหน้า (rep-2455-023) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-023-01', 'rep-2455-023', 'A-48510-09L40', 'โช้คอัพหน้า', 2, 1950.00, 390.00, 3510.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-023-02', 'rep-2455-023', '43199', 'งานเปลี่ยนโช้คอัพหน้า', 2, 450.00, 0.00, 900.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 24: 230,000 km (rep-2455-024) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-024-01', 'rep-2455-024', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-024-02', 'rep-2455-024', '22899', 'ล้างหัวฉีดเบนซิน (ค่าแรง)', 1, 945.00, 0.00, 945.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 25: 240,000 km (rep-2455-025) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-025-01', 'rep-2455-025', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-025-02', 'rep-2455-025', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90GL-5', 30, 12.50, 0.00, 375.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-025-03', 'rep-2455-025', '80000', 'ค่าแรงเช็คระยะ 80,000 กม. (รอบวน)', 1, 1620.00, 0.00, 1620.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 26: 250,000 km (rep-2455-026) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-026-01', 'rep-2455-026', 'A-85214-48010', 'ยางใบปัดน้ำฝน', 2, 345.00, 0.00, 690.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-026-02', 'rep-2455-026', 'A-08880-83011', 'นมค.กึ่งสังเคราะห์_G', 1, 820.00, 0.00, 820.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 27: ซ่อมมอเตอร์พัดลมหม้อน้ำ (rep-2455-027) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-027-01', 'rep-2455-027', 'A-16363-20390', 'มอเตอร์พัดลมหม้อน้ำ', 1, 3150.00, 315.00, 2835.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-027-02', 'rep-2455-027', '870151', 'เปลี่ยนมอเตอร์พัดลม (ค่าแรง)', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 28: 260,000 km (rep-2455-028) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-028-01', 'rep-2455-028', '88399', 'ล้างตู้แอร์ Air Flow', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-028-02', 'rep-2455-028', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 29: 270,000 km (rep-2455-029) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-029-01', 'rep-2455-029', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-029-02', 'rep-2455-029', '22899', 'ล้างหัวฉีดเบนซิน (ค่าแรง)', 1, 1125.00, 0.00, 1125.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 30: 280,000 km (rep-2455-030) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-030-01', 'rep-2455-030', 'A-04466-YZZE4', 'ชุดผ้าเบรกหลัง', 1, 1850.00, 185.00, 1665.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-030-02', 'rep-2455-030', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-030-03', 'rep-2455-030', '47399', 'งานล้างทำความสะอาดเบรก', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 31: 290,000 km (rep-2455-031) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-031-01', 'rep-2455-031', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-031-02', 'rep-2455-031', '22899', 'ล้างหัวฉีดเบนซิน (ค่าแรง)', 1, 945.00, 0.00, 945.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 32: 300,000 km (rep-2455-032) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-032-01', 'rep-2455-032', 'A-90916-T2024', 'สายพานหน้าเครื่อง', 1, 1350.00, 135.00, 1215.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-032-02', 'rep-2455-032', 'A-90919-01191', 'หัวเทียนไอริเดียม', 4, 720.00, 0.00, 2880.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-032-03', 'rep-2455-032', '160251', 'เปลี่ยนสายพานเครื่อง (ค่าแรง)', 1, 350.00, 0.00, 350.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 33: ซ่อมคอยล์เย็น (rep-2455-033) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-033-01', 'rep-2455-033', 'A-88501-71040', 'คอยล์เย็นแอร์หน้า', 1, 4250.00, 425.00, 3825.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-033-02', 'rep-2455-033', '885011', 'เปลี่ยนคอยล์เย็น (ค่าแรง)', 1, 2250.00, 0.00, 2250.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 34: 310,000 km (rep-2455-034) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-034-01', 'rep-2455-034', '88399', 'ล้างตู้แอร์ Air Flow', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-034-02', 'rep-2455-034', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 35: ซ่อมหลอดไฟ+กลอนประตู (rep-2455-035) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-035-01', 'rep-2455-035', 'A-90981-13044', 'หลอดไฟท้าย', 2, 90.00, 0.00, 180.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-035-02', 'rep-2455-035', '690121', 'ซ่อม/ปรับตั้งกลอนประตู', 1, 450.00, 0.00, 450.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 36: ซ่อมลูกหมากแร็ค (rep-2455-036) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-036-01', 'rep-2455-036', 'A-45503-09330', 'ลูกหมากแร็ค', 2, 1650.00, 330.00, 2970.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-036-02', 'rep-2455-036', '455031', 'เปลี่ยนลูกหมากแร็ค (ค่าแรง)', 1, 850.00, 0.00, 850.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 37: 320,000 km (rep-2455-037) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-037-01', 'rep-2455-037', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-037-02', 'rep-2455-037', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90GL-5', 30, 12.50, 0.00, 375.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-037-03', 'rep-2455-037', '80000', 'ค่าแรงเช็คระยะ (รอบวน)', 1, 1620.00, 0.00, 1620.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 38: แบตเตอรี่ (rep-2455-038) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-038-01', 'rep-2455-038', 'A-28800-YZZRT', 'แบตเตอรี่แคลเซียม 80D26R', 1, 3450.00, 0.00, 3450.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 39: เช็คระยะต่อเนื่อง (rep-2455-039) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-039-01', 'rep-2455-039', 'A-08880-84675', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 900.00, 0.00, 900.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-039-02', 'rep-2455-039', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 40: ซ่อมหม้อน้ำ (rep-2455-040) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-040-01', 'rep-2455-040', 'A-16400-0L140', 'หม้อน้ำ', 1, 4250.00, 425.00, 3825.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-040-02', 'rep-2455-040', 'A-16571-0L030', 'ท่อยางหม้อน้ำ', 1, 350.00, 0.00, 350.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-040-03', 'rep-2455-040', '160011', 'เปลี่ยนหม้อน้ำ (ค่าแรง)', 1, 950.00, 0.00, 950.00, 'labour', '2026-04-12T00:00:00Z');

PRAGMA foreign_keys = ON;
