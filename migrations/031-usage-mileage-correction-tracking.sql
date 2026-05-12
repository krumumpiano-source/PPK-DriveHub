-- Migration 031: Add mileage correction tracking to usage_records
-- Purpose: Allow admins to edit mileage and track who changed it, when, and why
-- Safety: ALTER TABLE ADD COLUMN only (NULL allowed) — non-destructive

ALTER TABLE usage_records ADD COLUMN updated_by TEXT;
ALTER TABLE usage_records ADD COLUMN updated_at TEXT;
ALTER TABLE usage_records ADD COLUMN correction_note TEXT;
