-- Fix latest documented oil change for vehicle นข 2455 พย
-- Invoice GSJ26-05163 dated 2026-02-02, mileage 491911 km

PRAGMA foreign_keys = OFF;

UPDATE repair_log
SET issue_description = 'เช็คระยะ 490,000 กม. / เปลี่ยนน้ำมันเครื่อง-ไส้กรอง, วิเคราะห์ปัญหาเครื่องยนต์',
    updated_at = '2026-04-12T19:00:00Z'
WHERE id = 'rep-2455-103';

DELETE FROM repair_items
WHERE repair_id = 'rep-2455-103';

INSERT OR IGNORE INTO repair_items (
  id, repair_id, part_code, description, quantity, unit_price,
  discount_amount, net_amount, item_type, created_at
) VALUES
  ('ri-2455-103-01', 'rep-2455-103', '490000', 'เช็คระยะ 490,000 กม.', 1, 1196.00, 0.00, 1196.00, 'labour', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-02', 'rep-2455-103', 'A-08880-84684', 'น้ำมันเครื่องกึ่งสังเคราะห์ G', 1, 977.00, 0.00, 977.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-03', 'rep-2455-103', 'A-08880-84686', 'น้ำมันเครื่องกึ่งสังเคราะห์ L', 1, 164.00, 0.00, 164.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-04', 'rep-2455-103', 'A-90080-43030', 'ประเก็นน็อตถ่ายน้ำมันเครื่อง', 1, 21.00, 0.00, 21.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-05', 'rep-2455-103', 'A-90915-YZZD2', 'กรองน้ำมันเครื่อง', 1, 207.00, 0.00, 207.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-06', 'rep-2455-103', 'B-PZT00', 'น้ำยาล้างเมนบรถ', 2, 30.00, 0.00, 60.00, 'part', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-07', 'rep-2455-103', '12999', 'งานวิเคราะห์ปัญหาทางเครื่องยนต์', 1, 462.80, 0.00, 462.80, 'labour', '2026-04-12T00:00:00Z'),
  ('ri-2455-103-08', 'rep-2455-103', '22899', 'งานอื่นๆ ตามใบเสร็จ', 1, 1846.00, 0.00, 1846.00, 'labour', '2026-04-12T00:00:00Z');

UPDATE vehicle_maintenance
SET last_km = 491911,
    last_date = '2026-02-02',
    next_km = 501911,
    next_date = '2026-08-02',
    updated_at = '2026-04-12T19:00:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key IN ('engine_oil', 'oil_filter');