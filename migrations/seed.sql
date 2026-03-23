-- PPK DriveHub — Seed Data
-- Initial settings, fuel types, maintenance items, first admin placeholder
-- Run after schema.sql

-- ============================================================
-- Queue Rules
-- ============================================================
INSERT OR IGNORE INTO queue_rules (id, key, value, updated_at) VALUES
('qr-01', 'max_car_usage_per_week', '3', datetime('now')),
('qr-02', 'max_driver_long_jobs_per_week', '2', datetime('now')),
('qr-03', 'pending_return_hour', '18', datetime('now')),
('qr-04', 'default_out_time', '08:00', datetime('now')),
('qr-05', 'default_in_time', '17:30', datetime('now'));

-- ============================================================
-- System Settings
-- ============================================================
INSERT OR IGNORE INTO system_settings (id, key, value, updated_at) VALUES
('ss-01', 'app_name', 'PPK DriveHub', datetime('now')),
('ss-02', 'school_name', 'โรงเรียนพะเยาพิทยาคม', datetime('now')),
('ss-03', 'academic_year', '2569', datetime('now')),
('ss-04', 'require_password_change_on_first_login', 'true', datetime('now')),
('ss-05', 'session_timeout_minutes', '480', datetime('now')),
('ss-06', 'telegram_enabled', 'false', datetime('now')),
('ss-07', 'fuel_type_gasoline_91_price', '0', datetime('now')),
('ss-08', 'fuel_type_gasoline_95_price', '0', datetime('now')),
('ss-09', 'fuel_type_gasoline_e20_price', '0', datetime('now')),
('ss-10', 'fuel_type_gasoline_e85_price', '0', datetime('now')),
('ss-11', 'fuel_type_diesel_price', '0', datetime('now')),
('ss-12', 'fuel_type_diesel_b7_price', '0', datetime('now')),
('ss-13', 'fuel_type_diesel_b20_price', '0', datetime('now')),
('ss-14', 'fuel_type_electric_price', '0', datetime('now'));

-- ============================================================
-- Maintenance Settings (default items)
-- ============================================================
INSERT OR IGNORE INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, updated_at) VALUES
('ms-01', 'oil_change', 'เปลี่ยนน้ำมันเครื่อง', 10000, 6, 1, datetime('now')),
('ms-02', 'oil_filter', 'เปลี่ยนไส้กรองน้ำมัน', 10000, 6, 1, datetime('now')),
('ms-03', 'air_filter', 'เปลี่ยนไส้กรองอากาศ', 20000, 12, 1, datetime('now')),
('ms-04', 'fuel_filter', 'เปลี่ยนไส้กรองน้ำมันเชื้อเพลิง', 30000, 24, 1, datetime('now')),
('ms-05', 'tire_rotation', 'สลับยาง', 10000, 6, 1, datetime('now')),
('ms-06', 'brake_check', 'ตรวจเบรก', 20000, 12, 1, datetime('now')),
('ms-07', 'spark_plug', 'เปลี่ยนหัวเทียน', 40000, 24, 1, datetime('now')),
('ms-08', 'coolant', 'เปลี่ยนน้ำหล่อเย็น', 40000, 24, 1, datetime('now')),
('ms-09', 'belt_check', 'ตรวจสายพาน', 50000, 36, 1, datetime('now')),
('ms-10', 'battery_check', 'ตรวจสอบแบตเตอรี่', 20000, 12, 1, datetime('now'));

-- ============================================================
-- NOTE: First admin user is created via POST /api/setup
-- Run: POST https://your-domain/api/setup
-- Body: { "username": "admin", "password": "Admin@1234", "first_name": "Admin", "last_name": "PPK", "email": "admin@ppk.ac.th" }
-- ============================================================
