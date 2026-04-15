-- Migration 013: แก้ไข notes ของ maintenance_profiles ให้ตรงกับของเหลวที่ใช้จริง
-- ตามบันทึกซ่อม (repair_items) — ค่า interval_km / interval_months ถูกต้องอยู่แล้วทั้งหมด
-- เปลี่ยนแค่ notes ให้สะท้อนยี่ห้อ/เกรดจริงที่ช่างใช้

-- Coaster coolant: ยังคงใช้ Hino LLC เพราะเป็นเครื่อง Hino → notes ถูกต้องแล้ว

-- ============================================================
-- 2. Ventury (นข 1977, ปี 2551/2008, เบนซิน 2TR-FE)
-- บันทึกซ่อมใช้ "น้ำมันกึ่งสังเคราะห์เขียว" ตลอด (7,154-434,071 km)
-- → Toyota Genuine Semi-Synthetic Green 10W-30 API SN
-- ============================================================
UPDATE maintenance_profiles
SET notes = '2TR-FE: 10W-30 SN กึ่งสังเคราะห์เขียวแท้โตโยต้า',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Ventury' AND item_key = 'engine_oil';

-- ============================================================
-- 3. Commuter (ทั้ง H200 นข 2455 และ H300 นข 3816)
-- H200: เริ่มจาก สีแดง CI-4 → เปลี่ยนมาเป็น กึ่งสังเคราะห์ ตั้งแต่ปี 2017
-- H300: ใช้ ดีเซลสังเคราะห์ DL-1 ตลอด
-- ============================================================
UPDATE maintenance_profiles
SET notes = 'H200(2KD): กึ่งสังเคราะห์เขียว 10W-30 / H300(1GD-DPF): 5W-30 DL-1 ดีเซลสังเคราะห์',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Commuter' AND item_key = 'engine_oil';

-- ============================================================
-- 4. TOYOTA wildcard (*) engine_oil base notes — ปรับให้แม่นยำขึ้น
-- ============================================================
UPDATE maintenance_profiles
SET notes = 'ดีเซล: 15W-40 CI-4 / เบนซิน: 10W-30 SN กึ่งสังเคราะห์เขียว',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = '*' AND item_key = 'engine_oil';

-- ============================================================
-- 5. Ventury gear_oil — repair records show TYPE T-IV ATF
-- ============================================================
UPDATE maintenance_profiles
SET notes = 'ATF Type T-IV (เกียร์ออโต้)',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Ventury' AND item_key = 'gear_oil';

-- ============================================================
-- 6. Commuter gear_oil — repair records show TYPE T-IV
-- ============================================================
UPDATE maintenance_profiles
SET notes = 'ATF Type T-IV (เกียร์ออโต้)',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Commuter' AND item_key = 'gear_oil';

-- ============================================================
-- 7. Commuter differential_oil — repair records show 90 GL-5
-- ============================================================
UPDATE maintenance_profiles
SET notes = 'Hypoid Gear Oil 90 GL-5',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Commuter' AND item_key = 'differential_oil';

-- ============================================================
-- 8. Ventury differential_oil — repair records show 90 GL-5
-- ============================================================
UPDATE maintenance_profiles
SET notes = 'Hypoid Gear Oil 90 GL-5',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Ventury' AND item_key = 'differential_oil';

-- ============================================================
-- 9. Coaster engine oil interval — ช่างเปลี่ยนจริงเฉลี่ย ~5,123 km
-- แม้สเปก DL-1 synthetic = 10,000 km แต่ช่างเลือกเปลี่ยนถี่กว่า
-- เนื่องจากเป็นรถมินิบัส ขนคนเยอะ บรรทุกหนัก
-- → ปรับเป็น 5,000 km เพื่อให้แจ้งเตือนสอดคล้องกับการใช้งานจริง
-- ============================================================
UPDATE maintenance_profiles
SET interval_km = 5000,
    interval_months = 3,
    notes = 'N04C-UN (DPF): 5W-30 DL-1 ดีเซลสังเคราะห์ — มินิบัสบรรทุกหนัก เปลี่ยนทุก 5,000 km',
    updated_at = datetime('now')
WHERE brand = 'TOYOTA' AND model = 'Coaster' AND item_key = 'engine_oil';
