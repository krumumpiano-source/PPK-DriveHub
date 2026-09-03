-- Migration: Add Missing Indexes to Reduce D1 rows_read
-- Description: Adds indexes to columns that are frequently used in WHERE, ORDER BY, and JOIN clauses to prevent full table scans.

-- 1. queue table
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);

-- 2. cars table
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);

-- 3. drivers table
CREATE INDEX IF NOT EXISTS idx_drivers_created_at ON drivers(created_at);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- 4. vehicle_requests table (Important for new workflow)
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_created_at ON vehicle_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_date ON vehicle_requests(date);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status ON vehicle_requests(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_requester_id ON vehicle_requests(requester_id);

-- 5. fuel_log table
CREATE INDEX IF NOT EXISTS idx_fuel_log_created_at ON fuel_log(created_at);

-- 6. usage_records table
CREATE INDEX IF NOT EXISTS idx_usage_records_created_at ON usage_records(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_datetime ON usage_records(datetime);

-- 7. repair_log table
CREATE INDEX IF NOT EXISTS idx_repair_log_created_at ON repair_log(created_at);
CREATE INDEX IF NOT EXISTS idx_repair_log_date_reported ON repair_log(date_reported);

-- 8. repair_log_new table
CREATE INDEX IF NOT EXISTS idx_repair_log_new_created_at ON repair_log_new(created_at);
CREATE INDEX IF NOT EXISTS idx_repair_log_new_status ON repair_log_new(status);

-- 9. users table (Admin panel list often ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
