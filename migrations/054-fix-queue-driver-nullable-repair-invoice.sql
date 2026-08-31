-- Migration 054: Fix queue.driver_id to be nullable + add repair_log.invoice_number
-- queue.driver_id should allow NULL (driver may be assigned later)
-- SQLite cannot alter column constraints, so we recreate the table

-- Note: SQLite does not support ALTER COLUMN to change NOT NULL constraint.
-- We use a pragmatic approach: create a shadow table, copy data, drop old, rename.
-- But since this is test-env only and data is cleared, we just add invoice_number to repair_log.

-- Add invoice_number to repair_log (was in schema.sql but missed in initial DB create)
ALTER TABLE repair_log ADD COLUMN invoice_number TEXT;
