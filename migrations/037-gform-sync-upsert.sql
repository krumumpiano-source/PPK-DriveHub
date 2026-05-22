-- Migration 037: รองรับ UPDATE เมื่อแก้ไข sheet
-- เพิ่ม rows_updated ใน gform_sync_log เพื่อ track จำนวนแถวที่ถูก update
ALTER TABLE gform_sync_log ADD COLUMN rows_updated INTEGER NOT NULL DEFAULT 0;
