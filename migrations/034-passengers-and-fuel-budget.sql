-- Migration 034: เพิ่ม passengers field + สร้างตาราง fuel_budget
-- วันที่: 2026-05-13
-- ผู้ดำเนินการ: ระบบ PPK DriveHub
-- ความปลอดภัย: additive only - ไม่ลบ/แก้ไขข้อมูลเดิม

-- 1. เพิ่มฟิลด์ passengers ใน usage_records (รายชื่อผู้โดยสาร)
-- หมายเหตุ: D1 SQLite ไม่รองรับ IF NOT EXISTS ใน ADD COLUMN
ALTER TABLE usage_records ADD COLUMN passengers TEXT;

-- 2. สร้างตาราง fuel_budget (วงเงินจัดสรรน้ำมันรายปีงบประมาณ)
CREATE TABLE IF NOT EXISTS fuel_budget (
  id TEXT PRIMARY KEY,
  fiscal_year_be INTEGER NOT NULL,        -- พ.ศ. ปีงบประมาณ เช่น 2569
  fuel_type TEXT,                         -- ประเภทน้ำมัน (null = รวมทุกประเภท)
  allocated_liters REAL,                  -- วงเงินจัดสรร (ลิตร)
  allocated_amount REAL NOT NULL DEFAULT 0, -- วงเงินจัดสรร (บาท)
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(fiscal_year_be, fuel_type)
);

CREATE INDEX IF NOT EXISTS idx_fuel_budget_fy ON fuel_budget(fiscal_year_be);
