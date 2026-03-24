-- PPK DriveHub - Seed Data
-- Initial admin user and system settings

-- Admin user: username=admin, password=Admin@2569
-- PBKDF2-SHA256, 100000 iterations (hashed value stored)
-- The password hash will be verified by _helpers.js
-- Note: Hash generated at runtime from first setup, using placeholder here
-- Run POST /api/setup to create admin programmatically

INSERT OR IGNORE INTO USERS (
  user_id, password_hash, title, full_name, department, phone, email,
  role, active, first_login, created_at, created_by, permissions
) VALUES (
  'admin-seed-user-001',
  'SEED_PLACEHOLDER',
  'นาย',
  'ผู้ดูแลระบบ',
  'ฝ่ายบริหาร',
  '',
  'admin@ppk.ac.th',
  'admin',
  1,
  0,
  datetime('now', '+7 hours'),
  'system',
  '{"queue":"delete","fuel":"delete","repair":"delete","reports":"delete","vehicles":"delete","drivers":"delete","usage_log":"delete"}'
);

-- Admin settings key-value defaults
INSERT OR IGNORE INTO MASTER (key, value, description, updated_at, updated_by, version) VALUES
('admin_username', 'admin', 'Admin login username', datetime('now', '+7 hours'), 'system', 1),
('max_daily_distance_km', '500', 'Max km driver can drive per day before fatigue flag', datetime('now', '+7 hours'), 'system', 1),
('fatigue_rest_days', '1', 'Rest days required after fatigue flag', datetime('now', '+7 hours'), 'system', 1),
('queue_freeze_buffer_hours', '2', 'Hours before queue to auto-freeze if no confirmation', datetime('now', '+7 hours'), 'system', 1),
('allow_flexible_time', '1', 'Allow flexible time queue requests', datetime('now', '+7 hours'), 'system', 1),
('auto_recovery_enabled', '1', 'Enable auto recovery for pending queues', datetime('now', '+7 hours'), 'system', 1),
('pdpa_version', '1.0', 'Current PDPA policy version', datetime('now', '+7 hours'), 'system', 1),
('system_year', '2569', 'Current fiscal year', datetime('now', '+7 hours'), 'system', 1),
('telegram_enabled', '0', 'Enable Telegram notifications', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_gasohol91', 'แก๊สโซฮอล 91', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_gasohol95', 'แก๊สโซฮอล 95', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_e20', 'E20', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_e85', 'E85', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_diesel', 'ดีเซล', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_b7', 'ไบโอดีเซล B7', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_b10', 'ไบโอดีเซล B10', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_b20', 'ไบโอดีเซล B20', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_lpg', 'LPG', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('fuel_type_ev', 'ไฟฟ้า (EV)', 'Fuel type label', datetime('now', '+7 hours'), 'system', 1),
('maintenance_oil_interval_km', '5000', 'Oil change interval (km)', datetime('now', '+7 hours'), 'system', 1),
('maintenance_oil_interval_days', '90', 'Oil change interval (days)', datetime('now', '+7 hours'), 'system', 1),
('maintenance_filter_interval_km', '10000', 'Air filter change interval (km)', datetime('now', '+7 hours'), 'system', 1),
('maintenance_tire_interval_km', '40000', 'Tire rotation interval (km)', datetime('now', '+7 hours'), 'system', 1),
('setup_completed', '0', 'Whether initial setup is done', datetime('now', '+7 hours'), 'system', 1);
