-- Migration 052: Remove user pongsatorn.b@ppk.ac.th / pongsatorn.b from the system

-- Delete sessions
DELETE FROM sessions WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(email) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b'
);

-- Delete notifications
DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(email) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b'
);

-- Delete audit logs
DELETE FROM audit_log WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(email) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b'
);

-- Delete user
DELETE FROM users WHERE LOWER(email) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b@ppk.ac.th' OR LOWER(username) = 'pongsatorn.b';
