# PPK DriveHub: Authentication, Onboarding & Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement first-time `@ppk.ac.th` login using phone number as default password, complete first-time onboarding / profile completion, persistent session management, and automated email notifications for vehicle request lifecycle and password resets.

**Architecture:** Extend Cloudflare D1 schema for user department and onboarding status; update Workers auth endpoints for smart identity check, phone-as-password, and profile completion; build a multi-step responsive interface in `login.html`; create a robust notification email helper supporting Google Apps Script MailApp and REST Mail APIs; hook email triggers to vehicle request creation, cancellation, and dispatch events.

**Tech Stack:** Cloudflare Pages Functions (JavaScript ES Modules, D1 SQLite), HTML5, Vanilla CSS / JavaScript, Google Apps Script MailApp / REST Mail API.

## Global Constraints
- Push dev commit (`git add .`, `git commit -m "..."`, `git push`) whenever modifications are made.
- Existing Admin accounts (and staff accounts) must continue logging in with their existing passwords without disruption.
- First-time `@ppk.ac.th` users use their phone number as the initial password, then complete onboarding before entering `dashboard.html`.
- Session tokens and user profiles are stored in LocalStorage/SessionStorage to prevent redundant inputs.

---

### Task 1: Database Migration for Department and Onboarding Status

**Files:**
- Create: `migrations/055-add-user-department-and-onboarding.sql`
- Modify: `migrations/schema.sql`

**Interfaces:**
- Produces: `users.department TEXT`, `users.onboarding_completed INTEGER NOT NULL DEFAULT 1`

- [ ] **Step 1: Write migration SQL file**
Create `migrations/055-add-user-department-and-onboarding.sql`:
```sql
-- Migration 055: Add department and onboarding_completed to users table
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 1;

-- Backfill existing users:
UPDATE users SET onboarding_completed = 1 WHERE onboarding_completed IS NULL;
```

- [ ] **Step 2: Update `migrations/schema.sql`**
Add `department TEXT,` and `onboarding_completed INTEGER NOT NULL DEFAULT 1,` inside `CREATE TABLE IF NOT EXISTS users (...)`.

- [ ] **Step 3: Commit migration**
```bash
git add migrations/055-add-user-department-and-onboarding.sql migrations/schema.sql
git commit -m "feat(db): add department and onboarding_completed to users table"
```

---

### Task 2: Email Notification Engine & Templates

**Files:**
- Modify: `functions/_helpers.js`
- Create: `docs/email-webhook-gas.js`

**Interfaces:**
- Produces:
  - `sendNotificationEmail(env, { to, subject, html, text })`
  - `sendRequestCreatedEmail(env, requestData, requester)`
  - `sendRequestCancelledEmail(env, requestData, requester, cancelledBy)`
  - `sendRequestApprovedEmail(env, requestData, requester, vehicle, driver)`
  - `sendPasswordResetEmail(env, user, resetToken, origin)`

- [ ] **Step 1: Implement `sendNotificationEmail` in `functions/_helpers.js`**
Enhance email dispatcher supporting Google Apps Script (`env.EMAIL_WEBHOOK_URL`) and Resend API (`env.RESEND_API_KEY`).
Add rich HTML styling with PPK DriveHub branding.

- [ ] **Step 2: Add lifecycle email trigger helpers in `functions/_helpers.js`**
Create templated email formatters for:
1. Created request confirmation
2. Cancellation confirmation
3. Approval and queue assignment (plate, driver name & phone)
4. Password reset link with 1-hour expiry

- [ ] **Step 3: Create Google Apps Script bridge file in `docs/email-webhook-gas.js`**
Write documented Google Apps Script snippet for admin deployment.

- [ ] **Step 4: Commit email notification engine**
```bash
git add functions/_helpers.js docs/email-webhook-gas.js
git commit -m "feat(email): add email notification engine and GAS webhook script"
```

---

### Task 3: Backend Auth, Check-Identity, and Onboarding API

**Files:**
- Modify: `functions/api/auth/[[path]].js`

**Interfaces:**
- Consumes: `users`, `dbRun`, `dbFirst`, `hashPassword`, `verifyPassword`, `sendNotificationEmail`
- Produces:
  - `POST /api/auth/check-identity` with `is_first_time` detection for `@ppk.ac.th`
  - `POST /api/auth/login` with phone-number initialization for first-time `@ppk.ac.th` users
  - `POST /api/auth/complete-onboarding` for saving title, first_name, last_name, department, phone
  - `GET /api/auth/me` returning `department` and `onboarding_completed`
  - `PUT /api/auth/profile` allowing `department` updates
  - `POST /api/auth/forgot-password` triggering actual email delivery

- [ ] **Step 1: Update `check-identity` endpoint**
Detect if user does not exist AND identity is `@ppk.ac.th`:
Return `{ exists: false, is_school_email: true, is_first_time: true, ... }`.
If user exists and `onboarding_completed === 0`, return `{ exists: true, is_school_email: true, is_first_time: true, ... }`.

- [ ] **Step 2: Update `login` endpoint**
If user does not exist and username ends with `@ppk.ac.th`:
- Treat input password as phone number.
- Validate phone format (9-10 digits).
- Insert user into `users` with `onboarding_completed = 0`, `role = 'staff'`, `phone = inputPassword`.
- Return `{ token, user_id, needs_onboarding: true, ... }`.

- [ ] **Step 3: Add `complete-onboarding` endpoint**
Handle `POST /api/auth/complete-onboarding`:
- Authenticate session token.
- Validate `title`, `first_name`, `last_name`, `department`, `phone`.
- Update user record in D1: `title`, `first_name`, `last_name`, `display_name`, `department`, `phone`, `onboarding_completed = 1`.
- If phone number was modified during onboarding, re-hash password to match updated phone.
- Return updated user profile.

- [ ] **Step 4: Update `me`, `profile`, and `forgot-password` endpoints**
- In `GET /api/auth/me`: include `department`, `onboarding_completed`.
- In `PUT /api/auth/profile`: include `department` in allowed fields.
- In `POST /api/auth/forgot-password`: dispatch `sendPasswordResetEmail`.

- [ ] **Step 5: Commit auth updates**
```bash
git add functions/api/auth/[[path]].js
git commit -m "feat(auth): implement phone login for @ppk.ac.th, onboarding completion, and email reset"
```

---

### Task 4: Admin Password Reset Enhancement

**Files:**
- Modify: `functions/api/admin/[[path]].js`
- Modify: `frontend/user-management.html`

**Interfaces:**
- Consumes: `PUT /api/admin/users/:id/reset-password`
- Produces: UI modal & API options for resetting user password to phone number, custom password, or sending reset link

- [ ] **Step 1: Update `PUT /api/admin/users/:id/reset-password` in `functions/api/admin/[[path]].js`**
Allow body parameters:
- `action: 'phone'` -> resets password hash to user's phone number
- `action: 'custom'` with `new_password` -> sets specific password
- `action: 'email'` -> dispatches reset password email to user

- [ ] **Step 2: Add password reset button and dialog in `frontend/user-management.html`**
Add "🔑 รีเซ็ตรหัสผ่าน" action for each user, allowing admin to reset quickly.

- [ ] **Step 3: Commit admin password reset**
```bash
git add functions/api/admin/[[path]].js frontend/user-management.html
git commit -m "feat(admin): enhance user password reset capabilities"
```

---

### Task 5: Frontend `login.html` & Onboarding Workflow

**Files:**
- Modify: `frontend/login.html`
- Modify: `frontend/js/api.js`

**Interfaces:**
- Consumes: `checkIdentity`, `POST /api/auth/login`, `POST /api/auth/complete-onboarding`
- Produces:
  - Step 1 (Identity Input)
  - Step 2 (Password Input for existing users OR Phone Input for first-time `@ppk.ac.th`)
  - Step 3 (Onboarding & Profile Completion Card)
  - Auto-login check on page load

- [ ] **Step 1: Update `js/api.js`**
Add `API.completeOnboarding(data)` pointing to `POST /api/auth/complete-onboarding`.

- [ ] **Step 2: Update `frontend/login.html` UI**
- Add auto-redirect on page load if user already has a valid token and `onboarding_completed !== 0`.
- Update Step 2: if `is_first_time`, change label to "เบอร์โทรศัพท์ (รหัสผ่านเริ่มต้นสำหรับการเข้าใช้งานครั้งแรก)", set type="tel", add friendly guidance.
- Build Step 3 (Onboarding Card):
  - คำนำหน้า (select)
  - ชื่อจริง และ นามสกุล
  - กลุ่มสาระการเรียนรู้ หรือกลุ่มงาน (dropdown)
  - ยืนยันเบอร์โทรศัพท์ (prefilled from step 2)
  - ยืนยันอีเมล (prefilled read-only)
  - Button: `บันทึกข้อมูลและเข้าสู่ระบบทันที`
- Handle submission: call `API.completeOnboarding`, update `API.setUser`, redirect to `dashboard.html`.

- [ ] **Step 3: Commit login and onboarding UI**
```bash
git add frontend/login.html frontend/js/api.js
git commit -m "feat(ui): add first-time phone login flow and onboarding screen in login.html"
```

---

### Task 6: Frontend Session Persistence & Onboarding Guard

**Files:**
- Modify: `frontend/dashboard.html`
- Modify: `frontend/common.js`
- Modify: `frontend/profile.html`

**Interfaces:**
- Consumes: `API.getUser()`, `API.getToken()`
- Produces: Persistent user state, seamless navigation, profile display

- [ ] **Step 1: Update `frontend/common.js`**
Ensure user session loads correctly and `department` is accessible in `getCurrentUser()`.

- [ ] **Step 2: Update `frontend/profile.html`**
Support editing and displaying `department` and phone correctly.

- [ ] **Step 3: Update `frontend/dashboard.html`**
Add safety check: if `user.onboarding_completed === 0`, redirect to `login.html` to complete onboarding.

- [ ] **Step 4: Commit frontend persistence and guard**
```bash
git add frontend/common.js frontend/profile.html frontend/dashboard.html
git commit -m "feat(ui): ensure profile persistence and onboarding guard"
```

---

### Task 7: Integration in Vehicle Requests (Lifecycle Automated Emails)

**Files:**
- Modify: `functions/api/vehicle-requests/[[path]].js`

**Interfaces:**
- Consumes: `sendRequestCreatedEmail`, `sendRequestCancelledEmail`, `sendRequestApprovedEmail`

- [ ] **Step 1: Send confirmation email on request creation**
In `POST /api/vehicle-requests`:
After inserting request, dispatch `sendRequestCreatedEmail(env, row, user)`.

- [ ] **Step 2: Send cancellation email on request deletion**
In `DELETE /api/vehicle-requests/:id`:
Dispatch `sendRequestCancelledEmail(env, row, requester, user)`.

- [ ] **Step 3: Send approval & dispatch email on queue assignment**
In `PUT /api/vehicle-requests/:id/approve-queue` and bulk approve:
Dispatch `sendRequestApprovedEmail(env, row, requester, car, driver)` with license plate, driver name, and driver phone.

- [ ] **Step 4: Commit vehicle request email hooks**
```bash
git add functions/api/vehicle-requests/[[path]].js
git commit -m "feat(notifications): trigger automated email notifications for vehicle request lifecycle"
```

---

### Task 8: Verification & End-to-End Testing

**Files:**
- Modify: `tests/` or manual verification scripts

- [ ] **Step 1: Verify syntax and linting**
Run `npm run lint` or syntax check on modified files.

- [ ] **Step 2: Verify First-Time `@ppk.ac.th` flow**
Test `newuser@ppk.ac.th` -> phone login -> onboarding completion -> auto-redirect.

- [ ] **Step 3: Verify Admin / Existing User flow**
Test login with existing admin account -> ensure unchanged password works.

- [ ] **Step 4: Verify Email triggers**
Verify request creation, cancellation, approval, and password reset email generation.

- [ ] **Step 5: Final Git push**
Run `git push` to ensure repository is up to date.
