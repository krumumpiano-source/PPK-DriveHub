-- Migration 016: Usage records — purpose, destination, driver_name_manual
-- PPK DriveHub — April 2026

-- ============================================================
-- 1. USAGE_RECORDS — เพิ่ม field สำหรับวัตถุประสงค์และคนขับแบบ manual
-- ============================================================

ALTER TABLE usage_records ADD COLUMN purpose TEXT;
-- วัตถุประสงค์การใช้รถ (เช่น school_passenger / official_document / other)

ALTER TABLE usage_records ADD COLUMN destination TEXT;
-- จุดหมายปลายทาง (เพิ่มแยกจาก location เพื่อรองรับ QR form ใหม่)

ALTER TABLE usage_records ADD COLUMN driver_name_manual TEXT;
-- ชื่อคนขับที่กรอกเอง สำหรับผู้ใช้ที่ไม่มีบัญชีในระบบ (qr_manual mode)

-- ============================================================
-- 2. INDEX — ช่วย filter รายการแบบ manual ใน usage log
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usage_records_source ON usage_records(record_source);
-- record_source ถูกเพิ่มในมัตรา 005 แล้ว, index นี้เพิ่มประสิทธิภาพ filter ใน usage-log
