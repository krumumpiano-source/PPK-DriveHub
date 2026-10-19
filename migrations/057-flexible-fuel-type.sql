-- Migration 057: Allow flexible fuel types in fuel_log matching system_settings
-- Eliminates rigid CHECK constraint that failed for fuelSave_diesel_b7, vPower, etc.

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS _fuel_log_flexible (
  signed_supply_chief TEXT,
  updated_by TEXT,
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  car_id TEXT NOT NULL,
  driver_id TEXT,
  mileage_before INTEGER,
  mileage_after INTEGER,
  liters REAL NOT NULL,
  price_per_liter REAL,
  amount REAL,
  fuel_type TEXT NOT NULL DEFAULT 'diesel',
  gas_station_name TEXT,
  gas_station_address TEXT,
  gas_station_tax_id TEXT,
  receipt_number TEXT,
  pump_meter_number TEXT,
  receipt_image TEXT,
  receipt_pdf TEXT,
  fuel_consumption_rate REAL,
  expense_type TEXT DEFAULT 'procurement' CHECK(expense_type IN ('procurement','official_travel')),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  document_number TEXT,
  anomaly_flag INTEGER DEFAULT 0,
  purpose TEXT,
  purpose_detail TEXT,
  driver_name_manual TEXT,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

INSERT OR IGNORE INTO _fuel_log_flexible (
  signed_supply_chief, updated_by, id, date, time, car_id, driver_id,
  mileage_before, mileage_after, liters, price_per_liter, amount,
  fuel_type, gas_station_name, gas_station_address, gas_station_tax_id,
  receipt_number, pump_meter_number, receipt_image, receipt_pdf,
  fuel_consumption_rate, expense_type, notes, created_by, created_at,
  updated_at, deleted_at, deleted_by, document_number, anomaly_flag,
  purpose, purpose_detail, driver_name_manual
)
SELECT
  signed_supply_chief, updated_by, id, date, time, car_id, driver_id,
  mileage_before, mileage_after, liters, price_per_liter, amount,
  fuel_type, gas_station_name, gas_station_address, gas_station_tax_id,
  receipt_number, pump_meter_number, receipt_image, receipt_pdf,
  fuel_consumption_rate, expense_type, notes, created_by, created_at,
  updated_at, deleted_at, deleted_by, document_number, anomaly_flag,
  purpose, purpose_detail, driver_name_manual
FROM fuel_log;
DROP TABLE IF EXISTS fuel_log;
ALTER TABLE _fuel_log_flexible RENAME TO fuel_log;

CREATE INDEX IF NOT EXISTS idx_fuel_log_deleted ON fuel_log(deleted_at);
CREATE INDEX IF NOT EXISTS idx_fuel_log_document_number ON fuel_log(document_number);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date_car ON fuel_log(date, car_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_car_id ON fuel_log(car_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date ON fuel_log(date);

PRAGMA foreign_keys=ON;
