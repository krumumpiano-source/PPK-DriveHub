-- Migration 007: Comprehensive Maintenance Profiles
-- ตามมาตรฐาน กรมขนส่ง + ศูนย์บริการ Toyota / Mazda / Suzuki / Isuzu / Hino
-- เพิ่ม brand-specific intervals, DLT items, fuel-type filtering

-- ============================================================
-- 1. Add new columns to maintenance_settings
-- ============================================================
ALTER TABLE maintenance_settings ADD COLUMN category TEXT DEFAULT 'general';
ALTER TABLE maintenance_settings ADD COLUMN fuel_type_filter TEXT DEFAULT NULL;
ALTER TABLE maintenance_settings ADD COLUMN vehicle_class TEXT DEFAULT NULL;
ALTER TABLE maintenance_settings ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE maintenance_settings ADD COLUMN dlt_required INTEGER DEFAULT 0;

-- ============================================================
-- 2. Create maintenance_profiles table (brand-specific intervals)
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_profiles (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT DEFAULT '*',
  item_key TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(brand, model, item_key)
);

CREATE INDEX IF NOT EXISTS idx_mp_brand ON maintenance_profiles(brand);
CREATE INDEX IF NOT EXISTS idx_mp_item ON maintenance_profiles(item_key);

-- ============================================================
-- 3. Rename old keys + update categories (existing 10 items)
-- ============================================================
UPDATE maintenance_settings SET item_key = 'engine_oil', item_name = 'น้ำมันเครื่อง', category = 'fluid', sort_order = 1, interval_km = 10000, interval_months = 6 WHERE item_key = 'oil_change';
UPDATE maintenance_settings SET item_name = 'ไส้กรองน้ำมันเครื่อง', category = 'filter', sort_order = 2 WHERE item_key = 'oil_filter';
UPDATE maintenance_settings SET item_name = 'ไส้กรองอากาศ', category = 'filter', sort_order = 9, interval_km = 20000, interval_months = 12 WHERE item_key = 'air_filter';
UPDATE maintenance_settings SET item_name = 'ไส้กรองเชื้อเพลิง', category = 'filter', sort_order = 10, interval_km = 40000, interval_months = 24 WHERE item_key = 'fuel_filter';
UPDATE maintenance_settings SET category = 'tire', sort_order = 17 WHERE item_key = 'tire_rotation';
UPDATE maintenance_settings SET item_key = 'brake_pad', item_name = 'ผ้าเบรก', category = 'brake', interval_km = 40000, interval_months = 24, sort_order = 14 WHERE item_key = 'brake_check';
UPDATE maintenance_settings SET item_name = 'หัวเทียน', category = 'ignition', fuel_type_filter = 'gasoline', sort_order = 23 WHERE item_key = 'spark_plug';
UPDATE maintenance_settings SET item_name = 'น้ำยาหล่อเย็น', category = 'fluid', interval_km = 100000, interval_months = 48, sort_order = 5 WHERE item_key = 'coolant';
UPDATE maintenance_settings SET item_key = 'serpentine_belt', item_name = 'สายพานหน้าเครื่อง (V-Belt)', category = 'belt', interval_km = 80000, interval_months = 48, sort_order = 13 WHERE item_key = 'belt_check';
UPDATE maintenance_settings SET item_key = 'battery', item_name = 'แบตเตอรี่', category = 'electrical', interval_km = 0, interval_months = 24, sort_order = 26 WHERE item_key = 'battery_check';

-- Fix vehicle_maintenance old keys
UPDATE vehicle_maintenance SET item_key = 'engine_oil' WHERE item_key = 'oil_change';
UPDATE vehicle_maintenance SET item_key = 'brake_pad' WHERE item_key = 'brake_check';
UPDATE vehicle_maintenance SET item_key = 'serpentine_belt' WHERE item_key = 'belt_check';
UPDATE vehicle_maintenance SET item_key = 'battery' WHERE item_key = 'battery_check';

-- ============================================================
-- 4. Insert new comprehensive items (24 new items)
-- ============================================================

-- Fluids
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-11', 'gear_oil', 'น้ำมันเกียร์ (ATF/MTF)', 40000, 48, 1, 'fluid', NULL, NULL, 3, 0, datetime('now')),
('ms-12', 'brake_fluid', 'น้ำมันเบรก', 40000, 24, 1, 'fluid', NULL, NULL, 4, 0, datetime('now')),
('ms-13', 'power_steering_fluid', 'น้ำมันพวงมาลัยพาวเวอร์', 80000, 48, 1, 'fluid', NULL, NULL, 6, 0, datetime('now')),
('ms-14', 'differential_oil', 'น้ำมันเฟืองท้าย', 40000, 48, 1, 'fluid', NULL, NULL, 7, 0, datetime('now'));

-- Filters
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-15', 'ac_filter', 'ไส้กรองแอร์', 20000, 12, 1, 'filter', NULL, NULL, 11, 0, datetime('now')),
('ms-16', 'fuel_water_separator', 'กรองน้ำในเชื้อเพลิง', 20000, 12, 1, 'filter', 'diesel', NULL, 12, 0, datetime('now'));

-- Belts
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-17', 'timing_belt', 'สายพานไทม์มิ่ง', 100000, 60, 1, 'belt', NULL, NULL, 8, 0, datetime('now'));

-- Brakes
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-18', 'brake_disc', 'จานเบรก', 80000, 48, 1, 'brake', NULL, NULL, 15, 0, datetime('now'));

-- Tires
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-19', 'tire', 'ยางรถ (เปลี่ยนชุด)', 50000, 48, 1, 'tire', NULL, NULL, 16, 0, datetime('now')),
('ms-20', 'wheel_alignment', 'ตั้งศูนย์ล้อ', 20000, 12, 1, 'tire', NULL, NULL, 18, 0, datetime('now'));

-- Suspension
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-21', 'shock_absorber', 'โช้คอัพ', 80000, 60, 1, 'suspension', NULL, NULL, 19, 0, datetime('now')),
('ms-22', 'ball_joint', 'ลูกหมาก', 100000, 60, 1, 'suspension', NULL, NULL, 20, 0, datetime('now')),
('ms-23', 'bush', 'บูชยาง (ปีกนก/กันโคลง)', 100000, 60, 1, 'suspension', NULL, NULL, 21, 0, datetime('now')),
('ms-24', 'hub_grease', 'จารบีดุมล้อ', 40000, 24, 1, 'suspension', NULL, 'bus,truck', 22, 0, datetime('now'));

-- Ignition
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-25', 'glow_plug', 'หัวเผา', 80000, 48, 1, 'ignition', 'diesel', NULL, 24, 0, datetime('now')),
('ms-26', 'injector_cleaning', 'ล้างหัวฉีด', 60000, 36, 1, 'ignition', 'diesel', NULL, 25, 0, datetime('now'));

-- Electrical
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-27', 'alternator_check', 'ตรวจไดชาร์จ', 60000, 36, 1, 'electrical', NULL, NULL, 27, 0, datetime('now'));

-- Other
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-28', 'wiper', 'ใบปัดน้ำฝน', 0, 12, 1, 'other', NULL, NULL, 28, 0, datetime('now')),
('ms-29', 'clutch', 'คลัทช์ (เกียร์ธรรมดา)', 100000, 0, 1, 'other', NULL, NULL, 29, 0, datetime('now')),
('ms-30', 'ac_service', 'ล้างระบบแอร์', 0, 12, 1, 'other', NULL, NULL, 30, 0, datetime('now'));

-- DLT / กรมขนส่ง
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_at) VALUES
('ms-31', 'dlt_inspection', 'ตรวจสภาพรถประจำปี (ขนส่ง)', 0, 12, 1, 'dlt', NULL, NULL, 31, 1, datetime('now')),
('ms-32', 'emission_check', 'ตรวจมลพิษ/ควันดำ', 0, 12, 1, 'dlt', NULL, NULL, 32, 1, datetime('now')),
('ms-33', 'fire_extinguisher', 'ถังดับเพลิง (ตรวจ/เติม)', 0, 12, 1, 'dlt', NULL, 'bus,van', 33, 1, datetime('now')),
('ms-34', 'safety_equipment', 'อุปกรณ์ความปลอดภัย (สามเหลี่ยม/ค้อนฉุกเฉิน)', 0, 12, 1, 'dlt', NULL, 'bus,van', 34, 1, datetime('now'));

-- ============================================================
-- 5. Brand-specific Maintenance Profiles
-- ============================================================

-- TOYOTA Diesel (Commuter, Coaster, Hiace, Dyna)
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-t01', 'TOYOTA', '*', 'engine_oil', 10000, 6, 'Toyota Genuine Motor Oil 15W-40', datetime('now')),
('mp-t02', 'TOYOTA', '*', 'oil_filter', 10000, 6, 'เปลี่ยนพร้อมน้ำมันเครื่อง', datetime('now')),
('mp-t03', 'TOYOTA', '*', 'fuel_filter', 20000, 12, 'ดีเซล: เปลี่ยนถี่กว่าปกติ', datetime('now')),
('mp-t04', 'TOYOTA', '*', 'fuel_water_separator', 10000, 6, 'ระบายน้ำทุกครั้งที่เปลี่ยนถ่าย', datetime('now')),
('mp-t05', 'TOYOTA', '*', 'coolant', 160000, 84, 'Toyota Super Long Life Coolant', datetime('now')),
('mp-t06', 'TOYOTA', '*', 'gear_oil', 40000, 24, 'ATF WS / Gear Oil 75W-90', datetime('now')),
('mp-t07', 'TOYOTA', '*', 'differential_oil', 80000, 48, 'Hypoid Gear Oil 85W-90', datetime('now')),
('mp-t08', 'TOYOTA', '*', 'timing_belt', 150000, 72, 'บางรุ่นใช้โซ่ไม่ต้องเปลี่ยน', datetime('now')),
('mp-t09', 'TOYOTA', '*', 'serpentine_belt', 80000, 48, 'ตรวจทุก 40,000 กม.', datetime('now')),
('mp-t10', 'TOYOTA', '*', 'brake_pad', 40000, 24, 'ตรวจทุก 10,000 กม.', datetime('now')),
('mp-t11', 'TOYOTA', '*', 'brake_fluid', 40000, 24, 'DOT 3 / DOT 4', datetime('now')),
('mp-t12', 'TOYOTA', '*', 'glow_plug', 80000, 48, 'ดีเซลเท่านั้น', datetime('now')),
('mp-t13', 'TOYOTA', '*', 'air_filter', 20000, 12, NULL, datetime('now')),
('mp-t14', 'TOYOTA', '*', 'ac_filter', 20000, 12, NULL, datetime('now'));

-- Toyota Ventury (Gasoline) — override for gasoline-specific items
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-tv01', 'TOYOTA', 'Ventury', 'spark_plug', 100000, 60, 'Iridium หัวเทียนอิริเดียม', datetime('now')),
('mp-tv02', 'TOYOTA', 'Ventury', 'engine_oil', 10000, 6, 'Toyota 5W-30 / 5W-40', datetime('now'));

-- MAZDA BT-50 (Diesel)
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-m01', 'MAZDA', '*', 'engine_oil', 10000, 12, 'Mazda Original Oil DPF 5W-30', datetime('now')),
('mp-m02', 'MAZDA', '*', 'oil_filter', 10000, 12, 'เปลี่ยนพร้อมน้ำมันเครื่อง', datetime('now')),
('mp-m03', 'MAZDA', '*', 'fuel_filter', 40000, 24, NULL, datetime('now')),
('mp-m04', 'MAZDA', '*', 'coolant', 120000, 60, 'FL22 Long Life Coolant', datetime('now')),
('mp-m05', 'MAZDA', '*', 'gear_oil', 40000, 48, 'ATF FZ / MTF 75W-90', datetime('now')),
('mp-m06', 'MAZDA', '*', 'differential_oil', 40000, 48, 'Hypoid Gear Oil 80W-90', datetime('now')),
('mp-m07', 'MAZDA', '*', 'timing_belt', 100000, 60, NULL, datetime('now')),
('mp-m08', 'MAZDA', '*', 'brake_pad', 40000, 24, NULL, datetime('now')),
('mp-m09', 'MAZDA', '*', 'air_filter', 40000, 24, 'BT-50 กรองอากาศเปลี่ยนถี่น้อยกว่า', datetime('now'));

-- SUZUKI Carry (Gasoline)
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-s01', 'SUZUKI', '*', 'engine_oil', 5000, 6, 'เครื่องเล็ก เปลี่ยนถี่กว่า', datetime('now')),
('mp-s02', 'SUZUKI', '*', 'oil_filter', 10000, 6, NULL, datetime('now')),
('mp-s03', 'SUZUKI', '*', 'spark_plug', 20000, 24, 'Standard spark plug', datetime('now')),
('mp-s04', 'SUZUKI', '*', 'air_filter', 20000, 12, NULL, datetime('now')),
('mp-s05', 'SUZUKI', '*', 'gear_oil', 40000, 48, NULL, datetime('now')),
('mp-s06', 'SUZUKI', '*', 'timing_belt', 80000, 48, 'Suzuki K-Series', datetime('now'));

-- HONDA Dream (Motorcycle)
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-h01', 'HONDA', 'Dream', 'engine_oil', 3000, 3, 'มอเตอร์ไซค์: เปลี่ยนถี่', datetime('now')),
('mp-h02', 'HONDA', 'Dream', 'oil_filter', 6000, 6, NULL, datetime('now')),
('mp-h03', 'HONDA', 'Dream', 'spark_plug', 12000, 12, NULL, datetime('now')),
('mp-h04', 'HONDA', 'Dream', 'air_filter', 12000, 12, NULL, datetime('now'));

-- ISUZU Diesel (อนาคต — D-Max, MU-X, NLR, NPR, FRR)
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-i01', 'ISUZU', '*', 'engine_oil', 10000, 6, 'Isuzu Genuine 15W-40 CI-4', datetime('now')),
('mp-i02', 'ISUZU', '*', 'oil_filter', 10000, 6, 'เปลี่ยนพร้อมน้ำมันเครื่อง', datetime('now')),
('mp-i03', 'ISUZU', '*', 'fuel_water_separator', 10000, 6, 'ISUZU เน้นระบายน้ำเชื้อเพลิงทุกรอบ', datetime('now')),
('mp-i04', 'ISUZU', '*', 'fuel_filter', 20000, 12, NULL, datetime('now')),
('mp-i05', 'ISUZU', '*', 'air_filter', 20000, 12, NULL, datetime('now')),
('mp-i06', 'ISUZU', '*', 'gear_oil', 40000, 24, NULL, datetime('now')),
('mp-i07', 'ISUZU', '*', 'differential_oil', 40000, 48, NULL, datetime('now')),
('mp-i08', 'ISUZU', '*', 'coolant', 100000, 48, NULL, datetime('now')),
('mp-i09', 'ISUZU', '*', 'timing_belt', 100000, 60, NULL, datetime('now')),
('mp-i10', 'ISUZU', '*', 'brake_pad', 40000, 24, NULL, datetime('now'));

-- HINO Diesel (อนาคต — FC, RK, RN series buses/trucks)
INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-n01', 'HINO', '*', 'engine_oil', 15000, 6, 'เครื่องใหญ่ ระยะยาวกว่า', datetime('now')),
('mp-n02', 'HINO', '*', 'oil_filter', 15000, 6, 'เปลี่ยนพร้อมน้ำมันเครื่อง', datetime('now')),
('mp-n03', 'HINO', '*', 'fuel_filter', 20000, 12, NULL, datetime('now')),
('mp-n04', 'HINO', '*', 'fuel_water_separator', 10000, 6, NULL, datetime('now')),
('mp-n05', 'HINO', '*', 'air_filter', 20000, 12, NULL, datetime('now')),
('mp-n06', 'HINO', '*', 'gear_oil', 40000, 24, NULL, datetime('now')),
('mp-n07', 'HINO', '*', 'differential_oil', 60000, 48, NULL, datetime('now')),
('mp-n08', 'HINO', '*', 'coolant', 80000, 48, NULL, datetime('now')),
('mp-n09', 'HINO', '*', 'brake_pad', 30000, 12, 'รถบัส/รถบรรทุก สึกเร็วกว่า', datetime('now')),
('mp-n10', 'HINO', '*', 'hub_grease', 60000, 24, 'จารบีดุมล้อ รถใหญ่', datetime('now')),
('mp-n11', 'HINO', '*', 'timing_belt', 100000, 60, NULL, datetime('now')),
('mp-n12', 'HINO', '*', 'serpentine_belt', 60000, 36, 'รถบรรทุกสายพานสึกเร็ว', datetime('now'));
