# แผนการปรับโครงสร้างสถาปัตยกรรมระบบ ความปลอดภัย และประสิทธิภาพ (Architectural Refactoring, Security & Performance Plan)
**โครงการ:** ระบบบริหารจัดการยานพาหนะ PPK DriveHub (งานยานพาหนะ กลุ่มงานบริหารบุคคล โรงเรียนพะเยาพิทยาคม)  
**สถานะเอกสาร:** ผ่านการตรวจสอบโค้ดจริง (Phase 0 Verified Baseline) และทบทวนสถาปัตยกรรมระดับ Principal Staff Engineer  
**วันที่อัปเดตล่าสุด:** 19 ตุลาคม 2569

---

## 0. สรุปผลการตรวจสอบโค้ดจริง (Phase 0: Verification Baseline)

ก่อนเริ่มวางแผนลงมือปฏิบัติ ได้ทำการสแกนและตรวจสอบซอร์สโค้ดจริงในโปรเจกต์เพื่อแยกแยะ **"สิ่งที่ทำเสร็จแล้ว"** ออกจาก **"ปัญหาที่มีอยู่จริงในโค้ดปัจจุบัน"** เพื่อไม่ให้เกิดการแก้ซ้ำซ้อนหรือหลงทิศทาง:

### ✅ สิ่งที่ปรับปรุงไปแล้วในระบบปัจจุบัน (ไม่ต้องรื้อซ้ำ)
1. **การดึงคิวแนะนำ (`GET /api/queue/suggest`):** ในไฟล์ [`functions/api/queue/suggest.js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/queue/suggest.js#L26-L70) ได้ใช้ `Promise.all()` ดึงข้อมูลรถ คนขับ คิวทับซ้อน ใบลา และประวัติการขับขี่แบบขนาน (Parallel Queries) รวมถึงแก้สูตรตรวจสอบคิวข้ามวัน (Multi-day overlap) เรียบร้อยแล้ว
2. **Indexes พื้นฐานชุดแรก (`migrations/051` และ `052`):** มีการสร้าง Composite Indexes สำหรับ `usage_records`, `queue(date, status, time_start, time_end)`, `fuel_log(car_id, deleted_at, date)` และ `notifications` ไว้แล้วใน [`migrations/051-optimize-d1-read-indexes.sql`](file:///d:/AI%20CURSER/ppk-drivehub/migrations/051-optimize-d1-read-indexes.sql) และ [`migrations/052-optimize-backend-indexes.sql`](file:///d:/AI%20CURSER/ppk-drivehub/migrations/052-optimize-backend-indexes.sql)
3. **การล็อกปุ่มกดส่งคำขอใช้รถซ้ำฝั่ง Frontend:** ใน [`frontend/vehicle-request.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/vehicle-request.html#L718-L785) มีการตรวจสอบเบอร์โทรศัพท์ 9–10 หลัก และล็อกปุ่ม `btnSubmitRequest.disabled = true` ระหว่างส่งข้อมูลแล้ว

---

## 1. ด้านสถาปัตยกรรมซอฟต์แวร์และ Clean Code (Lead Software Architect Review)

### 1.1 ปัญหา God Files / Monolithic HTML+JS
โค้ดฝั่ง Frontend รวมศูนย์ HTML, CSS, Business Logic, การคำนวณสถิติ, การสร้างไฟล์ Word (`.docx`) และหน้าสั่งพิมพ์ (Print Template) ไว้ในไฟล์เดียวขนาดใหญ่ ทำให้แก้ไขยากและเสี่ยงกระทบส่วนอื่น:
- [`frontend/reports.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/reports.html) **(2,510 บรรทัด):**
  - บรรทัด `1076–1079`: Hardcode ชื่อและตำแหน่งบุคลากร (`P_AUTHOR`, `P_PURCHASE`, `P_CHIEF`, `P_DIRECTOR`) ฝังตายตัวในโค้ด
  - บรรทัด `1450–1995`: โค้ดสร้างเอกสารราชการ `.docx` ฝังรวมกับโค้ดจัดการตาราง UI
  - บรรทัด `2135–2157`: โค้ดประกอบ HTML String สำหรับสั่งพิมพ์รายงาน (`window.print()`)
- [`frontend/fuel-ledger.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/fuel-ledger.html) **(2,091 บรรทัด):**
  - บรรทัด `1160–1250` และ `1885–1960`: โค้ดสร้างบันทึกข้อความขออนุมัติเบิกจ่ายน้ำมันและทะเบียนคุมใบสั่งซื้อฝังรวมกับลอจิกตาราง
- [`frontend/vehicle-request.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/vehicle-request.html) **(1,987 บรรทัด):**
  - รวมฟอร์มขอใช้รถ, แผนที่ Leaflet + OSRM Routing, ระบบอนุมัติของหัวหน้างาน/ผู้จัดคิว, กระดานวาดลายเซ็น (Canvas Signature) และหน้าพิมพ์ใบขออนุญาตไว้ในไฟล์เดียว

### 1.2 โค้ดตรวจสอบเงื่อนไขการจัดคิวซ้ำซ้อนกัน 2 จุด (Duplicated Domain Logic)
ลอจิกตรวจสอบความพร้อมของรถ, รายการซ่อมค้าง, ใบขับขี่หมดอายุ, วันลาพักผ่อน, กฎความล้าสะสม 400 กม. (Fatigue Rule) และการตรวจสอบคิวซ้อนทับ ถูกเขียนซ้ำกันเกือบทั้งหมดใน 2 ไฟล์:
1. [`functions/api/queue/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/queue/%5B%5Bpath%5D%5D.js#L105-L201) (บรรทัด `105–201` ใน `POST /api/queue`)
2. [`functions/api/vehicle-requests/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/vehicle-requests/%5B%5Bpath%5D%5D.js#L344-L436) (บรรทัด `344–436` ใน `PUT /api/vehicle-requests/:id/approve`)

**แนวทางแก้ไข:** แยกฟังก์ชัน `validateDispatchConflicts(db, { carId, driverId, date, returnDate, timeStart, timeEnd, estimatedKm })` ไปไว้ที่ `functions/_lib/queue-validator.js` เพื่อให้ทั้งสอง Endpoint เรียกใช้แหล่งความจริงเดียว (Single Source of Truth)

### 1.3 ค่าคงที่และตัวเลขปริศนา (Hardcoded Personnel & Magic Numbers)
- [`frontend/vehicle-request.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/vehicle-request.html#L1337) (บรรทัด `1337`): ใช้ตัวเลข `/ 3` คำนวณระยะทางโดยประมาณจากงบค่าน้ำมัน (`Math.round(parseFloat(fuelCost) / 3)`) โดยไม่ดึงค่าเฉลี่ยอัตราสิ้นเปลืองจริง
- [`frontend/reports.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/reports.html#L1076-L1079) (บรรทัด `1076–1079`): ชื่อผู้จัดทำรายงาน หัวหน้างานยานพาหนะ เจ้าหน้าที่พัสดุ และผู้อำนวยการ ถูก Hardcode ไว้ หากมีการย้ายหรือเปลี่ยนตำแหน่งต้องแก้โค้ดใหม่ทั้งหมด ควรดึงจากตาราง `system_settings` พร้อมมีค่า Fallback

---

## 2. ด้านความปลอดภัย (OWASP Security Audit)

### 2.1 [CRITICAL] ช่องโหว่ยิง API อ่านเลขไมล์ด้วย AI โดยไม่จำกัดจำนวนครั้ง (Unauthenticated Quota Exhaustion)
- **จุดที่พบ:** [`functions/_middleware.js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/_middleware.js#L14) (บรรทัด `14` เปิด `/api/usage/ocr-odometer` เป็น `PUBLIC_PATHS`) และ [`functions/api/usage/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/usage/%5B%5Bpath%5D%5D.js#L128-L168) (บรรทัด `128–168`)
- **ความเสี่ยง:** Endpoint `/api/usage/ocr-odometer` เปิดให้เรียกใช้ได้โดยไม่ต้องเข้าสู่ระบบ และ **ไม่ได้อยู่ใน `RATE_LIMITS`** (บรรทัด `27–35` ของ `_middleware.js`) อีกทั้งไม่จำกัดขนาด Base64 Payload ผู้ไม่หวังดีสามารถเขียนสคริปต์ยิงภาพขนาดใหญ่เข้า Endpoint นี้รัวๆ เพื่อเผาโควตา `GEMINI_API_KEY` จนเต็มภายในไม่กี่นาที
- **วิธีแก้ไข:**
  1. เพิ่ม `'/api/usage/ocr-odometer': { max: 10, windowMs: 60 * 1000 }` ลงใน `RATE_LIMITS` ของ [`functions/_middleware.js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/_middleware.js#L27-L35)
  2. ตรวจสอบขนาด `body.base64.length <= 2_800_000` (ไม่เกิน ~2MB) ก่อนส่งต่อไปยัง Gemini API

### 2.2 [HIGH] ช่องโหว่ Stored DOM XSS จากการต่อ String HTML โดยไม่ Escape
- **จุดที่พบ:** [`frontend/vehicle-request.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/vehicle-request.html#L824-L835) (ฟังก์ชัน `renderRequestCard` บรรทัด `824–835`) และบรรทัด `1467–1478` (ฟังก์ชัน `printAdminRequest`)
- **ความเสี่ยง:** มีการนำค่าที่ผู้ใช้กรอก เช่น `r.destination`, `r.purpose`, `r.requester_name`, `r.requester_department`, `r.notes` ไปแทรกใน `.innerHTML` และ `printWin.document.write(...)` โดยตรง หากมีสคริปต์ฝังอยู่ในฟิลด์ดังกล่าว จะถูกรันในเบราว์เซอร์ของหัวหน้างานหรือแอดมินทันทีที่เปิดดูหรือพิมพ์ใบขอใช้รถ
- **วิธีแก้ไข:** สร้างฟังก์ชันกลาง `escapeHtml(str)` ใน `frontend/js/ui-helpers.js` และครอบข้อมูลจากผู้ใช้ทุกจุดก่อนแสดงผลใน HTML หรือหน้าสั่งพิมพ์

### 2.3 [MEDIUM] การแนบ Session Token ใน Query String และการเก็บใน `localStorage`
- **จุดที่พบ:** [`frontend/js/api.js`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/js/api.js#L4-L15) (บรรทัด `4–15`) และบรรทัด `92–98` (`getFileUrl`) รวมถึง [`functions/_middleware.js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/_middleware.js#L111-L113) (บรรทัด `111–113`)
- **ความเสี่ยง:** การแนบ `?token=...` ไปกับ URL รูปภาพ (`/api/files/...`) ทำให้ Session Token เสี่ยงรั่วไหลใน Browser History, Access Logs หรือ Referrer Header
- **วิธีแก้ไข (แบบไม่ทำให้ระบบเดิมพัง):** ใช้แนวทาง **Dual-Mode Auth** คือเพิ่มการตั้งค่าคุกกี้ `HttpOnly; Secure; SameSite=Lax` ควบคู่กับ `Authorization: Bearer` เดิม เพื่อให้เบราว์เซอร์ส่งคุกกี้ไปกับ `<img src="/api/files/...">` โดยอัตโนมัติโดยไม่ต้องแนบ `?token=` ใน URL

---

## 3. ด้านประสิทธิภาพฐานข้อมูลและ Backend (DBA & Latency Review)

### 3.1 จัดอันดับ 3 จุดที่ทำงานช้าและกินทรัพยากรสูงสุด (Top 3 Worst Queries / APIs)

#### อันดับ 1: N+1 Database Writes ใน `POST /api/vehicle-requests/bulk-approve` และลูปแจ้งเตือน
- **จุดที่พบ:**
  - [`functions/api/vehicle-requests/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/vehicle-requests/%5B%5Bpath%5D%5D.js#L291-L298) (บรรทัด `291–298`): วนลูป `for (const id of body.ids)` ยิง `await dbRun(UPDATE ...)` และ `await writeAuditLog(...)` ทีละรายการ (หากอนุมัติ 20 รายการ จะเกิด Network Round-trip ไปยัง D1 ถึง 40 ครั้งซ้อน)
  - [`functions/api/vehicle-requests/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/vehicle-requests/%5B%5Bpath%5D%5D.js#L182-L185) (บรรทัด `182–185`): วนลูป `for (const mgr of queueManagers)` ยิง `await createNotification(...)` ทีละคน
- **โค้ดที่ Optimize แล้ว (ใช้ `env.DB.batch()` รวบเป็น 1 Round-trip):**
```javascript
// แทนที่การวนลูป await dbRun ทีละรายการ ด้วย D1 Batch API
const stmts = [];
for (const id of body.ids) {
  stmts.push(
    env.DB.prepare(
      `UPDATE vehicle_requests SET signature_image = ?, updated_by = ?, updated_at = ?
       WHERE id = ? AND status = 'approved' AND signature_image IS NULL`
    ).bind(signatureImagePath, user.id, ts, id),
    env.DB.prepare(
      `INSERT INTO audit_log (id, user_id, username, action, module, entity_id, details, created_at)
       VALUES (?, ?, ?, 'bulk_approve_vehicle_request', 'vehicle_request', ?, ?, ?)`
    ).bind(generateUUID(), user.id, user.displayName, id, JSON.stringify({ signature_image: signatureImagePath }), ts)
  );
}
await env.DB.batch(stmts);
```

#### อันดับ 2: Correlated Subqueries $6 \times N$ ใน `GET /api/reports/vehicles` และ Sequential Queries ในรายงานน้ำมัน
- **จุดที่พบ:**
  - [`functions/api/reports/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/reports/%5B%5Bpath%5D%5D.js#L71-L82) (บรรทัด `71–82`): ใช้ Subquery 6 ตัวต่อรถ 1 คัน (`SELECT COUNT(*) FROM queue ...`, `SUM(fl.liters)`, `SUM(fl.amount)`, `AVG(fl.fuel_consumption_rate)`, `COUNT(*) FROM repair_log`, `SUM(...) FROM repair_log`)
  - [`functions/api/reports/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/reports/%5B%5Bpath%5D%5D.js#L103-L173) (บรรทัด `103–173`): ใน `GET /api/reports/fuel` รัน `await` เรียงต่อกัน 5 Queries (`rows`, `summary`, `bySource`, `byVehicle`, `byDriver`) ทั้งที่สามารถรันพร้อมกันด้วย `Promise.all()` ได้ทันที
- **SQL & โค้ดที่ Optimize แล้ว:**
```sql
-- เปลี่ยน Correlated Subqueries 6 ตัวต่อแถว เป็น Pre-aggregated CTEs ครั้งเดียว
WITH q_agg AS (
  SELECT car_id, COUNT(*) AS trip_count
  FROM queue WHERE status = 'completed' AND date >= ? AND date <= ?
  GROUP BY car_id
),
f_agg AS (
  SELECT car_id,
         COALESCE(SUM(liters), 0) AS total_fuel_liters,
         COALESCE(SUM(amount), 0) AS total_fuel_cost,
         AVG(CASE WHEN fuel_consumption_rate > 0 THEN fuel_consumption_rate END) AS avg_consumption
  FROM fuel_log WHERE deleted_at IS NULL AND date >= ? AND date <= ?
  GROUP BY car_id
),
r_agg AS (
  SELECT car_id,
         COUNT(*) AS repair_count,
         COALESCE(SUM(COALESCE(NULLIF(grand_total, 0), cost, 0)), 0) AS total_repair_cost
  FROM repair_log WHERE date_reported >= ? AND date_reported <= ?
  GROUP BY car_id
)
SELECT c.id, c.license_plate, c.brand, c.model, c.year, c.status, c.current_mileage, c.fuel_type,
       COALESCE(q.trip_count, 0) AS trip_count,
       COALESCE(f.total_fuel_liters, 0) AS total_fuel_liters,
       COALESCE(f.total_fuel_cost, 0) AS total_fuel_cost,
       f.avg_consumption,
       COALESCE(r.repair_count, 0) AS repair_count,
       COALESCE(r.total_repair_cost, 0) AS total_repair_cost
FROM cars c
LEFT JOIN q_agg q ON q.car_id = c.id
LEFT JOIN f_agg f ON f.car_id = c.id
LEFT JOIN r_agg r ON r.car_id = c.id
ORDER BY c.license_plate;
```

#### อันดับ 3: Sequential Queries 5 ตัวซ้อนใน `POST /api/vehicle-requests`
- **จุดที่พบ:** [`functions/api/vehicle-requests/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/vehicle-requests/%5B%5Bpath%5D%5D.js#L90-L130) (บรรทัด `90–130`)
- **ปัญหา:** ยิง `await dbFirst(...)` 5 ครั้งเรียงต่อกัน (`activeCarsCount`, `usedCarsCount`, `activeDriversCount`, `usedDriversCount`, `leaveDriversCount`) ทำให้เสียเวลา Latency สะสม 5 รอบก่อนจะบันทึกคำขอ
- **วิธีแก้ไข:** รวบทั้ง 5 คำสั่งเข้า `await Promise.all([...])` ลดเวลาตรวจสอบความพร้อมลงได้ ~75%

### 3.2 Indexes ที่ยังขาดหายไป (Missing High-Impact Indexes)
แม้จะมี `migrations/051` และ `052` แล้ว แต่จากการตรวจสอบ Query ที่ถูกเรียกใช้งานบ่อยที่สุด พบว่ายังขาด Composite Indexes สำคัญ 3 ตัว (เตรียมสร้างใน `migrations/057-add-remaining-hot-indexes.sql`):
```sql
-- 1. ใช้ใน _middleware.js บรรทัด 126 ทุกครั้งที่มีการเรียก API ที่ต้องยืนยันตัวตน
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires
  ON sessions(token, expires_at);

-- 2. ใช้ตรวจสอบวันลาของคนขับทุกครั้งที่ขอใช้รถ/จัดคิว (queue/[[path]].js บรรทัด 140, vehicle-requests บรรทัด 125 & 377)
CREATE INDEX IF NOT EXISTS idx_leaves_driver_status_dates
  ON leaves(driver_id, status, start_date, end_date);

-- 3. ใช้ตรวจสอบรายการแจ้งซ่อมค้างของรถทุกครั้งที่จัดคิว (queue/[[path]].js บรรทัด 115, vehicle-requests บรรทัด 354)
CREATE INDEX IF NOT EXISTS idx_repair_log_car_status_dates
  ON repair_log(car_id, status, date_reported, date_completed);
```

---

## 4. ด้านประสิทธิภาพ Frontend และ UX (Web Vitals & Rendering Review)

### 4.1 การล้างและสร้าง DOM ใหม่ทั้งตาราง (`.innerHTML` Thrashing)
- **จุดที่พบ:**
  - [`frontend/vehicle-request.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/vehicle-request.html#L815-L905): ฟังก์ชันแสดงรายการคำขอใช้รถเขียนทับ `container.innerHTML` ทั้งหมดทุกครั้งที่สลับแท็บหรือกรองข้อมูล
  - [`frontend/fuel-ledger.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/fuel-ledger.html#L750-L920) และ [`frontend/reports.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/reports.html): การกรองตารางจำนวนหลายร้อยแถวสร้าง HTML String ก้อนใหญ่แล้วสั่ง Re-layout ทั้งหน้า
- **วิธีแก้ไข:**
  1. เพิ่ม `debounce(fn, 200)` สำหรับช่องค้นหาและตัวกรองทั้งหมด เพื่อไม่ให้ตารางกระตุกขณะพิมพ์
  2. ใช้ `DocumentFragment` หรือแบ่งหน้าแสดงผล (Client-side Pagination / Windowing ทีละ 50 แถว) สำหรับตารางที่มีข้อมูลเกิน 100 รายการ

### 4.2 การโหลดไลบรารีขนาดใหญ่ขวางการแสดงผลหน้าแรก (Render-Blocking Scripts)
- **จุดที่พบ:** ใน [`frontend/reports.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/reports.html) และ [`frontend/fuel-ledger.html`](file:///d:/AI%20CURSER/ppk-drivehub/frontend/fuel-ledger.html) โหลดไลบรารีสร้างไฟล์ Word (`docx`), `Chart.js` หรือ `html2pdf` ตั้งแต่เปิดหน้าเว็บ ทั้งที่ผู้ใช้ส่วนใหญ่เปิดเข้ามาเพื่อดูตารางข้อมูลก่อน
- **วิธีแก้ไข:** โหลดไลบรารีส่งออกเอกสารแบบ Dynamic Lazy Load (`await loadScript(...)`) เฉพาะเมื่อผู้ใช้กดปุ่ม **"ส่งออก Word (.docx)"** หรือ **"ดาวน์โหลด PDF"** เท่านั้น

---

## 5. ด้านการประกันคุณภาพ ช่องโหว่ลอจิก และ Race Conditions (QA & Edge Cases Review)

### 5.1 [CRITICAL] Race Condition จัดคิวรถ/คนขับซ้ำซ้อนกัน (TOCTOU Double-Booking)
- **จุดที่พบ:**
  - [`functions/api/vehicle-requests/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/vehicle-requests/%5B%5Bpath%5D%5D.js#L412-L470) (`PUT /api/vehicle-requests/:id/approve` บรรทัด `412–470`)
  - [`functions/api/queue/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/queue/%5B%5Bpath%5D%5D.js#L176-L226) (`POST /api/queue` บรรทัด `176–226`)
- **สถานการณ์ที่ทำให้พัง:** यदिผู้จัดคิว 2 คนกดอนุมัติคำขอใช้รถ 2 ใบที่ขอรถคันเดียวกันในเวลาเดียวกัน (ห่างกันไม่กี่มิลลิวินาที) คำสั่ง `SELECT` ตรวจคิวซ้อน (บรรทัด `413`) ของทั้งคู่จะเห็นว่ารถว่างพร้อมกัน แล้วสั่ง `INSERT INTO queue` (บรรทัด `446`) สำเร็จทั้งคู่ ทำให้เกิดคิวซ้อนทับกันในฐานข้อมูลทันที
- **วิธีแก้ไข (Atomic Conditional Insert + Optimistic Status Lock):**
  1. ในการอนุมัติคำขอ ให้เปลี่ยน `UPDATE vehicle_requests` เป็นเงื่อนไข `WHERE id = ? AND status IN ('pending_executive', 'pending_supervisor')` และเช็ค `result.meta.changes === 1` เพื่อป้องกันการกดอนุมัติซ้ำ
  2. ใช้ `env.DB.batch()` รวบการอัปเดตสถานะคำขอและการสร้างคิวให้อยู่ใน Transaction เดียวกัน

### 5.2 [HIGH] Race Condition เลขที่คำขอ (`request_no`) และเลขที่ใบเบิกน้ำมัน (`document_number`) ชนกัน
- **จุดที่พบ:**
  - [`functions/api/vehicle-requests/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/vehicle-requests/%5B%5Bpath%5D%5D.js#L145-L153) (`SELECT MAX(request_no) ...` แล้วบวก 1 ใน JS)
  - [`functions/api/fuel/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/fuel/%5B%5Bpath%5D%5D.js#L98-L106) (`SELECT document_number ... ORDER BY document_number DESC LIMIT 1` แล้วบวก 1 ใน JS)
- **วิธีแก้ไข:** เพิ่มการทำ Retry (สูงสุด 3 ครั้ง) ร่วมกับตารางลำดับเลขเอกสาร (`document_sequences`) ที่อัปเดตแบบ Atomic (`INSERT ... ON CONFLICT DO UPDATE SET seq = seq + 1 RETURNING seq`)

### 5.3 [MEDIUM] ช่องโหว่การกรอกเลขไมล์ย้อนหลังในหน้าบันทึกการใช้รถผ่าน QR (`POST /api/usage/record`)
- **จุดที่พบ:** [`functions/api/usage/[[path]].js`](file:///d:/AI%20CURSER/ppk-drivehub/functions/api/usage/%5B%5Bpath%5D%5D.js#L177-L180) (บรรทัด `177–180`)
- **ปัญหา:** ตรวจสอบเพียง `body.mileage < 0` แต่ไม่ได้ตรวจสอบว่าเลขไมล์ต่ำกว่าเลขไมล์ปัจจุบันของรถ (`cars.current_mileage`) หรือสูงกระโดดผิดปกติ (เช่น กรอกเกิน 100,000 กม. ในเที่ยวเดียวจากอาการนิ้วเบิ้ล) ซึ่งต่างจาก `fuel/record` ที่มีการดักเลขไมล์ต่ำกว่าครั้งก่อนไว้แล้ว
- **วิธีแก้ไข:** ดึง `current_mileage` ของรถมาเปรียบเทียบ หากต่ำกว่าเลขไมล์ล่าสุด (เกินค่าคลาดเคลื่อนที่อนุญาต) หรือเพิ่มขึ้นเกิน `5,000 กม.` ต่อหนึ่งทริป ให้แจ้งเตือนผู้ใช้ให้ตรวจสอบก่อนบันทึก

---

## 6. คำสั่งเชิงสถาปัตยกรรมและแผนปฏิบัติการไร้ Downtime (Principal Staff Engineer Directives)

เพื่อป้องกันหายนะจากการรื้อระบบครั้งใหญ่ (**No Big Bang Rewrite**) การปรับปรุงทั้งหมดข้างต้น **ต้องปฏิบัติตามกฎเหล็ก 5 ข้อ** ดังต่อไปนี้:

### 6.1 กลยุทธ์การย้ายระบบทีละส่วน (Strangler Fig Pattern & Incremental PRs)
- **ห้ามแก้ไฟล์เกิน 3–5 ไฟล์ต่อ 1 Commit/PR:** แยกการแก้ไขออกเป็นส่วนย่อยที่ทดสอบและ Deploy แยกกันได้อย่างอิสระ
- **แยกโมดูลแบบค่อยเป็นค่อยไป:** เมื่อแยกโค้ดออกจาก `reports.html` หรือ `vehicle-request.html` ให้แยกเฉพาะส่วน (เช่น แยก `frontend/js/ui-helpers.js` หรือ `functions/_lib/queue-validator.js`) โดยคงชื่อฟังก์ชันและ API Response Schema เดิมไว้ 100% (Backward Compatible)

### 6.2 แผนหนีตายและปุ่มย้อนกลับ (1-Minute Rollback Plan)
ทุกเฟสต้องสามารถกู้คืนระบบกลับสู่สถานะปกติได้ภายใน **ไม่เกิน 2 นาที** หากพบปัญหาบน Production:
1. **การสำรองฐานข้อมูลก่อนรัน Migration ทุกครั้ง:**
   ```powershell
   npx wrangler d1 export ppk-drivehub-db --remote --output="backups/backup-$(Get-Date -Format 'yyyyMMdd-HHmm').sql"
   ```
2. **การย้อนกลับโค้ด (Application Rollback):**
   - ใช้คำสั่ง `npx wrangler pages deployment rollback` หรือ `git revert <commit-sha> && git push` เพื่อสลับกลับไปใช้ Deployment ก่อนหน้าได้ทันที
3. **การย้อนกลับฐานข้อมูล (Database Rollback):**
   - ในการเพิ่ม Index ใช้ `CREATE INDEX IF NOT EXISTS` ซึ่งไม่กระทบโค้ดเก่า หากต้องการยกเลิกสามารถรัน `DROP INDEX IF EXISTS <index_name>;` ได้ทันทีโดยข้อมูลไม่สูญหาย

### 6.3 การรักษาความถูกต้องของข้อมูล (Expand-Migrate-Contract Pattern)
- **ห้ามใช้คำสั่ง `DROP COLUMN`, `RENAME COLUMN` หรือเปลี่ยนโครงสร้างตารางแบบทำลายของเดิมโดยตรง**
- หากต้องเปลี่ยนวิธีเก็บข้อมูลหรือเปลี่ยนระบบ Auth:
  1. **Expand:** เพิ่มคอลัมน์/ตารางใหม่ หรือรองรับทั้ง `Cookie` และ `Bearer Token` ควบคู่กัน (Dual-Mode)
  2. **Migrate:** ย้ายข้อมูลเก่าหรืออัปเดตฝั่ง Client ให้ใช้ของใหม่จนครบ 100%
  3. **Contract:** เมื่อพิสูจน์แล้วว่าระบบนิ่งอย่างน้อย 2 สัปดาห์ จึงค่อยปลดโค้ดเก่าออก

### 6.4 กลยุทธ์การทดสอบเพื่อยืนยันผล 100% (Verification & QA Gates)
ก่อนจะถือว่าแต่ละเฟสเสร็จสมบูรณ์ ต้องผ่านการตรวจสอบดังนี้:
- **Syntax & Runtime Check:** รัน `node --check` กับไฟล์ `.js` ทุกไฟล์ที่แก้ไข
- **Golden Master Check สำหรับเอกสารราชการ:** ทดสอบกดสร้างไฟล์ Word (`.docx`) และหน้าสั่งพิมพ์ (`Print Preview`) ใน `reports.html`, `fuel-ledger.html`, และ `vehicle-request.html` เทียบกับต้นฉบับเดิม เพื่อให้มั่นใจว่าแบบฟอร์มราชการไม่เพี้ยนแม้แต่บรรทัดเดียว
- **Concurrency & Security Check:** ทดสอบยิง API พร้อมกันเพื่อยืนยันว่า Rate Limit และระบบป้องกันคิวซ้อนทำงานถูกต้อง

---

## 7. ตารางแผนการดำเนินงานแบ่งตามระยะ (Phased Execution Roadmap)

| เฟส (Phase) | ขอบเขตงาน (Scope) | ระดับความเสี่ยง | วิธี Rollback หากเกิดปัญหา |
| :--- | :--- | :---: | :--- |
| **Phase 0 (เสร็จสิ้น)** | สแกนและยืนยันจุดเกิดปัญหาจากซอร์สโค้ดจริงทั้งหมด พร้อมจัดทำแผนสถาปัตยกรรม | 🟢 ไม่มี | ไม่มีการเปลี่ยนโค้ดการทำงาน |
| **Phase 1: Quick Wins (Security & DB Indexes)** | 1. เพิ่ม Rate Limit และจำกัดขนาดรูปให้ `/api/usage/ocr-odometer`<br>2. สร้าง Migration `057` เพิ่ม 3 Composite Indexes ที่ขาดหาย<br>3. ป้องกัน DOM XSS ด้วย `escapeHtml()` ใน `vehicle-request.html` | 🟢 ต่ำมาก | `DROP INDEX` / `git revert` |
| **Phase 2: Backend Latency & Atomic Queue** | 1. เปลี่ยน N+1 ใน `bulk-approve` และลูปแจ้งเตือนให้ใช้ `env.DB.batch()`<br>2. เปลี่ยน Sequential Queries ใน `POST /api/vehicle-requests` และ `GET /api/reports/fuel` เป็น `Promise.all()`<br>3. ปรับ `GET /api/reports/vehicles` ให้ใช้ CTE แทน Correlated Subqueries<br>4. ป้องกัน Race Condition ตอนอนุมัติคิวด้วย Optimistic Status Check + `env.DB.batch()` | 🟡 ปานกลาง | `git revert` (เนื่องจากไม่เปลี่ยน Schema ตารางหลัก) |
| **Phase 3: Shared Domain Validator & Settings** | 1. แยก `functions/_lib/queue-validator.js` ลดโค้ดซ้ำซ้อนระหว่าง `queue` และ `vehicle-requests`<br>2. ดึงรายชื่อผู้ลงนามใน `reports.html` จาก `system_settings` (โดยมีค่า Hardcode เดิมเป็น Fallback) | 🟢 ต่ำ | Fallback ทำงานอัตโนมัติ / `git revert` |
| **Phase 4: Frontend Modularization & Lazy Loading** | 1. เพิ่ม `debounce` ในช่องค้นหาตาราง<br>2. ทำ Dynamic Lazy Load สำหรับไลบรารีส่งออกรายงาน (`docx` / `html2pdf`)<br>3. ค่อยๆ แยกโมดูลสร้างเอกสารออกจาก `reports.html` และ `fuel-ledger.html` ทีละส่วน | 🟡 ปานกลาง | Feature Flag / `git revert` |
