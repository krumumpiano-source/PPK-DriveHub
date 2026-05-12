-- Migration 027: Batch-heal orphan departures (ครั้งที่ 2)
-- สร้าง auto_return สำหรับ departure ที่ไม่มีบันทึกกลับภายใน 2 วัน
--
-- ครอบคลุม 2 กรณี:
--   1. is_historical=1 (นำเข้าจาก CSV Google Form) — ทั้งหมด ~64 รายการ
--      สาเหตุ: พนักงานกรอก "ออกเดินทาง" แต่ไม่เคยกลับมากรอก "กลับจากเดินทาง"
--   2. is_historical=0 เก่ากว่า 3 วัน — ~93 รายการ
--      สาเหตุ: ลืมสแกนกลับหลังระบบใหม่เริ่มใช้งาน
--
-- กฎกำหนดเวลา return:
--   - ออกก่อน 15:00 → ตั้ง return เป็น 17:00 วันเดิม
--   - ออกหลัง 15:00  → บวก 2 ชั่วโมง (ป้องกัน return < departure)
-- ======================================================

INSERT INTO usage_records (
  id, car_id, driver_id, record_type,
  datetime, mileage, location, notes,
  queue_id, data_quality, auto_notes,
  is_historical, created_at
)
SELECT
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  lower(hex(randomblob(6))),
  dep.car_id,
  dep.driver_id,
  'return',
  CASE
    WHEN time(dep.datetime) < '15:00:00'
      THEN substr(dep.datetime, 1, 11) || '17:00:00'
    ELSE
      datetime(dep.datetime, '+2 hours')
  END,
  dep.mileage,
  '',
  '',
  dep.queue_id,
  'auto_return',
  'ระบบสร้างอัตโนมัติ (batch-heal 2026-05-12) — ออกเดินทาง ' || substr(dep.datetime, 1, 10) || ' แต่ไม่มีบันทึกกลับ',
  dep.is_historical,
  datetime('now')
FROM usage_records dep
WHERE dep.record_type = 'departure'
  AND dep.data_quality NOT IN ('auto_departure', 'gap_record')
  AND (
    dep.is_historical = 1
    OR (dep.is_historical = 0 AND dep.datetime < date('now', '-3 days'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM usage_records ret
    WHERE ret.car_id = dep.car_id
      AND ret.record_type = 'return'
      AND ret.datetime > dep.datetime
      AND ret.datetime <= datetime(dep.datetime, '+2 days')
  );
