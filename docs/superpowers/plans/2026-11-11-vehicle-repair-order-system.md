# PPK DriveHub: Vehicle Repair Order & Print System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PPK DriveHub to generate, manage, and print official Vehicle Repair Orders / Work Orders (ใบส่งซ่อม / ใบขอตรวจสภาพและเสนอราคา) for dispatching vehicles to service centers and repair shops, complete with auto-generated work order numbers, fuel level & mileage handover tracking, organization terms, and a print-ready A4 document view.

**Architecture:** Extend Cloudflare D1 schema with repair order fields (`fuel_level`, `estimated_completion_date`, `garage_phone`, `garage_contact_person`); update Workers API `functions/api/repair/[[path]].js` with auto-generation of `work_order_number` (format `WO-YYYYMM-XXXX`); build a print-optimized page `frontend/print-repair-order.html`; integrate "พิมพ์ใบส่งซ่อม" action buttons into `frontend/repair.html` and driver repair flows; verify with Playwright E2E tests.

**Tech Stack:** Cloudflare Pages Functions (D1 SQLite, JavaScript ES Modules), HTML5 / CSS3 Print Stylesheet (@media print), Vanilla JavaScript, Playwright E2E.

## Global Constraints
- Every change must follow the repository rule: `git add .`, `git commit -m "..."`, and `git push`.
- Preserve backward compatibility with existing `repair_log` and `repair_items` records.
- The printable document must fit standard A4 paper cleanly (no unwanted page breaks, no browser headers/footers in print preview).
- All permissions must respect existing RBAC (`driver`, `repair`, `admin`).

---

### Task 1: Database Migration for Repair Order Fields

**Files:**
- Create: `migrations/056-add-repair-order-fields.sql`
- Modify: `migrations/schema.sql`

**Interfaces:**
- Produces:
  - `repair_log.fuel_level TEXT` (e.g. '1/4', '1/2', '3/4', 'full')
  - `repair_log.estimated_completion_date TEXT` (YYYY-MM-DD)
  - `repair_log.garage_contact_person TEXT` (ชื่อ SA หรือผู้ประสานงานอู่)
  - `repair_log.garage_phone TEXT` (เบอร์โทรติดต่ออู่)

- [ ] **Step 1: Create migration script `migrations/056-add-repair-order-fields.sql`**
```sql
-- Migration 056: Add repair order & handover fields to repair_log
ALTER TABLE repair_log ADD COLUMN fuel_level TEXT DEFAULT '1/2';
ALTER TABLE repair_log ADD COLUMN estimated_completion_date TEXT;
ALTER TABLE repair_log ADD COLUMN garage_contact_person TEXT;
ALTER TABLE repair_log ADD COLUMN garage_phone TEXT;
```

- [ ] **Step 2: Update base schema `migrations/schema.sql`**
Add the new columns to the `repair_log` table definition.

- [ ] **Step 3: Commit and push**
```bash
git add migrations/056-add-repair-order-fields.sql migrations/schema.sql
git commit -m "feat(db): add repair order fields to repair_log"
git push
```

---

### Task 2: Backend API Enhancements for Work Order Number & Order Details

**Files:**
- Modify: `functions/api/repair/[[path]].js`
- Test: `tests/e2e/repair-order.spec.mjs`

**Interfaces:**
- Consumes: `POST /api/repair/log`, `PUT /api/repair/log/:id`, `GET /api/repair/log/:id`
- Produces:
  - Auto-generated `work_order_number` (`WO-YYYYMM-XXXX`) if not provided
  - Supports `fuel_level`, `estimated_completion_date`, `garage_contact_person`, `garage_phone`
  - Enriched `GET /api/repair/log/:id` including vehicle metadata (chassis_number, engine_number, color) and organization contact details

- [ ] **Step 1: Write helper function for sequential Work Order Number generation**
In `functions/api/repair/[[path]].js`, implement:
```javascript
async function generateWorkOrderNumber(db) {
  const nowStr = new Date().toISOString();
  const ym = nowStr.substring(0, 7).replace('-', ''); // e.g. 202611
  const prefix = `WO-${ym}-`;
  const latest = await dbFirst(db,
    `SELECT work_order_number FROM repair_log WHERE work_order_number LIKE ? ORDER BY work_order_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let nextSeq = 1;
  if (latest?.work_order_number) {
    const parts = latest.work_order_number.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) nextSeq = lastNum + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
```

- [ ] **Step 2: Update `POST /api/repair/log` and `PUT /api/repair/log/:id`**
- If `work_order_number` is empty, auto-populate using `generateWorkOrderNumber(env.DB)`.
- Save `fuel_level`, `estimated_completion_date`, `garage_contact_person`, `garage_phone`.

- [ ] **Step 3: Enhance `GET /api/repair/log/:id` query**
Join `cars` table to include `chassis_number`, `engine_number`, `color`, `seat_count`, `fuel_type`, and `province` for complete vehicle profile on the print document.

- [ ] **Step 4: Commit and push**
```bash
git add functions/api/repair/[[path]].js
git commit -m "feat(api): auto-generate work order number and support repair order fields"
git push
```

---

### Task 3: Create Printable Repair Order Document (`frontend/print-repair-order.html`)

**Files:**
- Create: `frontend/print-repair-order.html`
- Modify: `frontend/common.css` (if shared print helpers needed)

**Interfaces:**
- Consumes: `GET /api/repair/log/:id`
- Displays:
  1. Header with organization logo and title "ใบส่งรถเข้าซ่อมบำรุง / ใบขอตรวจสภาพและเสนอราคา"
  2. Document Reference: Work Order Number, Date Issued, Status
  3. Vehicle Profile Table: Plate, Brand/Model, Mileage In, Fuel Level, Chassis/Engine No
  4. Garage / Service Center Info: Name, Contact Person, Phone, Address
  5. Work Scope & Symptoms Table: Items list with checkboxes and descriptions
  6. Terms & Policies: 4 standard conditions (Quotation approval, Old parts return, Tax invoice details, Warranty)
  7. Handover & Acceptance Signatures:
     - Left: Approver (หัวหน้างาน/ผู้มีอำนาจ)
     - Middle-Left: Driver (ผู้นำส่งรถ)
     - Middle-Right: Garage Receiver (ผู้รับรถของอู่/ศูนย์)
     - Right: Receiver upon completion (ผู้ตรวจรับรถเมื่อซ่อมเสร็จ)
  8. Print buttons & automated print trigger on URL param `?autoprint=1`.

- [ ] **Step 1: Create HTML structure and embedded A4 print CSS**
Ensure `@page { size: A4 portrait; margin: 12mm 15mm; }` with clear borders, legible fonts (Sarabun / Inter), and no overflow.

- [ ] **Step 2: Add client-side script to fetch and bind repair data**
Fetch from `${CONFIG.API_BASE_URL}/repair/log/${repairId}` with bearer token, format dates to Thai Buddhist era (`วว/ดด/ปปปป`), render itemized list or issues.

- [ ] **Step 3: Commit and push**
```bash
git add frontend/print-repair-order.html
git commit -m "feat(ui): add A4 printable repair order template"
git push
```

---

### Task 4: Integrate Repair Order Generation & Print Button into UI

**Files:**
- Modify: `frontend/repair.html`
- Modify: `frontend/repair-inspection.html` (if applicable)

**Interfaces:**
- Adds:
  - "พิมพ์ใบส่งซ่อม (A4)" button with print icon (`fa-solid fa-print`) on repair card action bars and history rows.
  - New input fields in the "แจ้งซ่อม / แก้ไขข้อมูลซ่อม" modal:
    - ระดับน้ำมัน ณ วันส่งมอบ (Fuel level dropdown: E, 1/4, 1/2, 3/4, เต็มถัง)
    - วันที่คาดว่าจะแล้วเสร็จ (Date picker)
    - เบอร์โทรศัพท์อู่ / ผู้ประสานงาน (Text inputs)

- [ ] **Step 1: Add new input fields to Repair Modal in `frontend/repair.html`**
- [ ] **Step 2: Add "พิมพ์ใบส่งซ่อม" action button to repair cards and modal**
Call `window.open('print-repair-order.html?id=' + encodeURIComponent(repairId), '_blank')`.
- [ ] **Step 3: Test UI interactivity in browser**
- [ ] **Step 4: Commit and push**
```bash
git add frontend/repair.html
git commit -m "feat(ui): integrate print repair order button and handover inputs"
git push
```

---

### Task 5: End-to-End Automated Verification

**Files:**
- Create: `tests/e2e/repair-order.spec.mjs`

- [ ] **Step 1: Write E2E test script**
- Verify login as admin/repair officer.
- Submit a new repair request with items and fuel level.
- Confirm `work_order_number` is generated.
- Navigate to `print-repair-order.html?id=...` and verify document contains plate number, garage name, symptoms, and terms.
- [ ] **Step 2: Run test using Playwright**
```bash
npx playwright test tests/e2e/repair-order.spec.mjs
```
- [ ] **Step 3: Commit and push**
```bash
git add tests/e2e/repair-order.spec.mjs
git commit -m "test(e2e): verify repair order generation and printing"
git push
```
