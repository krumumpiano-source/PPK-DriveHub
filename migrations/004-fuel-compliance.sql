-- ============================================================
-- Migration 004: Fuel Compliance — หลักการพัสดุ
-- Adds soft delete, document number, anomaly detection,
-- purpose, driver manual name, and bill reconciliation tables.
-- ============================================================

-- 1A. ALTER TABLE fuel_log — เพิ่ม 7 columns
ALTER TABLE fuel_log ADD COLUMN deleted_at TEXT;
ALTER TABLE fuel_log ADD COLUMN deleted_by TEXT;
ALTER TABLE fuel_log ADD COLUMN document_number TEXT;
ALTER TABLE fuel_log ADD COLUMN anomaly_flag INTEGER DEFAULT 0;
ALTER TABLE fuel_log ADD COLUMN purpose TEXT;
ALTER TABLE fuel_log ADD COLUMN purpose_detail TEXT;
ALTER TABLE fuel_log ADD COLUMN driver_name_manual TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fuel_log_deleted ON fuel_log(deleted_at);
CREATE INDEX IF NOT EXISTS idx_fuel_log_document_number ON fuel_log(document_number);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date_car ON fuel_log(date, car_id);

-- 1C. Seed fuel_types_list
INSERT OR IGNORE INTO system_settings (id, key, value, updated_at) VALUES
('ss-20', 'fuel_types_list', '[{"id":"fuelSave_gasohol91","name":"ฟิวเซฟ แก๊สโซฮอล์ 91"},{"id":"vPower_gasohol95","name":"วี-เพาวอร์แก๊สโซฮอล์ 95"},{"id":"vPower_diesel_b7","name":"วี-เพาเวอร์ ดีเซล B7"},{"id":"fuelSave_diesel_b7","name":"ฟิวเซฟดีเซล B7"},{"id":"e20","name":"E20"},{"id":"fuelSave_diesel","name":"ฟิวเซฟดีเซล"}]', datetime('now'));

-- ============================================================
-- Bill Reconciliation tables (Phase 9A)
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_station_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  station_name TEXT,
  date_from TEXT,
  date_to TEXT,
  invoice_date TEXT,
  total_amount REAL,
  invoice_image TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','matched','mismatched','resolved')),
  notes TEXT,
  reconciled_by TEXT,
  reconciled_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS fuel_invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  fuel_type TEXT,
  total_liters REAL,
  total_amount REAL,
  FOREIGN KEY (invoice_id) REFERENCES fuel_station_invoices(id)
);
