-- Add map estimation fields to vehicle_requests
ALTER TABLE vehicle_requests ADD COLUMN dest_lat REAL;
ALTER TABLE vehicle_requests ADD COLUMN dest_lng REAL;
ALTER TABLE vehicle_requests ADD COLUMN estimated_km REAL;

-- Add estimated_km to queue (since queue holds the final assigned job)
ALTER TABLE queue ADD COLUMN estimated_km REAL;
