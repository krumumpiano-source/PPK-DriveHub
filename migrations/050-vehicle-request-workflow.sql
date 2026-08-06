-- Migration 050: Update vehicle_requests for multi-level approval workflow

PRAGMA foreign_keys=off;

CREATE TABLE vehicle_requests_new (
  id TEXT PRIMARY KEY,
  request_no TEXT,
  requester_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_department TEXT,
  date TEXT NOT NULL,
  return_date TEXT,
  time_start TEXT,
  time_end TEXT,
  destination TEXT NOT NULL,
  route TEXT,
  purpose TEXT,
  passengers INTEGER DEFAULT 1,
  passenger_names TEXT DEFAULT '[]',
  priority TEXT DEFAULT 'general' CHECK(priority IN ('urgent','teaching_support','general')),
  is_urgent INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_supervisor' CHECK(status IN ('pending_supervisor','pending_executive','approved','rejected','cancelled')),
  supervisor_id TEXT,
  supervisor_approved_at TEXT,
  executive_id TEXT,
  approved_by TEXT,
  approved_at TEXT,
  assigned_car_id TEXT,
  assigned_driver_id TEXT,
  assigned_queue_id TEXT,
  rejection_reason TEXT,
  notes TEXT,
  waypoints TEXT,
  dest_lat REAL,
  dest_lng REAL,
  estimated_km REAL,
  pdf_generated_at TEXT,
  signature_image TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (supervisor_id) REFERENCES users(id),
  FOREIGN KEY (executive_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (assigned_car_id) REFERENCES cars(id),
  FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id),
  FOREIGN KEY (assigned_queue_id) REFERENCES queue(id)
);

INSERT INTO vehicle_requests_new (
  id, request_no, requester_id, requester_name, requester_department, date, return_date, time_start, time_end,
  destination, route, purpose, passengers, passenger_names, priority, is_urgent,
  status, approved_by, approved_at, assigned_car_id, assigned_driver_id, assigned_queue_id,
  rejection_reason, notes, waypoints, dest_lat, dest_lng, estimated_km, pdf_generated_at, signature_image, created_at, updated_at
)
SELECT 
  id, request_no, requester_id, requester_name, requester_department, date, return_date, time_start, time_end,
  destination, route, purpose, passengers, passenger_names, priority, is_urgent,
  CASE 
    WHEN status = 'pending' THEN 'pending_supervisor' 
    ELSE status 
  END, 
  approved_by, approved_at, assigned_car_id, assigned_driver_id, assigned_queue_id,
  rejection_reason, notes, waypoints, dest_lat, dest_lng, estimated_km, pdf_generated_at, signature_image, created_at, updated_at
FROM vehicle_requests;

DROP TABLE vehicle_requests;
ALTER TABLE vehicle_requests_new RENAME TO vehicle_requests;

CREATE INDEX idx_vehicle_requests_status ON vehicle_requests(status);
CREATE INDEX idx_vehicle_requests_requester ON vehicle_requests(requester_id);
CREATE INDEX idx_vehicle_requests_date ON vehicle_requests(date);
CREATE INDEX idx_vehicle_requests_no ON vehicle_requests(request_no);

PRAGMA foreign_keys=on;
