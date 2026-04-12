-- Import historical repair data for นข 2455 พย (TOYOTA Commuter)
-- PART 3: Records 41-56 (2022-09-05 to 2026-03-28)
-- 16 repair records + 38 repair items + vehicle_maintenance sync + mileage update
-- Mileage range 331,245 to 401,254 km

PRAGMA foreign_keys = OFF;

-- ============================================================
-- REPAIR LOG (Records 41-56)
-- ============================================================

-- 41. งานซ่อมระบบขับเคลื่อน (เพลากลาง)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-041', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2022-09-05', '2022-09-05', 'completed',
  'เปลี่ยนกากบาทเพลากลาง, อัดจาระบีช่วงล่าง (เนื่องจากมีอาการสั่นขณะออกตัว)', 'repair',
  'โตโยต้าพะเยา (1994)',
  331245, 331245,
  850.00, 2066.36, 145.00, 204.14, 3120.50,
  'REP22-02684', '2022-09-05T12:00:00Z', '2022-09-05T12:00:00Z'
);

-- 42. เช็คระยะ 330,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-042', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2022-11-18', '2022-11-18', 'completed',
  'เช็คระยะปกติ, ล้างเครื่องยนต์, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  334152, 334152,
  1125.00, 2725.89, 0.00, 269.56, 4120.45,
  'REP22-03412', '2022-11-18T12:00:00Z', '2022-11-18T12:00:00Z'
);

-- 43. งานซ่อมระบบเบรก (เบรกหลัง)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-043', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2023-02-14', '2023-02-14', 'completed',
  'เปลี่ยนกระบอกเบรกหลัง ซ้าย-ขวา, ทำความสะอาดเบรกหลัง', 'repair',
  'โตโยต้าพะเยา (1994)',
  338452, 338452,
  850.00, 3122.24, 230.00, 278.06, 4250.30,
  'REP23-00451', '2023-02-14T12:00:00Z', '2023-02-14T12:00:00Z'
);

-- 44. เช็คระยะ 340,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-044', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2023-05-22', '2023-05-22', 'completed',
  'เปลี่ยนน้ำมันเกียร์, เปลี่ยนน้ำมันเฟืองท้าย, สลับยาง-ถ่วงล้อ', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  341254, 341254,
  266.00, 5762.60, 0.00, 422.00, 6450.60,
  'REP23-01254', '2023-05-22T12:00:00Z', '2023-05-22T12:00:00Z'
);

-- 45. งานซ่อมระบบสตาร์ท (มอเตอร์สตาร์ท)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-045', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2023-07-10', '2023-07-10', 'completed',
  'เปลี่ยนแปรงถ่านมอเตอร์สตาร์ท, ทำความสะอาดไดสตาร์ท (สตาร์ทติดยากบางครั้ง)', 'repair',
  'โตโยต้าพะเยา (1994)',
  344582, 344582,
  850.00, 1150.47, 0.00, 140.03, 2140.50,
  'REP23-01852', '2023-07-10T12:00:00Z', '2023-07-10T12:00:00Z'
);

-- 46. เช็คระยะ 350,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-046', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2023-10-15', '2023-10-15', 'completed',
  'เช็คระยะปกติ, เปลี่ยนไส้กรองอากาศ', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  350141, 350141,
  0.00, 3196.54, 85.00, 223.76, 3420.30,
  'REP23-02654', '2023-10-15T12:00:00Z', '2023-10-15T12:00:00Z'
);

-- 47. งานซ่อมระบบพวงมาลัยพาวเวอร์
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-047', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2023-12-05', '2023-12-05', 'completed',
  'เปลี่ยนสายพานหน้าเครื่อง, เปลี่ยนลูกรอกสายพาน (มีเสียงหอนขณะเลี้ยว)', 'repair',
  'โตโยต้าพะเยา (1994)',
  354152, 354152,
  0.00, 4536.64, 350.00, 317.56, 4854.20,
  'REP23-03214', '2023-12-05T12:00:00Z', '2023-12-05T12:00:00Z'
);

-- 48. เช็คระยะ 360,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-048', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2024-03-12', '2024-03-12', 'completed',
  'เช็คระยะปกติ, ล้างแอร์ Fresh Car', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  361245, 361245,
  0.00, 5065.70, 0.00, 354.60, 5420.30,
  'REP24-00412', '2024-03-12T12:00:00Z', '2024-03-12T12:00:00Z'
);

-- 49. งานซ่อมช่วงล่าง (บูชปีกนก)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-049', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2024-06-20', '2024-06-20', 'completed',
  'เปลี่ยนบูชปีกนกล่าง ซ้าย-ขวา, ตั้งศูนย์ล้อ', 'repair',
  'โตโยต้าพะเยา (1994)',
  366412, 366412,
  1450.00, 3335.47, 170.00, 334.98, 5120.45,
  'REP24-01245', '2024-06-20T12:00:00Z', '2024-06-20T12:00:00Z'
);

-- 50. เช็คระยะ 370,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-050', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2024-09-10', '2024-09-10', 'completed',
  'เปลี่ยนน้ำมันเครื่อง/ไส้กรอง, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  371244, 371244,
  945.00, 2657.00, 0.00, 252.14, 3854.14,
  'REP24-02054', '2024-09-10T12:00:00Z', '2024-09-10T12:00:00Z'
);

-- 51. งานซ่อมระบบปรับอากาศ (คอมเพรสเซอร์)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-051', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2024-12-05', '2024-12-05', 'completed',
  'เปลี่ยนชุดคลัทช์คอมเพรสเซอร์แอร์, เปลี่ยนลูกปืนมู่เล่ (แอร์มีเสียงดัง)', 'repair',
  'โตโยต้าพะเยา (1994)',
  375412, 375412,
  1250.00, 3282.99, 285.00, 317.31, 4850.30,
  'REP24-03122', '2024-12-05T12:00:00Z', '2024-12-05T12:00:00Z'
);

-- 52. เช็คระยะ 380,000 กม. (รอบใหญ่)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-052', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2025-03-14', '2025-03-14', 'completed',
  'เปลี่ยนน้ำมันเกียร์, เปลี่ยนน้ำมันเฟืองท้าย, เปลี่ยนน้ำมันเบรก-คลัทช์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  381254, 381254,
  1620.00, 4785.89, 0.00, 448.41, 6854.30,
  'REP25-00458', '2025-03-14T12:00:00Z', '2025-03-14T12:00:00Z'
);

-- 53. งานซ่อมระบบเชื้อเพลิง (ปั๊มติ๊ก)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-053', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2025-06-20', '2025-06-20', 'completed',
  'เปลี่ยนมอเตอร์ปั๊มน้ำมันเชื้อเพลิง (ปั๊มติ๊ก), เปลี่ยนไส้กรองน้ำมันเชื้อเพลิงในถัง', 'repair',
  'โตโยต้าพะเยา (1994)',
  385854, 385854,
  1450.00, 3615.84, 370.00, 354.61, 5420.45,
  'REP25-01254', '2025-06-20T12:00:00Z', '2025-06-20T12:00:00Z'
);

-- 54. เช็คระยะ 390,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-054', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2025-10-10', '2025-10-10', 'completed',
  'เปลี่ยนน้ำมันเครื่อง/ไส้กรอง, ล้างเครื่องยนต์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  391245, 391245,
  0.00, 2916.03, 0.00, 204.12, 3120.15,
  'REP25-02214', '2025-10-10T12:00:00Z', '2025-10-10T12:00:00Z'
);

-- 55. งานซ่อมช่วงล่างล่าสุด (ลูกหมาก)
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-055', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2026-01-15', '2026-01-15', 'completed',
  'เปลี่ยนลูกหมากคันชักนอก ซ้าย-ขวา, สลับยาง-ถ่วงล้อ', 'repair',
  'โตโยต้าพะเยา (1994)',
  396412, 396412,
  1250.00, 2348.41, 170.00, 251.89, 3850.30,
  'REP26-00152', '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'
);

-- 56. เช็คระยะล่าสุด 400,000 กม.
INSERT OR IGNORE INTO repair_log (
  id, car_id, date_reported, date_completed, status,
  issue_description, service_type, garage_name,
  mileage_at_repair, mileage_out,
  labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
  invoice_number, created_at, updated_at
) VALUES (
  'rep-2455-056', 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  '2026-03-28', '2026-03-28', 'completed',
  'เช็คระยะ 4 แสนโล, เปลี่ยนหัวเทียนไอริเดียม, ล้างแอร์', 'scheduled_maintenance',
  'โตโยต้าพะเยา (1994)',
  401254, 401254,
  1850.00, 6509.93, 0.00, 585.19, 8945.12,
  'REP26-00894', '2026-03-28T12:00:00Z', '2026-03-28T12:00:00Z'
);

-- ============================================================
-- REPAIR ITEMS (Records 41-56)
-- ============================================================

-- === Record 41: เพลากลาง (rep-2455-041) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-041-01', 'rep-2455-041', 'A-37401-60041', 'กากบาทเพลากลาง', 1, 1450.00, 145.00, 1305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-041-02', 'rep-2455-041', '370011', 'เปลี่ยนกากบาทเพลากลาง (ค่าแรง)', 1, 850.00, 0.00, 850.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 42: 330,000 km (rep-2455-042) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-042-01', 'rep-2455-042', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-042-02', 'rep-2455-042', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-042-03', 'rep-2455-042', '22899', 'ล้างหัวฉีดเบนซิน (ค่าแรง)', 1, 1125.00, 0.00, 1125.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 43: กระบอกเบรกหลัง (rep-2455-043) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-043-01', 'rep-2455-043', 'A-47550-09130', 'กระบอกเบรกหลัง', 2, 1150.00, 230.00, 2070.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-043-02', 'rep-2455-043', '475501', 'เปลี่ยนกระบอกเบรกหลัง (ค่าแรง)', 1, 850.00, 0.00, 850.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 44: 340,000 km (rep-2455-044) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-044-01', 'rep-2455-044', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-044-02', 'rep-2455-044', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90GL-5', 30, 12.50, 0.00, 375.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-044-03', 'rep-2455-044', '420018', 'สลับยางและถ่วงล้อ', 1, 266.00, 0.00, 266.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 45: มอเตอร์สตาร์ท (rep-2455-045) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-045-01', 'rep-2455-045', 'A-28120-0C010', 'ชุดแปรงถ่านมอเตอร์สตาร์ท', 1, 450.00, 0.00, 450.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-045-02', 'rep-2455-045', '281001', 'ถอดประกอบและซ่อมไดสตาร์ท (ค่าแรง)', 1, 850.00, 0.00, 850.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 46: 350,000 km (rep-2455-046) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-046-01', 'rep-2455-046', 'A-17801-0C010', 'ไส้กรองอากาศ', 1, 850.00, 85.00, 765.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-046-02', 'rep-2455-046', 'A-08880-84675', 'นมค.กึ่งสังเคราะห์เขียว_G', 1, 900.00, 0.00, 900.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 47: สายพานหน้าเครื่อง (rep-2455-047) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-047-01', 'rep-2455-047', 'A-90916-T2024', 'สายพานหน้าเครื่อง', 1, 1350.00, 135.00, 1215.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-047-02', 'rep-2455-047', 'A-16620-0L020', 'ชุดตัวตั้งสายพาน', 1, 2150.00, 215.00, 1935.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 48: 360,000 km (rep-2455-048) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-048-01', 'rep-2455-048', 'B-PT202B', 'น้ำยาล้างแอร์เฟรชคาร์', 1, 1450.00, 0.00, 1450.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-048-02', 'rep-2455-048', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 49: บูชปีกนก (rep-2455-049) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-049-01', 'rep-2455-049', 'A-48655-0K040', 'บูชปีกนกล่าง ตัวใหญ่', 2, 850.00, 170.00, 1530.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-049-02', 'rep-2455-049', '480011', 'เปลี่ยนบูชปีกนกและตั้งศูนย์ (ค่าแรง)', 1, 1450.00, 0.00, 1450.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 50: 370,000 km (rep-2455-050) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-050-01', 'rep-2455-050', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-050-02', 'rep-2455-050', 'A-08880-84675', 'นมค.กึ่งสังเคราะห์เขียว_G', 1, 900.00, 0.00, 900.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-050-03', 'rep-2455-050', '22899', 'ล้างหัวฉีดเบนซิน (ค่าแรง)', 1, 945.00, 0.00, 945.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 51: คลัทช์คอมเพรสเซอร์ (rep-2455-051) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-051-01', 'rep-2455-051', 'A-88410-0K010', 'ชุดคลัทช์คอมเพรสเซอร์', 1, 2850.00, 285.00, 2565.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-051-02', 'rep-2455-051', '883001', 'เปลี่ยนชุดคลัทช์แอร์ (ค่าแรง)', 1, 1250.00, 0.00, 1250.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 52: 380,000 km (rep-2455-052) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-052-01', 'rep-2455-052', 'A-08886-80905', 'น้ำมันเกียร์ TYPE T-IV', 1, 1310.00, 0.00, 1310.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-052-02', 'rep-2455-052', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90GL-5', 30, 12.50, 0.00, 375.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-052-03', 'rep-2455-052', '80000', 'ค่าแรงเช็คระยะรอบใหญ่', 1, 1620.00, 0.00, 1620.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 53: ปั๊มเชื้อเพลิง (rep-2455-053) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-053-01', 'rep-2455-053', 'A-23221-0C010', 'มอเตอร์ปั๊มเชื้อเพลิง', 1, 2450.00, 245.00, 2205.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-053-02', 'rep-2455-053', 'A-23300-0L030', 'ไส้กรองน้ำมันเชื้อเพลิง', 1, 1250.00, 125.00, 1125.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-053-03', 'rep-2455-053', '232101', 'งานถอดถังน้ำมันเปลี่ยนปั๊ม (ค่าแรง)', 1, 1450.00, 0.00, 1450.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 54: 390,000 km (rep-2455-054) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-054-01', 'rep-2455-054', 'A-08880-84675', 'นมค.กึ่งสังเคราะห์เขียว_G', 1, 900.00, 0.00, 900.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-054-02', 'rep-2455-054', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', '2026-04-12T00:00:00Z');

-- === Record 55: ลูกหมากคันชักนอก (rep-2455-055) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-055-01', 'rep-2455-055', 'A-45046-09251', 'ลูกหมากคันชักนอก', 2, 850.00, 170.00, 1530.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-055-02', 'rep-2455-055', '450461', 'เปลี่ยนลูกหมากและตั้งศูนย์ (ค่าแรง)', 1, 1250.00, 0.00, 1250.00, 'labour', '2026-04-12T00:00:00Z');

-- === Record 56: 400,000 km (rep-2455-056) ===
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-056-01', 'rep-2455-056', 'A-90919-01191', 'หัวเทียนไอริเดียม', 4, 720.00, 0.00, 2880.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-056-02', 'rep-2455-056', 'B-PT202B', 'น้ำยาล้างแอร์เฟรชคาร์', 1, 1450.00, 0.00, 1450.00, 'part', '2026-04-12T00:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, created_at)
VALUES ('ri-2455-056-03', 'rep-2455-056', '100001', 'ค่าแรงเช็คระยะ 400,000 กม.', 1, 1850.00, 0.00, 1850.00, 'labour', '2026-04-12T00:00:00Z');

-- ============================================================
-- UPDATE current_mileage
-- ============================================================
UPDATE cars SET current_mileage = 401254 WHERE id = 'd5685d4b-914f-4140-8de6-6050a514ae9b' AND (current_mileage IS NULL OR current_mileage < 401254);

-- ============================================================
-- SYNC vehicle_maintenance from repair history
-- ============================================================

-- engine_oil: last at 391,245 km (2025-10-10) record 54
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-engine_oil', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'engine_oil', 391245, '2025-10-10', 401245, '2026-04-10', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- oil_filter: last at 326,966 km (2022-04-18) record 39
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-oil_filter', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'oil_filter', 326966, '2022-04-18', 336966, '2022-10-18', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- gear_oil: last at 381,254 km (2025-03-14) record 52
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-gear_oil', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'gear_oil', 381254, '2025-03-14', 421254, '2027-03-14', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- differential_oil: last at 381,254 km (2025-03-14) record 52
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-differential_oil', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'differential_oil', 381254, '2025-03-14', 461254, '2029-03-14', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- brake_fluid: last at 381,254 km (2025-03-14) record 52
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-brake_fluid', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'brake_fluid', 381254, '2025-03-14', 421254, '2027-03-14', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- brake_pad: latest brake-pad replacement at 280,422 km (2019-10-08) record 30
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-brake_pad', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'brake_pad', 280422, '2019-10-08', 320422, '2021-10-08', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- air_filter: last at 350,141 km (2023-10-15) record 46
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-air_filter', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'air_filter', 350141, '2023-10-15', 370141, '2024-10-15', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- timing_belt: last at 201,368 km (2016-11-29) record 20
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-timing_belt', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'timing_belt', 201368, '2016-11-29', 351368, '2022-11-29', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- serpentine_belt: last at 354,152 km (2023-12-05) record 47
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-serpentine_belt', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'serpentine_belt', 354152, '2023-12-05', 434152, '2027-12-05', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- injector_cleaning: last at 371,244 km (2024-09-10) record 50
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-injector_cleaning', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'injector_cleaning', 371244, '2024-09-10', 391244, '2025-09-10', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

-- tire_rotation: last at 396,412 km (2026-01-15) record 55
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-2455-tire_rotation', 'd5685d4b-914f-4140-8de6-6050a514ae9b', 'tire_rotation', 396412, '2026-01-15', 406412, '2026-07-15', '2026-04-12T00:00:00Z')
ON CONFLICT(car_id, item_key) DO UPDATE SET last_km=excluded.last_km, last_date=excluded.last_date, next_km=excluded.next_km, next_date=excluded.next_date, updated_at=excluded.updated_at;

PRAGMA foreign_keys = ON;
