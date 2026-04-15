-- Migration 011: Fix Maintenance Profiles — Per Model Accuracy
-- =============================================================================
-- Based on official manufacturer service manuals & owner's manuals:
--   - Toyota Service Manual: HiAce H100 (5L/1KZ-TE), H200 (2KD-FTV), H300 (1GD-FTV)
--   - Toyota Coaster Owner's Manual (Hino N04C for Thailand)
--   - Toyota Dyna Service Guide (5L-E diesel)
--   - Mazda BT-50 Owner's Manual 2nd Gen (Ford Duratorq P4AT/P5AT)
--   - Suzuki Carry Service Manual (G-series gasoline)
--   - Honda Dream 125 Owner's Manual
--
-- Key fixes:
--   1. Timing CHAIN vs BELT distinction per engine type
--   2. Old vehicle shorter intervals (Hiace H100, Dyna)
--   3. Heavy vehicle adjustments (Coaster minibus, Dyna truck)
--   4. Missing items per brand (Suzuki, Honda)
--   5. MAZDA oil change interval fix for Thai conditions
-- =============================================================================

-- ============================================================
-- 1. TOYOTA Commuter — Model-specific profiles
--    H200 (2554/2011): 2.5L 2KD-FTV diesel — uses TIMING BELT at 150,000 km
--    H300 (2566/2023): 2.8L 1GD-FTV diesel — uses TIMING CHAIN (no belt!)
--    Base Commuter profile covers H200 (belt); H300 gets vehicle override
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-tc01', 'TOYOTA', 'Commuter', 'engine_oil', 10000, 6, 'H200: 15W-40 CI-4 / H300: 0W-30 DL-1', datetime('now')),
('mp-tc02', 'TOYOTA', 'Commuter', 'oil_filter', 10000, 6, NULL, datetime('now')),
('mp-tc03', 'TOYOTA', 'Commuter', 'fuel_filter', 20000, 12, NULL, datetime('now')),
('mp-tc04', 'TOYOTA', 'Commuter', 'fuel_water_separator', 10000, 6, NULL, datetime('now')),
('mp-tc05', 'TOYOTA', 'Commuter', 'air_filter', 40000, 24, NULL, datetime('now')),
('mp-tc06', 'TOYOTA', 'Commuter', 'ac_filter', 20000, 12, NULL, datetime('now')),
('mp-tc07', 'TOYOTA', 'Commuter', 'coolant', 160000, 84, 'Toyota SLLC', datetime('now')),
('mp-tc08', 'TOYOTA', 'Commuter', 'gear_oil', 40000, 24, 'ATF WS', datetime('now')),
('mp-tc09', 'TOYOTA', 'Commuter', 'differential_oil', 80000, 48, 'Hypoid 85W-90 GL-5', datetime('now')),
('mp-tc10', 'TOYOTA', 'Commuter', 'brake_pad', 40000, 24, '15 seats, inspect every 10,000 km', datetime('now')),
('mp-tc11', 'TOYOTA', 'Commuter', 'brake_fluid', 40000, 24, 'DOT 3 / DOT 4', datetime('now')),
('mp-tc12', 'TOYOTA', 'Commuter', 'serpentine_belt', 80000, 48, NULL, datetime('now')),
('mp-tc13', 'TOYOTA', 'Commuter', 'timing_belt', 150000, 72, 'H200 2KD-FTV: belt 150,000 / H300 1GD-FTV: chain', datetime('now')),
('mp-tc14', 'TOYOTA', 'Commuter', 'glow_plug', 80000, 48, NULL, datetime('now'));

-- ============================================================
-- 2. TOYOTA Coaster — Hino N04C 4.0L Diesel (Thailand 2019-2022)
--    Minibus 20 seats, heavier than standard van
--    Hino N04C uses gear-driven camshaft (NO belt/chain)
--    Coolant: Hino LLC (NOT Toyota SLLC)
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-tco01', 'TOYOTA', 'Coaster', 'engine_oil', 10000, 6, 'Hino N04C: 15W-40 CI-4 DH-2', datetime('now')),
('mp-tco02', 'TOYOTA', 'Coaster', 'oil_filter', 10000, 6, NULL, datetime('now')),
('mp-tco03', 'TOYOTA', 'Coaster', 'fuel_filter', 20000, 12, NULL, datetime('now')),
('mp-tco04', 'TOYOTA', 'Coaster', 'fuel_water_separator', 5000, 3, 'drain every 5,000 km', datetime('now')),
('mp-tco05', 'TOYOTA', 'Coaster', 'air_filter', 20000, 12, NULL, datetime('now')),
('mp-tco06', 'TOYOTA', 'Coaster', 'ac_filter', 20000, 12, NULL, datetime('now')),
('mp-tco07', 'TOYOTA', 'Coaster', 'coolant', 100000, 48, 'Hino Long Life Coolant (NOT Toyota SLLC)', datetime('now')),
('mp-tco08', 'TOYOTA', 'Coaster', 'gear_oil', 40000, 24, NULL, datetime('now')),
('mp-tco09', 'TOYOTA', 'Coaster', 'differential_oil', 40000, 24, 'Minibus: check more frequently', datetime('now')),
('mp-tco10', 'TOYOTA', 'Coaster', 'brake_pad', 30000, 12, 'Minibus 20 seats: wears faster', datetime('now')),
('mp-tco11', 'TOYOTA', 'Coaster', 'brake_fluid', 40000, 24, 'DOT 3', datetime('now')),
('mp-tco12', 'TOYOTA', 'Coaster', 'serpentine_belt', 60000, 36, 'Hino N04C: shorter interval', datetime('now')),
('mp-tco13', 'TOYOTA', 'Coaster', 'timing_belt', NULL, NULL, 'Hino N04C: gear-driven camshaft, no belt/chain', datetime('now')),
('mp-tco14', 'TOYOTA', 'Coaster', 'glow_plug', 80000, 48, NULL, datetime('now')),
('mp-tco15', 'TOYOTA', 'Coaster', 'hub_grease', 40000, 24, 'Minibus: hub grease required', datetime('now'));

-- ============================================================
-- 3. TOYOTA Hiace — H100 Gen 4 (2543/2000)
--    Engine: 3.0L 5L or 1KZ-TE diesel
--    26-year-old vehicle: shorter intervals, NO SLLC coolant
--    Timing belt: 100,000 km (not 150,000)
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-th01', 'TOYOTA', 'Hiace', 'engine_oil', 5000, 3, 'H100 old engine: 15W-40 mineral, change frequently', datetime('now')),
('mp-th02', 'TOYOTA', 'Hiace', 'oil_filter', 10000, 6, NULL, datetime('now')),
('mp-th03', 'TOYOTA', 'Hiace', 'fuel_filter', 20000, 12, NULL, datetime('now')),
('mp-th04', 'TOYOTA', 'Hiace', 'fuel_water_separator', 10000, 6, NULL, datetime('now')),
('mp-th05', 'TOYOTA', 'Hiace', 'air_filter', 20000, 12, NULL, datetime('now')),
('mp-th06', 'TOYOTA', 'Hiace', 'ac_filter', 20000, 12, NULL, datetime('now')),
('mp-th07', 'TOYOTA', 'Hiace', 'coolant', 40000, 24, 'H100: standard coolant, NOT SLLC', datetime('now')),
('mp-th08', 'TOYOTA', 'Hiace', 'gear_oil', 40000, 24, NULL, datetime('now')),
('mp-th09', 'TOYOTA', 'Hiace', 'differential_oil', 40000, 24, NULL, datetime('now')),
('mp-th10', 'TOYOTA', 'Hiace', 'brake_pad', 40000, 24, NULL, datetime('now')),
('mp-th11', 'TOYOTA', 'Hiace', 'brake_fluid', 40000, 24, 'DOT 3', datetime('now')),
('mp-th12', 'TOYOTA', 'Hiace', 'serpentine_belt', 50000, 36, 'Old vehicle: belt wears faster', datetime('now')),
('mp-th13', 'TOYOTA', 'Hiace', 'timing_belt', 100000, 48, '5L/1KZ-TE: timing belt 100,000 km', datetime('now')),
('mp-th14', 'TOYOTA', 'Hiace', 'glow_plug', 60000, 36, 'Old engine: glow plugs degrade faster', datetime('now'));

-- ============================================================
-- 4. TOYOTA Dyna — Light truck (2547/2004)
--    Engine: likely 5L-E 3.0L diesel
--    Truck: needs hub grease, faster brake wear
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-td01', 'TOYOTA', 'Dyna', 'engine_oil', 10000, 6, '5L-E: 15W-40 CI-4', datetime('now')),
('mp-td02', 'TOYOTA', 'Dyna', 'oil_filter', 10000, 6, NULL, datetime('now')),
('mp-td03', 'TOYOTA', 'Dyna', 'fuel_filter', 20000, 12, NULL, datetime('now')),
('mp-td04', 'TOYOTA', 'Dyna', 'fuel_water_separator', 10000, 6, NULL, datetime('now')),
('mp-td05', 'TOYOTA', 'Dyna', 'air_filter', 20000, 12, 'Truck: dusty conditions', datetime('now')),
('mp-td06', 'TOYOTA', 'Dyna', 'coolant', 40000, 24, 'Old model: standard coolant, NOT SLLC', datetime('now')),
('mp-td07', 'TOYOTA', 'Dyna', 'gear_oil', 40000, 24, NULL, datetime('now')),
('mp-td08', 'TOYOTA', 'Dyna', 'differential_oil', 40000, 24, 'Truck: shorter interval', datetime('now')),
('mp-td09', 'TOYOTA', 'Dyna', 'brake_pad', 30000, 12, 'Truck: faster brake wear', datetime('now')),
('mp-td10', 'TOYOTA', 'Dyna', 'brake_fluid', 40000, 24, 'DOT 3', datetime('now')),
('mp-td11', 'TOYOTA', 'Dyna', 'serpentine_belt', 50000, 36, NULL, datetime('now')),
('mp-td12', 'TOYOTA', 'Dyna', 'timing_belt', 100000, 48, '5L-E: timing belt 100,000 km', datetime('now')),
('mp-td13', 'TOYOTA', 'Dyna', 'glow_plug', 60000, 36, NULL, datetime('now')),
('mp-td14', 'TOYOTA', 'Dyna', 'hub_grease', 40000, 24, 'Truck: hub grease required', datetime('now'));

-- ============================================================
-- 5. Fix TOYOTA Ventury — 2TR-FE 2.7L Gasoline
--    Uses TIMING CHAIN (no belt replacement needed)
--    Complete gasoline-specific profile
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-tv03', 'TOYOTA', 'Ventury', 'timing_belt', NULL, NULL, '2TR-FE: timing chain, no replacement', datetime('now')),
('mp-tv04', 'TOYOTA', 'Ventury', 'coolant', 160000, 84, 'Toyota SLLC', datetime('now')),
('mp-tv05', 'TOYOTA', 'Ventury', 'gear_oil', 40000, 24, 'ATF WS automatic', datetime('now')),
('mp-tv06', 'TOYOTA', 'Ventury', 'air_filter', 40000, 24, NULL, datetime('now')),
('mp-tv07', 'TOYOTA', 'Ventury', 'ac_filter', 20000, 12, NULL, datetime('now')),
('mp-tv08', 'TOYOTA', 'Ventury', 'brake_pad', 50000, 30, 'Gasoline: lighter than diesel Commuter', datetime('now')),
('mp-tv09', 'TOYOTA', 'Ventury', 'brake_fluid', 40000, 24, 'DOT 3 / DOT 4', datetime('now')),
('mp-tv10', 'TOYOTA', 'Ventury', 'serpentine_belt', 80000, 48, NULL, datetime('now')),
('mp-tv11', 'TOYOTA', 'Ventury', 'differential_oil', 80000, 48, NULL, datetime('now')),
('mp-tv12', 'TOYOTA', 'Ventury', 'oil_filter', 10000, 6, NULL, datetime('now'));

-- ============================================================
-- 6. MAZDA BT-50 — Ford Duratorq P4AT 2.2L / P5AT 3.2L Diesel
--    Uses TIMING CHAIN (NOT belt!)
--    Fix oil interval_months: 12 -> 6 for Thai conditions
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-mb01', 'MAZDA', 'BT-50', 'engine_oil', 10000, 6, 'Ford Duratorq: 5W-30 CJ-4 — Thai conditions 6 months', datetime('now')),
('mp-mb02', 'MAZDA', 'BT-50', 'oil_filter', 10000, 6, NULL, datetime('now')),
('mp-mb03', 'MAZDA', 'BT-50', 'timing_belt', NULL, NULL, 'Ford Duratorq P4AT/P5AT: timing chain, no belt', datetime('now')),
('mp-mb04', 'MAZDA', 'BT-50', 'fuel_filter', 40000, 24, NULL, datetime('now')),
('mp-mb05', 'MAZDA', 'BT-50', 'air_filter', 40000, 24, NULL, datetime('now')),
('mp-mb06', 'MAZDA', 'BT-50', 'coolant', 120000, 60, 'Mazda FL22 Long Life Coolant', datetime('now')),
('mp-mb07', 'MAZDA', 'BT-50', 'gear_oil', 60000, 48, 'ATF FZ (6AT)', datetime('now')),
('mp-mb08', 'MAZDA', 'BT-50', 'differential_oil', 40000, 48, 'Hypoid 80W-90 GL-5', datetime('now')),
('mp-mb09', 'MAZDA', 'BT-50', 'brake_pad', 40000, 24, NULL, datetime('now')),
('mp-mb10', 'MAZDA', 'BT-50', 'brake_fluid', 40000, 24, 'DOT 3 / DOT 4', datetime('now')),
('mp-mb11', 'MAZDA', 'BT-50', 'serpentine_belt', 100000, 48, NULL, datetime('now')),
('mp-mb12', 'MAZDA', 'BT-50', 'ac_filter', 20000, 12, NULL, datetime('now'));

-- Fix MAZDA * wildcard oil change interval for Thai driving conditions
UPDATE maintenance_profiles SET interval_months = 6,
  notes = 'Mazda API CJ-4 5W-30 — Thai conditions 6 months'
  WHERE brand = 'MAZDA' AND model = '*' AND item_key = 'engine_oil';
UPDATE maintenance_profiles SET interval_months = 6
  WHERE brand = 'MAZDA' AND model = '*' AND item_key = 'oil_filter';

-- ============================================================
-- 7. Add missing SUZUKI Carry profiles
--    G-series gasoline engine
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-s07', 'SUZUKI', '*', 'coolant', 40000, 24, 'Small engine: shorter coolant interval', datetime('now')),
('mp-s08', 'SUZUKI', '*', 'brake_pad', 30000, 24, NULL, datetime('now')),
('mp-s09', 'SUZUKI', '*', 'brake_fluid', 30000, 24, 'DOT 3', datetime('now')),
('mp-s10', 'SUZUKI', '*', 'serpentine_belt', 40000, 36, NULL, datetime('now')),
('mp-s11', 'SUZUKI', '*', 'ac_filter', 20000, 12, NULL, datetime('now'));

-- ============================================================
-- 8. Add missing HONDA Dream profiles
--    125cc motorcycle
-- ============================================================

INSERT OR IGNORE INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mp-h05', 'HONDA', 'Dream', 'brake_pad', 15000, 12, 'Drum brake motorcycle', datetime('now')),
('mp-h06', 'HONDA', 'Dream', 'battery', 0, 18, 'Motorcycle battery: shorter lifespan', datetime('now'));

-- ============================================================
-- 9. Vehicle-specific overrides (maintenance_vehicle_profiles)
--    For vehicles where brand+model profile doesn't match their engine
-- ============================================================

-- Toyota Commuter H300 (nk 3816, 2566) — 1GD-FTV uses TIMING CHAIN
INSERT OR REPLACE INTO maintenance_vehicle_profiles (id, car_id, item_key, interval_km, interval_months, notes, updated_at) VALUES
('mvp-3816-timing', 'df5fd5a5-287e-4e10-a8d0-f6818daa6522', 'timing_belt', NULL, NULL, '1GD-FTV (H300): timing chain — no replacement', datetime('now'));

-- ============================================================
-- 10. Clean up incorrect vehicle_maintenance alerts
--     Remove timing_belt next alerts for vehicles with timing chains
-- ============================================================

-- Ventury (nk 1977) — 2TR-FE timing chain
DELETE FROM vehicle_maintenance
  WHERE car_id = 'b43ad8e2-04d0-40e0-90ab-d598bf44282d'
  AND item_key = 'timing_belt';

-- Commuter H300 (nk 3816) — 1GD-FTV timing chain
DELETE FROM vehicle_maintenance
  WHERE car_id = 'df5fd5a5-287e-4e10-a8d0-f6818daa6522'
  AND item_key = 'timing_belt';

-- Coaster (40-0158) — Hino N04C gear-driven camshaft
DELETE FROM vehicle_maintenance
  WHERE car_id = '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3'
  AND item_key = 'timing_belt';

-- BT-50 (kj 5192) — Ford Duratorq timing chain
DELETE FROM vehicle_maintenance
  WHERE car_id = '97d66518-d511-4ae2-abcb-54a491b5f13c'
  AND item_key = 'timing_belt';
