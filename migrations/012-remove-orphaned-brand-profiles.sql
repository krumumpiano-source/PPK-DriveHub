-- Migration 012: Remove orphaned brand profiles (no vehicles exist for these brands)
-- Date: 2026-04-15
-- Reason: HINO and ISUZU profiles were seeded in migration 007 but no vehicles
--         of these brands exist in the system. This causes confusing tabs in admin-settings.
-- Verified: SELECT DISTINCT brand FROM cars → HONDA, MAZDA, SUZUKI, TOYOTA only

-- Remove HINO profiles (12 items) — no HINO vehicles in fleet
DELETE FROM maintenance_profiles WHERE brand = 'HINO';

-- Remove ISUZU profiles (10 items) — no ISUZU vehicles in fleet
DELETE FROM maintenance_profiles WHERE brand = 'ISUZU';
