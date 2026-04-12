-- Fix current maintenance alerts that are inaccurate or use legacy item keys
-- Scope: only vehicles currently showing alerts as of 2026-04-12

PRAGMA foreign_keys = OFF;

-- ============================================================
-- 1) นข 1977 — Ventury gasoline uses spark_plug profile override (100,000 km / 60 months)
-- ============================================================
UPDATE vehicle_maintenance
SET last_km = 390047,
    last_date = '2023-09-25',
    next_km = 490047,
    next_date = '2028-09-25',
    updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'b43ad8e2-04d0-40e0-90ab-d598bf44282d'
  AND item_key = 'spark_plug';

-- ============================================================
-- 2) นข 2455 — normalize legacy keys so alerts use valid maintenance items
-- ============================================================

-- transmission_oil -> gear_oil
UPDATE vehicle_maintenance
SET item_key = 'gear_oil',
    last_km = 381254,
    last_date = '2025-03-14',
    next_km = 421254,
    next_date = '2027-03-14',
    updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'transmission_oil';

-- drive_belt -> serpentine_belt using Toyota profile 80,000 km / 48 months
UPDATE vehicle_maintenance
SET item_key = 'serpentine_belt',
    last_km = 354152,
    last_date = '2023-12-05',
    next_km = 434152,
    next_date = '2027-12-05',
    updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'drive_belt';

-- Rear brake pads are the latest brake-pad replacement event; keep as canonical brake_pad.
DELETE FROM vehicle_maintenance
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'front_brake_pads';

UPDATE vehicle_maintenance
SET item_key = 'brake_pad',
    last_km = 280422,
    last_date = '2019-10-08',
    next_km = 320422,
    next_date = '2021-10-08',
    updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'rear_brake_pads';

-- Commuter diesel should not carry gasoline spark-plug maintenance alerts.
DELETE FROM vehicle_maintenance
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'spark_plugs';

-- Keep differential oil aligned with Toyota profile (80,000 km / 48 months)
UPDATE vehicle_maintenance
SET last_km = 381254,
    last_date = '2025-03-14',
    next_km = 461254,
    next_date = '2029-03-14',
    updated_at = '2026-04-12T00:00:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'differential_oil';

PRAGMA foreign_keys = ON;
