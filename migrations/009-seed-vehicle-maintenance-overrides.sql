-- Migration 009: Seed per-vehicle maintenance overrides for the current active fleet
-- Rule of thumb requested by operations:
--   - gasoline vans/pickups/light vehicles: engine oil + oil filter every 5,000 km / 6 months
--   - diesel fleet vehicles: engine oil + oil filter every 10,000 km / 6 months
-- Keep motorcycle-specific maintenance profiles intact (e.g. HONDA Dream)

INSERT INTO maintenance_vehicle_profiles (id, car_id, item_key, interval_km, interval_months, notes, updated_at)
SELECT lower(hex(randomblob(16))), c.id, t.item_key,
       CASE WHEN c.fuel_type = 'gasoline' THEN 5000 ELSE 10000 END,
       6,
       CASE WHEN c.fuel_type = 'gasoline'
            THEN 'seeded for active fleet: gasoline vehicle oil service every 5,000 km / 6 months'
            ELSE 'seeded for active fleet: diesel vehicle oil service every 10,000 km / 6 months'
       END,
       '2026-04-12T18:00:00Z'
FROM cars c
CROSS JOIN (
  SELECT 'engine_oil' AS item_key
  UNION ALL
  SELECT 'oil_filter' AS item_key
) t
WHERE c.status != 'inactive'
  AND c.fuel_type IN ('gasoline', 'diesel')
  AND NOT (c.brand = 'HONDA' AND c.model = 'Dream')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  interval_km = excluded.interval_km,
  interval_months = excluded.interval_months,
  notes = excluded.notes,
  updated_at = excluded.updated_at;

DELETE FROM maintenance_vehicle_profiles
WHERE item_key IN ('engine_oil', 'oil_filter')
  AND car_id IN (
    SELECT id FROM cars
    WHERE status != 'inactive'
      AND brand = 'HONDA'
      AND model = 'Dream'
  );

UPDATE vehicle_maintenance
SET next_km = CASE
      WHEN last_km IS NOT NULL THEN last_km + (
        SELECT mvp.interval_km
        FROM maintenance_vehicle_profiles mvp
        WHERE mvp.car_id = vehicle_maintenance.car_id
          AND mvp.item_key = vehicle_maintenance.item_key
      )
      ELSE next_km
    END,
    next_date = CASE
      WHEN last_date IS NOT NULL THEN date(
        last_date,
        '+' || (
          SELECT mvp.interval_months
          FROM maintenance_vehicle_profiles mvp
          WHERE mvp.car_id = vehicle_maintenance.car_id
            AND mvp.item_key = vehicle_maintenance.item_key
        ) || ' months'
      )
      ELSE next_date
    END,
    updated_at = '2026-04-12T18:00:00Z'
WHERE item_key IN ('engine_oil', 'oil_filter')
  AND car_id IN (
    SELECT car_id
    FROM maintenance_vehicle_profiles
    WHERE item_key IN ('engine_oil', 'oil_filter')
  );