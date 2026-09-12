-- Migration 055: Add department and onboarding_completed to users table
-- Enables subject group / department tracking and first-time onboarding flow

ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 1;

-- Backfill all existing users to have onboarding_completed = 1 so their existing access is not blocked
UPDATE users SET onboarding_completed = 1 WHERE onboarding_completed IS NULL;
