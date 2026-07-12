-- Add tracking fields to survey_responses to ensure data integrity and prevent false accusations
ALTER TABLE survey_responses ADD COLUMN ip_address TEXT DEFAULT '';
ALTER TABLE survey_responses ADD COLUMN user_agent TEXT DEFAULT '';
