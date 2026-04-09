-- ============================================================
-- Import Historical Repair Data for นข-1977 พย
-- car_id: b43ad8e2-04d0-40e0-90ab-d598bf44282d
-- Generated: 2026-04-09
-- Total records: 45 repair_log + repair_items
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ============================================================
-- 1. เช็คระยะ 10,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-001', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2009-04-08', '2009-04-08', 'completed', 7154, 7154, 'โตโยต้าพะเยา (1994)', 'โรงเรียนพะเยาพิทยาคม', 'เช็คระยะตามกำหนด 10,000 กม. / 6 เดือน', 'scheduled_maintenance', 'GSJ09-02349', 50.00, 1440.00, 0.00, 104.30, 1594.30, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-001-01', 'rep-1977-001', '10000', 'เช็คระยะ 10,000 กม.', 1, 0.00, 0.00, 0.00, 'service', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-001-02', 'rep-1977-001', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 215.00, 0.00, 430.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-001-03', 'rep-1977-001', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 820.00, 0.00, 820.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-001-04', 'rep-1977-001', 'A-90430-12031-1', 'ปะเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 15.00, 0.00, 15.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-001-05', 'rep-1977-001', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 175.00, 0.00, 175.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-001-06', 'rep-1977-001', 'WGNI29', 'น้ำยาทำความสะอาดผ้าเบรกและจานเบรก', 1, 50.00, 0.00, 50.00, 'part', 6, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 2. เช็คระยะ 20,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-002', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2009-08-04', '2009-08-04', 'completed', 17121, 17121, 'โตโยต้าพะเยา (1994)', 'ทองชิต', 'เช็คระยะ 20,000 กม., ล้างเครื่องยนต์, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance', 'GSJ09-07682', 30.00, 2203.00, 0.00, 156.31, 2389.31, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-002-01', 'rep-1977-002', '20000', 'เช็คระยะ 20,000 กม.', 1, 0.00, 0.00, 0.00, 'service', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-02', 'rep-1977-002', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 0.00, 420.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-03', 'rep-1977-002', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 0.00, 800.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-04', 'rep-1977-002', 'A-90430-12031-1', 'ปะเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 0.00, 18.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-05', 'rep-1977-002', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 175.00, 0.00, 175.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-06', 'rep-1977-002', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-07', 'rep-1977-002', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 7, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-08', 'rep-1977-002', '47399', 'ล้างทำความสะอาดผ้าเบรก', 1, 30.00, 0.00, 30.00, 'labour', 8, '2026-04-09T00:00:00.000Z'),
('ri-1977-002-09', 'rep-1977-002', 'B-PZT00', 'น้ำยาล้างเบรก', 1, 20.00, 0.00, 20.00, 'part', 9, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 3. งานซ่อมตัวถังและสี (ประกันภัย)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, garage_name, taken_by, issue_description, service_type, invoice_number, claim_number, insurance_company, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-003', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2010-04-08', '2010-04-08', 'completed', 17122, 'โตโยต้าพะเยา (1994)', 'พัชรพงษ์ หลักฐาน', 'เปลี่ยนกันชนหน้า, เปลี่ยนสเกิร์ตหน้า และงานพ่นสี', 'other', 'BPJ09-03838 / REP09-01241', '52506-รจ-6890', 'บจก. วิริยะประกันภัย', 6018.00, 15602.60, 0.00, 1513.44, 23134.04, 'รวมจากใบ BPJ09-03838: 16,694.78 และ REP09-01241: 6,439.26 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-003-01', 'rep-1977-003', 'A-52119-26928', 'กันชนหน้า', 1, 4410.00, 882.00, 3528.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-003-02', 'rep-1977-003', 'A-76081-DX010-00', 'สเกิร์ตกันชนหน้า', 1, 14350.00, 2870.00, 11480.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-003-03', 'rep-1977-003', 'A-90467-09185', 'หมุดยึด', 2, 31.00, 12.40, 49.60, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-003-04', 'rep-1977-003', 'A-PZ057-00001', 'กรอบป้ายทะเบียน Luxury', 1, 545.00, 0.00, 545.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-003-05', 'rep-1977-003', '52119AX1', 'กันชนหน้า เปลี่ยนพ่นสี', 1, 4624.00, 693.60, 3930.40, 'labour', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-003-06', 'rep-1977-003', '527661X1', 'สเกิร์ตหน้า เปลี่ยนพ่นสี', 1, 2456.00, 368.40, 2087.60, 'labour', 6, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 4. เช็คระยะ 30,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-004', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2009-12-08', '2009-12-08', 'completed', 25844, 25844, 'โตโยต้าพะเยา (1994)', 'วินัย ก่องคำ', 'เช็คระยะ 30,000 กม., ล้างตู้แอร์ (Air Flow)', 'scheduled_maintenance', 'TAX09-08125', 480.00, 2788.00, 0.00, 228.76, 3496.76, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-004-01', 'rep-1977-004', '30000', 'เช็คระยะ 30,000 กม.', 1, 0.00, 0.00, 0.00, 'service', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-02', 'rep-1977-004', '47399', 'ล้างทำความสะอาดผ้าเบรก', 1, 30.00, 0.00, 30.00, 'labour', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-03', 'rep-1977-004', '88399', 'ล้างทำความสะอาดตู้แอร์ (แอร์โฟว์)', 1, 450.00, 0.00, 450.00, 'labour', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-04', 'rep-1977-004', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 0.00, 420.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-05', 'rep-1977-004', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 0.00, 800.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-06', 'rep-1977-004', 'A-90430-12031-1', 'ปะเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 0.00, 18.00, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-07', 'rep-1977-004', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 175.00, 0.00, 175.00, 'part', 7, '2026-04-09T00:00:00.000Z'),
('ri-1977-004-08', 'rep-1977-004', 'B-SF03B', 'น้ำยา SF03B', 1, 1375.00, 0.00, 1375.00, 'part', 8, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 5. งานซ่อมเครื่องยนต์ (อาการกระตุก)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-005', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2010-02-12', '2010-02-12', 'completed', 34357, 34357, 'โตโยต้าพะเยา (1994)', 'วินัย ก่องคำ', 'ตรวจเช็คไฟรูปเครื่องยนต์โชว์ และอาการกระตุก', 'repair', 'TAX09-09742', 150.00, 0.00, 0.00, 10.50, 160.50, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-005-01', 'rep-1977-005', '12099', 'ตรวจเช็คไฟรูปเครื่องยนต์โชว์', 1, 150.00, 0.00, 150.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-005-02', 'rep-1977-005', 'FREE24', 'ตรวจเช็คสภาพฟรี 24 รายการ', 1, 0.00, 0.00, 0.00, 'service', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 6. เช็คระยะ 40,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-006', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2010-04-08', '2010-04-08', 'completed', 36147, 36147, 'โตโยต้าพะเยา (1994)', 'ทองชิต บุญเทียม', 'เช็คระยะ 40,000 กม., เปลี่ยนน้ำมันเบรก-คลัทช์', 'scheduled_maintenance', 'TAX10-00845', 50.00, 1625.50, 17.50, 117.29, 1792.79, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-006-01', 'rep-1977-006', '40000', 'เช็คระยะ 40,000 กม.', 1, 0.00, 0.00, 0.00, 'service', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-02', 'rep-1977-006', 'A-08823-80040', 'น้ำมันเบรก_คลัทช์', 2, 115.00, 0.00, 230.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-03', 'rep-1977-006', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 0.00, 420.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-04', 'rep-1977-006', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 0.00, 800.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-05', 'rep-1977-006', 'A-90430-12031-1', 'ปะเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 0.00, 18.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-06', 'rep-1977-006', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 175.00, 17.50, 157.50, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-07', 'rep-1977-006', '47399', 'งานหมวดดิสก์เบรก', 1, 30.00, 0.00, 30.00, 'labour', 7, '2026-04-09T00:00:00.000Z'),
('ri-1977-006-08', 'rep-1977-006', 'WG001', 'น้ำยาทำความสะอาดเบรก', 1, 20.00, 0.00, 20.00, 'part', 8, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 7. เช็คระยะ 50,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-007', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2010-04-08', '2010-04-08', 'completed', 46277, 46277, 'โตโยต้าพะเยา (1994)', 'เอกรัตน์ จิกไม้', 'เช็คระยะ 50,000 กม., ล้างตู้แอร์, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance', 'TAX10-06910', 135.00, 2743.00, 0.00, 201.46, 3079.46, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-007-01', 'rep-1977-007', '50000', 'เช็คระยะ 50,000 กม.', 1, 0.00, 0.00, 0.00, 'service', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-007-02', 'rep-1977-007', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 1, 210.00, 0.00, 210.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-007-03', 'rep-1977-007', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 0.00, 800.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-007-04', 'rep-1977-007', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-007-05', 'rep-1977-007', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-007-06', 'rep-1977-007', 'A-08821-80860', 'น้ำยาทำความสะอาดตู้แอร์', 1, 750.00, 0.00, 750.00, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-007-07', 'rep-1977-007', 'B-PZT00', 'น้ำยาล้างเบรก', 1, 20.00, 0.00, 20.00, 'part', 7, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 8. เช็คระยะ 60,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-008', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2010-04-08', '2010-04-08', 'completed', 59005, 59005, 'โตโยต้าพะเยา (1994)', 'เกษม ก้อนคำ', 'เช็คระยะ 60,000 กม., ล้างหัวฉีดเบนซิน, ล้างเครื่องยนต์', 'scheduled_maintenance', 'TAX10-12247', 637.50, 2052.05, 218.45, 188.27, 2877.82, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-008-01', 'rep-1977-008', '60000', 'เช็คระยะ 60,000 กม.', 1, 675.00, 67.50, 607.50, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-008-02', 'rep-1977-008', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 42.00, 378.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-008-03', 'rep-1977-008', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 80.00, 720.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-008-04', 'rep-1977-008', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 175.00, 26.25, 148.75, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-008-05', 'rep-1977-008', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-008-06', 'rep-1977-008', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 6, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 9. เช็คระยะ 70,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-009', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2011-06-10', '2011-06-10', 'completed', 71177, 71177, 'โตโยต้าพะเยา (1994)', 'เกษม ก้อนคำ', 'เช็คระยะ 70,000 กม., ล้างหัวฉีดเบนซิน, ล้างเครื่องยนต์', 'scheduled_maintenance', 'TAX11-04580', 824.60, 2201.70, 108.70, 211.84, 3238.14, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-009-01', 'rep-1977-009', '70000', 'เช็คระยะ 70,000 กม.', 1, 874.00, 87.40, 786.60, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-009-02', 'rep-1977-009', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 0.00, 420.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-009-03', 'rep-1977-009', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 0.00, 800.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-009-04', 'rep-1977-009', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 195.00, 19.50, 175.50, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-009-05', 'rep-1977-009', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-009-06', 'rep-1977-009', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-009-07', 'rep-1977-009', '47399', 'ล้างทำความสะอาดเบรก', 1, 38.00, 0.00, 38.00, 'labour', 7, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 10. เช็คระยะ 80,000 กม. (รอบใหญ่)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-010', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2011-09-14', '2011-09-14', 'completed', 83171, 83171, 'โตโยต้าพะเยา (1994)', 'วาทิต วงศ์ขัติ', 'เปลี่ยนของเหลวทั้งระบบ (น้ำมันเครื่อง, เกียร์, เฟืองท้าย, เบรก-คลัทช์), สลับยางถ่วงล้อ', 'scheduled_maintenance', 'TAX11-07798', 1508.60, 4260.70, 200.70, 403.85, 6173.15, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-010-01', 'rep-1977-010', '80000', 'เช็คระยะ 80,000 กม.', 1, 1368.00, 136.80, 1231.20, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-02', 'rep-1977-010', 'A-08886-80905', 'น้ำมันเกียร์ TYPE_T-IV', 1, 1310.00, 0.00, 1310.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-03', 'rep-1977-010', 'A-PZT01-8717D', 'น้ำมันเฟืองท้าย 90gl-5', 30, 12.50, 0.00, 375.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-04', 'rep-1977-010', 'A-08823-80040', 'น้ำมันเบรค_คลัทช์', 2, 115.00, 0.00, 230.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-05', 'rep-1977-010', 'A-35178-30010', 'แหวนรองน็อตเกียร์', 1, 68.00, 6.80, 61.20, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-06', 'rep-1977-010', 'A-12157-10010', 'แหวนรองน็อตเฟืองท้าย', 2, 46.00, 9.20, 82.80, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-07', 'rep-1977-010', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', 7, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-08', 'rep-1977-010', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 8, '2026-04-09T00:00:00.000Z'),
('ri-1977-010-09', 'rep-1977-010', '420018', 'สลับยางและถ่วงล้อ', 1, 266.00, 26.60, 239.40, 'labour', 9, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 11. เช็คระยะ 100,000 กม. (รอบใหญ่)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-011', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2012-02-29', '2012-02-29', 'completed', 100432, 100432, 'โตโยต้าพะเยา (1994)', 'เกษม ก้อนคำ', 'เปลี่ยนน้ำมันเครื่อง, เปลี่ยนหัวเทียน (4 หัว), เปลี่ยนชุดผ้าเบรกหน้า', 'scheduled_maintenance', 'TAX12-01755', 1303.40, 7147.70, 704.90, 591.58, 9042.68, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-011-01', 'rep-1977-011', '100000', 'เช็คระยะ 100,000 กม.', 1, 1140.00, 114.00, 1026.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-02', 'rep-1977-011', 'A-90919-01191', 'หัวเทียน (แอร์ริเดียม)', 4, 700.00, 280.00, 2520.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-03', 'rep-1977-011', 'A-04465-26421', 'ชุดผ้าเบรกหน้า', 1, 2470.00, 247.00, 2223.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-04', 'rep-1977-011', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 0.00, 420.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-05', 'rep-1977-011', 'A-08880-83011', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 800.00, 0.00, 800.00, 'part', 5, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-06', 'rep-1977-011', 'A-90430-12031-1', 'ปะเก็นรองน็อตถ่ายน้ำมันเครื่อง', 1, 18.00, 1.80, 16.20, 'part', 6, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-07', 'rep-1977-011', 'A-90915-20003', 'ไส้กรองน้ำมันเครื่อง', 1, 355.00, 35.50, 319.50, 'part', 7, '2026-04-09T00:00:00.000Z'),
('ri-1977-011-08', 'rep-1977-011', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 8, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 12. เช็คระยะ 110,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-012', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2012-07-17', '2012-07-17', 'completed', 112973, 112973, 'โตโยต้าพะเยา (1994)', 'อุเทน หมื่นพันธ์', 'เช็คระยะ 110,000 กม., ล้างแอร์เฟรชคาร์', 'scheduled_maintenance', 'TAX12-06207', 1331.40, 3935.70, 133.90, 368.70, 5635.80, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-012-01', 'rep-1977-012', '110000', 'เช็คระยะ 110,000 กม.', 1, 966.00, 96.60, 869.40, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-012-02', 'rep-1977-012', 'A-08880-83010', 'น้ำมันกึ่งสังเคราะห์เขียว_L', 2, 210.00, 0.00, 420.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-012-03', 'rep-1977-012', 'B-PT202B', 'น้ำยาล้างแอร์เฟรชคาร์', 1, 1450.00, 0.00, 1450.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-012-04', 'rep-1977-012', 'B-TBVL', 'ผลิตภัณฑ์หล่อลื่นบ่าวาล์ว', 1, 465.00, 0.00, 465.00, 'part', 4, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 13. เช็คระยะ 130,000 กม. (ซ่อมใหญ่ระบบระบายความร้อน)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-013', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2012-12-14', '2012-12-14', 'completed', 130724, 130724, 'โตโยต้าพะเยา (1994)', 'เอกพงษ์ ศรีชัย', 'เช็คระยะ 130,000 กม., เปลี่ยนปั๊มน้ำ, เปลี่ยนหม้อน้ำ, เปลี่ยนน้ำยาหล่อเย็น', 'scheduled_maintenance', 'REP12-05459', 1629.60, 4437.70, 431.70, 424.71, 6492.01, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-013-01', 'rep-1977-013', 'A-16100-09460', 'ปั๊มน้ำ', 1, 2170.00, 217.00, 1953.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-013-02', 'rep-1977-013', '160011', 'เปลี่ยนหม้อน้ำ', 1, 798.00, 79.80, 718.20, 'labour', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-013-03', 'rep-1977-013', 'A-08889-80061', 'น้ำยาหม้อน้ำแกลลอน', 2, 450.00, 0.00, 900.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-013-04', 'rep-1977-013', 'A-90915-20003', 'ไส้กรองน้ำมันเครื่อง', 1, 365.00, 36.50, 328.50, 'part', 4, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 14. เช็คระยะ 140,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-014', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2013-03-16', '2013-03-16', 'completed', 140722, 140722, 'โตโยต้าพะเยา (1994)', 'สมชาย แสนสูน', 'เช็คระยะตามรอบปกติ', 'scheduled_maintenance', 'REP13-01882', 1260.00, 2573.00, 0.00, 268.31, 4101.31, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-014-01', 'rep-1977-014', '140000', 'เช็คระยะ 140,000 กม.', 1, 1260.00, 0.00, 1260.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-014-02', 'rep-1977-014', 'B-TBVL', 'ผลิตภัณฑ์หล่อลื่นบ่าวาล์ว', 1, 465.00, 0.00, 465.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 15. เช็คระยะ 150,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-015', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2013-07-09', '2013-07-09', 'completed', 151688, 151688, 'โตโยต้าพะเยา (1994)', 'สมิตา ชาวงษ์', 'เช็คระยะ 150,000 กม., เปลี่ยนยางปัดน้ำฝน, เปลี่ยนไส้กรองแอร์', 'scheduled_maintenance', 'REP13-04000', 966.00, 3973.00, 0.00, 345.73, 5284.73, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-015-01', 'rep-1977-015', 'A-85214-12301', 'ยางปัดน้ำฝน', 1, 260.00, 0.00, 260.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-015-02', 'rep-1977-015', 'A-85214-48010', 'ยางใบปัดน้ำฝน L, R', 2, 345.00, 0.00, 690.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-015-03', 'rep-1977-015', 'A-87139-06080', 'ไส้กรองเครื่องปรับอากาศ', 1, 450.00, 0.00, 450.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 16. เช็คระยะ 160,000 กม. (รอบใหญ่)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-016', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2013-10-26', '2013-10-26', 'completed', 162009, 162009, 'โตโยต้าพะเยา (1994)', 'สมิตา ชาวงษ์', 'เปลี่ยนน้ำมันเกียร์, เปลี่ยนน้ำมันเฟืองท้าย, เปลี่ยนน้ำมันเบรก-คลัทช์, เปลี่ยนผ้าเบรกหน้า', 'scheduled_maintenance', 'REP13-06051', 1935.00, 6260.00, 0.00, 573.65, 8768.65, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-016-01', 'rep-1977-016', 'A-04465-YZZE9', 'ผ้าเบรคหน้า', 1, 2540.00, 0.00, 2540.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-016-02', 'rep-1977-016', 'A-08886-80905', 'น้ำมันเกียร์ TYPE_T-IV', 1, 1310.00, 0.00, 1310.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-016-03', 'rep-1977-016', 'A-PZT01-8722P', 'น้ำมันเฟืองท้าย #140', 30, 12.50, 0.00, 375.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 17. เช็คระยะ 170,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-017', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2013-12-16', '2013-12-16', 'completed', 166052, 166052, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'เช็คระยะ 170,000 กม., เปลี่ยนน้ำยาหล่อเย็น, เปลี่ยนหลอดไฟหรี่', 'scheduled_maintenance', 'REP13-07268', 1350.00, 4233.00, 300.00, 369.81, 5652.81, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-017-01', 'rep-1977-017', 'A-88889-80061', 'น้ำยาหม้อน้ำแกลลอน', 2, 450.00, 0.00, 900.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-017-02', 'rep-1977-017', 'A-85214-48010', 'ยางใบปัดน้ำฝน L, R', 2, 345.00, 0.00, 690.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-017-03', 'rep-1977-017', 'A-90080-81053', 'หลอดไฟหรี่แบบเสียบเล็ก', 2, 25.00, 0.00, 50.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 18. เช็คระยะ 180,000 กม. (ซ่อมใหญ่/2 ใบซ่อม)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-018', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2014-06-25', '2014-06-25', 'completed', 173491, 182350, 'โตโยต้าพะเยา (1994)', 'สมชาย แสนสูน / รัตติกาล วงศ์ปัญญา', 'เช็คระยะ 180,000 กม., เปลี่ยนน้ำมันเครื่อง, ล้างเครื่องยนต์, ล้างเบรก', 'scheduled_maintenance', 'REP14-02265 / REP14-05081', 0.00, 0.00, 0.00, 0.00, 9510.16, 'ใบที่หนึ่ง: 5,006.53 และใบที่สอง: 4,503.63 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-018-01', 'rep-1977-018', 'B-NASA3000B', 'น้ำยารักษาเครื่องยนต์ NASA3000', 1, 430.00, 0.00, 430.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-018-02', 'rep-1977-018', 'B-TBCPB', 'น.ทำความสะอาดเครื่องยนต์', 1, 465.00, 0.00, 465.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 19. เช็คระยะ 190,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-019', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2014-10-09', '2014-10-09', 'completed', 190464, 190464, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'เช็คระยะ 190,000 กม., เปลี่ยนไส้กรองอากาศ, น้ำยาเคลือบกระจก, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance', 'REP14-06604', 1035.00, 3484.00, 0.00, 316.33, 4835.33, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-019-01', 'rep-1977-019', 'A-17801-75010', 'ไส้กรองอากาศ', 1, 1100.00, 0.00, 1100.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-019-02', 'rep-1977-019', 'A-PZT01-7221B', 'น้ำยาล้างหัวฉีดเบนซิน', 1, 305.00, 0.00, 305.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-019-03', 'rep-1977-019', 'A-PZT00-7082L', 'น้ำยาเคลือบกระจก', 1, 150.00, 0.00, 150.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 20. เช็คระยะ 200,000 กม. (รอบใหญ่/เปลี่ยนหัวเทียน)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-020', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2015-02-12', '2015-02-12', 'completed', 202269, 202269, 'โตโยต้าพะเยา (1994)', 'พิมพาพร โพธางาม', 'เช็คระยะ 2 แสนโล, เปลี่ยนหัวเทียน (4 หัว), เปลี่ยนผ้าเบรกหน้า', 'scheduled_maintenance', 'REP15-01490', 1620.00, 6573.50, 0.00, 573.55, 8768.05, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-020-01', 'rep-1977-020', 'A-90919-01191', 'หัวเทียน', 4, 720.00, 0.00, 2880.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-020-02', 'rep-1977-020', 'A-04465-YZZE9', 'ผ้าเบรคหน้า', 1, 2540.00, 0.00, 2540.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 21. เช็คระยะ 210,000 กม. (ซ่อมรั่วปะเก็นฝาวาล์ว)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-021', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2015-07-06', '2015-07-06', 'completed', 211340, 211340, 'โตโยต้าพะเยา (1994)', 'พะเยาพิทยาคม', 'เช็คระยะ 210,000 กม., เปลี่ยนปะเก็นฝาครอบวาล์ว, เปลี่ยนปะเก็นรองเบ้าหัวเทียน, ล้างตู้แอร์', 'repair', 'REP15-02834', 2995.00, 6170.00, 0.00, 641.55, 9806.55, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-021-01', 'rep-1977-021', '110121', 'เปลี่ยนปะเก็นฝาครอบวาล์ว', 1, 270.00, 0.00, 270.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-021-02', 'rep-1977-021', 'WG001', 'ประเก็นฝาครอบวาล์ว (ร้านนอก)', 1, 455.00, 0.00, 455.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-021-03', 'rep-1977-021', 'A-11213-0C011', 'ปะเก็นฝาครอบวาล์ว', 1, 255.00, 0.00, 255.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-021-04', 'rep-1977-021', 'A-11214-0C011', 'ปะเก็นรองเบ้าหัวเทียน', 1, 150.00, 0.00, 150.00, 'part', 4, '2026-04-09T00:00:00.000Z'),
('ri-1977-021-05', 'rep-1977-021', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 5, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 22. งานซ่อมระบบไฟ (หลอดไฟหน้า)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-022', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2015-09-01', '2015-09-01', 'completed', 216655, 216655, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'ตรวจสอบไฟตัดหมอกข้างซ้ายไม่ติด (หลอดขาด), เปลี่ยนหลอดไฟหน้า', 'repair', 'REP15-03238', 225.00, 540.00, 0.00, 53.55, 818.55, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-022-01', 'rep-1977-022', 'A-90981-13047', 'หลอดไฟใหญ่ สปอร์ตไลท์', 1, 540.00, 0.00, 540.00, 'part', 1, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 23. เช็คระยะ 230,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-023', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2016-03-16', '2016-03-16', 'completed', 232244, 232244, 'โตโยต้าพะเยา (1994)', 'รัตติกาล วงศ์ปัญญา', 'เช็คระยะ 230,000 กม., ล้างตู้แอร์, ล้างเครื่องยนต์', 'scheduled_maintenance', 'REP16-00628', 1035.00, 2767.00, 0.00, 0.00, 0.00, 'ใบที่ 1/2 ยอดรวมรอปิดใบ — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-023-01', 'rep-1977-023', 'A-08814-80040', 'น้ำยาขจัดคราบเขม่าเครื่องยนต์', 1, 530.00, 0.00, 530.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-023-02', 'rep-1977-023', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 24. ซ่อมระบบเชื้อเพลิง (ปั๊มเชื้อเพลิง/ปั๊มติ๊ก)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-024', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2016-04-19', '2016-04-19', 'completed', 233774, 233774, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'รถมีอาการกระตุก สตาร์ทติดยาก, เปลี่ยนปั๊มน้ำมันเชื้อเพลิง, เปลี่ยนชุดกรองเบนซิน', 'repair', 'REP16-01034', 630.00, 11875.00, 0.00, 875.35, 13380.35, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-024-01', 'rep-1977-024', 'A-23220-0M030', 'ปั๊มน้ำมันเชื้อเพลิง', 1, 5455.00, 0.00, 5455.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-024-02', 'rep-1977-024', 'A-77024-26011', 'ชุดกรองเบนซิน', 1, 6865.00, 0.00, 6865.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-024-03', 'rep-1977-024', 'A-77169-52010', 'ประเก็นหน้าแปลนท่อดูดน้ำมัน', 1, 161.00, 0.00, 161.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 25. เช็คระยะ 270,000 กม. (เปลี่ยนมอเตอร์พัดลมหม้อน้ำ)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-025', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2017-07-25', '2017-07-25', 'completed', 267984, 267984, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'เช็คระยะ 270,000 กม., เปลี่ยนมอเตอร์พัดลมหม้อน้ำ R และ L', 'scheduled_maintenance', 'REP17-02135', 2859.50, 18582.00, 0.00, 1500.98, 22942.48, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-025-01', 'rep-1977-025', 'A-16363-20390', 'มอเตอร์พัดลมหม้อน้ำ R', 1, 7490.00, 0.00, 7490.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-025-02', 'rep-1977-025', 'A-16363-75030', 'มอเตอร์พัดลมหม้อน้ำ L', 1, 7540.00, 0.00, 7540.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-025-03', 'rep-1977-025', '870151', 'เปลี่ยนมอเตอร์พัดลม', 1, 90.00, 0.00, 90.00, 'labour', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 26. เช็คระยะ 280,000 กม. (รอบใหญ่)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-026', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2017-12-15', '2017-12-15', 'completed', 279228, 279228, 'โตโยต้าพะเยา (1994)', 'พลูี บัวศรี', 'เปลี่ยนน้ำมันเครื่อง, น้ำมันเกียร์, น้ำมันเฟืองท้าย, น้ำมันเบรก-คลัทช์, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance', 'REP17-03526', 3665.00, 5479.50, 0.00, 640.12, 9784.62, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-026-01', 'rep-1977-026', 'A-08880-83642', 'น้ำมันกึ่งสังเคราะห์เขียว 1L', 2, 215.50, 0.00, 431.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-026-02', 'rep-1977-026', 'A-08823-80170', 'น้ำมันเบรค_คลัทช์', 2, 110.00, 0.00, 220.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-026-03', 'rep-1977-026', 'A-PZT01-8712P', 'น้ำมันเฟืองท้าย 90 GL 5', 30, 13.05, 0.00, 391.50, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-026-04', 'rep-1977-026', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 4, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 27. เช็คระยะ 290,000 กม. (ซ่อมระบบเบรก)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-027', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2018-07-17', '2018-07-17', 'completed', 288870, 288870, 'โตโยต้าพะเยา (1994)', 'พลูี บัวศรี', 'เช็คระยะ 290,000 กม., เจียรจานเบรกคู่หน้า, เปลี่ยนผ้าเบรกหน้า', 'scheduled_maintenance', 'REP18-02014', 0.00, 0.00, 0.00, 0.00, 3404.50, 'ใบที่ 1/2 ยอดเฉพาะรายการเบรกหน้า — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-027-01', 'rep-1977-027', '473015', 'เจียรจานเบรกหน้า (1ข้าง)', 1, 990.00, 0.00, 990.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-027-02', 'rep-1977-027', '473101', 'เปลี่ยนชุดคาลิปเปอร์ดิสก์เบรกหน้า', 1, 450.00, 0.00, 450.00, 'labour', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 28. เช็คระยะ 300,000 กม. (ซ่อมช่วงล่างโช้คอัพ)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-028', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2018-11-14', '2018-11-14', 'completed', 296097, 296097, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'เช็คระยะ 300,000 กม., เปลี่ยนสายพานเครื่องยนต์, เปลี่ยนโช้คอัพหลัง (L/R), ล้างคอยล์เย็น', 'scheduled_maintenance', 'REP18-02978', 5510.00, 8184.50, 0.00, 958.62, 14653.12, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-028-01', 'rep-1977-028', 'A-48531-80736', 'โช้คอัพหลัง', 2, 1375.00, 0.00, 2750.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-028-02', 'rep-1977-028', 'A-90916-02708', 'สายพานเครื่อง', 1, 2505.00, 0.00, 2505.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-028-03', 'rep-1977-028', '160251', 'เปลี่ยนสายพานเครื่อง', 1, 225.00, 0.00, 225.00, 'labour', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-028-04', 'rep-1977-028', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 4, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 29. งานซ่อมระบบไฟ (หลอดไฟหรี่/ไฟท้าย)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-029', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2018-11-27', '2018-11-27', 'completed', 297761, 297761, 'โตโยต้าพะเยา (1994)', 'รัตติกาล วงศ์ปัญญา', 'เปลี่ยนหลอดไฟหรี่หน้า L-R, เปลี่ยนหลอดไฟหรี่หลัง L-R', 'repair', 'REP18-03093', 225.00, 232.00, 0.00, 31.99, 488.99, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-029-01', 'rep-1977-029', 'A-90080-81053', 'หลอดไฟหรี่แบบเสียบเล็ก', 2, 26.00, 0.00, 52.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-029-02', 'rep-1977-029', 'A-90981-13044-1', 'หลอดไฟ', 2, 90.00, 0.00, 180.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 30. งานซ่อมจุกจิก (ปรับตั้งไฟหน้า)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-030', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2019-04-12', '2019-04-12', 'completed', 297796, 297796, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'ปรับตั้งไฟหน้า', 'repair', 'TAX19-06791', 63.00, 0.00, 0.00, 4.41, 67.41, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-030-01', 'rep-1977-030', '81099', 'งานอื่นๆ หมวดไฟใหญ่-ไฟเลี้ยว', 1, 63.00, 0.00, 63.00, 'labour', 1, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 31. เช็คระยะ 310,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-031', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2019-07-04', '2019-07-04', 'completed', 310540, 310540, 'โตโยต้าพะเยา (1994)', 'พลูี บัวศรี', 'เช็คระยะ 310,000 กม., ล้างหัวฉีดเบนซิน 4 หัว, ล้างคอยล์เย็น', 'scheduled_maintenance', 'REP19-01954', 3395.00, 3133.00, 0.00, 456.96, 6984.96, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-031-01', 'rep-1977-031', '22899', 'ล้างหัวฉีดทั้ง 4 หัว', 1, 1845.00, 0.00, 1845.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-031-02', 'rep-1977-031', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-031-03', 'rep-1977-031', 'AIRCARE', 'ทำความสะอาดตู้แอร์', 1, 200.00, 0.00, 200.00, 'labour', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 32. เช็คระยะ 320,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-032', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2019-10-10', '2019-10-10', 'completed', 320599, 320599, 'โตโยต้าพะเยา (1994)', 'พลูี บัวศรี', 'เช็คระยะ 320,000 กม., ตรวจวัดแบตเตอรี่, ตรวจสภาพรถยนต์', 'scheduled_maintenance', 'REP19-03030', 2070.00, 2369.50, 0.00, 310.77, 4750.27, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-032-01', 'rep-1977-032', '320000', 'เช็คระยะ 320,000 กม.', 1, 1620.00, 0.00, 1620.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-032-02', 'rep-1977-032', 'A-08880-83642', 'น้ำมันกึ่งสังเคราะห์เขียว 1L', 2, 215.50, 0.00, 431.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 33. เช็คระยะ 330,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-033', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2020-03-02', '2020-03-02', 'completed', 330701, 330701, 'โตโยต้าพะเยา (1994)', 'คมสันต์ มากสุข', 'เช็คระยะ 330,000 กม., ล้างหัวฉีดเบนซิน 4 หัว', 'scheduled_maintenance', 'REP20-00718', 2880.00, 1533.00, 0.00, 308.91, 4721.91, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-033-01', 'rep-1977-033', '330000', 'เช็คระยะ 330,000 กม.', 1, 1035.00, 0.00, 1035.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-033-02', 'rep-1977-033', '22899', 'ล้างหัวฉีดทั้ง 4 หัว', 1, 1845.00, 0.00, 1845.00, 'labour', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 34. เช็คระยะ 340,000 กม. (ซ่อมรั่วซึม)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-034', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2021-03-11', '2021-03-11', 'completed', 344313, 344313, 'โตโยต้าพะเยา (1994)', 'โสภี ขัตติยะ', 'เช็คระยะ 340,000 กม., เปลี่ยนซีลท้ายเครื่อง, เปลี่ยนปะเก็นฝาวาล์ว, เจียรจานเบรกหน้า', 'scheduled_maintenance', 'REP21-00672', 4650.00, 5139.50, 0.00, 685.27, 10474.77, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-034-01', 'rep-1977-034', 'A-90311-88006', 'ซีลท้ายเครื่อง', 1, 550.00, 0.00, 550.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-034-02', 'rep-1977-034', 'A-11213-0C010', 'ประเก็นฝาวาล์ว', 1, 255.00, 0.00, 255.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-034-03', 'rep-1977-034', '473015', 'เจียรจานเบรกหน้า (1ข้าง)', 1, 1100.00, 0.00, 1100.00, 'labour', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-034-04', 'rep-1977-034', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 4, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 35. เช็คระยะ 370,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-035', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2022-10-20', '2022-10-20', 'completed', 373232, 373232, 'โตโยต้าพะเยา (1994)', 'พลูี บัวศรี', 'เช็คระยะ 370,000 กม., ล้างเครื่องยนต์, ล้างคอยล์เย็น, พ่นน้ำยาทำความสะอาดภายในห้องโดยสาร', 'scheduled_maintenance', 'REP22-03004', 3770.00, 3004.50, 0.00, 474.22, 7248.72, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-035-01', 'rep-1977-035', '370000', 'เช็คระยะ 370,000 กม.', 1, 1150.00, 0.00, 1150.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-035-02', 'rep-1977-035', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1600.00, 0.00, 1600.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-035-03', 'rep-1977-035', 'CS0019', 'พ่นน้ำยาทำความสะอาดในห้องโดยสาร', 1, 200.00, 0.00, 200.00, 'labour', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 36. งานซ่อมช่วงล่าง (โช้คอัพหน้า)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-036', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2023-02-10', '2023-02-10', 'completed', 373233, 373233, 'โตโยต้าเชียงราย จำกัด (สำนักงานใหญ่)', 'จักรพันธ์ จิตต์ปิยะมิตร', 'ตรวจสอบระบบรองรับหน้า (สตรัท), เปลี่ยนโช้คอัพหน้า', 'repair', 'REP23-03439', 500.00, 1162.50, 500.00, 81.38, 1243.88, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-036-01', 'rep-1977-036', 'A-48510-8Z193', 'โช้คอัพหน้า', 1, 1550.00, 387.50, 1162.50, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-036-02', 'rep-1977-036', '43199', 'งานอื่นๆ หมวดระบบรองรับหน้า', 1, 500.00, 0.00, 500.00, 'labour', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 37. เช็คระยะ 380,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-037', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2023-03-09', '2023-03-09', 'completed', 382434, 382434, 'โตโยต้าพะเยา (1994)', 'รัตติกาล วงศ์ปัญญา', 'เช็คระยะ 380,000 กม., ล้างเครื่องยนต์, ล้างหัวฉีดเบนซิน', 'scheduled_maintenance', 'REP23-00597', 4265.00, 2554.50, 0.00, 477.37, 7296.87, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-037-01', 'rep-1977-037', '380000', 'เช็คระยะ 380,000 กม.', 1, 1500.00, 0.00, 1500.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-037-02', 'rep-1977-037', '22899', 'ล้างหัวฉีดทั้ง 4 หัว', 1, 1845.00, 0.00, 1845.00, 'labour', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 38. เช็คระยะ 390,000 กม. (เปลี่ยนคอยล์จุดระเบิด)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-038', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2023-09-25', '2023-09-25', 'completed', 390047, 390047, 'โตโยต้าพะเยา (1994)', 'รัตติกาล วงศ์ปัญญา', 'เช็คระยะ 390,000 กม., เปลี่ยนหัวเทียน, เปลี่ยนคอยล์จุดระเบิด (4 ตัว), เปลี่ยนปะเก็นฝาวาล์ว', 'scheduled_maintenance', 'REP23-02225', 1000.00, 11535.00, 0.00, 877.45, 13412.45, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-038-01', 'rep-1977-038', 'A-90919-T2008', 'คอยล์จุดระเบิด', 4, 2000.00, 0.00, 8000.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-038-02', 'rep-1977-038', 'A-08479-00807', 'หัวเทียน', 4, 770.00, 0.00, 3080.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-038-03', 'rep-1977-038', '110121', 'เปลี่ยนประเก็นฝาครอบวาล์ว', 1, 300.00, 0.00, 300.00, 'labour', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 39. เช็คระยะ 390,000 กม. (ต่อเนื่อง/ล้างตู้แอร์)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-039', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2024-01-08', '2024-01-08', 'completed', 394523, 394523, 'โตโยต้าพะเยา (1994)', 'พลูี บัวศรี', 'ล้างหัวฉีดเบนซิน 4 หัว, ล้างตู้แอร์, เปลี่ยนไส้กรองอากาศ', 'scheduled_maintenance', 'REP24-00048', 4115.00, 3980.00, 0.00, 566.65, 8661.65, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-039-01', 'rep-1977-039', 'A-17801-75010', 'ไส้กรองอากาศ', 1, 1100.00, 0.00, 1100.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-039-02', 'rep-1977-039', '22899', 'ล้างหัวฉีดทั้ง 4 หัว', 1, 1845.00, 0.00, 1845.00, 'labour', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-039-03', 'rep-1977-039', 'A-08821-80870', 'ผลิตภัณฑ์ล้างคอยล์เย็น', 1, 1601.00, 0.00, 1601.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 40. งานซ่อมใหญ่ระบบไฟและน้ำเย็น (เปลี่ยนปลั๊กเซนเซอร์ 23 รายการ)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-040', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2024-08-23', '2024-08-23', 'completed', 400310, 400310, 'โตโยต้าพะเยา (1994)', 'กัญญารัตน์ ดวงศรี', 'เปลี่ยนปลั๊กไฟเซนเซอร์ต่างๆ ทั่วเครื่องยนต์, เปลี่ยนปั๊มน้ำ, เปลี่ยนวาล์วน้ำ, ซ่อมรั่วปะเก็นฝาหน้า', 'repair', 'REP24-01893', 6032.00, 12399.00, 0.00, 1290.17, 19721.17, 'ใบที่ 1/4 ถึง 4/4 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-040-01', 'rep-1977-040', 'A-90980-11156', 'ปลั๊กไฟ', 3, 220.00, 0.00, 660.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-040-02', 'rep-1977-040', 'A-16100-09460', 'ปั๊มน้ำ', 1, 2470.00, 0.00, 2470.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-040-03', 'rep-1977-040', 'A-90916-03093', 'วาล์วน้ำ', 1, 1050.00, 0.00, 1050.00, 'part', 3, '2026-04-09T00:00:00.000Z'),
('ri-1977-040-04', 'rep-1977-040', '111051', 'ปลอกครอบเฟืองไทม์มิ่ง (ค่าแรงซ่อมรั่ว)', 1, 4992.00, 0.00, 4992.00, 'labour', 4, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 41. เช็คระยะ 410,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-041', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2025-06-24', '2025-06-24', 'completed', 411622, 411622, 'โตโยต้าพะเยา (1994)', 'ชนิษฐา ป่วงงาม', 'เช็คระยะ 410,000 กม., ล้างเครื่องยนต์, ล้างหัวฉีดเบนซิน, เปลี่ยนยางปัดน้ำฝน', 'scheduled_maintenance', 'REP25-01284', 3967.60, 1656.00, 0.00, 393.65, 6017.25, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-041-01', 'rep-1977-041', '410000', 'เช็คระยะ 410,000 กม.', 1, 1196.00, 0.00, 1196.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-041-02', 'rep-1977-041', '22899', 'ล้างหัวฉีดทั้ง 4 หัว', 1, 1846.00, 0.00, 1846.00, 'labour', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-041-03', 'rep-1977-041', 'A-85214-12301', 'ยางปัดน้ำฝน', 1, 260.00, 0.00, 260.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 42. เช็คระยะ 420,000 กม. (ซ่อมช่วงล่างลูกหมาก)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-042', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2025-10-10', '2025-10-10', 'completed', 417164, 417164, 'โตโยต้าพะเยา (1994)', 'ชนิษฐา ป่วงงาม', 'เปลี่ยนลูกหมากแร็ค, เปลี่ยนลูกหมากคันชัก, เปลี่ยนไส้กรองอากาศ', 'scheduled_maintenance', 'REP25-02123', 2485.60, 1966.00, 0.00, 311.61, 4763.21, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-042-01', 'rep-1977-042', '434081', 'เปลี่ยนลูกปืนล้อหน้า (1 ข้าง)', 1, 2485.60, 0.00, 2485.60, 'labour', 1, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 43. งานซ่อมระบบไฟ (แบตเตอรี่)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-043', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2025-11-20', '2025-11-20', 'completed', 420785, 420785, 'โตโยต้าพะเยา (1994)', 'ชนิษฐา ป่วงงาม', 'เปลี่ยนแบตเตอรี่ 80D26R MF, เปลี่ยนยางใบปัดน้ำฝน L, R', 'repair', 'REP25-02457', 260.00, 3994.00, 0.00, 297.78, 4551.78, 'ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-043-01', 'rep-1977-043', 'A-28800-YZZRT', 'แบตเตอรี่แคลเซียม 80D26R MF', 1, 3220.00, 0.00, 3220.00, 'part', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-043-02', 'rep-1977-043', 'A-85214-48010', 'ยางใบปัดน้ำฝน L, R', 2, 387.00, 0.00, 774.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 44. เช็คระยะ 420,000 กม. (ต่อเนื่อง)
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-044', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2026-01-14', '2026-01-14', 'completed', 424671, 424671, 'โตโยต้าพะเยา (1994)', 'ชนิษฐา ป่วงงาม', 'เปลี่ยนน้ำมันเครื่องและไส้กรองตามรอบ', 'scheduled_maintenance', 'REP26-00084', 260.00, 1830.00, 0.00, 146.30, 2236.30, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-044-01', 'rep-1977-044', '29TF', 'เปลี่ยนน้ำมันเครื่องและไส้กรอง', 1, 260.00, 0.00, 260.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-044-02', 'rep-1977-044', 'A-08880-84675', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 900.00, 0.00, 900.00, 'part', 2, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- 45. เช็คระยะล่าสุด 430,000 กม.
-- ============================================================
INSERT OR IGNORE INTO repair_log (id, car_id, date_reported, date_completed, status, mileage_at_repair, mileage_out, garage_name, taken_by, issue_description, service_type, invoice_number, labour_cost, parts_cost, discount_amount, vat_amount, grand_total, notes, created_at, updated_at)
VALUES ('rep-1977-045', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', '2026-04-07', '2026-04-07', 'completed', 434071, 434071, 'โตโยต้าพะเยา (1994)', 'พะเยาพิทยาคม', 'เช็คระยะ 430,000 กม., ตรวจสภาพทั่วไป', 'scheduled_maintenance', 'REP26-00703', 1196.00, 1635.00, 0.00, 198.17, 3029.17, 'ใบที่ 1/2 และ 2/2 — ข้อมูลย้อนหลัง', '2026-04-09T00:00:00.000Z', '2026-04-09T00:00:00.000Z');

INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at) VALUES
('ri-1977-045-01', 'rep-1977-045', '430000', 'เช็คระยะ 430,000 กม.', 1, 1196.00, 0.00, 1196.00, 'labour', 1, '2026-04-09T00:00:00.000Z'),
('ri-1977-045-02', 'rep-1977-045', 'A-08880-84675', 'น้ำมันกึ่งสังเคราะห์เขียว_G', 1, 900.00, 0.00, 900.00, 'part', 2, '2026-04-09T00:00:00.000Z'),
('ri-1977-045-03', 'rep-1977-045', 'A-08880-84676', 'น้ำมันกึ่งสังเคราะห์เขียว 1L', 2, 234.00, 0.00, 468.00, 'part', 3, '2026-04-09T00:00:00.000Z');

-- ============================================================
-- Summary: 45 repair_log records, ~170 repair_items records
-- Date range: 2009-04-08 to 2026-04-07
-- Mileage range: 7,154 to 434,071 km
-- Total cost: ~295,000+ บาท
-- ============================================================

