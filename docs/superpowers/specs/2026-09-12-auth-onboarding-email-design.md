# Specification: PPK DriveHub Authentication, Onboarding & Email Notifications

## 1. Overview
This specification details the end-to-end implementation for:
1. **School Email (`@ppk.ac.th`) & Phone Number First-Time Authentication**:
   - Allowing new school personnel with `@ppk.ac.th` to log in using their phone number as an initial password.
   - Preserving full backward compatibility for existing accounts (e.g. Admin, Super Admin, drivers, and pre-existing staff) to use their standard passwords.
2. **First-Time User Onboarding & Profile Completion**:
   - Immediately upon first login via phone, presenting an in-page mandatory profile completion step (`login.html` Step 3).
   - Collecting title, first name, last name, department / subject group, confirming phone number and school email.
   - Storing the information into D1 database and auto-entering `dashboard.html`.
3. **Session & Profile Persistence**:
   - Storing session token and user profile in `localStorage` (if remember me) or `sessionStorage`.
   - Auto-redirecting already-logged-in users visiting `login.html` straight to `dashboard.html`.
   - Safeguarding against un-onboarded state in the dashboard.
4. **Email Notification System**:
   - Automated notification emails triggered on:
     - Vehicle Request Created (to requester).
     - Vehicle Request Cancelled (to requester).
     - Vehicle Request Approved & Dispatched with vehicle and driver details (to requester).
     - Password Reset Link (to user).
   - Modular backend architecture supporting Google Apps Script (`MailApp.sendEmail` - 100% free with school Google Workspace / Gmail account) and configurable REST Mail APIs (e.g. Resend, Webhook).
   - Password reset capabilities: Self-service password reset via email link, and Admin-assisted password reset via `user-management.html`.

---

## 2. User Flows & Architecture

### Flow 1: Smart Identity Check & First-Time Phone Login
1. **User enters identifier in `login.html`**:
   - User types e.g. `somchai@ppk.ac.th` or `admin`.
   - Frontend calls `POST /api/auth/check-identity`.
2. **Check-Identity Evaluation**:
   - **Case A: Existing Active User** (`exists === true`):
     - If the user has completed onboarding (`onboarding_completed !== 0`), show normal Password form:
       - Header: Display Name & Email.
       - Password Field: `[ รหัสผ่าน ]`.
   - **Case B: First-Time User with School Email** (`exists === false` and email ends with `@ppk.ac.th`, OR user exists with `onboarding_completed === 0`):
     - Return `{ exists: false, is_school_email: true, is_first_time: true }`.
     - Card smoothly displays Step 2:
       - Badge: `✨ เข้าใช้งานครั้งแรกสำหรับบุคลากร @ppk.ac.th`.
       - Field: `[ 📱 เบอร์โทรศัพท์ของคุณ (ใช้เป็นรหัสผ่านเริ่มต้น) ]`.
       - Helper note: "ใช้เบอร์โทรศัพท์มือถือ 9-10 หลัก เป็นรหัสผ่านเริ่มต้นสำหรับการเข้าใช้งานครั้งแรก".
3. **Login Request (`POST /api/auth/login`)**:
   - If user exists: standard password check (`verifyPassword`).
   - If user does not exist AND identifier is `@ppk.ac.th`:
     - Clean input phone (9-10 digits).
     - Salt and hash phone number as `password_hash`.
     - Insert new record into `users` table:
       - `role`: `'staff'`
       - `username`: email
       - `email`: email
       - `phone`: input phone
       - `onboarding_completed`: `0`
       - `must_change_password`: `0`
     - Generate session token.
     - Return `{ token, user_id, needs_onboarding: true, ... }`.

### Flow 2: Onboarding & Profile Completion
1. When `login.html` receives `needs_onboarding: true`:
   - Store token in memory/storage.
   - Transition smoothly to **Step 3: Onboarding Panel**.
2. **Form Fields**:
   - **คำนำหน้า**: Dropdown (`นาย`, `นาง`, `นางสาว`, `ดร.`, `ครู`, `อาจารย์`, `ว่าที่ ร.ต.`, `อื่นๆ`).
   - **ชื่อจริง** and **นามสกุล**: Two input fields (auto-guessed if possible).
   - **กลุ่มสาระการเรียนรู้ / กลุ่มงาน**: Dropdown of 8 learning areas + administrative units + `อื่นๆ`.
   - **ยืนยันเบอร์โทรศัพท์**: Pre-filled with phone from Step 2, editable.
   - **ยืนยันอีเมล**: Pre-filled read-only with `@ppk.ac.th`.
3. **Submission (`POST /api/auth/complete-onboarding`)**:
   - Validates all required fields.
   - Updates `users` table:
     - `title`, `first_name`, `last_name`, `display_name = title + first_name + ' ' + last_name`
     - `department`
     - `phone`
     - `onboarding_completed = 1`
   - If user updated their phone number in this step, update their password hash to match their confirmed phone number.
   - Returns updated user object.
   - Frontend sets `API.setUser(...)`, notifies user, and redirects directly to `dashboard.html`.

### Flow 3: Session Persistence & Auto-Login
1. In `login.html`, check `API.getToken()` and `API.getUser()` on page load:
   - If token exists and `user.onboarding_completed !== 0`:
     - Call `GET /api/auth/me` in background or verify expiry.
     - Auto-redirect to `dashboard.html`.
2. In `dashboard.html`:
   - If `currentUser` has `onboarding_completed === 0`, display profile completion prompt or redirect to complete profile.
3. In subsequent visits:
   - Token and profile are remembered in `localStorage` (`remember-me = true`) or `sessionStorage`.
   - No repetitive entry of credentials or profile info.

### Flow 4: Automated Email Notifications
1. **Helper Function `sendNotificationEmail(env, { to, subject, html, text })`**:
   - Checks `env.EMAIL_WEBHOOK_URL` (Google Apps Script Web App URL).
     - Payload: `{ to, subject, html, text }`.
     - Google Apps Script uses `MailApp.sendEmail({ to, subject, htmlBody: html, body: text })`.
   - Alternatively checks `env.RESEND_API_KEY` (if user chooses Resend REST API).
2. **Event 1: Request Created (`POST /api/vehicle-requests`)**:
   - Sends confirmation email to `user.email`.
   - Subject: `[PPK DriveHub] ยืนยันการส่งคำขอใช้รถราชการ - เลขที่ ${requestNo}`.
   - Content: วันที่, เวลา, ปลายทาง, วัตถุประสงค์, จำนวนผู้โดยสาร, สถานะปัจจุบัน.
3. **Event 2: Request Cancelled (`DELETE /api/vehicle-requests/:id`)**:
   - Sends cancellation email to `requester.email`.
   - Subject: `[PPK DriveHub] ยืนยันการยกเลิกคำขอใช้รถราชการ - เลขที่ ${request_no}`.
   - Content: เลขที่คำขอ, วันที่, ปลายทาง, เวลาที่ยกเลิก.
4. **Event 3: Request Approved & Assigned (`approve-queue` and `bulk-approve`)**:
   - Sends dispatch notification email to `requester.email`.
   - Subject: `[PPK DriveHub] คำขอใช้รถได้รับการอนุมัติและจัดรถแล้ว - เลขที่ ${request_no}`.
   - Content:
     - ทะเบียนรถ, ยี่ห้อ, รุ่น
     - ชื่อพนักงานขับรถ, เบอร์โทรศัพท์ติดต่อ
     - วันที่และเวลาออกเดินทาง
5. **Event 4: Password Reset**:
   - User self-reset: `POST /api/auth/forgot-password` sends email with reset link containing secure token.
   - Admin reset: `PUT /api/admin/users/:id/reset-password` supports setting a new password, resetting to the user's phone number, or triggering a reset link email.

---

## 3. Database Schema Updates

### Migration `055-add-user-department-and-onboarding.sql`:
```sql
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 1;
```
*(Existing users are set to `onboarding_completed = 1` by default so their workflow is untouched).*

Also update `migrations/schema.sql` to include `department` and `onboarding_completed` in the `users` table definition.

---

## 4. Google Apps Script Bridge Code
Provide Google Apps Script code for admin to paste into script.google.com:
```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    var subject = data.subject || '[PPK DriveHub] แจ้งเตือนระบบ';
    var text = data.text || data.body || '';
    var html = data.html || text;

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: text,
      htmlBody: html,
      name: 'PPK DriveHub - งานยานพาหนะ'
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 5. Verification Plan
1. **First-Time School Email Login**:
   - Enter `newteacher@ppk.ac.th` in `login.html`.
   - System recognizes first-time `@ppk.ac.th` and requests phone number.
   - Enter phone number `0812345678`.
   - System registers user and transitions directly to Onboarding (Step 3).
   - Fill Title, Name, Department, confirm Phone/Email, submit.
   - Verify DB has record with correct department, phone, and `onboarding_completed = 1`.
   - Verify auto-login into `dashboard.html`.
2. **Subsequent Login**:
   - Log out, enter `newteacher@ppk.ac.th`.
   - System recognizes existing user, prompts for password.
   - Enter `0812345678`, login succeeds, no onboarding prompted.
3. **Admin Account Compatibility**:
   - Enter admin email (`krumum.piano@gmail.com` or `admin@ppk.ac.th`).
   - System prompts for standard admin password.
   - Verify admin logs in normally.
4. **Email Notifications**:
   - Create a vehicle request -> verify email dispatched with request details.
   - Cancel vehicle request -> verify cancellation email dispatched.
   - Approve vehicle request with assigned vehicle and driver -> verify dispatch email dispatched with plate and driver info.
   - Test password reset -> verify reset email.
