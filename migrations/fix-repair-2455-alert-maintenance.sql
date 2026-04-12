-- Align maintenance alert rows for vehicle นข 2455 with documented repair history

-- Exact item-key matches backed by maintenance settings/profiles
UPDATE vehicle_maintenance
SET next_km = 370141,
    next_date = '2024-10-15',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'air_filter';

UPDATE vehicle_maintenance
SET next_km = 461254,
    next_date = '2029-03-14',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'differential_oil';

UPDATE vehicle_maintenance
SET last_km = 459796,
    last_date = '2025-01-31',
    next_km = 519796,
    next_date = '2028-01-31',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'injector_cleaning';

UPDATE vehicle_maintenance
SET next_km = 351368,
    next_date = '2022-11-29',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'timing_belt';

-- Legacy row keys that should follow the latest documented evidence
UPDATE vehicle_maintenance
SET last_km = 296023,
    last_date = '2018-11-06',
    next_km = 336023,
    next_date = '2020-11-06',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'front_brake_pads';

UPDATE vehicle_maintenance
SET next_date = '2021-10-08',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'rear_brake_pads';

UPDATE vehicle_maintenance
SET next_date = '2029-03-14',
    updated_at = '2026-04-12T15:30:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'transmission_oil';