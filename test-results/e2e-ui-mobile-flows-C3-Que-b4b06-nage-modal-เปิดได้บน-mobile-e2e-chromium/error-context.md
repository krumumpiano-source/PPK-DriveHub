# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-mobile-flows.spec.mjs >> C3: Queue Manage — Mobile UI >> queue-manage: modal เปิดได้บน mobile
- Location: tests\e2e\ui-mobile-flows.spec.mjs:170:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว")').first()
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
    47 × waiting for element to be visible, enabled and stable
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
            - generic [ref=e249] [cursor=pointer]:
              - generic [ref=e250]: "8"
              - generic [ref=e251]: CHECK-001 คนขับ E2E Test
            - generic [ref=e252] [cursor=pointer]:
              - generic [ref=e253]: "9"
              - generic [ref=e254]: CHECK-001 คนขับ E2E Test
            - generic [ref=e255] [cursor=pointer]:
              - generic [ref=e256]: "10"
              - generic [ref=e257]: QR-005 หลัก ทดสอบQR
            - generic [ref=e259] [cursor=pointer]: "11"
            - generic [ref=e261] [cursor=pointer]: "12"
            - generic [ref=e263] [cursor=pointer]: "13"
            - generic [ref=e265] [cursor=pointer]: "14"
            - generic [ref=e267] [cursor=pointer]: "15"
            - generic [ref=e269] [cursor=pointer]: "16"
            - generic [ref=e271] [cursor=pointer]: "17"
            - generic [ref=e273] [cursor=pointer]: "18"
            - generic [ref=e275] [cursor=pointer]: "19"
            - generic [ref=e277] [cursor=pointer]: "20"
            - generic [ref=e279] [cursor=pointer]: "21"
            - generic [ref=e281] [cursor=pointer]: "22"
            - generic [ref=e283] [cursor=pointer]: "23"
            - generic [ref=e285] [cursor=pointer]: "24"
            - generic [ref=e287] [cursor=pointer]: "25"
            - generic [ref=e289] [cursor=pointer]: "26"
            - generic [ref=e291] [cursor=pointer]: "27"
            - generic [ref=e293] [cursor=pointer]: "28"
            - generic [ref=e295] [cursor=pointer]: "29"
            - generic [ref=e297] [cursor=pointer]: "30"
      - paragraph [ref=e299]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
  76  | 
  77  |   test('password input มี type=password (ปกปิดรหัส)', async ({ page }) => {
  78  |     await page.goto('/login.html');
  79  |     await page.waitForLoadState('networkidle');
  80  |     const pwInput = page.locator('input[type="password"], #password').first();
  81  |     await expect(pwInput).toBeVisible();
  82  |     expect(await pwInput.getAttribute('type')).toBe('password');
  83  |   });
  84  | 
  85  |   test('กรอก username+password → submit ได้ (API response)', async ({ page }) => {
  86  |     clearRateLimits();
  87  |     await page.goto('/login.html');
  88  |     await page.waitForLoadState('networkidle');
  89  |     const usernameInput = page.locator('#username, input[name="username"]').first();
  90  |     const passwordInput = page.locator('#password, input[type="password"]').first();
  91  |     await usernameInput.fill(ADMIN_USER);
  92  |     await passwordInput.fill(ADMIN_PASS || 'dummy');
  93  |     const [response] = await Promise.all([
  94  |       page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }),
  95  |       page.locator('#loginBtn, button[type="submit"]').first().click(),
  96  |     ]);
  97  |     expect(response.status()).toBeLessThan(500);
  98  |   });
  99  | });
  100 | 
  101 | // ════════════════════════════════════════════
  102 | // C2: QR Pages บน Mobile
  103 | // ════════════════════════════════════════════
  104 | test.describe('C2: QR Pages — Mobile Access', () => {
  105 |   test('qr-scan.html โหลดได้โดยไม่ต้อง login', async ({ page }) => {
  106 |     await page.goto('/qr-scan.html');
  107 |     await page.waitForLoadState('networkidle');
  108 |     expect(page.url()).not.toMatch(/login/);
  109 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  110 |     expect(body.length).toBeGreaterThan(100);
  111 |   });
  112 | 
  113 |   test('qr-daily-check.html โหลดได้', async ({ page }) => {
  114 |     await page.goto('/qr-daily-check.html');
  115 |     await page.waitForLoadState('networkidle');
  116 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  117 |     expect(body.length).toBeGreaterThan(100);
  118 |   });
  119 | 
  120 |   test('qr-fuel-record.html โหลดได้', async ({ page }) => {
  121 |     await page.goto('/qr-fuel-record.html');
  122 |     await page.waitForLoadState('networkidle');
  123 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  124 |     expect(body.length).toBeGreaterThan(100);
  125 |   });
  126 | 
  127 |   test('qr-usage-record.html โหลดได้', async ({ page }) => {
  128 |     await page.goto('/qr-usage-record.html');
  129 |     await page.waitForLoadState('networkidle');
  130 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  131 |     expect(body.length).toBeGreaterThan(100);
  132 |   });
  133 | 
  134 |   test('qr-survey.html โหลดได้', async ({ page }) => {
  135 |     await page.goto('/qr-survey.html');
  136 |     await page.waitForLoadState('networkidle');
  137 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  138 |     expect(body.length).toBeGreaterThan(100);
  139 |   });
  140 | });
  141 | 
  142 | // ════════════════════════════════════════════
  143 | // C3: Queue Manage — Mobile UI
  144 | // ════════════════════════════════════════════
  145 | test.describe('C3: Queue Manage — Mobile UI', () => {
  146 |   test('queue-manage.html โหลดได้บน mobile', async ({ page }) => {
  147 |     await loginAsAdmin(page);
  148 |     await page.goto('/queue-manage.html');
  149 |     await page.waitForLoadState('networkidle');
  150 |     const vpWidth = page.viewportSize()?.width || 390;
  151 |     expect(vpWidth).toBeGreaterThan(0);
  152 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  153 |     expect(overflow).toBe(false);
  154 |   });
  155 | 
  156 |   test('queue-manage: ปุ่ม "เพิ่มคิว/จองคิว" มองเห็นบน mobile', async ({ page }) => {
  157 |     await loginAsAdmin(page);
  158 |     await page.goto('/queue-manage.html');
  159 |     await page.waitForLoadState('networkidle');
  160 |     // หาปุ่มเพิ่มคิว
  161 |     const addBtn = page.locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว"), [data-action="add-queue"]').first();
  162 |     if (await addBtn.count() > 0) {
  163 |       await expect(addBtn).toBeVisible();
  164 |       // ตรวจ touch target ≥ 40px
  165 |       const height = await addBtn.evaluate(el => el.getBoundingClientRect().height);
  166 |       expect(height).toBeGreaterThanOrEqual(40);
  167 |     }
  168 |   });
  169 | 
  170 |   test('queue-manage: modal เปิดได้บน mobile', async ({ page }) => {
  171 |     await loginAsAdmin(page);
  172 |     await page.goto('/queue-manage.html');
  173 |     await page.waitForLoadState('networkidle');
  174 |     const addBtn = page.locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว")').first();
  175 |     if (await addBtn.count() > 0) {
> 176 |       await addBtn.click();
      |                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  177 |       await page.waitForTimeout(500);
  178 |       // Modal หรือ form โผล่
  179 |       const modal = page.locator('.modal, [role="dialog"], .form-card, form').first();
  180 |       if (await modal.count() > 0) {
  181 |         await expect(modal).toBeVisible();
  182 |       }
  183 |     }
  184 |   });
  185 | });
  186 | 
  187 | // ════════════════════════════════════════════
  188 | // C4: Notifications บน Mobile
  189 | // ════════════════════════════════════════════
  190 | test.describe('C4: Notifications — Mobile', () => {
  191 |   test('notifications.html โหลดได้บน mobile', async ({ page }) => {
  192 |     await loginAsAdmin(page);
  193 |     await page.goto('/notifications.html');
  194 |     await page.waitForLoadState('networkidle');
  195 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  196 |     expect(overflow).toBe(false);
  197 |   });
  198 | 
  199 |   test('notifications: list แสดงเป็น column', async ({ page }) => {
  200 |     await loginAsAdmin(page);
  201 |     await page.goto('/notifications.html');
  202 |     await page.waitForLoadState('networkidle');
  203 |     // รอ load
  204 |     await page.waitForTimeout(500);
  205 |     // page มีเนื้อหา
  206 |     const bodyText = await page.evaluate(() => document.body.innerText.trim());
  207 |     expect(bodyText.length).toBeGreaterThan(0);
  208 |   });
  209 | });
  210 | 
  211 | // ════════════════════════════════════════════
  212 | // C5: Reports บน Mobile
  213 | // ════════════════════════════════════════════
  214 | test.describe('C5: Reports — Mobile View', () => {
  215 |   test('reports.html โหลดได้บน mobile', async ({ page }) => {
  216 |     await loginAsAdmin(page);
  217 |     await page.goto('/reports.html');
  218 |     await page.waitForLoadState('networkidle');
  219 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  220 |     expect(overflow).toBe(false);
  221 |   });
  222 | 
  223 |   test('executive-dashboard.html โหลดได้บน mobile', async ({ page }) => {
  224 |     await loginAsAdmin(page);
  225 |     await page.goto('/executive-dashboard.html');
  226 |     await page.waitForLoadState('networkidle');
  227 |     // ตรวจว่า page โหลดได้และมี content
  228 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  229 |     expect(body.length).toBeGreaterThan(100);
  230 |   });
  231 | });
  232 | 
  233 | // ════════════════════════════════════════════
  234 | // C6: Dashboard + Sidebar บน Mobile
  235 | // ════════════════════════════════════════════
  236 | test.describe('C6: Dashboard — Mobile Navigation', () => {
  237 |   test('dashboard โหลดสำเร็จ + sidebar toggle ทำงาน', async ({ page }) => {
  238 |     await loginAsAdmin(page);
  239 |     await page.goto('/dashboard.html');
  240 |     await page.waitForLoadState('networkidle');
  241 |     // ตรวจ hamburger โผล่
  242 |     const vpWidth = page.viewportSize()?.width ?? 390;
  243 |     if (vpWidth < 900) {
  244 |       const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  245 |       if (await hamburger.count() > 0) {
  246 |         await expect(hamburger).toBeVisible();
  247 |         await hamburger.click();
  248 |         await page.waitForTimeout(300);
  249 |         const sidebar = page.locator('.sidebar');
  250 |         await expect(sidebar).toHaveClass(/open/);
  251 |       }
  252 |     }
  253 |   });
  254 | 
  255 |   test('dashboard: stat cards ไม่ overflow บน 390px', async ({ page }) => {
  256 |     await loginAsAdmin(page);
  257 |     await page.goto('/dashboard.html');
  258 |     await page.waitForLoadState('networkidle');
  259 |     await page.waitForTimeout(500);
  260 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  261 |     expect(overflow).toBe(false);
  262 |   });
  263 | 
  264 |   test('vehicles.html: เปิดได้บน mobile', async ({ page }) => {
  265 |     await loginAsAdmin(page);
  266 |     await page.goto('/vehicles.html');
  267 |     await page.waitForLoadState('networkidle');
  268 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  269 |     expect(overflow).toBe(false);
  270 |   });
  271 | });
  272 | 
```