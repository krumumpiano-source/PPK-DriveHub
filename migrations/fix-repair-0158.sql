-- Fix repair data for 40-0158 (Toyota Coaster)
-- Verified against 4 invoices: REP22-03494, REP24-01676, REP25-01428, REP26-00394
-- Issues: (1) all repair_items missing (created_at bug), (2) date_reported errors,
--         (3) incomplete items, (4) wrong descriptions, (5) wrong item_types

PRAGMA foreign_keys = OFF;

-- ============================================================
-- FIX REPAIR_LOG: dates & descriptions
-- ============================================================

-- Record 3: date_reported was document date, should be vehicle entry date
UPDATE repair_log SET date_reported = '2022-12-09'
WHERE id = 'rep-0158-003';

-- Record 6: date_reported + description (invoice shows 20,000km service, not 60,000km)
UPDATE repair_log SET
  date_reported = '2024-07-25',
  issue_description = 'เช็คระยะ 20,000 กม. / 12 เดือน, ล้างหัวฉีด, ล้างเครื่องยนต์'
WHERE id = 'rep-0158-006';

-- Record 8: date_reported + description (not a 100k check; it's engine/radiator cleaning + oil change)
UPDATE repair_log SET
  date_reported = '2026-02-23',
  issue_description = 'น้ำยาทำความสะอาดเครื่องยนต์, น้ำยาทำความสะอาดหม้อน้ำ, เปลี่ยนถ่ายน้ำมันเครื่อง'
WHERE id = 'rep-0158-008';

-- ============================================================
-- INSERT ALL REPAIR_ITEMS (all were missing due to created_at NOT NULL bug)
-- ============================================================

-- === Record 1: REP22-01048 — 10,000 km (rep-0158-001) ===
-- No invoice image provided; using original data
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-001-01', 'rep-0158-001', '10000', 'เช็คระยะ 10,000 กม. / 6 เดือน', 1, 0.00, 0.00, 0.00, 'service', 1, '2022-03-31T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-001-02', 'rep-0158-001', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 240.00, 0.00, 480.00, 'part', 2, '2022-03-31T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-001-03', 'rep-0158-001', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1385.00, 0.00, 1385.00, 'part', 3, '2022-03-31T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-001-04', 'rep-0158-001', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 895.00, 0.00, 895.00, 'part', 4, '2022-03-31T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-001-05', 'rep-0158-001', 'A-90080-43030', 'ปะเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 14.00, 0.00, 14.00, 'part', 5, '2022-03-31T12:00:00Z');

-- === Record 2: REP22-02206 — 20,000 km (rep-0158-002) ===
-- No invoice image provided; using original data
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-01', 'rep-0158-002', '20000', 'เช็คระยะ 20,000 กม. / 12 เดือน', 1, 0.00, 0.00, 0.00, 'service', 1, '2022-07-27T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-02', 'rep-0158-002', 'A-08813-80029', 'น้ำยาล้างหัวฉีดดีเซล', 1, 374.00, 0.00, 374.00, 'part', 2, '2022-07-27T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-03', 'rep-0158-002', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 530.00, 0.00, 530.00, 'part', 3, '2022-07-27T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-04', 'rep-0158-002', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 251.00, 0.00, 502.00, 'part', 4, '2022-07-27T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-05', 'rep-0158-002', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1445.00, 0.00, 1445.00, 'part', 5, '2022-07-27T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-06', 'rep-0158-002', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 750.00, 0.00, 750.00, 'part', 6, '2022-07-27T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-002-07', 'rep-0158-002', 'A-90080-43030', 'ปะเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 19.00, 0.00, 19.00, 'part', 7, '2022-07-27T12:00:00Z');

-- === Record 3: REP22-03494 — 30,000 km (rep-0158-003) ===
-- VERIFIED against invoice image — corrected: added A-90080-43030 (20.00), added 30000 service line
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-00', 'rep-0158-003', '30000', 'เช็คระยะ 30,000 กม. / 18 เดือน', 1, 0.00, 0.00, 0.00, 'service', 1, '2022-12-11T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-01', 'rep-0158-003', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 251.00, 0.00, 502.00, 'part', 2, '2022-12-11T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-02', 'rep-0158-003', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1445.00, 0.00, 1445.00, 'part', 3, '2022-12-11T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-03', 'rep-0158-003', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 975.00, 0.00, 975.00, 'part', 4, '2022-12-11T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-04', 'rep-0158-003', 'A-90080-43030', 'ปะเก็นรีอะถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', 5, '2022-12-11T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-05', 'rep-0158-003', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', 6, '2022-12-11T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-003-06', 'rep-0158-003', 'CS0019', 'พ่นน้ำยาทำความสะอาดภายในห้องโดยสาร', 1, 0.00, 0.00, 0.00, 'service', 7, '2022-12-11T12:00:00Z');
-- parts verify: 502+1445+975+20+60 = 3,002 ✓

-- === Record 4: REP23-02058 — 40,000 km (rep-0158-004) ===
-- No invoice image provided; using original data
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-004-01', 'rep-0158-004', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', 1, '2023-08-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-004-02', 'rep-0158-004', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part', 2, '2023-08-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-004-03', 'rep-0158-004', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 995.00, 0.00, 995.00, 'part', 3, '2023-08-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-004-04', 'rep-0158-004', 'A-23390-YZZE4', 'ไส้กรองน้ำมันเชื้อเพลิง', 1, 1195.00, 0.00, 1195.00, 'part', 4, '2023-08-04T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-004-05', 'rep-0158-004', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', 5, '2023-08-04T12:00:00Z');

-- === Record 5: REP24-00609 — 50,000 km (rep-0158-005) ===
-- No invoice image provided; using original data
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-005-01', 'rep-0158-005', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', 1, '2024-03-12T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-005-02', 'rep-0158-005', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part', 2, '2024-03-12T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-005-03', 'rep-0158-005', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 975.00, 0.00, 975.00, 'part', 3, '2024-03-12T12:00:00Z');

-- === Record 6: REP24-01676 — 20,000 km interval (rep-0158-006) ===
-- VERIFIED against invoice image — corrected: added missing items (A-08880-83932/33, A-90080, B-PZT00)
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-01', 'rep-0158-006', '20000', 'เช็คระยะ 20,000 กม. / 12 เดือน (ค่าแรง)', 1, 2400.00, 0.00, 2400.00, 'labour', 1, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-02', 'rep-0158-006', 'A-08813-80029', 'น้ำยาล้างตัวเร่งดีเซล', 1, 374.00, 0.00, 374.00, 'part', 2, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-03', 'rep-0158-006', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 530.00, 0.00, 530.00, 'part', 3, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-04', 'rep-0158-006', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', 4, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-05', 'rep-0158-006', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1495.00, 0.00, 1495.00, 'part', 5, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-06', 'rep-0158-006', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 995.00, 0.00, 995.00, 'part', 6, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-07', 'rep-0158-006', 'A-90080-43030', 'ปะเก็นรีอะถ่ายน้ำมันเครื่อง', 1, 20.00, 0.00, 20.00, 'part', 7, '2024-07-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-006-08', 'rep-0158-006', 'B-PZT00', 'น้ำยาล้างเบรก', 2, 30.00, 0.00, 60.00, 'part', 8, '2024-07-26T12:00:00Z');
-- labour verify: 2,400 ✓   parts verify: 374+530+512+1495+995+20+60 = 3,986 ✓

-- === Record 7: REP25-01428 — battery + oil change (rep-0158-007) ===
-- VERIFIED against invoice image — corrected: added 29TF labour, all missing parts
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-01', 'rep-0158-007', '190011', 'เปลี่ยนแบตเตอรี่ (ค่าแรง)', 1, 156.00, 0.00, 156.00, 'labour', 1, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-02', 'rep-0158-007', '29TF', 'เปลี่ยนถ่ายน้ำมันเครื่องและไส้กรอง (ค่าแรง)', 1, 260.00, 0.00, 260.00, 'labour', 2, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-03', 'rep-0158-007', 'A-08813-80005', 'น้ำยาล้างตัวเร่งดีเซล', 1, 375.00, 0.00, 375.00, 'part', 3, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-04', 'rep-0158-007', 'A-08814-80170', 'น้ำยาล้างเครื่องยนต์ดีเซล', 1, 532.00, 0.00, 532.00, 'part', 4, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-05', 'rep-0158-007', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', 5, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-06', 'rep-0158-007', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', 6, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-07', 'rep-0158-007', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 1010.00, 0.00, 1010.00, 'part', 7, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-08', 'rep-0158-007', 'A-28800-YZZRV', 'แบตเตอรี่ 105D31R MF', 2, 3850.00, 0.00, 7700.00, 'part', 8, '2025-07-10T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-007-09', 'rep-0158-007', 'A-90080-43030', 'ปะเก็นรีอะถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', 9, '2025-07-10T12:00:00Z');
-- labour verify: 156+260 = 416 ✓   parts verify: 375+532+512+1535+1010+7700+21 = 11,685 ✓

-- === Record 8: REP26-00394 — engine/radiator cleaning + oil change (rep-0158-008) ===
-- VERIFIED against invoice image — corrected: 12099/14199 are labour not part, added missing items
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-01', 'rep-0158-008', '12099', 'น้ำยาทำความสะอาดเครื่องยนต์ (ค่าแรง)', 1, 462.80, 0.00, 462.80, 'labour', 1, '2026-02-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-02', 'rep-0158-008', '14199', 'น้ำยาทำความสะอาดหม้อน้ำ (ค่าแรง)', 1, 462.80, 0.00, 462.80, 'labour', 2, '2026-02-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-03', 'rep-0158-008', '29TL', 'เปลี่ยนถ่ายน้ำมันเครื่อง (ค่าแรง)', 1, 260.00, 0.00, 260.00, 'labour', 3, '2026-02-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-04', 'rep-0158-008', 'A-08880-83932', 'น้ำมันเครื่องดีเซลสังเคราะห์ L', 2, 256.00, 0.00, 512.00, 'part', 4, '2026-02-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-05', 'rep-0158-008', 'A-08880-83933', 'น้ำมันเครื่องดีเซลสังเคราะห์ G', 1, 1535.00, 0.00, 1535.00, 'part', 5, '2026-02-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-06', 'rep-0158-008', 'A-15601-78140', 'กรองน้ำมันเครื่อง', 1, 1010.00, 0.00, 1010.00, 'part', 6, '2026-02-26T12:00:00Z');
INSERT OR IGNORE INTO repair_items (id, repair_id, part_code, description, quantity, unit_price, discount_amount, net_amount, item_type, sort_order, created_at)
VALUES ('ri-0158-008-07', 'rep-0158-008', 'A-90080-43030', 'ปะเก็นรีอะถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', 7, '2026-02-26T12:00:00Z');
-- labour verify: 462.80+462.80+260.00 = 1,185.60 ✓   parts verify: 512+1535+1010+21 = 3,078 ✓

-- ============================================================
-- FIX vehicle_maintenance: remove incorrect ac_service
-- (record 8 has no AC service — it's engine/radiator cleaning)
-- ============================================================
DELETE FROM vehicle_maintenance WHERE id = 'vm-0158-ac_service';

PRAGMA foreign_keys = ON;
