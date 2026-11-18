# PPK DriveHub Phase 1 System Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Phase 1 critical runtime/SQL 500 crashes, close authentication/RBAC/XSS security vulnerabilities, prevent data loss during backup/restore, and repair broken frontend-to-backend API mappings.

**Architecture:** Enhance the core middleware (`functions/_middleware.js`) and shared helpers (`functions/_helpers.js`) to support automatic client IP logging, hierarchical `approve`/`manage` permissions, and safe Origin validation, while applying targeted fixes to broken SQL queries, context references, and frontend API action bridges.

**Tech Stack:** Cloudflare Pages Functions (JavaScript ES Modules), Cloudflare D1 (SQLite), Vanilla JS Frontend (`frontend/js/api.js`, `frontend/common.js`, `frontend/login.html`), Playwright Test Suite.

## Global Constraints

- Follow `.agents/AGENTS.md`: Every completed code change must be committed and pushed (`git add .`, `git commit -m "..."`, `git push`).
- Maintain backward compatibility with existing Playwright integration and E2E tests (`npm run test:api`, `npm run lint`).
- Never hardcode secrets or single-user email locks in source code.

---

### Task 1: Core Helpers, Middleware, IP Logging, File Upload Security & LINE Login CSRF

**Files:**
- Modify: `functions/_helpers.js`
- Modify: `functions/_middleware.js`
- Modify: `functions/api/auth/line/callback.js`
- Modify: `functions/api/files/[[path]].js`

**Interfaces:**
- Produces:
  - `PERMISSION_LEVELS = { view: 1, create: 2, edit: 3, approve: 3, delete: 4, manage: 4 }` in `functions/_helpers.js`
  - `getSafeOrigin(request)` in `functions/_helpers.js`
  - `getClientIp(request)` in `functions/_helpers.js` and automatic fallback in `writeAuditLog`

- [ ] **Step 1: Update `functions/_helpers.js` to support `approve`/`manage` permission levels, safe origin resolution, and automatic IP logging**

Modify `functions/_helpers.js`:
1. Update `PERMISSION_LEVELS`:
```javascript
const PERMISSION_LEVELS = { view: 1, create: 2, edit: 3, approve: 3, delete: 4, manage: 4 };
```
2. Add `ALLOWED_ORIGINS`, `getSafeOrigin(request)`, and `setLastClientIp(ip)` / `writeAuditLog` IP fallback:
```javascript
export const ALLOWED_ORIGINS = [
  'https://ppk-drivehub.pages.dev',
  'http://localhost:8788'
];

export function getSafeOrigin(request) {
  const origin = request?.headers?.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  try {
    const reqOrigin = new URL(request.url).origin;
    if (ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin;
  } catch {}
  return ALLOWED_ORIGINS[0];
}

let _lastClientIp = null;
export function setCurrentClientIp(ip) {
  _lastClientIp = ip || null;
}

export async function writeAuditLog(db, userId, username, action, module, entityId, details, ipAddress) {
  try {
    const finalIp = ipAddress || _lastClientIp || null;
    await dbRun(db,
      `INSERT INTO audit_log (id, user_id, username, action, module, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateUUID(), userId || null, username || null, action, module || null, entityId || null,
       details ? JSON.stringify(details) : null, finalIp, now()]
    );
  } catch {
    // Audit log failures should not crash the main request
  }
}
```

- [ ] **Step 2: Update `functions/_middleware.js` for `PUBLIC_PATHS`, `RATE_LIMITS`, and Client IP capture**

Modify `functions/_middleware.js`:
1. Add `'/api/auth/line'` to `PUBLIC_PATHS`.
2. Add `'/api/auth/check-identity': { max: 15, windowMs: 60 * 1000 }` and `'/api/usage/ocr-odometer': { max: 10, windowMs: 60 * 1000 }` to `RATE_LIMITS`.
3. Capture client IP at the start of `onRequest(context)`:
```javascript
const clientIp = request.headers.get('CF-Connecting-IP') ||
                 request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 request.headers.get('x-real-ip') || null;
env.clientIp = clientIp;
setCurrentClientIp(clientIp);
```
and include `ipAddress: clientIp` inside `env.user`.

- [ ] **Step 3: Fix LINE OAuth state verification in `functions/api/auth/line/callback.js`**

Modify `functions/api/auth/line/callback.js`:
```javascript
  const cookieHeader = request.headers.get('Cookie') || '';
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)line_auth_state=([^;]+)/);
  const savedState = stateCookieMatch ? stateCookieMatch[1] : null;
  if (!state || !savedState || state !== savedState) {
    return new Response('Invalid OAuth state (CSRF protection).', {
      status: 400,
      headers: { 'Set-Cookie': 'line_auth_state=; Path=/; HttpOnly; Max-Age=0; Secure; SameSite=Lax' }
    });
  }
```

- [ ] **Step 4: Harden `functions/api/files/[[path]].js` against Stored XSS**

Modify `functions/api/files/[[path]].js`:
1. Validate MIME type on `POST /api/files/upload`:
```javascript
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const cleanMime = String(body.mime).toLowerCase().trim();
if (!ALLOWED_MIMES.includes(cleanMime)) {
  return error('ประเภทไฟล์ไม่ได้รับอนุญาต (รองรับเฉพาะรูปภาพ JPEG, PNG, WEBP, GIF และ PDF)', 400);
}
```
2. Add security headers on `GET /api/files/*`:
```javascript
const headers = {
  'Content-Type': contentType,
  'Cache-Control': 'private, max-age=3600',
  'Content-Disposition': 'inline',
  'Content-Security-Policy': "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'",
  'X-Content-Type-Options': 'nosniff'
};
```

---

### Task 2: Authentication & Admin User Management Hardening

**Files:**
- Modify: `functions/api/auth/[[path]].js`
- Modify: `functions/api/admin/[[path]].js`
- Modify: `frontend/login.html`

- [ ] **Step 1: Harden `/api/auth/login`, `/api/auth/change-password`, `/api/auth/check-identity`, and `/api/auth/forgot-password` in `functions/api/auth/[[path]].js`**

1. In `POST /api/auth/login`:
   - Remove `inputPassword === '123456' || inputPassword === 'ppk123456'`.
   - Keep phone fallback ONLY for existing users where `user.must_change_password === 1` AND `user.phone` has at least 9 digits matching `inputPassword.replace(/\D/g, '')`.
   - Remove automatic user creation when `user` is not found (return `error('username/email หรือ password ไม่ถูกต้อง', 401)`).
2. In `POST /api/auth/check-identity`:
   - Do not return `phone`, `department`, `role`, or full `display_name` in public response.
   - Return:
     ```javascript
     return success({
       exists: true,
       is_school_email: isSchoolEmail,
       is_first_time: isFirstTime,
       must_change_password: user.must_change_password === 1,
       user: {
         username: user.username,
         email: user.email || user.username,
         display_name: user.username,
         onboarding_completed: user.onboarding_completed === 1,
         must_change_password: user.must_change_password === 1
       }
     });
     ```
   - When `user` does not exist, return `exists: false, is_school_email: isSchoolEmail, is_first_time: false`.
3. In `POST /api/auth/change-password`:
   - Always require `oldPassword`:
     ```javascript
     if (!oldPassword) return error('กรุณาระบุรหัสผ่านเดิม');
     let valid = await verifyPassword(oldPassword, user.salt, user.password_hash);
     if (!valid && user.must_change_password === 1 && user.phone) {
       const cleanOld = oldPassword.replace(/\D/g, '');
       const cleanPhone = user.phone.replace(/\D/g, '');
       if (cleanPhone.length >= 9 && cleanOld === cleanPhone) valid = true;
     }
     if (!valid) return error('รหัสผ่านเดิมไม่ถูกต้อง');
     ```
4. In `POST /api/auth/forgot-password`:
   - Use `const origin = getSafeOrigin(request);` instead of trusting raw `request.headers.get('Origin')`.

- [ ] **Step 2: Update `frontend/login.html` to remove hardcoded `123456` auto-fill and guide unregistered users to `/register.html`**

Modify `frontend/login.html`:
- When `res.data.exists === false`: show message guiding the user to register or click a button to go to `register.html`, while still allowing normal login attempt if they typed a username.
- When `res.data.must_change_password`: do NOT prefill `123456`; prompt the user to enter their initial password or phone number set by Admin.

- [ ] **Step 3: Fix `functions/api/admin/[[path]].js` (Remove hardcoded email lock, consolidate user delete, safe origin reset, role preview alias)**

1. Replace the hardcoded `krumum.piano@gmail.com` check (lines 78–82) with:
   ```javascript
   if (body.role && ['admin', 'super_admin'].includes(body.role) && user.role !== 'super_admin') {
     return error('เฉพาะผู้ดูแลสูงสุด (Super Admin) เท่านั้นที่สามารถแต่งตั้งสิทธิ์ Admin ได้', 403);
   }
   ```
2. In `/api/admin/users/:id/reset-password`, use `getSafeOrigin(request)`.
3. In `/api/admin/impersonate-role/:role`, map `'requester'` to `'staff'` before validating `validRoles`.
4. Consolidate the duplicate `DELETE /api/admin/users/:id` handlers into one safe handler that checks `user.id === id`, checks `super_admin` permissions, cleans up `sessions`, `notifications`, `password_history`, `reset_password_requests`, and wraps `DELETE FROM users` in a `try/catch` that falls back to deactivating (`active = 0`) if foreign key constraints exist.

---

### Task 3: Fix Runtime 500 Crashes, Broken SQL Queries & Missing RBAC Checks

**Files:**
- Modify: `functions/api/evaluations/[[path]].js`
- Modify: `functions/api/warnings/[[path]].js`
- Modify: `functions/api/reports/[[path]].js`
- Modify: `functions/api/cron/daily.js`
- Modify: `functions/api/cron/weekly.js`
- Modify: `functions/api/fuel/[[path]].js`
- Modify: `functions/api/tax-insurance/[[path]].js`
- Modify: `functions/api/incidents/[[path]].js`

- [ ] **Step 1: Fix `data.user` crashes and add RBAC in `functions/api/evaluations/[[path]].js` and `functions/api/warnings/[[path]].js`**

1. In `functions/api/evaluations/[[path]].js`:
   - Line 442: change `const user = data.user;` to `const user = env.user;`.
   - When `evaluation_type === 'committee'`, verify `['admin', 'super_admin', 'manager'].includes(user.role)` (return 403 otherwise).
   - In `DELETE /api/evaluations/:id` (line 495), verify `['admin', 'super_admin'].includes( env.user.role )` (return 403 otherwise).
2. In `functions/api/warnings/[[path]].js`:
   - Lines 30, 52, 94: change `const user = data.user;` to `const user = env.user;`.

- [ ] **Step 2: Fix broken SQL columns in `functions/api/reports/[[path]].js`**

1. In `GET /api/reports/audit-export` (lines 896–926):
   - Query real columns from `audit_log`: `al.id, al.created_at, al.module AS table_name, al.entity_id AS record_id, al.action, al.details, al.ip_address, COALESCE(u.display_name, al.username) AS actor_name, COALESCE(u.username, al.username) AS actor_username`.
   - Replace `al.table_name` in WHERE and `COUNT(DISTINCT al.table_name)` with `al.module`.
2. In `GET /api/reports/check-log` (line 1015):
   - Replace `cl.image_url` with `cl.check_image AS image_url, cl.check_image`.

- [ ] **Step 3: Fix broken SQL queries in `functions/api/cron/daily.js` and `functions/api/cron/weekly.js`**

1. In `functions/api/cron/daily.js`:
   - Query `vehicle_maintenance vm JOIN cars c ON vm.car_id = c.id LEFT JOIN maintenance_settings ms ON vm.item_key = ms.item_key WHERE vm.next_km IS NOT NULL AND (vm.next_km - c.current_mileage) <= 500 AND c.status NOT IN ('retired', 'inactive')`.
2. In `functions/api/cron/weekly.js`:
   - Query `queue` with `status IN ('completed', 'ongoing')`.
   - Query `fuel_log` with `SELECT COALESCE(SUM(amount), 0) as total_cost FROM fuel_log WHERE date >= ? AND date <= ? AND deleted_at IS NULL`.
   - Query `repair_log` with `SELECT COALESCE(SUM(COALESCE(NULLIF(grand_total, 0), cost, 0)), 0) as total_cost FROM repair_log WHERE date_reported >= ? AND date_reported <= ? AND status != 'cancelled'`.

- [ ] **Step 4: Fix `writeAuditLog` calls in `functions/api/fuel/[[path]].js` and add RBAC to `tax-insurance` & `incidents`**

1. In `functions/api/fuel/[[path]].js` (lines 785, 811, 825):
   - Replace `await writeAuditLog(env, { ... })` with `await writeAuditLog(env.DB, user.id, user.displayName || user.username, 'create_fuel_budget', 'fuel_budget', id, body);` (and corresponding `update_fuel_budget` / `delete_fuel_budget`).
2. In `functions/api/tax-insurance/[[path]].js` (`/api/tax-insurance/inspections`):
   - Add permission checks (`checkPermission(user, 'tax', ...)` or `checkPermission(user, 'vehicles', ...)`).
3. In `functions/api/incidents/[[path]].js`:
   - Add permission checks on `PUT /api/incidents/:id` and `PUT /api/incidents/:id/resolve` requiring `checkPermission(user, 'repair', 'edit') || checkPermission(user, 'vehicles', 'edit') || ['admin', 'super_admin', 'manager'].includes(user.role)`.

---

### Task 4: Atomic Multi-Table Backup & Restore

**Files:**
- Modify: `functions/api/backup/[[path]].js`

- [ ] **Step 1: Expand `BACKUP_TABLES` and `RESTORABLE_TABLES` and implement `db.batch()` atomic restore**

Modify `functions/api/backup/[[path]].js`:
1. Include all 31 domain tables ordered from parent to child in `RESTORABLE_TABLES` (and `'users'` in `BACKUP_TABLES`).
2. In `restoreSnapshot(db, snapshot)`:
   - Build an array of D1 prepared statements `stmts`.
   - Iterate `[...RESTORABLE_TABLES].reverse()` and push `db.prepare(\`DELETE FROM \${table}\`)` for tables present in `snapshot`.
   - Iterate `RESTORABLE_TABLES` in forward order and push `db.prepare(\`INSERT OR REPLACE INTO \${table} (\${cols}) VALUES (\${placeholders})\`).bind(...Object.values(row))` for each row.
   - Execute `await db.batch(stmts)` so the entire restore runs atomically in a single transaction.

---

### Task 5: Fix Frontend API Bridge, Leave Deletion & Role Preview

**Files:**
- Modify: `frontend/js/api.js`
- Modify: `frontend/common.js`
- Modify: `functions/api/drivers/leaves.js`

- [ ] **Step 1: Update `ACTION_MAP` in `frontend/js/api.js` and `previewRole` in `frontend/common.js`**

1. In `frontend/js/api.js`:
   - `'reportFatigue': (d) => API.post('/api/drivers/fatigue/report', d)`
   - `'deleteDriverLeave': (d) => API.del(\`/api/drivers/leaves/\${d.leaveId || d.id}\`)`
   - `'getFuelItem': (d) => API.get(\`/api/fuel/log/\${d.id}\`)`
   - `'updateFuel': (d) => API.put(\`/api/fuel/log/\${d.id}\`, d)`
   - `'deleteFuel': (d) => API.del(\`/api/fuel/log/\${d.id}\`)`
   - `'getFuelReports': (d) => API.get('/api/reports/fuel' + _q(d))`
   - `'getRepairReport': (d) => API.get('/api/reports/repairs' + _q(d))`
   - `'getMaintenanceSchedule': () => API.get('/api/maintenance/status')`
   - `'submitUsageQR': (d) => API.post('/api/usage/record', d)`
2. In `frontend/common.js`:
   - In `previewRole(role)`: map `'requester'` to `'staff'` so the preview user has a valid database role, and add `escapeHtml` helper for safe user display rendering.
3. In `functions/api/drivers/leaves.js`:
   - Support `id` or `leave_id` from URL searchParams OR request body on `DELETE`.

---

### Task 6: Verification, Linting & Automated Tests

**Files:**
- Modify: `tests/api-integration.test.mjs`

- [ ] **Step 1: Add regression tests for Phase 1 fixes in `tests/api-integration.test.mjs`**
- Test `/api/reports/audit-export` and `/api/reports/check-log` return 200 (not 500).
- Test `/api/evaluations` and `/api/warnings/pending` return 200 (not 500).
- Test `/api/cron/daily` and `/api/cron/weekly` return 200 (not 500).
- Test `/api/auth/check-identity` does not leak `phone` or `role`.
- Test `/api/files/upload` blocks `text/html` MIME type with 400.

- [ ] **Step 2: Run ESLint and Playwright API tests**
- Run: `npm run lint`
- Run: `npm run test:api`

- [ ] **Step 3: Commit and push all Phase 1 changes**
- Run: `git add . && git commit -m "fix(phase1): resolve 500 crashes, harden auth/RBAC/file security, and fix backup/API bridge" && git push`
