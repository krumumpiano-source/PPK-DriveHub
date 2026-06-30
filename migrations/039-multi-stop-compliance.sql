-- Add waypoints and compliance fields to vehicle_requests
ALTER TABLE vehicle_requests ADD COLUMN waypoints TEXT;

-- Add waypoints and compliance fields to queue
ALTER TABLE queue ADD COLUMN waypoints TEXT;
ALTER TABLE queue ADD COLUMN estimated_fuel_cost REAL;
ALTER TABLE queue ADD COLUMN distance_justification TEXT;
