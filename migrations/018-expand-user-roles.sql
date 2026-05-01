-- Migration 018: Expand user roles to support driver, manager, staff
-- The original CHECK constraint only allowed: admin, super_admin, vehicle, fuel, repair, viewer
-- New backend code requires: manager, driver, staff as valid roles
-- NOTE: sessions and password_history will be cleared (users must re-login after migration)

-- Step 1: Backup existing users data
CREATE TABLE _users_bak AS SELECT * FROM users;

-- Step 2: Drop FK-referencing tables (sessions are ephemeral, safe to clear)
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS password_history;
DROP TABLE IF EXISTS reset_password_requests;

-- Step 3: Drop old users table
DROP TABLE users;

-- Step 4: Recreate users with expanded role CHECK constraint
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','super_admin','vehicle','fuel','repair','viewer','manager','driver','staff')),
  permissions TEXT NOT NULL DEFAULT '{}',
  title TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  profile_image TEXT,
  driver_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  pdpa_accepted INTEGER NOT NULL DEFAULT 0,
  pdpa_accepted_at TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Step 5: Restore users (unknown roles mapped to 'viewer')
INSERT INTO users
SELECT id, username, email, password_hash, salt,
  CASE WHEN role IN ('admin','super_admin','vehicle','fuel','repair','viewer','manager','driver','staff')
       THEN role ELSE 'viewer' END AS role,
  permissions, title, first_name, last_name, display_name, phone, profile_image,
  driver_id, active, pdpa_accepted, pdpa_accepted_at, must_change_password, last_login,
  created_at, updated_at
FROM _users_bak;

-- Step 6: Recreate FK-referencing tables
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_impersonated INTEGER NOT NULL DEFAULT 0,
  impersonator_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE password_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE reset_password_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Step 7: Clean up backup table
DROP TABLE _users_bak;
