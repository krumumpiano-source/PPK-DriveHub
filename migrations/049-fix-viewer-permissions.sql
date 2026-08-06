-- Fix viewer permissions
-- The 'viewer' role was previously given read access to all modules, causing them to see all menus.
-- This migration resets the role for these users to 'staff' and clears their permissions so they only see the request vehicle and calendar menus.
UPDATE users SET role = 'staff', permissions = '{}' WHERE role = 'viewer';
