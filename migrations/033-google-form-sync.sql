-- Migration 033: Google Form sync support
-- เพิ่มคอลัมน์สำหรับติดตามแหล่งที่มาของข้อมูลที่ sync จาก Google Form
-- + ตาราง log การ sync

-- 1. คอลัมน์ form_timestamp = ประทับเวลาจากแถวใน Form (ใช้กัน duplicate)
ALTER TABLE usage_records ADD COLUMN form_timestamp TEXT;

-- 2. UNIQUE index กัน insert ซ้ำ row เดิมจาก Form
--    SQLite รองรับ partial unique index — ใช้ได้เฉพาะ row ที่มา Google Form
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_form_dedup
  ON usage_records(record_source, car_id, record_type, form_timestamp)
  WHERE form_timestamp IS NOT NULL;

-- 3. ตาราง log การ sync เพื่อให้ดูประวัติได้
CREATE TABLE IF NOT EXISTS gform_sync_log (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','success','partial','error')),
  trigger_source TEXT NOT NULL DEFAULT 'cron',  -- cron | manual | github_actions
  triggered_by TEXT,                             -- user email/id ถ้า manual
  sheets_processed INTEGER NOT NULL DEFAULT 0,
  rows_fetched INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,       -- duplicates / existing
  rows_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  details TEXT                                   -- JSON: per-sheet breakdown
);

CREATE INDEX IF NOT EXISTS idx_gform_sync_started ON gform_sync_log(started_at DESC);
