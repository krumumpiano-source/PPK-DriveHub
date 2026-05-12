-- ======================================================
-- Migration 024: Batch heal departure_only records
-- สร้าง auto_return สำหรับรายการที่บันทึกออกแต่ไม่มีบันทึกกลับ
-- ======================================================

-- Step 1: สร้าง auto_return record สำหรับทุก departure_only
-- ที่ไม่มี return record ตามมาภายหลัง
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
  ur.car_id,
  ur.driver_id,
  'return',
  substr(ur.datetime, 1, 11) || '17:00:00',
  ur.mileage,
  '', '',
  ur.queue_id,
  'auto_return',
  'ระบบสร้างอัตโนมัติ (batch) — ออกเดินทาง ' || substr(ur.datetime, 1, 10) || ' แต่ไม่มีบันทึกกลับ',
  1,
  datetime('now')
FROM usage_records ur
WHERE ur.data_quality = 'departure_only'
  AND NOT EXISTS (
    SELECT 1 FROM usage_records r2
    WHERE r2.car_id = ur.car_id
      AND r2.record_type = 'return'
      AND r2.datetime >= ur.datetime
      AND r2.data_quality NOT IN ('gap_record')
  );

-- Step 2: อัปเดต departure_only → normal (เพราะมี return แล้ว)
UPDATE usage_records
SET data_quality = 'normal',
    auto_notes = COALESCE(auto_notes || '; ', '') || 'batch-heal 2026-05-12: เพิ่ม auto_return แล้ว'
WHERE data_quality = 'departure_only';
