-- ============================================================
-- Migration 021: Add updated_by tracking to all main tables
-- Purpose: Allow UI to show "who created" and "who last edited"
-- Safety: ALTER TABLE ADD COLUMN only (NULL allowed) — non-destructive
-- ============================================================

-- fuel_log already has updated_at; add updated_by
ALTER TABLE fuel_log ADD COLUMN updated_by TEXT;

-- repair_log already has updated_at; add updated_by
ALTER TABLE repair_log ADD COLUMN updated_by TEXT;

-- queue already has updated_at; add updated_by
ALTER TABLE queue ADD COLUMN updated_by TEXT;

-- drivers already has updated_at; add updated_by
ALTER TABLE drivers ADD COLUMN updated_by TEXT;

-- tax_records: add both
ALTER TABLE tax_records ADD COLUMN updated_by TEXT;
ALTER TABLE tax_records ADD COLUMN updated_at TEXT;

-- insurance_records: add both
ALTER TABLE insurance_records ADD COLUMN updated_by TEXT;
ALTER TABLE insurance_records ADD COLUMN updated_at TEXT;

-- inspection_records: add both
ALTER TABLE inspection_records ADD COLUMN updated_by TEXT;
ALTER TABLE inspection_records ADD COLUMN updated_at TEXT;

-- incidents already has updated_at; add updated_by
ALTER TABLE incidents ADD COLUMN updated_by TEXT;
