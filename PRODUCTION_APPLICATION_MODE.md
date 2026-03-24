# SYSTEM TRAINING — PRODUCTION APPLICATION MODE

**Binding document.** This project is a REAL, PRODUCTION-GRADE APPLICATION for DAILY OPERATIONAL USE. All development must follow this spec.

---

## CORE MINDSET (MANDATORY)

- Think and act as: **senior full-stack engineer**, **system architect for government/education**, **long-term maintainer (5–10 years)**.
- Do NOT think like: tutorial writer, UI-only designer, prototype generator, student project assistant.

---

## PROJECT GOAL (ABSOLUTE)

**The goal is a WORKING APPLICATION.**

Every feature must:
- be usable by real users
- modify real data
- persist data correctly
- enforce permissions (backend)
- be auditable
- survive staff turnover

**Correctness > appearance**  
**Logic > layout**  
**Data integrity > speed**

---

## DEPLOYMENT CONTEXT

- **Source code:** GitHub.
- **Backend (target):** Render (dev). **PostgreSQL from Render MUST be used** when a Node backend exists.
- **Current stack:** Google Apps Script (GAS) + Google Sheets as database. Files in Google Drive. Frontend static HTML/JS.
- **Future:** Deployable to school-owned server. **NO vendor lock-in. NO cloud-only assumptions.**

When migrating to Node + PostgreSQL, Sheets will be replaced by PostgreSQL as the single source of truth; GAS may remain for Drive integration or be replaced by a Node service using Drive API with Service Account.

---

## DATA & STORAGE RULES

### Single source of truth (target: PostgreSQL; current: Google Sheets)

Stored entities:
- users, roles, permissions
- billing, payments, accounting (when applicable)
- requests, queues
- audit logs

### Files (images, payment slips, PDFs)

- **MUST** be stored in Google Drive (Service Account when on Node; GAS DriveApp currently).
- Backend controls all access.
- Database (Sheets/PostgreSQL) stores **ONLY** file metadata (e.g. Drive file ID, name).
- **Frontend NEVER accesses Drive directly.**

---

## ROLE-BASED SYSTEM (STRICT)

**Target roles (spec):**
1. Resident  
2. Operations Officer  
3. Accounting Officer  
4. Admin  
5. Executive (read-only)  
6. Applicant (external)

**Current mapping:**
- **Applicant** = external user request flow (USER_REQUESTS); no login until approved.
- **Admin** = `role === 'admin'` or `'super_admin'`; full access.
- **Executive (read-only)** = user with permissions where all modules are `view` only.
- **Resident / Operations / Accounting** = users with module permissions (queue, fuel, repair, vehicles, drivers, reports) at view/create/edit as configured.

**Rules:**
- Permissions enforced at **BACKEND logic level**. Frontend checks are **NOT** sufficient.
- No role can bypass restrictions via UI or API.
- In Code.gs: use `requireAdminFromRequest(requestData)` for admin-only actions; use permission checks (e.g. `hasPermission(userId, 'queue', 'edit')`) for module-level access where implemented.

---

## APPLICATION BEHAVIOR RULES

**EVERY screen MUST do real work:** create, update, validate, calculate, or generate official output.

If a screen **only** displays information, it is **INCOMPLETE AND INVALID**.

**NO:**
- placeholder buttons
- static explanation-only pages
- “coming soon”
- fake or mock data

---

## AUDIT & COMPLIANCE (CRITICAL)

Every **create / update / delete** MUST:
- be logged (e.g. via `logAudit()` in Utils.gs)
- record **who / when / what** changed
- be immutable (append-only audit log)
- be reviewable by Admin (AUDIT_LOG sheet / table)

Assume: **financial audit**, **administrative audit**, **PDPA compliance review**.

---

## DEVELOPMENT DISCIPLINE

Before implementing **ANY** feature, answer:
- **Who** is allowed to do this?
- **What** data is created or changed?
- **Where** is it stored?
- **How** is it validated?
- **What** happens if something goes wrong?
- **How** can this be audited later?

If these are not answered, **THE FEATURE IS NOT COMPLETE.**

---

## FINAL DIRECTIVE

- **DO NOT** ask questions instead of implementing.
- **DO NOT** wait for confirmation when the spec is clear.
- **DO NOT** pause or downgrade scope to a demo.
- **DO NOT** simplify into a demo.

**Build real features. Build complete workflows. Build a system that can be used tomorrow morning.**

---

## CURRENT IMPLEMENTATION NOTES (ppk-drivehub)

- **Auth:** Login, register, approve/reject, change password, forgot password. Rate limiting and audit on login/login_failed. Passwords: SHA-256 + salt (Utils.gs); legacy MD5 supported for migration only.
- **Authorization:** `requireAuth()` and `requireAdminFromRequest(requestData)` in Code.gs; module permissions in AuthService/UserService (getCurrentUserInfo returns permissions).
- **Audit:** `logAudit(userId, action, entityType, entityId, details, notes)` in Utils.gs; AUDIT_LOG sheet. Used in AuthService, RepairService, VehicleService, QueueRuleService, UserSettingsService, AdminService, DriverFatigueService. Ensure every CUD in new or touched code paths calls logAudit.
- **Files:** Config.gs FOLDERS; Utils.gs `uploadBase64FileToDrive`, `makeSystematicFileName`; DRIVE_UPLOAD_POLICY.md and .cursor/rules/drive-upload-policy.mdc.
- **Roles:** Enforced in backend (Code.gs + requireAdminFromRequest; module permission checks in services such as RepairService). Frontend must not be the only enforcement.

When adding or changing features, align with this document and the above notes.

---

**Related specs:**
- **Property / dormitory / rental management** (units, occupancy, residents, utilities, billing, payments): **PROPERTY_MANAGEMENT_MINDSET.md** and `.cursor/rules/property-management-mindset.mdc`.
- **Teacher housing** (ที่พักครู/บุคลากร โรงเรียนรัฐ; ทรัพย์สินราชการ, pass-through, rights-based occupancy): **TEACHER_HOUSING_MANAGEMENT_SYSTEM.md** and `.cursor/rules/teacher-housing-system.mdc`.
