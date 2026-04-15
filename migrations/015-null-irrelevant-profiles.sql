-- Migration 015: NULL out irrelevant maintenance items per brand/model
-- รายการที่ไม่เกี่ยวกับรถรุ่นนั้น → interval_km = NULL, interval_months = NULL
-- จะแสดง "⛔ ไม่ต้องเปลี่ยน" บนหน้า admin-settings

-- ============================================================
-- HONDA Dream (มอเตอร์ไซค์) — ใช้จริงแค่ 9 รายการ
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'มอเตอร์ไซค์ไม่มี', updated_at = datetime('now')
WHERE brand = 'HONDA' AND model IN ('*', 'Dream') AND item_key IN (
  'gear_oil', 'brake_fluid', 'coolant', 'power_steering_fluid', 'differential_oil',
  'timing_belt', 'serpentine_belt',
  'fuel_filter', 'ac_filter', 'fuel_water_separator',
  'brake_disc', 'tire_rotation', 'wheel_alignment',
  'shock_absorber', 'ball_joint', 'bush', 'hub_grease',
  'glow_plug', 'injector_cleaning',
  'alternator_check', 'wiper', 'clutch', 'ac_service',
  'fire_extinguisher', 'safety_equipment'
);

-- ============================================================
-- SUZUKI Carry (เบนซิน รถเล็ก)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'เบนซิน/ไม่มี', updated_at = datetime('now')
WHERE brand = 'SUZUKI' AND item_key IN (
  'fuel_water_separator', 'glow_plug', 'injector_cleaning',
  'hub_grease', 'power_steering_fluid',
  'fire_extinguisher', 'safety_equipment'
);

-- ============================================================
-- MAZDA BT-50 (ดีเซล กระบะ)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'ดีเซล/ไม่ใช่ bus', updated_at = datetime('now')
WHERE brand = 'MAZDA' AND item_key IN (
  'spark_plug',
  'fire_extinguisher', 'safety_equipment'
);

-- ============================================================
-- TOYOTA ค่ากลาง (*) — ดีเซลเป็นหลัก
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'ดีเซล ใช้หัวเผาแทน', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = '*' AND item_key = 'spark_plug';

-- ============================================================
-- TOYOTA Coaster (ดีเซล รถบัส) — ไม่มีหัวเทียน, มี clutch (เกียร์ธรรมดา)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'ดีเซล ใช้หัวเผาแทน', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Coaster' AND item_key = 'spark_plug';

-- ============================================================
-- TOYOTA Commuter (ดีเซล ตู้)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'ดีเซล ใช้หัวเผาแทน', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Commuter' AND item_key = 'spark_plug';

-- Commuter เกียร์ออโต้ ไม่มีคลัทช์
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'เกียร์ออโต้', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Commuter' AND item_key = 'clutch';

-- ============================================================
-- TOYOTA Hiace (ดีเซล ตู้)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'ดีเซล ใช้หัวเผาแทน', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Hiace' AND item_key = 'spark_plug';

UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'เกียร์ออโต้', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Hiace' AND item_key = 'clutch';

-- ============================================================
-- TOYOTA Dyna (ดีเซล รถบรรทุก)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'ดีเซล ใช้หัวเผาแทน', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Dyna' AND item_key = 'spark_plug';

-- ============================================================
-- TOYOTA Ventury (เบนซิน 2TR-FE)
-- ============================================================
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'เบนซิน ไม่มี', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Ventury' AND item_key IN (
  'fuel_water_separator', 'glow_plug', 'injector_cleaning'
);

-- Ventury เกียร์ออโต้
UPDATE maintenance_profiles SET interval_km = NULL, interval_months = NULL, notes = 'เกียร์ออโต้', updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Ventury' AND item_key = 'clutch';
