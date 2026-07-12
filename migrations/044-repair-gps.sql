-- Migration: Add GPS coordinates to repair_log
ALTER TABLE repair_log ADD COLUMN latitude REAL;
ALTER TABLE repair_log ADD COLUMN longitude REAL;
