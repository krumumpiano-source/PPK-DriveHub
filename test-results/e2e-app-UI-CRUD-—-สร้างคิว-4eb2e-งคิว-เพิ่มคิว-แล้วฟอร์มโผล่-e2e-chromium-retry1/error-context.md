# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> UI CRUD — สร้างคิว (Queue) >> กดปุ่ม "จองคิว" / "เพิ่มคิว" แล้วฟอร์มโผล่
- Location: tests\e2e\app.spec.mjs:644:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("จองคิว"), button:has-text("เพิ่มคิว"), button:has-text("Add"), [data-action="add"], #addQueueBtn, .btn-add-queue').first()
    - locator resolved to <button class="btn btn-success" onclick="openCreateModal()">➕ เพิ่มคิว</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "🚐 PPK DriveHub ระบบจัดการยานพาหนะ" [ref=e3] [cursor=pointer]:
      - /url: dashboard.html
      - generic [ref=e4]: 🚐
      - generic [ref=e5]:
        - generic [ref=e6]: PPK DriveHub
        - generic [ref=e7]: ระบบจัดการยานพาหนะ
    - generic [ref=e8]:
      - generic [ref=e9]: T
      - generic [ref=e10]:
        - generic [ref=e11]: testadmin
        - generic [ref=e12]: ผู้ดูแลสูงสุด
    - navigation [ref=e13]:
      - link "🏠 หน้าแรก" [ref=e14] [cursor=pointer]:
        - /url: dashboard.html
        - generic [ref=e15]: 🏠
        - generic [ref=e16]: หน้าแรก
      - link "📝 ขอใช้รถ" [ref=e17] [cursor=pointer]:
        - /url: vehicle-request.html?v=2
        - generic [ref=e18]: 📝
        - generic [ref=e19]: ขอใช้รถ
      - generic [ref=e20]:
        - generic [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: 📅
          - generic [ref=e23]: คิวและการใช้รถ
          - generic [ref=e24]: ▼
        - generic:
          - link "📅 จัดการคิวรถ" [ref=e25] [cursor=pointer]:
            - /url: queue-manage.html
            - generic [ref=e26]: 📅
            - generic [ref=e27]: จัดการคิวรถ
          - link "📝 บันทึกการใช้รถ" [ref=e28] [cursor=pointer]:
            - /url: usage-log.html
            - generic [ref=e29]: 📝
            - generic [ref=e30]: บันทึกการใช้รถ
          - link "📋 คิวและประวัติส่วนตัว" [ref=e31] [cursor=pointer]:
            - /url: driver-history.html
            - generic [ref=e32]: 📋
            - generic [ref=e33]: คิวและประวัติส่วนตัว
          - link "📱 สแกน QR Code" [ref=e34] [cursor=pointer]:
            - /url: qr-scan.html
            - generic [ref=e35]: 📱
            - generic [ref=e36]: สแกน QR Code
      - generic [ref=e37]:
        - generic [ref=e38] [cursor=pointer]:
          - generic [ref=e39]: ⛽
          - generic [ref=e40]: ระบบน้ำมัน
          - generic [ref=e41]: ▼
        - generic:
          - link "⛽ บันทึกเติมน้ำมัน" [ref=e42] [cursor=pointer]:
            - /url: fuel-record.html
            - generic [ref=e43]: ⛽
            - generic [ref=e44]: บันทึกเติมน้ำมัน
          - link "📄 เปรียบเทียบบิลน้ำมัน" [ref=e45] [cursor=pointer]:
            - /url: fuel-reconcile.html
            - generic [ref=e46]: 📄
            - generic [ref=e47]: เปรียบเทียบบิลน้ำมัน
          - link "📒 ทะเบียนควบคุมน้ำมัน" [ref=e48] [cursor=pointer]:
            - /url: fuel-ledger.html
            - generic [ref=e49]: 📒
            - generic [ref=e50]: ทะเบียนควบคุมน้ำมัน
      - generic [ref=e51]:
        - generic [ref=e52] [cursor=pointer]:
          - generic [ref=e53]: 🔧
          - generic [ref=e54]: ระบบซ่อมและตรวจสภาพ
          - generic [ref=e55]: ▼
        - generic:
          - link "🔧 งานซ่อม" [ref=e56] [cursor=pointer]:
            - /url: repair.html
            - generic [ref=e57]: 🔧
            - generic [ref=e58]: งานซ่อม
          - link "📋 ประวัติซ่อม" [ref=e59] [cursor=pointer]:
            - /url: repair-history.html
            - generic [ref=e60]: 📋
            - generic [ref=e61]: ประวัติซ่อม
          - link "🔔 แจ้งเตือนครบกำหนด" [ref=e62] [cursor=pointer]:
            - /url: maintenance-alerts.html
            - generic [ref=e63]: 🔔
            - generic [ref=e64]: แจ้งเตือนครบกำหนด
          - link "🔍 ตรวจสภาพ" [ref=e65] [cursor=pointer]:
            - /url: repair-inspection.html
            - generic [ref=e66]: 🔍
            - generic [ref=e67]: ตรวจสภาพ
          - link "🚨 รายงานเหตุการณ์" [ref=e68] [cursor=pointer]:
            - /url: incident.html
            - generic [ref=e69]: 🚨
            - generic [ref=e70]: รายงานเหตุการณ์
      - generic [ref=e71]:
        - generic [ref=e72] [cursor=pointer]:
          - generic [ref=e73]: ⭐
          - generic [ref=e74]: ระบบประเมิน
          - generic [ref=e75]: ▼
        - generic:
          - link "📖 เกณฑ์และคำอธิบาย" [ref=e76] [cursor=pointer]:
            - /url: evaluation-guide.html
            - generic [ref=e77]: 📖
            - generic [ref=e78]: เกณฑ์และคำอธิบาย
          - link "📝 ประเมินโดยผู้ใช้บริการ" [ref=e79] [cursor=pointer]:
            - /url: evaluate-trip.html
            - generic [ref=e80]: 📝
            - generic [ref=e81]: ประเมินโดยผู้ใช้บริการ
          - link "⚖️ ประเมินโดยกรรมการ/สถิติ" [ref=e82] [cursor=pointer]:
            - /url: driver-performance.html
            - generic [ref=e83]: ⚖️
            - generic [ref=e84]: ประเมินโดยกรรมการ/สถิติ
          - link "📑 สรุปผลประเมินเสนอ ผอ." [ref=e85] [cursor=pointer]:
            - /url: print-executive-summary.html
            - generic [ref=e86]: 📑
            - generic [ref=e87]: สรุปผลประเมินเสนอ ผอ.
      - generic [ref=e88]:
        - generic [ref=e89] [cursor=pointer]:
          - generic [ref=e90]: 📊
          - generic [ref=e91]: รายงานและสถิติ
          - generic [ref=e92]: ▼
        - generic:
          - link "📊 รายงานและสถิติ" [ref=e93] [cursor=pointer]:
            - /url: reports.html
            - generic [ref=e94]: 📊
            - generic [ref=e95]: รายงานและสถิติ
          - link "🏆 ผลงานพนักงาน" [ref=e96] [cursor=pointer]:
            - /url: driver-performance.html
            - generic [ref=e97]: 🏆
            - generic [ref=e98]: ผลงานพนักงาน
          - link "📑 สรุปประเมิน (ผอ.)" [ref=e99] [cursor=pointer]:
            - /url: print-executive-summary.html
            - generic [ref=e100]: 📑
            - generic [ref=e101]: สรุปประเมิน (ผอ.)
          - link "🚗 ไทม์ไลน์รถ" [ref=e102] [cursor=pointer]:
            - /url: vehicle-timeline.html
            - generic [ref=e103]: 🚗
            - generic [ref=e104]: ไทม์ไลน์รถ
          - link "📈 Dashboard ผู้บริหาร" [ref=e105] [cursor=pointer]:
            - /url: executive-dashboard.html
            - generic [ref=e106]: 📈
            - generic [ref=e107]: Dashboard ผู้บริหาร
          - link "📋 ข้อมูลรถและพนักงาน" [ref=e108] [cursor=pointer]:
            - /url: basic-info.html
            - generic [ref=e109]: 📋
            - generic [ref=e110]: ข้อมูลรถและพนักงาน
      - generic [ref=e111]:
        - generic [ref=e112] [cursor=pointer]:
          - generic [ref=e113]: 👤
          - generic [ref=e114]: ตั้งค่าส่วนตัว
          - generic [ref=e115]: ▼
        - generic:
          - link "👤 โปรไฟล์ของฉัน" [ref=e116] [cursor=pointer]:
            - /url: profile.html
            - generic [ref=e117]: 👤
            - generic [ref=e118]: โปรไฟล์ของฉัน
          - link "🔔 การแจ้งเตือน" [ref=e119] [cursor=pointer]:
            - /url: notifications.html
            - generic [ref=e120]: 🔔
            - generic [ref=e121]: การแจ้งเตือน
          - link "🔑 เปลี่ยนรหัสผ่าน" [ref=e122] [cursor=pointer]:
            - /url: change-password.html
            - generic [ref=e123]: 🔑
            - generic [ref=e124]: เปลี่ยนรหัสผ่าน
      - generic [ref=e125]:
        - generic [ref=e126] [cursor=pointer]:
          - generic [ref=e127]: 🛡️
          - generic [ref=e128]: ผู้ดูแลระบบ
          - generic [ref=e129]: ▼
        - generic:
          - generic [ref=e130]: ยานพาหนะ
          - link "🚙 จัดการข้อมูลรถ" [ref=e131] [cursor=pointer]:
            - /url: vehicles.html
            - generic [ref=e132]: 🚙
            - generic [ref=e133]: จัดการข้อมูลรถ
          - link "👷 จัดการพนักงานขับรถ" [ref=e134] [cursor=pointer]:
            - /url: drivers.html
            - generic [ref=e135]: 👷
            - generic [ref=e136]: จัดการพนักงานขับรถ
          - link "📄 ภาษี/ประกัน/ตรอ." [ref=e137] [cursor=pointer]:
            - /url: tax-insurance.html
            - generic [ref=e138]: 📄
            - generic [ref=e139]: ภาษี/ประกัน/ตรอ.
          - link "📱 จัดการ QR Code" [ref=e140] [cursor=pointer]:
            - /url: qr-manage.html
            - generic [ref=e141]: 📱
            - generic [ref=e142]: จัดการ QR Code
          - generic [ref=e143]: ผู้ใช้งาน
          - link "👥 จัดการผู้ใช้" [ref=e144] [cursor=pointer]:
            - /url: user-management.html
            - generic [ref=e145]: 👥
            - generic [ref=e146]: จัดการผู้ใช้
          - generic [ref=e147]: ระบบ
          - link "⚙️ ตั้งค่าระบบ" [ref=e148] [cursor=pointer]:
            - /url: admin-settings.html
            - generic [ref=e149]: ⚙️
            - generic [ref=e150]: ตั้งค่าระบบ
          - link "🔧 แก้ไขเลขไมล์" [ref=e151] [cursor=pointer]:
            - /url: mileage-correction.html
            - generic [ref=e152]: 🔧
            - generic [ref=e153]: แก้ไขเลขไมล์
          - link "📜 บันทึกกิจกรรม" [ref=e154] [cursor=pointer]:
            - /url: audit-log.html
            - generic [ref=e155]: 📜
            - generic [ref=e156]: บันทึกกิจกรรม
          - link "💾 สำรอง/กู้คืน" [ref=e157] [cursor=pointer]:
            - /url: backup-recovery.html
            - generic [ref=e158]: 💾
            - generic [ref=e159]: สำรอง/กู้คืน
      - generic [ref=e161]: ดูมุมมองตามบทบาท
      - generic [ref=e162]:
        - button "🛡️ ผู้ดูแลระบบ" [ref=e163] [cursor=pointer]:
          - generic [ref=e164]: 🛡️
          - text: ผู้ดูแลระบบ
        - button "📋 ผู้จัดการ" [ref=e165] [cursor=pointer]:
          - generic [ref=e166]: 📋
          - text: ผู้จัดการ
        - button "🚗 พนักงานขับรถ" [ref=e167] [cursor=pointer]:
          - generic [ref=e168]: 🚗
          - text: พนักงานขับรถ
        - button "📝 ผู้ขอใช้รถ" [ref=e169] [cursor=pointer]:
          - generic [ref=e170]: 📝
          - text: ผู้ขอใช้รถ
      - generic [ref=e171]:
        - generic [ref=e172] [cursor=pointer]:
          - generic [ref=e173]: ❓
          - generic [ref=e174]: ช่วยเหลือ
          - generic [ref=e175]: ▼
        - generic:
          - link "📖 วิธีใช้งาน" [ref=e176] [cursor=pointer]:
            - /url: user-guide.html
            - generic [ref=e177]: 📖
            - generic [ref=e178]: วิธีใช้งาน
          - link "📚 อภิธานศัพท์" [ref=e179] [cursor=pointer]:
            - /url: glossary.html
            - generic [ref=e180]: 📚
            - generic [ref=e181]: อภิธานศัพท์
      - link "🚪 ออกจากระบบ" [ref=e183] [cursor=pointer]:
        - /url: "#"
        - generic [ref=e184]: 🚪
        - generic [ref=e185]: ออกจากระบบ
  - generic [ref=e186]:
    - generic [ref=e187]:
      - generic [ref=e188]: ✏️ จัดคิว
      - generic [ref=e190]: T
    - generic [ref=e191]:
      - generic [ref=e192]:
        - heading "✏️ จัดคิว" [level=1] [ref=e193]
        - paragraph [ref=e194]: ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
      - generic [ref=e195]:
        - generic [ref=e196]:
          - button "📅 ปฏิทินคิวรถ" [ref=e197] [cursor=pointer]
          - button "📊 ตารางการใช้รถ (Gantt)" [ref=e198] [cursor=pointer]
        - generic [ref=e199]:
          - generic [ref=e200]:
            - generic [ref=e201]:
              - button "‹ เดือนก่อน" [ref=e202] [cursor=pointer]
              - button "วันนี้" [ref=e203] [cursor=pointer]
              - button "เดือนถัดไป ›" [ref=e204] [cursor=pointer]
            - generic [ref=e205]: กันยายน 2569
            - generic [ref=e206]:
              - button "➕ เพิ่มคิว" [ref=e207] [cursor=pointer]
              - button "🔄 รีเฟรช" [ref=e208] [cursor=pointer]
          - generic [ref=e209]:
            - generic [ref=e212]: คิวที่ผ่านมาแล้ว
            - generic [ref=e215]: คิวที่ใกล้จะถึง
            - generic [ref=e218]: คิวปัจจุบัน
            - generic [ref=e221]: คิวในอนาคต
          - generic [ref=e223]:
            - generic [ref=e224]: อา
            - generic [ref=e225]: จ
            - generic [ref=e226]: อ
            - generic [ref=e227]: พ
            - generic [ref=e228]: พฤ
            - generic [ref=e229]: ศ
            - generic [ref=e230]: ส
            - generic [ref=e232] [cursor=pointer]: "30"
            - generic [ref=e234] [cursor=pointer]: "31"
            - generic [ref=e236] [cursor=pointer]: "1"
            - generic [ref=e238] [cursor=pointer]: "2"
            - generic [ref=e240] [cursor=pointer]: "3"
            - generic [ref=e242] [cursor=pointer]: "4"
            - generic [ref=e244] [cursor=pointer]: "5"
            - generic [ref=e246] [cursor=pointer]: "6"
            - generic [ref=e248] [cursor=pointer]: "7"
            - generic [ref=e250] [cursor=pointer]: "8"
            - generic [ref=e252] [cursor=pointer]: "9"
            - generic [ref=e254] [cursor=pointer]: "10"
            - generic [ref=e256] [cursor=pointer]: "11"
            - generic [ref=e258] [cursor=pointer]: "12"
            - generic [ref=e260] [cursor=pointer]: "13"
            - generic [ref=e262] [cursor=pointer]: "14"
            - generic [ref=e264] [cursor=pointer]: "15"
            - generic [ref=e266] [cursor=pointer]: "16"
            - generic [ref=e268] [cursor=pointer]: "17"
            - generic [ref=e270] [cursor=pointer]: "18"
            - generic [ref=e272] [cursor=pointer]: "19"
            - generic [ref=e274] [cursor=pointer]: "20"
            - generic [ref=e276] [cursor=pointer]: "21"
            - generic [ref=e278] [cursor=pointer]: "22"
            - generic [ref=e280] [cursor=pointer]: "23"
            - generic [ref=e282] [cursor=pointer]: "24"
            - generic [ref=e284] [cursor=pointer]: "25"
            - generic [ref=e286] [cursor=pointer]: "26"
            - generic [ref=e288] [cursor=pointer]: "27"
            - generic [ref=e290] [cursor=pointer]: "28"
            - generic [ref=e292] [cursor=pointer]: "29"
            - generic [ref=e294] [cursor=pointer]: "30"
      - paragraph [ref=e296]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
  552 | // ════════════════════════════════════════════
  553 | // 18g. หน้า Driver Performance & History
  554 | // ════════════════════════════════════════════
  555 | test.describe('หน้า Driver Performance & History', () => {
  556 |   test.beforeEach(async ({ page }) => {
  557 |     await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  558 |     await loginAsAdmin(page);
  559 |   });
  560 | 
  561 |   test('โหลดหน้า Driver Performance สำเร็จ', async ({ page }) => {
  562 |     await page.goto('/driver-performance.html', { waitUntil: 'domcontentloaded' });
  563 |     await expect(page).toHaveTitle(/Performance|ประสิทธิภาพ|PPK DriveHub/);
  564 |   });
  565 | 
  566 |   test('โหลดหน้า Driver History สำเร็จ', async ({ page }) => {
  567 |     await page.goto('/driver-history.html');
  568 |     await page.waitForLoadState('networkidle');
  569 |     await expect(page).toHaveTitle(/History|ประวัติ|PPK DriveHub/);
  570 |   });
  571 | });
  572 | 
  573 | // ════════════════════════════════════════════
  574 | // 18h. หน้า Fuel Reconcile & QR Manage
  575 | // ════════════════════════════════════════════
  576 | test.describe('หน้า Fuel Reconcile & QR Manage', () => {
  577 |   test.beforeEach(async ({ page }) => {
  578 |     await loginAsAdmin(page);
  579 |   });
  580 | 
  581 |   test('โหลดหน้า Fuel Reconcile สำเร็จ', async ({ page }) => {
  582 |     await page.goto('/fuel-reconcile.html');
  583 |     await page.waitForLoadState('networkidle');
  584 |     await expect(page).toHaveTitle(/Reconcile|กระทบยอด|PPK DriveHub/);
  585 |   });
  586 | 
  587 |   test('โหลดหน้า QR Manage สำเร็จ', async ({ page }) => {
  588 |     await page.goto('/qr-manage.html');
  589 |     await page.waitForLoadState('networkidle');
  590 |     await expect(page).toHaveTitle(/QR|PP/);
  591 |   });
  592 | });
  593 | 
  594 | // ════════════════════════════════════════════
  595 | // 18i. หน้า Basic Info / Setup
  596 | // ════════════════════════════════════════════
  597 | test.describe('หน้า Basic Info', () => {
  598 |   test.beforeEach(async ({ page }) => {
  599 |     await loginAsAdmin(page);
  600 |   });
  601 | 
  602 |   test('โหลดหน้า Basic Info สำเร็จ', async ({ page }) => {
  603 |     await page.goto('/basic-info.html');
  604 |     await page.waitForLoadState('networkidle');
  605 |     // Could be part of setup wizard or standalone
  606 |     await expect(page).toHaveTitle(/PPK DriveHub/);
  607 |   });
  608 | });
  609 | 
  610 | // ════════════════════════════════════════════
  611 | // 25. UI CRUD Workflow — สร้างรถผ่านหน้าเว็บ
  612 | // ════════════════════════════════════════════
  613 | test.describe('UI CRUD — สร้างรถ (Vehicles)', () => {
  614 |   test.beforeEach(async ({ page }) => {
  615 |     await loginAsAdmin(page);
  616 |   });
  617 | 
  618 |   test('กดปุ่ม "เพิ่มรถ" แล้วฟอร์มโผล่', async ({ page }) => {
  619 |     await page.goto('/vehicles.html');
  620 |     await page.waitForLoadState('networkidle');
  621 | 
  622 |     // ค้นหาปุ่ม เพิ่มรถ / Add Vehicle
  623 |     const addBtn = page.locator(
  624 |       'button:has-text("เพิ่มรถ"), button:has-text("Add"), [data-action="add"], #addVehicleBtn, .btn-add-vehicle'
  625 |     );
  626 |     if (await addBtn.count() > 0) {
  627 |       await addBtn.first().click();
  628 |       await page.waitForTimeout(500);
  629 |       // Modal/form should appear
  630 |       const modal = page.locator('.modal, dialog, #vehicleModal, .vehicle-form');
  631 |       await expect(modal.first()).toBeVisible({ timeout: 5000 });
  632 |     }
  633 |   });
  634 | });
  635 | 
  636 | // ════════════════════════════════════════════
  637 | // 26. UI CRUD Workflow — สร้างคิวผ่านหน้าเว็บ
  638 | // ════════════════════════════════════════════
  639 | test.describe('UI CRUD — สร้างคิว (Queue)', () => {
  640 |   test.beforeEach(async ({ page }) => {
  641 |     await loginAsAdmin(page);
  642 |   });
  643 | 
  644 |   test('กดปุ่ม "จองคิว" / "เพิ่มคิว" แล้วฟอร์มโผล่', async ({ page }) => {
  645 |     await page.goto('/queue-manage.html');
  646 |     await page.waitForLoadState('networkidle');
  647 | 
  648 |     const addBtn = page.locator(
  649 |       'button:has-text("จองคิว"), button:has-text("เพิ่มคิว"), button:has-text("Add"), [data-action="add"], #addQueueBtn, .btn-add-queue'
  650 |     );
  651 |     if (await addBtn.count() > 0) {
> 652 |       await addBtn.first().click();
      |                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  653 |       await page.waitForTimeout(500);
  654 |       const modal = page.locator('.modal, dialog, #queueModal, .queue-form');
  655 |       await expect(modal.first()).toBeVisible({ timeout: 5000 });
  656 |     }
  657 |   });
  658 | });
  659 | 
  660 | // ════════════════════════════════════════════
  661 | // 27. UI CRUD Workflow — สร้างคนขับผ่านหน้าเว็บ
  662 | // ════════════════════════════════════════════
  663 | test.describe('UI CRUD — สร้างคนขับ (Drivers)', () => {
  664 |   test.beforeEach(async ({ page }) => {
  665 |     await loginAsAdmin(page);
  666 |   });
  667 | 
  668 |   test('กดปุ่ม "เพิ่มคนขับ" แล้วฟอร์มโผล่', async ({ page }) => {
  669 |     await page.goto('/drivers.html');
  670 |     await page.waitForLoadState('networkidle');
  671 | 
  672 |     const addBtn = page.locator(
  673 |       'button:has-text("เพิ่มคนขับ"), button:has-text("เพิ่ม"), [data-action="add"], #addDriverBtn, .btn-add-driver'
  674 |     );
  675 |     if (await addBtn.count() > 0) {
  676 |       await addBtn.first().click();
  677 |       await page.waitForTimeout(500);
  678 |       const modal = page.locator('.modal, dialog, #driverModal, .driver-form');
  679 |       await expect(modal.first()).toBeVisible({ timeout: 5000 });
  680 |     }
  681 |   });
  682 | });
  683 | 
  684 | // ════════════════════════════════════════════
  685 | // 28. UI CRUD — แจ้งซ่อมผ่านหน้าเว็บ
  686 | // ════════════════════════════════════════════
  687 | test.describe('UI CRUD — แจ้งซ่อม (Repair)', () => {
  688 |   test.beforeEach(async ({ page }) => {
  689 |     await loginAsAdmin(page);
  690 |   });
  691 | 
  692 |   test('กดปุ่ม "แจ้งซ่อม" แล้วฟอร์มโผล่', async ({ page }) => {
  693 |     await page.goto('/repair.html');
  694 |     await page.waitForLoadState('networkidle');
  695 | 
  696 |     const addBtn = page.locator(
  697 |       'button:has-text("แจ้งซ่อม"), button:has-text("เพิ่ม"), [data-action="add"], #addRepairBtn, .btn-add-repair'
  698 |     );
  699 |     if (await addBtn.count() > 0) {
  700 |       await addBtn.first().click();
  701 |       await page.waitForTimeout(500);
  702 |       const modal = page.locator('.modal, dialog, #repairModal, .repair-form');
  703 |       await expect(modal.first()).toBeVisible({ timeout: 5000 });
  704 |     }
  705 |   });
  706 | });
  707 | 
  708 | // ════════════════════════════════════════════
  709 | // 29. UI CRUD — บันทึกน้ำมันผ่านหน้าเว็บ
  710 | // ════════════════════════════════════════════
  711 | test.describe('UI CRUD — บันทึกน้ำมัน (Fuel)', () => {
  712 |   test.beforeEach(async ({ page }) => {
  713 |     await loginAsAdmin(page);
  714 |   });
  715 | 
  716 |   test('กดปุ่ม "บันทึกน้ำมัน" แล้วฟอร์มโผล่', async ({ page }) => {
  717 |     await page.goto('/fuel-record.html');
  718 |     await page.waitForLoadState('networkidle');
  719 | 
  720 |     const addBtn = page.locator(
  721 |       'button:has-text("บันทึกน้ำมัน"), button:has-text("เติมน้ำมัน"), button:has-text("เพิ่ม"), [data-action="add"], #addFuelBtn, .btn-add-fuel'
  722 |     );
  723 |     if (await addBtn.count() > 0) {
  724 |       await addBtn.first().click();
  725 |       await page.waitForTimeout(500);
  726 |       const modal = page.locator('.modal, dialog, #fuelModal, .fuel-form');
  727 |       // Modal may or may not exist depending on page design (QR-based vs admin UI)
  728 |       const modalCount = await modal.count();
  729 |       if (modalCount > 0) {
  730 |         await expect(modal.first()).toBeVisible({ timeout: 5000 });
  731 |       }
  732 |       // If no modal found, the page may use a different interaction pattern — still pass
  733 |     }
  734 |     // Page loaded successfully regardless
  735 |     expect(page.url()).not.toMatch(/login/);
  736 |   });
  737 | });
  738 | 
  739 | // ════════════════════════════════════════════
  740 | // 30. UI Workflow — Login → CRUD ครบวงจร (สร้างรถ+คนขับ+คิว)
  741 | // ════════════════════════════════════════════
  742 | test.describe('End-to-End Workflow — สร้างข้อมูลครบวงจรผ่าน API', () => {
  743 |   let vehicleId = '';
  744 |   let driverId = '';
  745 |   let queueId = '';
  746 | 
  747 |   async function adminFetch(method, path, body) {
  748 |     // Login first — try both passwords in case api-integration changed it
  749 |     clearRateLimits();
  750 |     let token = null;
  751 |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  752 |       const login = await fetch(`${BASE}/api/auth/login`, {
```