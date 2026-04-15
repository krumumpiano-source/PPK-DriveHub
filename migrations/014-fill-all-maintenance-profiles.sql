-- Migration 014: Fill missing maintenance profile items for all brands/models
-- ปัญหา: brand profiles มีแค่ 9-15 รายการ จากทั้งหมด 34 ใน maintenance_settings
-- ทำให้หน้า admin-settings แสดงรายการไม่ครบ
-- แก้: เติมรายการที่ขาดให้ครบ 34 รายการ ในทุก brand/model combination

-- ============================================================
-- Step 1: Fill brand wildcard (*) profiles
-- ใช้ค่า default จาก maintenance_settings สำหรับรายการที่ยังไม่มี
-- ============================================================
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at)
SELECT 
  'mp-fill-' || lower(replace(b.brand,' ','')) || '-star-' || ms.item_key,
  b.brand,
  '*',
  ms.item_key,
  ms.interval_km,
  ms.interval_months,
  NULL,
  datetime('now')
FROM maintenance_settings ms
CROSS JOIN (SELECT DISTINCT brand FROM maintenance_profiles) b
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_profiles mp 
  WHERE mp.brand = b.brand AND mp.model = '*' AND mp.item_key = ms.item_key
)
ORDER BY b.brand, ms.sort_order;

-- ============================================================
-- Step 2: Fill model-specific profiles
-- ใช้ค่าจาก brand wildcard (*) ก่อน ถ้าไม่มีจึงใช้ maintenance_settings default
-- ============================================================
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at)
SELECT 
  'mp-fill-' || lower(replace(bm.brand,' ','')) || '-' || lower(replace(bm.model,' ','')) || '-' || ms.item_key,
  bm.brand,
  bm.model,
  ms.item_key,
  COALESCE(star.interval_km, ms.interval_km),
  COALESCE(star.interval_months, ms.interval_months),
  star.notes,
  datetime('now')
FROM maintenance_settings ms
CROSS JOIN (SELECT DISTINCT brand, model FROM maintenance_profiles WHERE model != '*') bm
LEFT JOIN maintenance_profiles star 
  ON star.brand = bm.brand AND star.model = '*' AND star.item_key = ms.item_key
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_profiles mp 
  WHERE mp.brand = bm.brand AND mp.model = bm.model AND mp.item_key = ms.item_key
)
ORDER BY bm.brand, bm.model, ms.sort_order;
