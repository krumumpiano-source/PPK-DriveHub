-- Add GPS coordinates to usage_records
ALTER TABLE usage_records ADD COLUMN lat REAL;
ALTER TABLE usage_records ADD COLUMN lng REAL;
