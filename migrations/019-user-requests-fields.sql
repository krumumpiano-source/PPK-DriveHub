-- Migration 019: Store registration fields separately in user_requests
-- Previously title/department/phone/reason were concatenated into the `name` column,
-- producing display names like:
--   "อัจฉรา พันธ์สืบ (นางสาว) | แผนก:งานยานพาหนะ | โทร:0959... | เหตุผล:discuss"
-- This adds dedicated columns so registration data is stored cleanly.

ALTER TABLE user_requests ADD COLUMN title TEXT;
ALTER TABLE user_requests ADD COLUMN department TEXT;
ALTER TABLE user_requests ADD COLUMN phone TEXT;
ALTER TABLE user_requests ADD COLUMN reason TEXT;
