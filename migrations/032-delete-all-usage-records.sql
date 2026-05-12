-- Migration 032: ลบข้อมูลบันทึกการใช้รถทั้งหมด
-- วันที่: 2026-05-12
DELETE FROM usage_records;

-- Reset auto-increment sequence
DELETE FROM sqlite_sequence WHERE name = 'usage_records';
