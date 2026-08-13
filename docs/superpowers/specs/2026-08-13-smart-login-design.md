# Smart Login & First-Time Onboarding Design Specification

## Overview
PPK DriveHub currently uses separate `login.html` and `register.html` pages. Users often get confused about which page to use, and registration requires filling out many fields manually. 

This design unifies login and first-time registration into a single, intelligent "Single Smart Box" interface (`login.html`), drastically reducing friction for users (especially school staff using `@ppk.ac.th` emails).

## User Flows

### Flow 1: Step 1 — Identity Check
1. User navigates to `login.html`.
2. User sees a clean, modern card with a single input: `[ ✉️ อีเมลโรงเรียน (@ppk.ac.th) หรือ ชื่อผู้ใช้งาน ]`.
3. User presses `Enter` or clicks `ถัดไป ➔`.
4. Client calls API endpoint `POST /api/auth/check-identity`.

### Flow 2A: Existing User Login
1. If the API returns `{ exists: true, user: { full_name, email, ... } }`:
2. Card transitions smoothly to Step 2A (Login Mode).
3. Display user preview: Avatar icon + `full_name` + `email`.
4. Display password input: `[ 🔑 รหัสผ่าน ]`.
5. Display `[ ☑️ จำฉันไว้ในระบบ ]` & `[ ลืมรหัสผ่าน? ]`.
6. Button: `เข้าสู่ระบบ`.
7. Link: `[ ⬅️ ไม่ใช่บัญชีนี้? เปลี่ยน ]` (resets form to Step 1).
8. On submission, calls `POST /api/auth/login` and redirects to `dashboard.html`.

### Flow 2B: First-Time User / New Registration
1. If the API returns `{ exists: false, is_school_email: true, suggested_name: "..." }` or user is new:
2. Card transitions smoothly to Step 2B (First-time Onboarding Mode).
3. Banner: `✨ ยินดีต้อนรับบุคลากรใหม่! กรอกข้อมูลสั้นๆ เพื่อเริ่มใช้งาน`.
4. Display minimal 2 fields:
   - `[ 👤 ชื่อ - นามสกุล ]` (auto-filled if name can be parsed from email prefix)
   - `[ 🔑 ตั้งรหัสผ่าน (อย่างน้อย 8 ตัวอักษร) ]`
5. Button: `🚀 สมัครและเริ่มใช้งานทันที`.
6. On submission, calls `POST /api/auth/register`.
7. Upon successful registration, the API returns a JWT token. The client automatically saves the token and logs the user in (Auto-Login), redirecting straight to `dashboard.html`.

## Technical Changes

### Frontend
- **`frontend/login.html`**:
  - Redesign into a unified Card component supporting Step 1 (Identity Check), Step 2A (Login), and Step 2B (Onboarding).
  - Add smooth CSS animations (`slideLeft`, `fadeIn`, `fadeScale`).
  - Support keyboard shortcuts (`Enter` to submit/next).
- **`frontend/js/api.js`**:
  - Add `API.checkIdentity(identity)` helper method.

### Backend (Cloudflare Workers API)
- **`functions/api/auth/[[path]].js`**:
  - Add handler for `POST /api/auth/check-identity`.
  - Check if user exists in D1 database by `email` or `username`.
  - Return `{ exists: true/false, is_school_email: boolean, user: {...} }`.
  - Ensure `POST /api/auth/register` returns token + user object for seamless auto-login.

## Verification & Testing
1. Test with existing account -> verify identity check transitions to password step -> verify login success.
2. Test with new `@ppk.ac.th` email -> verify transition to first-time onboarding -> verify auto-login & redirect to dashboard.
3. Test keyboard navigation (`Enter` key on identity input and password input).
4. Run Playwright E2E tests to verify zero regressions.
