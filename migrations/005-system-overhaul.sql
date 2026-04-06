-- ============================================================
-- Migration 005: System Overhaul
-- PPK DriveHub — April 2026
--
-- Phase 1: เพิ่มตารางใหม่ 5 ตาราง + เพิ่มคอลัมน์ + repair_log recreate
-- ============================================================

-- ============================================================
-- 1. REPAIR_LOG — Recreate เพื่อเปลี่ยน CHECK constraint
--    status: pending/in_progress → requested/approved/rejected/inspected/documented/repairing
-- ============================================================

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

-- Migrate existing data (map old status to new)
INSERT INTO repair_log_new (
  id, car_id, date_reported, date_started, date_completed,
  status, mileage_at_repair, reporter_id, reporter_name,
  garage_name, repair_items, issue_description, cost,
  documents, notes, created_by, created_at, updated_at
)
SELECT
  id, car_id, date_reported, date_started, date_completed,
  CASE status
    WHEN 'pending' THEN 'requested'
    WHEN 'in_progress' THEN 'repairing'
    ELSE status
  END,
  mileage_at_repair, reporter_id, reporter_name,
  garage_name, repair_items, issue_description, cost,
  documents, notes, created_by, created_at, updated_at
FROM repair_log;

DROP TABLE repair_log;
ALTER TABLE repair_log_new RENAME TO repair_log;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_repair_log_car_id ON repair_log(car_id);
CREATE INDEX IF NOT EXISTS idx_repair_log_status ON repair_log(status);
CREATE INDEX IF NOT EXISTS idx_repair_log_driver ON repair_log(requested_by_driver_id);

-- ============================================================
-- 2. QUEUE — เพิ่ม backup_driver_id
-- ============================================================

ALTER TABLE queue ADD COLUMN backup_driver_id TEXT REFERENCES drivers(id);

-- ============================================================
-- 3. USAGE_RECORDS — เพิ่ม record_source
-- ============================================================

ALTER TABLE usage_records ADD COLUMN record_source TEXT DEFAULT 'manual';
-- Values: manual | auto | qr

-- ============================================================
-- 4. CARS — เพิ่ม qr_survey_code
-- ============================================================

ALTER TABLE cars ADD COLUMN qr_survey_code TEXT;

-- ============================================================
-- 5. VEHICLE_REQUESTS — ขอใช้รถออนไลน์
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_requests (
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (assigned_car_id) REFERENCES cars(id),
  FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id),
  FOREIGN KEY (assigned_queue_id) REFERENCES queue(id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status ON vehicle_requests(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_requester ON vehicle_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_date ON vehicle_requests(date);

-- ============================================================
-- 6. SURVEY_RESPONSES — แบบประเมินผู้โดยสาร (QR)
-- ============================================================

CREATE TABLE IF NOT EXISTS survey_responses (
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

CREATE INDEX IF NOT EXISTS idx_survey_car_id ON survey_responses(car_id);
CREATE INDEX IF NOT EXISTS idx_survey_driver_id ON survey_responses(driver_id);
CREATE INDEX IF NOT EXISTS idx_survey_created_at ON survey_responses(created_at);

-- ============================================================
-- 7. INCIDENTS — อุบัติเหตุ/เหตุการณ์ผิดปกติ
-- ============================================================

CREATE TABLE IF NOT EXISTS incidents (
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

CREATE INDEX IF NOT EXISTS idx_incidents_car_id ON incidents(car_id);
CREATE INDEX IF NOT EXISTS idx_incidents_driver_id ON incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date);

-- ============================================================
-- 8. INSPECTION_RECORDS — ตรอ. (ตรวจสภาพรถประจำปี)
-- ============================================================

CREATE TABLE IF NOT EXISTS inspection_records (
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

CREATE INDEX IF NOT EXISTS idx_inspection_car_id ON inspection_records(car_id);
CREATE INDEX IF NOT EXISTS idx_inspection_expiry ON inspection_records(expiry_date);

-- ============================================================
-- 9. TRIP_EVALUATIONS — แบบประเมินหลังเดินทาง (ผู้ขอใช้รถ)
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_trip_eval_queue ON trip_evaluations(queue_id);
CREATE INDEX IF NOT EXISTS idx_trip_eval_evaluator ON trip_evaluations(evaluator_id);
