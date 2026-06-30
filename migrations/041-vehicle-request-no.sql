-- Migration 041: Add request_no to vehicle_requests
ALTER TABLE vehicle_requests ADD COLUMN request_no TEXT;
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_no ON vehicle_requests(request_no);
