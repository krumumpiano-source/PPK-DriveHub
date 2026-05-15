-- Migration 035: Add odometer_image column to usage_records
-- Stores R2 key of odometer photo taken by driver before submission

ALTER TABLE usage_records ADD COLUMN odometer_image TEXT;
