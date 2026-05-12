-- Migration 030: ลบ queue records ซ้ำที่เกิดจาก migration 028 รัน 2 pass
-- สำหรับทุก (car_id, time_start, date) ที่มีมากกว่า 1 gap record
-- เก็บไว้แค่ 1 ตัว (id ที่มีค่าน้อยสุด) แล้วลบตัวที่เหลือพร้อม usage_records

-- 1. ลบ usage_records ที่ผูกกับ duplicate queue id ก่อน
DELETE FROM usage_records
WHERE queue_id IN (
  SELECT id FROM queue
  WHERE mission LIKE '%ไม่บันทึก%'
    AND id NOT IN (
      SELECT MIN(id)
      FROM queue
      WHERE mission LIKE '%ไม่บันทึก%'
      GROUP BY car_id, date, time_start
    )
);

-- 2. ลบ duplicate queue records
DELETE FROM queue
WHERE mission LIKE '%ไม่บันทึก%'
  AND id NOT IN (
    SELECT MIN(id)
    FROM queue
    WHERE mission LIKE '%ไม่บันทึก%'
    GROUP BY car_id, date, time_start
  );
