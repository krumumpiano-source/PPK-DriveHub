-- Migration 025: แก้ไขเลขไมล์ที่บันทึกผิด (double-paste / typo)
-- ตรวจสอบจาก T-records คู่และ records รอบข้าง

-- 1. 301482301482 → 301482 (2026-02-13, ป้ายทะเบียน 301482)
UPDATE usage_records
SET mileage = '301482'
WHERE id = '8073163b-d616-4abb-baa8-19617a8f2919'
  AND mileage = '301482301482';

-- 2. 238458238458 → 238458 (2026-02-25)
UPDATE usage_records
SET mileage = '238458'
WHERE id = 'ecbfd370-d85a-42d5-b83a-274ae4b3599c'
  AND mileage = '238458238458';

-- 3. 4112141121 → 41121 (2026-03-30, confirmed by next record 2026-04-02 = 41121)
UPDATE usage_records
SET mileage = '41121'
WHERE id = 'aab4e4b3-53a6-75e8-244e-ae5a586d7b0c'
  AND mileage = '4112141121';

-- 4. 4245013 → 425013 (2026-01-22 return, confirmed by T-record 843353cb = 425013)
UPDATE usage_records
SET mileage = '425013'
WHERE id = '7ec38f80-d85b-4052-8fb9-88ce051e62a1'
  AND mileage = '4245013';

-- 5. 4245013 → 425013 (2026-01-23 departure, confirmed by T-record 3aecb1b3 = 425013)
UPDATE usage_records
SET mileage = '425013'
WHERE id = '6795a036-912a-4dc3-972c-836e2f75b068'
  AND mileage = '4245013';

-- 6. 42 → 425245 (2026-01-23 return, confirmed by T-record 5a2463a1 = 425245)
UPDATE usage_records
SET mileage = '425245'
WHERE id = 'de363c1f-1749-4454-9379-d2be0ef481a9'
  AND mileage = '42';
