-- Migration 008: Vehicle-specific maintenance interval overrides
-- Allow each vehicle to override maintenance interval by item_key

CREATE TABLE IF NOT EXISTS maintenance_vehicle_profiles (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(car_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_mvp_car ON maintenance_vehicle_profiles(car_id);
CREATE INDEX IF NOT EXISTS idx_mvp_item ON maintenance_vehicle_profiles(item_key);