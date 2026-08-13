-- Migration 051: Set krumum.piano@gmail.com as the sole admin/super_admin
-- Demote any other admin/super_admin users to 'staff'

-- 1. Upsert krumum.piano@gmail.com as super_admin
INSERT INTO users (id, username, email, password_hash, salt, role, permissions, first_name, last_name, display_name, active, pdpa_accepted, must_change_password, created_at, updated_at)
VALUES (
  'ba9a2b5b-3acc-4eee-82c8-08422fe9bf02',
  'krumum.piano@gmail.com',
  'krumum.piano@gmail.com',
  'tkOLEfvsGXyS6Ts7KRQLF/59hOQqxlP8ly1BLyVyxSQ=',
  'A6U9wuBwMykuB7IFsvtjNA==',
  'super_admin',
  '{}',
  'PONGSATORN',
  'BHOTHIKEW',
  'PONGSATORN BHOTHIKEW',
  1,
  1,
  0,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(email) DO UPDATE SET
  role = 'super_admin',
  active = 1,
  updated_at = datetime('now');

UPDATE users
SET role = 'super_admin', active = 1, updated_at = datetime('now')
WHERE LOWER(email) = 'krumum.piano@gmail.com' OR LOWER(username) = 'krumum.piano@gmail.com';

-- 2. Demote any other users with admin/super_admin role to 'staff'
UPDATE users
SET role = 'staff', updated_at = datetime('now')
WHERE role IN ('admin', 'super_admin')
  AND LOWER(email) != 'krumum.piano@gmail.com'
  AND LOWER(username) != 'krumum.piano@gmail.com';
