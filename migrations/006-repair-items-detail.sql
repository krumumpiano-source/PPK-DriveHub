-- Migration 006: เพิ่มรายละเอียดใบแจ้งหนี้/ใบเสร็จซ่อม + ตาราง repair_items
-- รองรับข้อมูลจากใบแจ้งหนี้ Toyota (invoice number, ค่าแรง/ค่าอะไหล่, VAT, ส่วนลด, รายการอะไหล่ itemized)

-- 1. เพิ่มคอลัมน์ใหม่ใน repair_log
ALTER TABLE repair_log ADD COLUMN invoice_number TEXT;
ALTER TABLE repair_log ADD COLUMN work_order_number TEXT;
ALTER TABLE repair_log ADD COLUMN service_type TEXT DEFAULT 'repair' CHECK(service_type IN ('scheduled_maintenance','repair','inspection','other'));
ALTER TABLE repair_log ADD COLUMN labour_cost REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN parts_cost REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN discount_amount REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN vat_amount REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN grand_total REAL DEFAULT 0;
ALTER TABLE repair_log ADD COLUMN mileage_out INTEGER;
ALTER TABLE repair_log ADD COLUMN mechanic_name TEXT;

-- 2. สร้างตาราง repair_items สำหรับเก็บรายการอะไหล่/ค่าแรง itemized
CREATE TABLE IF NOT EXISTS repair_items (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL,
  part_code TEXT,
  description TEXT NOT NULL,
  brand_condition TEXT,
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

-- 3. สร้าง index สำหรับ invoice_number
CREATE INDEX IF NOT EXISTS idx_repair_log_invoice ON repair_log(invoice_number);
CREATE INDEX IF NOT EXISTS idx_repair_log_service_type ON repair_log(service_type);
