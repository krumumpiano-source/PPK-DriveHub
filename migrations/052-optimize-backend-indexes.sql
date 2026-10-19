-- Migration 052: Optimize Backend Indexes and Constraints
-- Adds critical composite indexes for requests filtering, queue conflict check, and notification lookups

-- 1. Optimize vehicle_requests lookups by status and date (Supervisor & Executive review flows)
CREATE INDEX IF NOT EXISTS idx_vr_status_date ON vehicle_requests(status, date);
CREATE INDEX IF NOT EXISTS idx_vr_date_status ON vehicle_requests(date, status);

-- 2. Optimize queue conflict check & suggest queries
CREATE INDEX IF NOT EXISTS idx_queue_conflict_check ON queue(date, status, time_start, time_end);

-- 3. Optimize fuel station invoices reconciliation lookups
CREATE INDEX IF NOT EXISTS idx_fuel_invoices_lookup ON fuel_station_invoices(station_name, date_from, date_to);

-- 4. Optimize user notification count & unread filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
