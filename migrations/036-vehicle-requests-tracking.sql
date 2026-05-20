-- Migration 036: Add created_by / updated_by tracking columns to vehicle_requests
ALTER TABLE vehicle_requests ADD COLUMN created_by TEXT;
ALTER TABLE vehicle_requests ADD COLUMN updated_by TEXT;
