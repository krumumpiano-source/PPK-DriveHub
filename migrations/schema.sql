-- PPK DriveHub — Database Schema
-- Cloudflare D1 (SQLite)
-- Migrated from Google Sheets (27 sheets → 27 tables)

-- ============================================================
-- GROUP 1: AUTH & USERS (4 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  line_user_id TEXT,
  position TEXT,
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','super_admin','vehicle','fuel','repair','viewer','manager','driver','staff')),
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
  title TEXT,
  department TEXT,
  phone TEXT,
  reason TEXT,
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
  updated_by TEXT,
  qr_survey_code TEXT,
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
  category TEXT DEFAULT 'general',
  fuel_type_filter TEXT DEFAULT NULL,
  vehicle_class TEXT DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  dlt_required INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_profiles (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT DEFAULT '*',
  item_key TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(brand, model, item_key)
);

CREATE INDEX IF NOT EXISTS idx_mp_brand ON maintenance_profiles(brand);
CREATE INDEX IF NOT EXISTS idx_mp_item ON maintenance_profiles(item_key);

CREATE TABLE IF NOT EXISTS maintenance_vehicle_profiles (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(car_id, item_key),
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

CREATE INDEX IF NOT EXISTS idx_mvp_car ON maintenance_vehicle_profiles(car_id);
CREATE INDEX IF NOT EXISTS idx_mvp_item ON maintenance_vehicle_profiles(item_key);

CREATE TABLE IF NOT EXISTS check_log (
  check_image TEXT,
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
  updated_by TEXT,
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  license_number TEXT,
  license_expiry TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','on_leave')),
  profile_image TEXT,                             -- R2 key
  id_card_image TEXT,                             -- R2 key
  fatigue_flag INTEGER NOT NULL DEFAULT 0,
  discipline_score INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  line_id TEXT DEFAULT '',
  position TEXT DEFAULT '',
  start_date TEXT,
  id_card_number TEXT DEFAULT '',
  date_of_birth TEXT,
  address TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  emergency_phone TEXT DEFAULT '',
  assignment_type TEXT DEFAULT 'primary',
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
  return_date TEXT,
  distance_justification TEXT,
  estimated_fuel_cost REAL,
  waypoints TEXT,
  signed_director TEXT,
  signed_deputy_director TEXT,
  signed_vehicle_chief TEXT,
  purpose_category TEXT,
  travel_order_number TEXT,
  updated_by TEXT,
  backup_driver_id TEXT REFERENCES drivers(id),
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
  estimated_km REAL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS usage_records (
  odometer_image TEXT,
  passengers TEXT,
  form_timestamp TEXT,
  correction_note TEXT,
  updated_at TEXT,
  updated_by TEXT,
  driver_name_manual TEXT,
  destination TEXT,
  purpose TEXT,
  record_source TEXT DEFAULT 'manual',
  auto_notes TEXT,
  is_historical INTEGER NOT NULL DEFAULT 0,
  requester_name TEXT,
  data_quality TEXT NOT NULL DEFAULT 'normal',
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  driver_id TEXT,
  record_type TEXT NOT NULL CHECK(record_type IN ('departure','return','refuel','inspection')),
  datetime TEXT NOT NULL,
  mileage INTEGER,
  location TEXT,
  notes TEXT,
  queue_id TEXT,
  lat REAL,
  lng REAL,
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
  fuel_type TEXT NOT NULL DEFAULT 'diesel' CHECK(fuel_type IN ('diesel', 'v_power_diesel', 'gasohol_95', 'gasohol_91', 'e20', 'premium_diesel')),
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
  updated_by TEXT,
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  date_reported TEXT NOT NULL,
  date_started TEXT,
  date_completed TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN (
    'requested','approved','rejected','inspected','documented','repairing','completed','cancelled'
  )),
  mileage_at_repair INTEGER,
  mileage_out INTEGER,
  reporter_id TEXT,
  reporter_name TEXT,
  garage_name TEXT,
  mechanic_name TEXT,
  taken_by TEXT,
  repair_items TEXT DEFAULT '[]',                 -- JSON array of repair item names
  issue_description TEXT,
  cost REAL,
  labour_cost REAL DEFAULT 0,
  parts_cost REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  invoice_number TEXT,
  work_order_number TEXT,
  service_type TEXT DEFAULT 'repair',             -- repair/scheduled_service/accident/insurance
  claim_number TEXT,
  insurance_company TEXT,
  documents TEXT DEFAULT '[]',                    -- JSON array of R2 keys
  quotation_documents TEXT DEFAULT '[]',
  memo_documents TEXT DEFAULT '[]',
  receipt_documents TEXT DEFAULT '[]',
  memo_notes TEXT,
  notes TEXT,
  latitude REAL,
  longitude REAL,
  approved_by TEXT,
  approved_at TEXT,
  rejected_by TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  inspection_date TEXT,
  inspection_notes TEXT,
  requested_by_driver_id TEXT REFERENCES drivers(id),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

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
  updated_at TEXT,
  updated_by TEXT,
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
  updated_at TEXT,
  updated_by TEXT,
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
CREATE INDEX IF NOT EXISTS idx_usage_records_queue_id ON usage_records(queue_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_record_type ON usage_records(record_type);

-- ============================================================
-- GROUP 9: EVALUATIONS & WARNINGS (2 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_evaluations (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  queue_id TEXT,                                  -- NULL for committee evaluation
  evaluator_id TEXT NOT NULL,                     -- user_id of passenger or committee member
  evaluation_type TEXT NOT NULL DEFAULT 'passenger' CHECK(evaluation_type IN ('passenger','committee')),
  score_driving INTEGER,                          -- 1-5
  score_service INTEGER,                          -- 1-5
  score_punctuality INTEGER,                      -- 1-5
  score_maintenance INTEGER,                      -- 1-20 (committee only)
  score_discipline INTEGER,                       -- 1-20 (committee only)
  score_contribution INTEGER,                     -- 1-20 (committee only)
  total_score REAL NOT NULL,                      -- calculated average for passenger (1-5), or total (1-60) for committee
  comments TEXT,
  academic_year TEXT,                             -- To group evaluations by year (e.g. '2569')
  created_at TEXT NOT NULL,
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (queue_id) REFERENCES queue(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_driver_evaluations_driver_id ON driver_evaluations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_evaluations_type ON driver_evaluations(evaluation_type);
CREATE INDEX IF NOT EXISTS idx_driver_evaluations_year ON driver_evaluations(academic_year);

CREATE TABLE IF NOT EXISTS driver_warnings (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  warning_type TEXT NOT NULL DEFAULT 'written_warning' CHECK(warning_type IN ('verbal_record','written_warning','contract_breach_notice')),
  reason TEXT NOT NULL,
  pip_start_date TEXT,
  pip_end_date TEXT,
  issued_by TEXT NOT NULL,                        -- user_id of admin/committee chair
  acknowledged_by_driver INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  academic_year TEXT,                             -- To track warnings per contract year
  created_at TEXT NOT NULL,
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (issued_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_driver_warnings_driver_id ON driver_warnings(driver_id);


-- Added from 003-usage-quality-and-indexes.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT NOT NULL,
  blocked_until TEXT
);

-- Added from 005-system-overhaul.sql
CREATE TABLE IF NOT EXISTS repair_log_new (
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  date_reported TEXT NOT NULL,
  date_started TEXT,
  date_completed TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN (
    'requested','approved','rejected','inspected','documented','repairing','completed','cancelled'
  )),
  mileage_at_repair INTEGER,
  reporter_id TEXT,
  reporter_name TEXT,
  garage_name TEXT,
  repair_items TEXT DEFAULT '[]',
  issue_description TEXT,
  cost REAL,
  documents TEXT DEFAULT '[]',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  -- New columns for 7-step workflow
  approved_by TEXT,
  approved_at TEXT,
  rejected_by TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  inspection_date TEXT,
  inspection_notes TEXT,
  quotation_documents TEXT DEFAULT '[]',
  memo_documents TEXT DEFAULT '[]',
  memo_notes TEXT,
  receipt_documents TEXT DEFAULT '[]',
  requested_by_driver_id TEXT REFERENCES drivers(id),
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- Added from 005-system-overhaul.sql
CREATE TABLE IF NOT EXISTS vehicle_requests (
  signature_image TEXT,
  request_no TEXT,
  return_date TEXT,
  waypoints TEXT,
  updated_by TEXT,
  created_by TEXT,
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_department TEXT,
  date TEXT NOT NULL,
  time_start TEXT,
  time_end TEXT,
  destination TEXT NOT NULL,
  route TEXT,
  purpose TEXT,
  passengers INTEGER DEFAULT 1,
  passenger_names TEXT DEFAULT '[]',
  priority TEXT DEFAULT 'general' CHECK(priority IN ('urgent','teaching_support','general')),
  is_urgent INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  approved_by TEXT,
  approved_at TEXT,
  assigned_car_id TEXT,
  assigned_driver_id TEXT,
  assigned_queue_id TEXT,
  rejection_reason TEXT,
  notes TEXT,
  pdf_generated_at TEXT,
  dest_lat REAL,
  dest_lng REAL,
  estimated_km REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (assigned_car_id) REFERENCES cars(id),
  FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id),
  FOREIGN KEY (assigned_queue_id) REFERENCES queue(id)
);

-- Added from 005-system-overhaul.sql
CREATE TABLE IF NOT EXISTS survey_responses (
  user_agent TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  queue_id TEXT,
  driver_id TEXT,
  politeness_score INTEGER CHECK(politeness_score BETWEEN 1 AND 5),
  safety_score INTEGER CHECK(safety_score BETWEEN 1 AND 5),
  punctuality_score INTEGER CHECK(punctuality_score BETWEEN 1 AND 5),
  cleanliness_score INTEGER CHECK(cleanliness_score BETWEEN 1 AND 5),
  appearance_score INTEGER CHECK(appearance_score BETWEEN 1 AND 5),
  overall_score INTEGER CHECK(overall_score BETWEEN 1 AND 5),
  comment TEXT,
  respondent_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (queue_id) REFERENCES queue(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Added from 005-system-overhaul.sql
CREATE TABLE IF NOT EXISTS incidents (
  updated_by TEXT,
  notes TEXT,
  incident_time TEXT,
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  driver_id TEXT,
  incident_date TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK(incident_type IN ('accident','traffic_violation','damage','other')),
  description TEXT,
  location TEXT,
  damage_cost REAL DEFAULT 0,
  photos TEXT DEFAULT '[]',
  police_report_number TEXT,
  insurance_claim TEXT,
  status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','investigating','resolved','closed')),
  resolved_by TEXT,
  resolved_at TEXT,
  resolution_notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Added from 005-system-overhaul.sql
CREATE TABLE IF NOT EXISTS inspection_records (
  updated_at TEXT,
  updated_by TEXT,
  id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  inspection_center TEXT,
  result TEXT CHECK(result IN ('passed','failed')),
  cost REAL,
  certificate_image TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- Added from 005-system-overhaul.sql
CREATE TABLE IF NOT EXISTS trip_evaluations (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  driver_behavior_score INTEGER CHECK(driver_behavior_score BETWEEN 1 AND 5),
  vehicle_condition_score INTEGER CHECK(vehicle_condition_score BETWEEN 1 AND 5),
  punctuality_score INTEGER CHECK(punctuality_score BETWEEN 1 AND 5),
  overall_score INTEGER CHECK(overall_score BETWEEN 1 AND 5),
  problems TEXT,
  suggestions TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (queue_id) REFERENCES queue(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);

-- Added from 033-google-form-sync.sql
CREATE TABLE IF NOT EXISTS gform_sync_log (
  rows_updated INTEGER NOT NULL DEFAULT 0,
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

-- Added from 034-passengers-and-fuel-budget.sql
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

-- Added from 051-optimize-d1-read-indexes.sql
CREATE INDEX IF NOT EXISTS idx_usage_records_sync_lookup ON usage_records(car_id, record_source, form_timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_records_car_datetime ON usage_records(car_id, datetime DESC);
CREATE INDEX IF NOT EXISTS idx_usage_records_heal_lookup ON usage_records(car_id, record_type, datetime DESC);
CREATE INDEX IF NOT EXISTS idx_queue_car_status_date ON queue(car_id, status, date DESC, time_start DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_log_car_del_date ON fuel_log(car_id, deleted_at, date);
CREATE INDEX IF NOT EXISTS idx_repair_log_car_date ON repair_log(car_id, date_reported);