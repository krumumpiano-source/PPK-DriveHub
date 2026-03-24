-- PPK DriveHub - D1 Database Schema
-- Migration from Google Sheets (26 tables)
-- All column names preserved from GAS project

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS USERS (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  title TEXT,
  full_name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  active INTEGER NOT NULL DEFAULT 1,
  first_login INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  notes TEXT,
  permissions TEXT,
  password_changed_at TEXT
);

-- ============================================================
-- 2. USER_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS USER_REQUESTS (
  request_id TEXT PRIMARY KEY,
  title TEXT,
  full_name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  assigned_role TEXT DEFAULT 'viewer',
  initial_password TEXT,
  notes TEXT
);

-- ============================================================
-- 3. QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS QUEUE (
  queue_id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time_start TEXT,
  time_end TEXT,
  car_id TEXT,
  driver_id TEXT,
  mission TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL,
  created_by TEXT,
  started_at TEXT,
  ended_at TEXT,
  mileage_start REAL,
  mileage_end REAL,
  notes TEXT,
  qr_scan_id TEXT,
  allow_flexible INTEGER DEFAULT 0,
  emergency_override INTEGER DEFAULT 0,
  fatigue_override INTEGER DEFAULT 0,
  override_reason TEXT,
  passenger_count INTEGER DEFAULT 0,
  requested_by TEXT,
  destination TEXT,
  frozen INTEGER DEFAULT 0,
  freeze_at TEXT,
  FOREIGN KEY (car_id) REFERENCES CARS(car_id),
  FOREIGN KEY (driver_id) REFERENCES DRIVERS(driver_id)
);

-- ============================================================
-- 4. CARS
-- ============================================================
CREATE TABLE IF NOT EXISTS CARS (
  car_id TEXT PRIMARY KEY,
  license_plate TEXT NOT NULL,
  province TEXT,
  brand TEXT,
  model TEXT,
  year TEXT,
  color TEXT,
  fuel_type TEXT,
  vehicle_type TEXT,
  seat_count INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  qr_code TEXT,
  vehicle_images TEXT,
  registration_book_image TEXT,
  registration_number TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  registration_date TEXT,
  registration_expiry TEXT,
  owner_name TEXT,
  owner_address TEXT,
  mileage REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- 5. DRIVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS DRIVERS (
  driver_id TEXT PRIMARY KEY,
  title TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  line_id TEXT,
  position TEXT,
  start_date TEXT,
  license_number TEXT,
  license_expiry TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  fatigue_flag INTEGER DEFAULT 0,
  fatigue_date TEXT,
  fatigue_distance REAL,
  profile_image TEXT,
  id_card_image TEXT,
  id_card_number TEXT,
  id_card_issue_date TEXT,
  id_card_expiry_date TEXT,
  date_of_birth TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  notes TEXT
);

-- ============================================================
-- 6. VEHICLE_MAINTENANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS VEHICLE_MAINTENANCE (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  last_km REAL,
  last_date TEXT,
  notes TEXT,
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE(car_id, item_key)
);

-- ============================================================
-- 7. MAINTENANCE_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS MAINTENANCE_SETTINGS (
  setting_id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  check_interval REAL,
  average_daily_km REAL,
  enabled INTEGER DEFAULT 1,
  updated_at TEXT
);

-- ============================================================
-- 8. FUEL_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS FUEL_LOG (
  fuel_id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  car_id TEXT,
  driver_id TEXT,
  mileage_before REAL,
  mileage_after REAL,
  liters REAL,
  price_per_liter REAL,
  amount REAL,
  fuel_type TEXT,
  gas_station_name TEXT,
  gas_station_address TEXT,
  gas_station_tax_id TEXT,
  receipt_number TEXT,
  receipt_image TEXT,
  receipt_pdf TEXT,
  fuel_consumption_rate REAL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  notes TEXT
);

-- ============================================================
-- 9. REPAIR_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS REPAIR_LOG (
  repair_id TEXT PRIMARY KEY,
  car_id TEXT,
  date_reported TEXT,
  date_started TEXT,
  date_completed TEXT,
  mileage_at_repair REAL,
  taken_by TEXT,
  garage_name TEXT,
  repair_items TEXT,
  issue_description TEXT,
  repair_description TEXT,
  cost REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  documents TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  completed_by TEXT,
  notes TEXT
);

-- ============================================================
-- 10. CHECK_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS CHECK_LOG (
  check_id TEXT PRIMARY KEY,
  car_id TEXT,
  inspector_name TEXT,
  date TEXT NOT NULL,
  time TEXT,
  check_type TEXT DEFAULT 'daily',
  overall_status TEXT DEFAULT 'good',
  checks_data TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

-- ============================================================
-- 11. INSPECTION_ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS INSPECTION_ALERTS (
  alert_id TEXT PRIMARY KEY,
  check_id TEXT,
  car_id TEXT,
  risk_level TEXT,
  items TEXT,
  recommendations TEXT,
  inspector_name TEXT,
  vehicle_info TEXT,
  actions_taken TEXT,
  notification_sent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  why_this_alert TEXT,
  data_used TEXT,
  recommendation TEXT
);

-- ============================================================
-- 12. USAGE_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS USAGE_RECORDS (
  record_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  record_type TEXT NOT NULL DEFAULT 'departure',
  datetime TEXT NOT NULL,
  requested_by TEXT,
  destination TEXT,
  mileage REAL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  notes TEXT,
  auto_generated INTEGER DEFAULT 0,
  auto_reason TEXT,
  original_user TEXT,
  audit_tag TEXT
);

-- ============================================================
-- 13. SCHEDULED_REPAIRS
-- ============================================================
CREATE TABLE IF NOT EXISTS SCHEDULED_REPAIRS (
  scheduled_repair_id TEXT PRIMARY KEY,
  car_id TEXT,
  request_type TEXT,
  start_date TEXT,
  start_time TEXT,
  expected_return_date TEXT,
  expected_return_time TEXT,
  issue_description TEXT,
  garage_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  actual_repair_id TEXT,
  notes TEXT
);

-- ============================================================
-- 14. LEAVES
-- ============================================================
CREATE TABLE IF NOT EXISTS LEAVES (
  leave_id TEXT PRIMARY KEY,
  driver_id TEXT,
  leave_type TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  notes TEXT,
  is_emergency INTEGER DEFAULT 0
);

-- ============================================================
-- 15. PASSWORD_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS PASSWORD_HISTORY (
  history_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  changed_by TEXT
);

-- ============================================================
-- 16. RESET_PASSWORD_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS RESET_PASSWORD_REQUESTS (
  request_id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  reset_token TEXT,
  expires_at TEXT,
  status TEXT DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  reset_at TEXT,
  reset_by TEXT
);

-- ============================================================
-- 17. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS NOTIFICATIONS (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- ============================================================
-- 18. AUDIT_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS AUDIT_LOG (
  log_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  old_value TEXT,
  new_value TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

-- ============================================================
-- 19. PDPA_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS PDPA_LOG (
  log_id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  accepted_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

-- ============================================================
-- 20. MASTER (system settings key-value)
-- ============================================================
CREATE TABLE IF NOT EXISTS MASTER (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TEXT,
  updated_by TEXT,
  version INTEGER DEFAULT 1,
  effective_from TEXT,
  effective_to TEXT
);

-- ============================================================
-- 21. QUEUE_RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS QUEUE_RULES (
  rule_id TEXT PRIMARY KEY,
  driver_id TEXT,
  assignment_type TEXT,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT,
  notes TEXT,
  version INTEGER DEFAULT 1,
  effective_from TEXT,
  effective_to TEXT
);

-- ============================================================
-- 22. SYSTEM_SNAPSHOT
-- ============================================================
CREATE TABLE IF NOT EXISTS SYSTEM_SNAPSHOT (
  snapshot_id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  active_cars INTEGER DEFAULT 0,
  cars_in_repair INTEGER DEFAULT 0,
  active_drivers INTEGER DEFAULT 0,
  queue_count INTEGER DEFAULT 0,
  override_count INTEGER DEFAULT 0,
  auto_recovery_count INTEGER DEFAULT 0,
  fuel_logs_today INTEGER DEFAULT 0,
  repair_logs_today INTEGER DEFAULT 0,
  check_logs_today INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT
);

-- ============================================================
-- 23. SELF_REPORTED_FATIGUE
-- ============================================================
CREATE TABLE IF NOT EXISTS SELF_REPORTED_FATIGUE (
  report_id TEXT PRIMARY KEY,
  driver_id TEXT,
  date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

-- ============================================================
-- 24. TAX_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS TAX_RECORDS (
  tax_id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  tax_year TEXT,
  amount REAL,
  due_date TEXT,
  paid_date TEXT,
  receipt_number TEXT,
  receipt_image TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT
);

-- ============================================================
-- 25. INSURANCE_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS INSURANCE_RECORDS (
  insurance_id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  insurance_type TEXT,
  company_name TEXT,
  policy_number TEXT,
  start_date TEXT,
  end_date TEXT,
  premium REAL,
  coverage REAL,
  document_image TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT
);

-- ============================================================
-- 26. FUEL_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS FUEL_REQUESTS (
  fuel_request_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  requested_date TEXT NOT NULL,
  fuel_type TEXT,
  estimated_liters REAL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_queue_date ON QUEUE(date);
CREATE INDEX IF NOT EXISTS idx_queue_car_id ON QUEUE(car_id);
CREATE INDEX IF NOT EXISTS idx_queue_driver_id ON QUEUE(driver_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON QUEUE(status);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON FUEL_LOG(date);
CREATE INDEX IF NOT EXISTS idx_fuel_car_id ON FUEL_LOG(car_id);
CREATE INDEX IF NOT EXISTS idx_repair_car_id ON REPAIR_LOG(car_id);
CREATE INDEX IF NOT EXISTS idx_repair_status ON REPAIR_LOG(status);
CREATE INDEX IF NOT EXISTS idx_check_date ON CHECK_LOG(date);
CREATE INDEX IF NOT EXISTS idx_check_car_id ON CHECK_LOG(car_id);
CREATE INDEX IF NOT EXISTS idx_usage_car_id ON USAGE_RECORDS(car_id);
CREATE INDEX IF NOT EXISTS idx_usage_datetime ON USAGE_RECORDS(datetime);
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON NOTIFICATIONS(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON AUDIT_LOG(timestamp);
CREATE INDEX IF NOT EXISTS idx_leaves_driver_id ON LEAVES(driver_id);
CREATE INDEX IF NOT EXISTS idx_cars_active ON CARS(active);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON DRIVERS(status);
