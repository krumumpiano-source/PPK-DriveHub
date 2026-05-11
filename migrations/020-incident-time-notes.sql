-- Add time and notes columns for incidents
ALTER TABLE incidents ADD COLUMN incident_time TEXT;
ALTER TABLE incidents ADD COLUMN notes TEXT;
