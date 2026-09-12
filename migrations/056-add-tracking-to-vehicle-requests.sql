-- Migration 056: Ensure created_by and updated_by exist on vehicle_requests
ALTER TABLE vehicle_requests ADD COLUMN created_by TEXT;
ALTER TABLE vehicle_requests ADD COLUMN updated_by TEXT;
