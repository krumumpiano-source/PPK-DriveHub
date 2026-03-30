-- Migration 003: Usage data quality columns + security/performance indexes
-- PPK DriveHub — March 2026

-- ============================================================
-- 1. USAGE RECORDS — Data Quality Columns
-- ============================================================

ALTER TABLE usage_records ADD COLUMN data_quality TEXT NOT NULL DEFAULT 'normal';
-- Values: normal | auto_departure | auto_return | auto_unresolved | gap_record | late_return | departure_only | return_only

ALTER TABLE usage_records ADD COLUMN requester_name TEXT;
-- ชื่อผู้ขอใช้รถ (จาก CSV/QR)

ALTER TABLE usage_records ADD COLUMN is_historical INTEGER NOT NULL DEFAULT 0;
-- 1 = imported historical data

ALTER TABLE usage_records ADD COLUMN auto_notes TEXT;
-- หมายเหตุอัตโนมัติจาก auto-heal system

-- ============================================================
-- 2. SYSTEM SETTINGS — Gap Threshold
-- ============================================================

INSERT OR IGNORE INTO system_settings (id, key, value, updated_by, updated_at)
VALUES ('setting-gap-min-km', 'gap_minimum_km', '50', NULL, datetime('now'));
-- Admin-configurable: minimum km gap to create gap_record

INSERT OR IGNORE INTO system_settings (id, key, value, updated_by, updated_at)
VALUES ('setting-fuel-consumption-default', 'default_fuel_consumption_rate', '8', NULL, datetime('now'));
-- km/liter default for gap cost estimation

-- ============================================================
-- 3. RATE LIMITING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT NOT NULL,
  blocked_until TEXT
);

-- ============================================================
-- 4. PERFORMANCE INDEXES (Missing from schema.sql)
-- ============================================================

-- Users: middleware checks active+role on every request
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(active, role);

-- Queue: conflict detection queries by status+date+car
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_status_date_car ON queue(status, date, car_id);

-- Fuel: reports query by car+date frequently
CREATE INDEX IF NOT EXISTS idx_fuel_log_car_date ON fuel_log(car_id, date DESC);

-- Audit: query by user+date for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_date ON audit_log(user_id, created_at DESC);

-- Usage: query by driver, data_quality filters
CREATE INDEX IF NOT EXISTS idx_usage_records_driver_id ON usage_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_datetime ON usage_records(datetime DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_quality ON usage_records(data_quality);

-- Check log: query by date for daily check score
CREATE INDEX IF NOT EXISTS idx_check_log_created_at ON check_log(created_at);

-- Leaves: driver leave history
CREATE INDEX IF NOT EXISTS idx_leaves_driver_id ON leaves(driver_id);

-- Sessions: cleanup expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
