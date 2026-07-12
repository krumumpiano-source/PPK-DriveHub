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
