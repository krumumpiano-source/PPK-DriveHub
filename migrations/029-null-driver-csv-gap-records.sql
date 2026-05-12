-- Migration 029: mark auto-generated csv_gap records with honest mission text
-- driver_id column is NOT NULL so we cannot clear it.
-- Instead we update mission and notes to clearly state the driver is unknown.

-- 1. Update queue records that were auto-generated from CSV gaps
UPDATE queue
SET mission = 'มีการใช้รถโดยไม่บันทึกข้อมูล',
    notes   = COALESCE(notes || ' | ', '') || 'ไม่ทราบพนักงานขับรถ (ข้อมูลจาก CSV gap — ชื่อคนขับเป็นการสันนิษฐานเท่านั้น)'
WHERE mission LIKE 'ไม่มีการบันทึก (auto%';

-- 2. Update auto_notes in usage_records to flag driver as inferred
UPDATE usage_records
SET auto_notes = COALESCE(auto_notes || ' | ', '') || 'ไม่ทราบพนักงานขับรถจริง (driver_id เป็นการสันนิษฐาน)'
WHERE record_source = 'csv_gap';
