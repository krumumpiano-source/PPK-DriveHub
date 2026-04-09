-- ============================================================
-- Migration 006: Repair Detail Fields
-- PPK DriveHub — April 2026
--
-- เพิ่มฟิลด์ละเอียดสำหรับใบแจ้งซ่อม (invoice, ค่าแรง/อะไหล่, VAT, ประกัน ฯลฯ)
-- + ตาราง repair_items สำหรับรายการอะไหล่แยกรายชิ้น
-- ============================================================

-- 1. เพิ่มคอลัมน์ใหม่ใน repair_log
ALTER TABLE repair_log ADD COLUMN invoice_number TEXT;
ALTER TABLE repair_log ADD COLUMN work_order_number TEXT;
ALTER TABLE repair_log ADD COLUMN service_type TEXT DEFAULT 'repair';
ALTER TABLE repair_log ADD COLUMN labour_cost REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN parts_cost REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN discount_amount REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN vat_amount REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN grand_total REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN mileage_out INTEGER;
ALTER TABLE repair_log ADD COLUMN mechanic_name TEXT;
ALTER TABLE repair_log ADD COLUMN taken_by TEXT;
ALTER TABLE repair_log ADD COLUMN claim_number TEXT;
ALTER TABLE repair_log ADD COLUMN insurance_company TEXT;

-- 2. ตาราง repair_items — รายการอะไหล่/ค่าแรงแยกรายชิ้น
CREATE TABLE IF NOT EXISTS repair_items (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL,
  part_code TEXT DEFAULT '',
  description TEXT NOT NULL,
  brand_condition TEXT DEFAULT '',
  quantity REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  net_amount REAL DEFAULT 0,
  item_type TEXT DEFAULT 'part' CHECK(item_type IN ('part','labour','service','other')),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repair_id) REFERENCES repair_log(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_repair_items_repair_id ON repair_items(repair_id);

-- 3. Indexes สำหรับฟิลด์ใหม่
CREATE INDEX IF NOT EXISTS idx_repair_log_invoice ON repair_log(invoice_number);
CREATE INDEX IF NOT EXISTS idx_repair_log_service_type ON repair_log(service_type);
CREATE INDEX IF NOT EXISTS idx_repair_log_claim ON repair_log(claim_number);
