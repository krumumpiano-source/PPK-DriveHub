-- Migration 026: แก้ไขเลขไมล์ที่บันทึกผิด ชุดที่ 2

-- 1. 525725 → 425725 (2026-01-26 return, T-record 6d851593 = 425725)
UPDATE usage_records
SET mileage = '425725'
WHERE id = '065e0f16-0c64-4c4d-9c0e-0c08e56e7b07'
  AND mileage = '525725';

-- 2. 230552 → 238552 (2026-03-03 return, T-record 42244ae7 = 238552)
UPDATE usage_records
SET mileage = '238552'
WHERE id = '2360b4df-34bc-4f50-a02d-54d2517ec0cf'
  AND mileage = '230552';
