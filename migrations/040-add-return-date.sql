-- Migration 040
ALTER TABLE vehicle_requests ADD COLUMN return_date TEXT;
ALTER TABLE queue ADD COLUMN return_date TEXT;