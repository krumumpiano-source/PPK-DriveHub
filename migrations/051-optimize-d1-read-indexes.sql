-- Migration 051: Optimize D1 Read Indexes (Composite indexes for Google Form sync, Auto-heal, Queue lookups, and Reports)

-- 1. Optimize usage_records lookups for Google Form Sync & existing checks
CREATE INDEX IF NOT EXISTS idx_usage_records_sync_lookup 
  ON usage_records(car_id, record_source, form_timestamp);

-- 2. Optimize usage_records for Auto-Heal & timeline sorting
CREATE INDEX IF NOT EXISTS idx_usage_records_car_datetime 
  ON usage_records(car_id, datetime DESC);

CREATE INDEX IF NOT EXISTS idx_usage_records_heal_lookup 
  ON usage_records(car_id, record_type, datetime DESC);

-- 3. Optimize queue lookups by car and status with date ordering
CREATE INDEX IF NOT EXISTS idx_queue_car_status_date 
  ON queue(car_id, status, date DESC, time_start DESC);

-- 4. Optimize fuel_log lookups for reports and car history
CREATE INDEX IF NOT EXISTS idx_fuel_log_car_del_date 
  ON fuel_log(car_id, deleted_at, date);

-- 5. Optimize repair_log lookups for reports and car history
CREATE INDEX IF NOT EXISTS idx_repair_log_car_date 
  ON repair_log(car_id, date_reported);
