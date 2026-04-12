-- ================================================================
-- Sync vehicle_maintenance for นข-1977 from 45 historical repairs
-- car_id: b43ad8e2-04d0-40e0-90ab-d598bf44282d
-- TOYOTA Ventury → uses TOYOTA brand profiles for intervals
-- ================================================================
PRAGMA foreign_keys = OFF;

-- 1) Update current_mileage from latest repair (REP-045: 434,071 กม.)
UPDATE cars SET current_mileage = 434071, updated_at = '2026-04-09T00:00:00'
WHERE id = 'b43ad8e2-04d0-40e0-90ab-d598bf44282d';

-- 2) Insert/Update vehicle_maintenance records
-- Matched by same keyword logic as syncMaintenanceFromRepair()
-- Using TOYOTA profiles: engine_oil=10000km/6mo, gear_oil=40000km/24mo, etc.

-- engine_oil: REP-045 (2026-04-07 @ 434,071 km) เช็คระยะ ← always includes oil change
-- interval: 10,000 km / 6 months → next: 444,071 / 2026-10-07
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-engine-oil', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'engine_oil',
        434071, '2026-04-07', 444071, '2026-10-07', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=434071, last_date='2026-04-07', next_km=444071, next_date='2026-10-07', updated_at='2026-04-09T00:00:00';

-- oil_filter: same as engine_oil (always changed together)
-- interval: 10,000 km / 6 months
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-oil-filter', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'oil_filter',
        434071, '2026-04-07', 444071, '2026-10-07', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=434071, last_date='2026-04-07', next_km=444071, next_date='2026-10-07', updated_at='2026-04-09T00:00:00';

-- gear_oil: REP-026 (2017-12-15 @ 279,228 km) "น้ำมันเกียร์"
-- interval: 40,000 km / 24 months → next: 319,228 / 2019-12-15 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-gear-oil', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'gear_oil',
        279228, '2017-12-15', 319228, '2019-12-15', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=279228, last_date='2017-12-15', next_km=319228, next_date='2019-12-15', updated_at='2026-04-09T00:00:00';

-- brake_fluid: REP-026 (2017-12-15 @ 279,228 km) "น้ำมันเบรก-คลัทช์"
-- interval: 40,000 km / 24 months → next: 319,228 / 2019-12-15 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-brake-fluid', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'brake_fluid',
        279228, '2017-12-15', 319228, '2019-12-15', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=279228, last_date='2017-12-15', next_km=319228, next_date='2019-12-15', updated_at='2026-04-09T00:00:00';

-- coolant: REP-017 (2013-12-16 @ 166,052 km) "น้ำยาหล่อเย็น"
-- interval: 160,000 km / 84 months → next: 326,052 / 2020-12-16 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-coolant', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'coolant',
        166052, '2013-12-16', 326052, '2020-12-16', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=166052, last_date='2013-12-16', next_km=326052, next_date='2020-12-16', updated_at='2026-04-09T00:00:00';

-- differential_oil: REP-026 (2017-12-15 @ 279,228 km) "น้ำมันเฟืองท้าย"
-- interval: 80,000 km / 48 months → next: 359,228 / 2021-12-15 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-diff-oil', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'differential_oil',
        279228, '2017-12-15', 359228, '2021-12-15', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=279228, last_date='2017-12-15', next_km=359228, next_date='2021-12-15', updated_at='2026-04-09T00:00:00';

-- air_filter: REP-042 (2025-10-10 @ 417,164 km) "เปลี่ยนไส้กรองอากาศ"
-- interval: 20,000 km / 12 months → next: 437,164 / 2026-10-10
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-air-filter', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'air_filter',
        417164, '2025-10-10', 437164, '2026-10-10', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=417164, last_date='2025-10-10', next_km=437164, next_date='2026-10-10', updated_at='2026-04-09T00:00:00';

-- ac_filter: REP-015 (2013-07-09 @ 151,688 km) "ไส้กรองเครื่องปรับอากาศ"
-- interval: 20,000 km / 12 months → next: 171,688 / 2014-07-09 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-ac-filter', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'ac_filter',
        151688, '2013-07-09', 171688, '2014-07-09', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=151688, last_date='2013-07-09', next_km=171688, next_date='2014-07-09', updated_at='2026-04-09T00:00:00';

-- fuel_filter: REP-024 (2016-04-19 @ 233,774 km) "ชุดกรองเบนซิน"
-- interval: 20,000 km / 12 months → next: 253,774 / 2017-04-19 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-fuel-filter', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'fuel_filter',
        233774, '2016-04-19', 253774, '2017-04-19', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=233774, last_date='2016-04-19', next_km=253774, next_date='2017-04-19', updated_at='2026-04-09T00:00:00';

-- serpentine_belt: REP-028 (2018-11-14 @ 296,097 km) "สายพานเครื่องยนต์"
-- interval: 80,000 km / 48 months → next: 376,097 / 2022-11-14 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-serpentine', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'serpentine_belt',
        296097, '2018-11-14', 376097, '2022-11-14', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=296097, last_date='2018-11-14', next_km=376097, next_date='2022-11-14', updated_at='2026-04-09T00:00:00';

-- brake_pad: REP-027 (2018-07-17 @ 288,870 km) "เปลี่ยนผ้าเบรกหน้า"
-- interval: 40,000 km / 24 months → next: 328,870 / 2020-07-17 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-brake-pad', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'brake_pad',
        288870, '2018-07-17', 328870, '2020-07-17', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=288870, last_date='2018-07-17', next_km=328870, next_date='2020-07-17', updated_at='2026-04-09T00:00:00';

-- brake_disc: REP-034 (2021-03-11 @ 344,313 km) "เจียรจานเบรกหน้า"
-- interval: 80,000 km / 48 months → next: 424,313 / 2025-03-11 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-brake-disc', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'brake_disc',
        344313, '2021-03-11', 424313, '2025-03-11', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=344313, last_date='2021-03-11', next_km=424313, next_date='2025-03-11', updated_at='2026-04-09T00:00:00';

-- spark_plug: REP-038 (2023-09-25 @ 390,047 km) "เปลี่ยนหัวเทียน"
-- Ventury gasoline profile: 100,000 km / 60 months → next: 490,047 / 2028-09-25
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-spark-plug', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'spark_plug',
        390047, '2023-09-25', 490047, '2028-09-25', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=390047, last_date='2023-09-25', next_km=490047, next_date='2028-09-25', updated_at='2026-04-09T00:00:00';

-- injector_cleaning: REP-041 (2025-06-24 @ 411,622 km) "ล้างหัวฉีดเบนซิน"
-- interval: 60,000 km / 36 months → next: 471,622 / 2028-06-24
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-injector', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'injector_cleaning',
        411622, '2025-06-24', 471622, '2028-06-24', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=411622, last_date='2025-06-24', next_km=471622, next_date='2028-06-24', updated_at='2026-04-09T00:00:00';

-- battery: REP-043 (2025-11-20 @ 420,785 km) "เปลี่ยนแบตเตอรี่ 80D26R MF"
-- interval: 0 km / 24 months → next_km: NULL, next_date: 2027-11-20
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-battery', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'battery',
        420785, '2025-11-20', NULL, '2027-11-20', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=420785, last_date='2025-11-20', next_km=NULL, next_date='2027-11-20', updated_at='2026-04-09T00:00:00';

-- wiper: REP-043 (2025-11-20 @ 420,785 km) "เปลี่ยนยางใบปัดน้ำฝน L, R"
-- interval: 0 km / 12 months → next_km: NULL, next_date: 2026-11-20
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-wiper', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'wiper',
        420785, '2025-11-20', NULL, '2026-11-20', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=420785, last_date='2025-11-20', next_km=NULL, next_date='2026-11-20', updated_at='2026-04-09T00:00:00';

-- shock_absorber: REP-036 (2023-02-10 @ 373,233 km) "เปลี่ยนโช้คอัพหน้า"
-- interval: 80,000 km / 60 months → next: 453,233 / 2028-02-10
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-shock', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'shock_absorber',
        373233, '2023-02-10', 453233, '2028-02-10', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=373233, last_date='2023-02-10', next_km=453233, next_date='2028-02-10', updated_at='2026-04-09T00:00:00';

-- ball_joint: REP-042 (2025-10-10 @ 417,164 km) "เปลี่ยนลูกหมากแร็ค, ลูกหมากคันชัก"
-- interval: 100,000 km / 60 months → next: 517,164 / 2030-10-10
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-ball-joint', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'ball_joint',
        417164, '2025-10-10', 517164, '2030-10-10', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=417164, last_date='2025-10-10', next_km=517164, next_date='2030-10-10', updated_at='2026-04-09T00:00:00';

-- tire_rotation: REP-010 (2011-09-14 @ 83,171 km) "สลับยางถ่วงล้อ"
-- interval: 10,000 km / 6 months → next: 93,171 / 2012-03-14 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-tire-rot', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'tire_rotation',
        83171, '2011-09-14', 93171, '2012-03-14', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=83171, last_date='2011-09-14', next_km=93171, next_date='2012-03-14', updated_at='2026-04-09T00:00:00';

-- ac_service: REP-039 (2024-01-08 @ 394,523 km) "ล้างตู้แอร์"
-- interval: 0 km / 12 months → next_km: NULL, next_date: 2025-01-08 (OVERDUE!)
INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
VALUES ('vm-1977-ac-svc', 'b43ad8e2-04d0-40e0-90ab-d598bf44282d', 'ac_service',
        394523, '2024-01-08', NULL, '2025-01-08', '2026-04-09T00:00:00')
ON CONFLICT(car_id, item_key) DO UPDATE SET
  last_km=394523, last_date='2024-01-08', next_km=NULL, next_date='2025-01-08', updated_at='2026-04-09T00:00:00';
