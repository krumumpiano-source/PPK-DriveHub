-- ============================================================
-- Migration 022: Add updated_by column to cars table
-- Purpose: Migration 021 missed cars table; getVehicles SELECT
--          joins users on c.updated_by which caused 500 error
--          (no such column: c.updated_by). Dashboard's available
--          vehicles list became empty.
-- Safety: ALTER TABLE ADD COLUMN only (NULL allowed) — non-destructive
-- ============================================================

ALTER TABLE cars ADD COLUMN updated_by TEXT;
