-- PPK DriveHub — Database Schema
-- Cloudflare D1 (SQLite)
-- Migrated from Google Sheets (27 sheets → 27 tables)

-- ============================================================
-- GROUP 1: AUTH & USERS (4 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','super_admin','vehicle','fuel','repair','viewer')),
  permissions TEXT NOT NULL DEFAULT '{}',         -- JSON: {queue:'view', fuel:'create', ...}
  title TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  profile_image TEXT,
  driver_id TEXT,                                  -- link to drivers table if this user is a driver
  active INTEGER NOT NULL DEFAULT 1,
  pdpa_accepted INTEGER NOT NULL DEFAULT 0,
  pdpa_accepted_at TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_impersonated INTEGER NOT NULL DEFAULT 0,
  impersonator_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'viewer',
  initial_permissions TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  initial_password_hash TEXT,
  salt TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reset_password_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- GROUP 2: VEHICLES (5 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  license_plate TEXT UNIQUE NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  seat_count INTEGER DEFAULT 4,
  chassis_number TEXT,
  engine_number TEXT,
  registration_date TEXT,
  registration_expiry TEXT,
  owner_name TEXT,
  owner_address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_mileage INTEGER DEFAULT 0,
  qr_code TEXT,
  vehicle_images TEXT DEFAULT '[]',               -- JSON array of R2 keys
  registration_book_image TEXT,                   -- R2 key
  notes TEXT,
  deactivated_reason TEXT,
  deactivated_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  province TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT '',
  registration_number TEXT DEFAULT '',
  vehicle_category TEXT DEFAULT 'primary'
);

CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  item_key TEXT NOT NULL,                         -- e.g. 'oil_change', 'tire_rotation'
  last_km INTEGER,
  last_date TEXT,
  next_km INTEGER,
  next_date TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(car_id, item_key),
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

CREATE TABLE IF NOT EXISTS maintenance_settings (
  id TEXT PRIMARY KEY,
  item_key TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS check_log (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  inspector TEXT NOT NULL,                        -- ชื่อผู้ตรวจ
  check_type TEXT NOT NULL DEFAULT 'daily',
  overall_status TEXT NOT NULL DEFAULT 'ok' CHECK(overall_status IN ('ok','warning','critical')),
  checks_data TEXT NOT NULL DEFAULT '{}',         -- JSON: {brakes:'ok', lights:'warning', ...}
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

CREATE TABLE IF NOT EXISTS inspection_alerts (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
  items TEXT NOT NULL DEFAULT '[]',               -- JSON array of alert items
  recommendations TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- ============================================================
-- GROUP 3: DRIVERS (3 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT,
  license_expiry TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','on_leave')),
  profile_image TEXT,                             -- R2 key
  id_card_image TEXT,                             -- R2 key
  fatigue_flag INTEGER NOT NULL DEFAULT 0,
  discipline_score INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  deactivated_reason TEXT,
  deactivated_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leaves (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'sick' CHECK(leave_type IN ('sick','personal','vacation','other')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS self_reported_fatigue (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  reason TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by TEXT,
  admin_notes TEXT,
  acknowledged_at TEXT,
  reported_at TEXT NOT NULL,
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- ============================================================
-- GROUP 4: QUEUE & USAGE (3 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS queue (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT NOT NULL,
  car_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  requester_id TEXT,
  requested_by TEXT,                              -- ชื่อผู้ขอ (อาจเป็นชื่อ key หรือชื่อเสรี)
  mission TEXT NOT NULL,
  destination TEXT,
  passengers INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','ongoing','completed','cancelled','frozen')),
  frozen_by TEXT,
  frozen_at TEXT,
  frozen_reason TEXT,
  cancel_reason TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  driver_id TEXT,
  record_type TEXT NOT NULL CHECK(record_type IN ('departure','return','refuel','inspection')),
  datetime TEXT NOT NULL,
  mileage INTEGER,
  location TEXT,
  notes TEXT,
  queue_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (queue_id) REFERENCES queue(id)
);

CREATE TABLE IF NOT EXISTS queue_rules (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

-- ============================================================
-- GROUP 5: FUEL (2 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_log (
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
  pump_meter_number TEXT,                         -- เลขหน้าตู้หัวจ่ายน้ำมัน
  receipt_image TEXT,                             -- R2 key
  receipt_pdf TEXT,                               -- R2 key
  fuel_consumption_rate REAL,                     -- km/liter
  expense_type TEXT DEFAULT 'procurement' CHECK(expense_type IN ('procurement','official_travel')),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT,                                -- soft delete timestamp
  deleted_by TEXT,                                -- user id ที่ลบ
  document_number TEXT,                           -- FUL-2569-04-001
  anomaly_flag INTEGER DEFAULT 0,                 -- 0=ปกติ, 1=ผิดปกติ
  purpose TEXT,                                   -- school_passenger/official_document/other
  purpose_detail TEXT,                            -- required เมื่อ purpose = 'other'
  driver_name_manual TEXT,                        -- ชื่อผู้เบิกที่พิมพ์เอง
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

CREATE INDEX IF NOT EXISTS idx_fuel_log_deleted ON fuel_log(deleted_at);
CREATE INDEX IF NOT EXISTS idx_fuel_log_document_number ON fuel_log(document_number);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date_car ON fuel_log(date, car_id);

CREATE TABLE IF NOT EXISTS fuel_requests (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  requester_id TEXT,
  requested_amount REAL,
  requested_liters REAL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

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

-- ============================================================
-- GROUP 6: REPAIR (2 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS repair_log (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  date_reported TEXT NOT NULL,
  date_started TEXT,
  date_completed TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')),
  mileage_at_repair INTEGER,
  reporter_id TEXT,
  reporter_name TEXT,
  garage_name TEXT,
  repair_items TEXT DEFAULT '[]',                 -- JSON array of repair items
  issue_description TEXT,
  cost REAL,
  documents TEXT DEFAULT '[]',                    -- JSON array of R2 keys
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

CREATE TABLE IF NOT EXISTS scheduled_repairs (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  repair_type TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled')),
  completed_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- ============================================================
-- GROUP 7: TAX & INSURANCE (2 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_records (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  tax_type TEXT NOT NULL DEFAULT 'annual_tax' CHECK(tax_type IN ('annual_tax','registration_renewal','other')),
  amount REAL,
  paid_date TEXT,
  expiry_date TEXT,
  receipt_image TEXT,                             -- R2 key
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

CREATE TABLE IF NOT EXISTS insurance_records (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  insurance_type TEXT NOT NULL DEFAULT 'compulsory' CHECK(insurance_type IN ('compulsory','voluntary','other')),
  insurance_company TEXT,
  policy_number TEXT,
  amount REAL,
  paid_date TEXT,
  expiry_date TEXT,
  coverage_details TEXT,
  receipt_image TEXT,                             -- R2 key
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- ============================================================
-- GROUP 8: SYSTEM (5 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  action TEXT NOT NULL,
  module TEXT,
  entity_id TEXT,
  details TEXT,                                   -- JSON
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pdpa_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  accessed_user_id TEXT,
  action TEXT NOT NULL,
  data_type TEXT,
  purpose TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,                                   -- NULL = broadcast to all
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  module TEXT,
  row_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_queue_date ON queue(date);
CREATE INDEX IF NOT EXISTS idx_queue_car_id ON queue(car_id);
CREATE INDEX IF NOT EXISTS idx_queue_driver_id ON queue(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_car_id ON fuel_log(car_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date ON fuel_log(date);
CREATE INDEX IF NOT EXISTS idx_repair_log_car_id ON repair_log(car_id);
CREATE INDEX IF NOT EXISTS idx_repair_log_status ON repair_log(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_tax_records_car_id ON tax_records(car_id);
CREATE INDEX IF NOT EXISTS idx_insurance_records_car_id ON insurance_records(car_id);
CREATE INDEX IF NOT EXISTS idx_check_log_car_id ON check_log(car_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_car_id ON usage_records(car_id);
