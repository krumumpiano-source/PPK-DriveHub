-- Remove synthetic/non-documented 400k service for vehicle นข 2455 พย
-- Record rep-2455-056 / REP26-00894 appears to be generated from import assumptions,
-- conflicts with the real later timeline, and has no supporting invoice from the user-provided documents.

PRAGMA foreign_keys = OFF;

DELETE FROM repair_items
WHERE repair_id = 'rep-2455-056';

DELETE FROM repair_log
WHERE id = 'rep-2455-056';

-- The synthetic 400k record had advanced spark plug tracking incorrectly.
-- Revert to the latest documented spark plug replacement we still have in the system.
UPDATE vehicle_maintenance
SET last_km = 301254,
    last_date = '2020-08-14',
    next_km = 401254,
    next_date = '2030-08-14',
    updated_at = '2026-04-12T19:15:00Z'
WHERE car_id = 'd5685d4b-914f-4140-8de6-6050a514ae9b'
  AND item_key = 'spark_plugs';