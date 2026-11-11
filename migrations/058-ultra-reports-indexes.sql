-- Migration 058: Ultra-Optimized Indexes for Return Match & Reports
-- Solves 18.3M row read spike on Cloudflare D1 by indexing exact lookup patterns in reports & gform sync

-- 1. Index for matching departure with the next return:
-- Query: WHERE car_id = ? AND record_type = 'return' AND queue_id IS NULL AND datetime > ? ORDER BY datetime ASC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_usage_records_return_match 
  ON usage_records(car_id, record_type, queue_id, datetime ASC);

-- 2. Index for departure lookups without queue_id:
-- Query: WHERE record_type = 'departure' AND queue_id IS NULL
CREATE INDEX IF NOT EXISTS idx_usage_records_dep_no_queue
  ON usage_records(record_type, queue_id, datetime DESC);

-- 3. Index for driver fuzzy match and active drivers lookup
CREATE INDEX IF NOT EXISTS idx_drivers_name_deactivated
  ON drivers(name, deactivated_at);

-- 4. Index for queue by status and date range
CREATE INDEX IF NOT EXISTS idx_queue_date_status_driver
  ON queue(date, status, driver_id);
