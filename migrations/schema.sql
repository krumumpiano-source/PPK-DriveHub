-- PPK DriveHub - D1 Database Schema v2
-- No PRAGMA/FK constraints for D1 compatibility

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
  updated_at TEXT,
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
  freeze_at TEXT
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
  maintenance_id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  maintenance_date TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  mileage REAL,
  cost REAL,
  description TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  next_maintenance_km REAL,
  next_maintenance_date TEXT
);
-- ============================================================
-- 7. MAINTENANCE_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS MAINTENANCE_SETTINGS (
  setting_id TEXT PRIMARY KEY,
  maintenance_type TEXT NOT NULL,
  interval_km REAL,
  interval_days INTEGER,
  warning_km REAL,
  warning_days INTEGER,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  description TEXT,
  updated_at TEXT
);
-- ============================================================
-- 8. FUEL_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS FUEL_LOG (
  fuel_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  queue_id TEXT,
  fuel_date TEXT NOT NULL,
  fuel_type TEXT,
  liters REAL,
  price_per_liter REAL,
  total_cost REAL,
  current_mileage REAL,
  previous_mileage REAL,
  fuel_consumption_rate REAL,
  station_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  receipt_image TEXT,
  fuel_full_tank INTEGER DEFAULT 0,
  odometer_image TEXT
);
-- ============================================================
-- 9. REPAIR_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS REPAIR_LOG (
  repair_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  queue_id TEXT,
  repair_date TEXT NOT NULL,
  repair_type TEXT,
  description TEXT,
  mechanic TEXT,
  garage_name TEXT,
  parts_cost REAL,
  labor_cost REAL,
  total_cost REAL,
  mileage_at_repair REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  images TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  completed_at TEXT,
  next_repair_km REAL,
  next_repair_date TEXT
);
-- ============================================================
-- 10. CHECK_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS CHECK_LOG (
  check_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  queue_id TEXT,
  check_date TEXT NOT NULL,
  check_type TEXT DEFAULT 'daily',
  check_score REAL,
  check_items TEXT,
  issues_found TEXT,
  notes TEXT,
  images TEXT,
  signed_by TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  action_required INTEGER DEFAULT 0
);
-- ============================================================
-- 11. INSPECTION_ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS INSPECTION_ALERTS (
  alert_id TEXT PRIMARY KEY,
  car_id TEXT,
  check_id TEXT,
  alert_date TEXT NOT NULL,
  alert_type TEXT,
  severity TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  notes TEXT,
  updated_at TEXT
);
-- ============================================================
-- 12. USAGE_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS USAGE_RECORDS (
  usage_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  queue_id TEXT,
  datetime TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'departure',
  mileage REAL,
  location TEXT,
  fuel_level REAL,
  odometer_image TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);
-- ============================================================
-- 13. SCHEDULED_REPAIRS
-- ============================================================
CREATE TABLE IF NOT EXISTS SCHEDULED_REPAIRS (
  scheduled_repair_id TEXT PRIMARY KEY,
  car_id TEXT,
  scheduled_date TEXT NOT NULL,
  repair_type TEXT,
  description TEXT,
  estimated_cost REAL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT
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
  approved_at TEXT,
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
  read_at TEXT,
  created_at TEXT NOT NULL
);
-- ============================================================
-- 18. AUDIT_LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS AUDIT_LOG (
  log_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  user_id TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT
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
-- 20. MASTER
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
  snapshot_date TEXT NOT NULL,
  data TEXT,
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
  tax_amount REAL,
  payment_date TEXT,
  expiry_date TEXT,
  receipt_image TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  status TEXT DEFAULT 'pending',
  updated_at TEXT
);
-- ============================================================
-- 25. INSURANCE_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS INSURANCE_RECORDS (
  insurance_id TEXT PRIMARY KEY,
  car_id TEXT NOT NULL,
  insurance_company TEXT,
  policy_number TEXT,
  insurance_type TEXT,
  coverage_amount REAL,
  premium_amount REAL,
  payment_date TEXT,
  start_date TEXT,
  end_date TEXT,
  policy_image TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  status TEXT DEFAULT 'active',
  updated_at TEXT
);
-- ============================================================
-- 26. FUEL_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS FUEL_REQUESTS (
  request_id TEXT PRIMARY KEY,
  car_id TEXT,
  driver_id TEXT,
  queue_id TEXT,
  requested_liters REAL,
  fuel_type TEXT,
  request_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  approved_by TEXT,
  approved_at TEXT
);