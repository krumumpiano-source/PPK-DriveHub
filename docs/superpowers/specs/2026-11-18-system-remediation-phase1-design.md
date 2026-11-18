# PPK DriveHub — System Audit & Remediation Design Spec (Phase 1 & Master Roadmap)

**Date:** 2026-11-18  
**Project:** PPK DriveHub (โรงเรียนพะเยาพิทยาคม)  
**Scope:** Phase 1 Detailed Specification (Critical 500 Crashes, Security/Auth/RBAC Hardening, Data Loss Prevention in Backup/Restore, Broken API Bridge) + Master Roadmap for Phases 2–5.

---

## 1. Executive Summary & Architecture Approach

จากการตรวจสอบระบบเชิงลึกพบข้อบกพร่องกระจายอยู่ใน 5 มิติหลัก (ความปลอดภัยและสิทธิ์, โค้ดพัง 500 Runtime/SQL Crash, สมการคำนวณผิดพลาด, ตรรกะคิวและ Auto-Heal รวน, และความสอดคล้องตามกฎหมายไทย)

เพื่อให้การแก้ไขมีความปลอดภัยสูงสุด ไม่กระทบข้อมูลจริงในฐานข้อมูล Cloudflare D1 และสามารถตรวจสอบย้อนกลับได้ด้วยการทดสอบอัตโนมัติ (Automated Tests) จึงแบ่งการดำเนินงานออกเป็น **5 เฟส** โดยเอกสารฉบับนี้กำหนดรายละเอียดเชิงวิศวกรรมของ **เฟสที่ 1** อย่างครบถ้วนโดยใช้ **แนวทางที่ 1 (Core Middleware/Helpers Enhancement + Targeted Endpoint Remediation)**

---

## 2. Phase 1 Detailed Design Specification

### 2.1 Authentication, Authorization (RBAC) & Security Hardening

#### A. ปิดช่องโหว่การยืนยันตัวตน (`functions/api/auth/[[path]].js`)
1. **ลบ Hardcoded Backdoor Passwords:**
   - ลบเงื่อนไข `if (inputPassword === '123456' || inputPassword === 'ppk123456')` ใน `/api/auth/login` และ `/api/auth/change-password` ออกทั้งหมด
2. **ปิดการสร้างบัญชีอัตโนมัติโดยไม่ยืนยันตัวตนตอน Login:**
   - ลบบล็อก `if (inputUsername.endsWith('@ppk.ac.th'))` ที่สร้างแถวใหม่ในตาราง `users` อัตโนมัติเมื่อล็อกอินไม่เจอชื่อผู้ใช้
   - ผู้ใช้ใหม่จะต้องลงทะเบียนผ่าน `/api/auth/register` หรือได้รับการสร้างบัญชีจากผู้ดูแลระบบเท่านั้น
   - สำหรับผู้ใช้ที่มีอยู่ในตาราง `users` แล้ว และมี `must_change_password === 1` ระบบจะตรวจสอบรหัสผ่านกับ `password_hash` ที่บันทึกไว้ (หรือเบอร์โทรศัพท์ใน `user.phone` เฉพาะกรณีที่บัญชีนั้นมีเบอร์โทรผูกไว้และยังไม่ได้เปลี่ยนรหัสผ่านเริ่มต้น)
3. **บังคับตรวจสอบรหัสผ่านเดิมใน `/api/auth/change-password`:**
   - ยกเลิกการข้ามตรวจ `old_password` เมื่อ `must_change_password === 1`
   - ทุกคำขอเปลี่ยนรหัสผ่านต้องส่ง `old_password` มาตรวจสอบกับ `verifyPassword(oldPassword, user.salt, user.password_hash)` (หรือตรงกับ `user.phone` กรณี `must_change_password === 1`) เสมอ
4. **ปิดการรั่วไหลของข้อมูลส่วนบุคคล (PII Enumeration) ใน `/api/auth/check-identity`:**
   - คืนค่าเฉพาะสถานะที่จำเป็นต่อการแสดงผลหน้าล็อกอิน:
     ```json
     {
       "exists": true,
       "is_school_email": true,
       "is_first_time": false,
       "must_change_password": false
     }
     ```
   - ตัดออบเจกต์ `user` (ที่มี `display_name`, `phone`, `department`, `role`) ออกจาก Response ทั้งหมด
5. **ป้องกัน Host/Origin Header Poisoning ในลิงก์รีเซ็ตรหัสผ่าน:**
   - ใน `/api/auth/forgot-password` และ `/api/admin/users/:id/reset-password`: ตรวจสอบ `request.headers.get('Origin')` เทียบกับรายการ `ALLOWED_ORIGINS` (`https://ppk-drivehub.pages.dev`, `http://localhost:8788`) หากไม่ตรงให้บังคับใช้ `'https://ppk-drivehub.pages.dev'` เสมอ

#### B. ซ่อมแซมระบบ LINE Login & ป้องกัน CSRF (`functions/api/auth/line.js`, `callback.js`, `_middleware.js`)
1. เพิ่ม `'/api/auth/line'` ใน `PUBLIC_PATHS` ของ `functions/_middleware.js` (ครอบคลุมทั้ง `/api/auth/line` และ `/api/auth/line/callback`)
2. ใน `functions/api/auth/line/callback.js`:
   - อ่านค่า Cookie `line_auth_state` จาก `request.headers.get('Cookie')`
   - ตรวจสอบว่า `state` จาก Query String ต้องมีค่าและตรงกับ `line_auth_state` ใน Cookie หากไม่ตรงให้ตอบกลับ `400 Invalid OAuth state` พร้อมล้าง Cookie ทันที

#### C. ปรับปรุง Middleware, Rate Limiting & File Upload Security (`functions/_middleware.js`, `functions/api/files/[[path]].js`)
1. **Rate Limiting เพิ่มเติม:**
   - เพิ่ม `'/api/auth/check-identity': { max: 15, windowMs: 60 * 1000 }`
   - เพิ่ม `'/api/usage/ocr-odometer': { max: 10, windowMs: 60 * 1000 }`
2. **Client IP Tracking ตาม พ.ร.บ. คอมพิวเตอร์ฯ มาตรา 26:**
   - ใน `_middleware.js` ดึงค่า IP จาก `request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null` เก็บไว้ที่ `env.clientIp` และใน `env.user.ipAddress`
   - ปรับ `writeAuditLog(db, userId, username, action, module, entityId, details, ipAddress)` ใน `_helpers.js` ให้สามารถรับ `ipAddress` ได้ หรือดึงจาก Global/Context fallback
3. **ป้องกัน Stored XSS ใน `/api/files/`:**
   - ใน `POST /api/files/upload`: อนุญาตเฉพาะ MIME types ที่ปลอดภัย ได้แก่ `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `application/pdf` เท่านั้น หากส่ง MIME type อื่นมา (เช่น `text/html`, `image/svg+xml`, `application/javascript`) ให้ปฏิเสธด้วย `400 ประเภทไฟล์ไม่ได้รับอนุญาต`
   - ใน `GET /api/files/*`: เพิ่ม Header `Content-Security-Policy: default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'` และ `X-Content-Type-Options: nosniff`

#### D. อุดช่องโหว่ระบบสิทธิ์ RBAC (`functions/_helpers.js` & API Endpoints)
1. **เพิ่มระดับสิทธิ์ `approve` ใน `_helpers.js`:**
   - ปรับ `PERMISSION_LEVELS` จาก `{ view: 1, create: 2, edit: 3, delete: 4 }` เป็น `{ view: 1, create: 2, edit: 3, approve: 3, delete: 4, manage: 4 }` เพื่อให้การเรียก `requirePermission(user, 'fuel', 'approve')` และ `requirePermission(user, 'admin', 'manage')` ทำงานได้อย่างถูกต้องตามลำดับขั้น
2. **ปลดล็อก Hardcoded Admin Email (`functions/api/admin/[[path]].js`):**
   - ลบเงื่อนไขที่บังคับว่าเฉพาะ `krumum.piano@gmail.com` เท่านั้นที่เป็น `admin` หรือ `super_admin` ได้
   - เปลี่ยนเป็นกฎ: **เฉพาะผู้ใช้ที่มี `user.role === 'super_admin'` เท่านั้นที่สามารถแต่งตั้ง เปลี่ยนแปลงบทบาท หรือระงับการใช้งานของผู้ใช้ที่มีบทบาท `admin` หรือ `super_admin` ได้**
   - ยุบรวม Handler `DELETE /api/admin/users/:id` ที่ซ้ำกัน 2 จุดใน `admin/[[path]].js` ให้เหลือจุดเดียว และจัดการเคลียร์หรืออัปเดต Foreign Keys ก่อนลบ (หรือหากติด Foreign Key จากประวัติงานราชการ ให้ปฏิเสธการลบแบบ Hard Delete แล้วแนะนำให้ใช้การระงับบัญชี Deactivate แทน เพื่อรักษาความสมบูรณ์ของข้อมูลราชการ)
3. **เพิ่มการตรวจสอบสิทธิ์ใน Endpoints ที่รั่ว:**
   - `functions/api/tax-insurance/[[path]].js`:
     - `GET /api/tax-insurance/inspections`: ต้องมีสิทธิ์ `checkPermission(user, 'tax', 'view') || checkPermission(user, 'vehicles', 'view')`
     - `POST /api/tax-insurance/inspections`: ต้องมีสิทธิ์ `checkPermission(user, 'tax', 'create') || checkPermission(user, 'vehicles', 'edit')`
     - `PUT /api/tax-insurance/inspections/:id`: ต้องมีสิทธิ์ `checkPermission(user, 'tax', 'edit') || checkPermission(user, 'vehicles', 'edit')`
     - `DELETE /api/tax-insurance/inspections/:id`: ต้องมีสิทธิ์ `checkPermission(user, 'tax', 'delete') || checkPermission(user, 'vehicles', 'delete')`
   - `functions/api/incidents/[[path]].js`:
     - `PUT /api/incidents/:id` และ `PUT /api/incidents/:id/resolve`: ต้องเป็น `admin`, `super_admin`, `manager` หรือมีสิทธิ์ `checkPermission(user, 'repair', 'edit')` หรือ `checkPermission(user, 'vehicles', 'edit')`
   - `functions/api/evaluations/[[path]].js`:
     - `POST /api/evaluations` เมื่อ `evaluation_type === 'committee'`: ต้องเป็น `admin`, `super_admin`, หรือ `manager` เท่านั้น
     - `DELETE /api/evaluations/:id`: ต้องเป็น `admin` หรือ `super_admin` เท่านั้น

---

### 2.2 การซ่อมจุดที่ระบบพัง Error 500 (Runtime & SQL Crashes)

1. **`functions/api/evaluations/[[path]].js` & `functions/api/warnings/[[path]].js`:**
   - เปลี่ยน `const user = data.user;` เป็น `const user = env.user;` ทุกจุด
2. **`functions/api/reports/[[path]].js`:**
   - ใน `GET /api/reports/audit-export` (บรรทัด 896–926):
     - เปลี่ยนพารามิเตอร์กรองตารางให้ใช้คอลัมน์ `al.module` (รองรับทั้ง query param `module` และ `table`)
     - เปลี่ยนคำสั่ง SQL SELECT เป็น:
       ```sql
       SELECT al.id, al.created_at, al.module AS table_name, al.entity_id AS record_id,
              al.action, al.details, al.ip_address,
              COALESCE(u.display_name, al.username) AS actor_name,
              COALESCE(u.username, al.username) AS actor_username
       FROM audit_log al
       LEFT JOIN users u ON al.user_id = u.id
       ```
     - เปลี่ยน Summary query จาก `COUNT(DISTINCT al.table_name)` เป็น `COUNT(DISTINCT al.module) AS tables_affected`
   - ใน `GET /api/reports/check-log` (บรรทัด 1014–1016):
     - เปลี่ยน `cl.image_url` เป็น `cl.check_image AS image_url, cl.check_image`
3. **`functions/api/cron/daily.js`:**
   - เปลี่ยนคิวรีข้อที่ 2 (เช็คระยะซ่อมบำรุงภายใน 500 กม.) จากเดิมที่ดึง `cars.next_km` (ซึ่งไม่มีอยู่จริง) เป็นการดึงจาก `vehicle_maintenance`:
     ```sql
     SELECT c.license_plate, c.brand, c.current_mileage, vm.next_km, ms.item_name
     FROM vehicle_maintenance vm
     JOIN cars c ON vm.car_id = c.id
     LEFT JOIN maintenance_settings ms ON vm.item_key = ms.item_key
     WHERE vm.next_km IS NOT NULL
       AND (vm.next_km - c.current_mileage) <= 500
       AND c.status NOT IN ('retired', 'inactive')
     ```
4. **`functions/api/cron/weekly.js`:**
   - แก้คิวรีที่ 1 (`queue`): `WHERE date >= ? AND date <= ? AND status IN ('completed', 'ongoing')`
   - แก้คิวรีที่ 2 (`fuel_log`): `SELECT COALESCE(SUM(amount), 0) as total_cost FROM fuel_log WHERE date >= ? AND date <= ? AND deleted_at IS NULL`
   - แก้คิวรีที่ 3 (`repair_log`): `SELECT COALESCE(SUM(COALESCE(NULLIF(grand_total, 0), cost, 0)), 0) as total_cost FROM repair_log WHERE date_reported >= ? AND date_reported <= ? AND status != 'cancelled'`
5. **`functions/api/fuel/[[path]].js` (Fuel Budgets Audit Log):**
   - ใน `POST`, `PUT`, `DELETE` ของ `/api/fuel/budgets` แก้การเรียก `writeAuditLog` ให้ใช้ Signature ที่ถูกต้อง:
     `await writeAuditLog(env.DB, user.id, user.displayName || user.username, 'create_fuel_budget', 'fuel_budget', id, body, env.clientIp);`

---

### 2.3 การยกเครื่องระบบ Backup & Restore (`functions/api/backup/[[path]].js`)

1. **ขยายตารางสำรองข้อมูล (`BACKUP_TABLES` และ `RESTORABLE_TABLES`):**
   - จัดลำดับตารางตาม Foreign Key Dependency (จากตารางหลักไปหาตารางลูก):
     1. `system_settings`
     2. `queue_rules`
     3. `maintenance_settings`
     4. `maintenance_profiles`
     5. `cars`
     6. `drivers`
     7. `maintenance_vehicle_profiles`
     8. `vehicle_maintenance`
     9. `leaves`
     10. `self_reported_fatigue`
     11. `queue`
     12. `vehicle_requests`
     13. `usage_records`
     14. `fuel_log`
     15. `fuel_requests`
     16. `fuel_station_invoices`
     17. `fuel_invoice_items`
     18. `fuel_budget`
     19. `repair_log`
     20. `repair_items`
     21. `scheduled_repairs`
     22. `check_log`
     23. `inspection_alerts`
     24. `tax_records`
     25. `insurance_records`
     26. `inspection_records`
     27. `incidents`
     28. `driver_evaluations`
     29. `driver_warnings`
     30. `survey_responses`
     31. `trip_evaluations`
   - สำหรับ `BACKUP_TABLES` จะมี `'users'` ด้วยเพื่อเก็บข้อมูลอ้างอิงในไฟล์ JSON แต่ตอน Restore (`RESTORABLE_TABLES`) จะไม่ลบตาราง `users` และ `sessions` ทิ้ง เพื่อป้องกันแอดมินที่กำลังกด Restore หลุดออกจากระบบ
2. **การกู้คืนแบบ Atomic Batch (`restoreSnapshot`):**
   - สร้างอาร์เรย์ของ Prepared Statements (`stmts`)
   - ตอนลบข้อมูลเดิม: วนลูป `RESTORABLE_TABLES` **ย้อนกลับจากท้ายมาหน้า** (ลบตารางลูก เช่น `repair_items`, `fuel_invoice_items` ก่อนตารางแม่)
   - ตอนเพิ่มข้อมูลคืน: วนลูป `RESTORABLE_TABLES` **ตามลำดับจากหน้าไปหลัง** (เพิ่มตารางแม่ก่อนตารางลูก)
   - รันคำสั่งทั้งหมดในครั้งเดียวด้วย `await db.batch(stmts)` เพื่อให้ทำงานภายใต้ Transaction เดียวกันของ Cloudflare D1 หากมีข้อผิดพลาดจะ Rollback ทั้งหมด ข้อมูลไม่สูญหาย

---

### 2.4 การซ่อมแซม API Bridge (`frontend/js/api.js`) และ Role Preview (`frontend/common.js`)

1. **แก้ไข `ACTION_MAP` ใน `frontend/js/api.js`:**
   - `'reportFatigue': (d) => API.post('/api/drivers/fatigue/report', d)`
   - `'deleteDriverLeave': (d) => API.del('/api/drivers/leaves/' + (d.leaveId || d.id))`
   - `'getFuelItem': (d) => API.get('/api/fuel/log/' + d.id)`
   - `'updateFuel': (d) => API.put('/api/fuel/log/' + d.id, d)`
   - `'deleteFuel': (d) => API.del('/api/fuel/log/' + d.id)`
   - `'getFuelReports': (d) => API.get('/api/reports/fuel' + _q(d))`
   - `'getRepairReport': (d) => API.get('/api/reports/repairs' + _q(d))`
   - `'getMaintenanceSchedule': () => API.get('/api/maintenance/status')`
   - `'submitUsageQR': (d) => API.post('/api/usage/record', d)`
2. **แก้ไขการลบใบลาใน `functions/api/drivers/leaves.js`:**
   - รองรับทั้ง `DELETE /api/drivers/leaves?id=...` และกรณีส่ง `id` มาใน body หรือ query
3. **แก้ไข Role Preview (`frontend/common.js` & `functions/api/admin/[[path]].js`):**
   - ใน `common.js`: ปรับ `previewRole('requester')` ให้แปลง role ในฝั่ง Client เป็น `'staff'` (หรือรองรับ `'requester'` ใน `roleLabel` และเมนู)
   - ใน `admin/[[path]].js` (`/api/admin/impersonate-role/:role`): ถ้ารับค่า `'requester'` ให้แปลงเป็น `'staff'` อัตโนมัติ

---

## 3. Master Roadmap for Subsequent Phases (Phases 2–5)

หลังจากจบเฟสที่ 1 แล้ว จะดำเนินการต่อเนื่องในเฟสที่ 2 ถึง 5 ดังนี้:
- **Phase 2 (Fuel, Repair & Financial Calculations):**
  - แก้สมการกระทบยอดบิลน้ำมัน (`total_diff_liters`) ให้เอาลิตรลบลิตร และกรองตามชื่อปั๊มน้ำมัน
  - คำนวณ `mileage_before` อัตโนมัติจาก `MAX(mileage_after)` ของการเติมครั้งก่อนหน้าใน `/api/fuel/record` เพื่อให้คำนวณ `fuel_consumption_rate` (กม./ลิตร) และ `avg_km_per_liter` ในทะเบียนคุมน้ำมันได้ถูกต้องแม้กรอกผ่าน QR
  - ซิงค์สถานะรถ (`cars.status = 'under_repair'`) ทันทีเมื่อสร้างหรือแก้ไขใบแจ้งซ่อมที่มีสถานะ `repairing`
- **Phase 3 (Queue Conflict, Driver Leave Lifecycle & Auto-Heal Logic):**
  - แก้การเช็คคิวชนของทริปหลายวัน (Multi-day Trip) ให้เปรียบเทียบด้วย Timestamp เต็ม (`YYYY-MM-DD HH:MM`) แทนการบล็อกเหมาทั้งวัน
  - เพิ่มการตรวจสอบคิวชน วันลา และความล้า ใน `PUT /api/queue/:id`
  - แก้การสแกน QR ขากลับ (`record_type = 'return'`) ให้จับคู่เฉพาะคิวที่วันเดินทางตรงกับวันนี้หรือกำลัง `ongoing` เท่านั้น ไม่ให้ไปปิดคิวล่วงหน้าของสัปดาห์หน้า
  - ปรับปรุง Auto-Heal ให้ตรวจสอบลำดับเวลา (Chronological Neighbor) รองรับการลงข้อมูลย้อนหลังโดยไม่หักคะแนนวินัยผิดคน
  - คืนสถานะคนขับจาก `on_leave` กลับเป็น `active` อัตโนมัติเมื่อพ้นกำหนดวันลา และรีเซ็ต `fatigue_flag = 0` เมื่อแอดมินกดรับทราบ
- **Phase 4 (Dynamic Driver Evaluation & Unified Survey):**
  - ลบการ Hardcode ชื่อคนขับ 4 คน (`LIKE '%ชารี%'...`) ใน `survey/[[path]].js` และ `evaluations/[[path]].js` เปลี่ยนเป็นดึงคนขับที่ `status = 'active'` และ `assignment_type = 'primary'` ทั้งหมดโดยอัตโนมัติ
  - เชื่อมโยงคะแนนประเมินจาก `survey_responses` เข้ากับระบบสรุปผลประเมินประจำปี (`evaluations/[[path]].js`)
  - ปรับสมการตัดเกรดใน `evaluations/[[path]].js`: หากยังไม่มีคะแนนจากกรรมการ ให้แสดงสถานะ `"รอผลกรรมการ"` แทนการนำ 0 มารวมแล้วตัดเกรดเป็น `"ต้องปรับปรุง"`
- **Phase 5 (Timezone UTC+7, PDPA Compliance & Repo Cleanup):**
  - เพิ่มฟังก์ชัน `nowThai()` / `todayThai()` (`UTC+7`) สำหรับใช้เทียบวันที่ปัจจุบันในระบบคิว รายงาน และ Cron
  - บันทึก `pdpa_log` เมื่อมีการเปิดดูหรือแก้ไขข้อมูลพนักงานขับรถ และทำ Masking เลขบัตรประชาชน 13 หลักสำหรับผู้ใช้ที่ไม่ใช่ Admin
  - ลบตารางขยะ `repair_log_new` และทำความสะอาดไฟล์ `.log` / ไฟล์ชั่วคราวใน Root Directory พร้อมอัปเดต `.gitignore`
