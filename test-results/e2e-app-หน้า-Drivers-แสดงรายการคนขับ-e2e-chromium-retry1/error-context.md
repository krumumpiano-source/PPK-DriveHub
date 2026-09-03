# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> หน้า Drivers >> แสดงรายการคนขับ
- Location: tests\e2e\app.spec.mjs:267:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#driversGrid, .driver-card, #driversContainer').first()
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('#driversGrid, .driver-card, #driversContainer').first()
    14 × locator resolved to <div id="driversContainer">…</div>
       - unexpected value "hidden"

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
      - generic [ref=e188]: 👤 ทะเบียนข้อมูลพนักงานขับรถ
      - generic [ref=e190]: T
    - generic [ref=e191]:
      - generic [ref=e192]:
        - heading "👤 ทะเบียนข้อมูลพนักงานขับรถ" [level=1] [ref=e193]
        - paragraph [ref=e194]: ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
      - generic [ref=e195]:
        - generic [ref=e196]:
          - button "🚗 พนักงานขับรถหลัก" [ref=e197] [cursor=pointer]
          - button "🚐 พนักงานขับรถสำรอง" [ref=e198] [cursor=pointer]
          - button "⚪ พนักงานพ้นสภาพ / ลาออก" [ref=e199] [cursor=pointer]
        - generic [ref=e200]:
          - button "➕ เพิ่มพนักงานขับรถใหม่" [ref=e201] [cursor=pointer]
          - button "🔃 รีเฟรช" [ref=e202] [cursor=pointer]
        - generic [ref=e203]: กำลังโหลดข้อมูล...
    - paragraph [ref=e205]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
  172 |     await loginAsAdmin(page);
  173 |   });
  174 | 
  175 |   test('โหลดหน้า Dashboard สำเร็จ', async ({ page }) => {
  176 |     await page.goto('/dashboard.html');
  177 |     await page.waitForLoadState('networkidle');
  178 | 
  179 |     // Dashboard content should appear
  180 |     await expect(page.locator('#dashboardContent')).toBeVisible({ timeout: 10000 });
  181 |     await expect(page).toHaveTitle(/Dashboard|PPK DriveHub/);
  182 |   });
  183 | 
  184 |   test('Sidebar navigation แสดงเมนู', async ({ page }) => {
  185 |     await page.goto('/dashboard.html');
  186 |     await page.waitForLoadState('networkidle');
  187 | 
  188 |     // Wait for sidebar to render
  189 |     const sidebar = page.locator('#sidebar, .sidebar');
  190 |     await expect(sidebar).toBeVisible({ timeout: 10000 });
  191 | 
  192 |     // Should have menu items
  193 |     const menuItems = sidebar.locator('.sidebar-item, [data-page]');
  194 |     expect(await menuItems.count()).toBeGreaterThan(3);
  195 |   });
  196 | 
  197 |   test('แสดงปฏิทิน', async ({ page }) => {
  198 |     await page.goto('/dashboard.html');
  199 |     await page.waitForLoadState('networkidle');
  200 | 
  201 |     const calendar = page.locator('#calendarGrid, .calendar-grid');
  202 |     await expect(calendar).toBeVisible({ timeout: 10000 });
  203 |   });
  204 | });
  205 | 
  206 | // ════════════════════════════════════════════
  207 | // 4. หน้า Queue (จัดคิว)
  208 | // ════════════════════════════════════════════
  209 | test.describe('หน้า Queue', () => {
  210 |   test.beforeEach(async ({ page }) => {
  211 |     await loginAsAdmin(page);
  212 |   });
  213 | 
  214 |   test('โหลดหน้าจัดคิวสำเร็จ', async ({ page }) => {
  215 |     await page.goto('/queue-manage.html');
  216 |     await page.waitForLoadState('networkidle');
  217 |     await expect(page).toHaveTitle(/คิว|Queue|PPK DriveHub/);
  218 |   });
  219 | 
  220 |   test('แสดงตารางหรือรายการคิว', async ({ page }) => {
  221 |     await page.goto('/queue-manage.html');
  222 |     await page.waitForLoadState('networkidle');
  223 | 
  224 |     // Queue uses calendar view — look for calendar grid or queue items
  225 |     const content = page.locator('#calendarGrid, #calendarContainer, .queue-item');
  226 |     await expect(content.first()).toBeVisible({ timeout: 10000 });
  227 |   });
  228 | });
  229 | 
  230 | // ════════════════════════════════════════════
  231 | // 5. หน้า Vehicles (รถ)
  232 | // ════════════════════════════════════════════
  233 | test.describe('หน้า Vehicles', () => {
  234 |   test.beforeEach(async ({ page }) => {
  235 |     await loginAsAdmin(page);
  236 |   });
  237 | 
  238 |   test('โหลดหน้ารถสำเร็จ', async ({ page }) => {
  239 |     await page.goto('/vehicles.html');
  240 |     await page.waitForLoadState('networkidle');
  241 |     await expect(page).toHaveTitle(/รถ|Vehicles|PPK DriveHub/);
  242 |   });
  243 | 
  244 |   test('แสดงรายการรถ', async ({ page }) => {
  245 |     await page.goto('/vehicles.html');
  246 |     await page.waitForLoadState('networkidle');
  247 | 
  248 |     const content = page.locator('#vehiclesGrid, .vehicle-card, #vehiclesContainer');
  249 |     await expect(content.first()).toBeVisible({ timeout: 10000 });
  250 |   });
  251 | });
  252 | 
  253 | // ════════════════════════════════════════════
  254 | // 6. หน้า Drivers (คนขับ)
  255 | // ════════════════════════════════════════════
  256 | test.describe('หน้า Drivers', () => {
  257 |   test.beforeEach(async ({ page }) => {
  258 |     await loginAsAdmin(page);
  259 |   });
  260 | 
  261 |   test('โหลดหน้าคนขับสำเร็จ', async ({ page }) => {
  262 |     await page.goto('/drivers.html');
  263 |     await page.waitForLoadState('networkidle');
  264 |     await expect(page).toHaveTitle(/คนขับ|Drivers|PPK DriveHub/);
  265 |   });
  266 | 
  267 |   test('แสดงรายการคนขับ', async ({ page }) => {
  268 |     await page.goto('/drivers.html');
  269 |     await page.waitForLoadState('networkidle');
  270 | 
  271 |     const content = page.locator('#driversGrid, .driver-card, #driversContainer');
> 272 |     await expect(content.first()).toBeVisible({ timeout: 10000 });
      |                                   ^ Error: expect(locator).toBeVisible() failed
  273 |   });
  274 | });
  275 | 
  276 | // ════════════════════════════════════════════
  277 | // 7. หน้า Fuel Record (น้ำมัน)
  278 | // ════════════════════════════════════════════
  279 | test.describe('หน้า Fuel Record', () => {
  280 |   test.beforeEach(async ({ page }) => {
  281 |     await loginAsAdmin(page);
  282 |   });
  283 | 
  284 |   test('โหลดหน้าน้ำมันสำเร็จ', async ({ page }) => {
  285 |     await page.goto('/fuel-record.html');
  286 |     await page.waitForLoadState('networkidle');
  287 |     await expect(page).toHaveTitle(/น้ำมัน|Fuel|PPK DriveHub/);
  288 |   });
  289 | });
  290 | 
  291 | // ════════════════════════════════════════════
  292 | // 8. หน้า Fuel Ledger (บัญชีน้ำมัน)
  293 | // ════════════════════════════════════════════
  294 | test.describe('หน้า Fuel Ledger', () => {
  295 |   test.beforeEach(async ({ page }) => {
  296 |     await loginAsAdmin(page);
  297 |   });
  298 | 
  299 |   test('โหลดหน้าบัญชีน้ำมันสำเร็จ', async ({ page }) => {
  300 |     await page.goto('/fuel-ledger.html');
  301 |     await page.waitForLoadState('networkidle');
  302 |     await expect(page).toHaveTitle(/บัญชี|Ledger|PPK DriveHub/);
  303 |   });
  304 | });
  305 | 
  306 | // ════════════════════════════════════════════
  307 | // 9. หน้า Repair (ซ่อมบำรุง)
  308 | // ════════════════════════════════════════════
  309 | test.describe('หน้า Repair', () => {
  310 |   test.beforeEach(async ({ page }) => {
  311 |     await loginAsAdmin(page);
  312 |   });
  313 | 
  314 |   test('โหลดหน้าซ่อมบำรุงสำเร็จ', async ({ page }) => {
  315 |     await page.goto('/repair.html');
  316 |     await page.waitForLoadState('networkidle');
  317 |     await expect(page).toHaveTitle(/ซ่อม|Repair|PPK DriveHub/);
  318 |   });
  319 | });
  320 | 
  321 | // ════════════════════════════════════════════
  322 | // 10. หน้า Tax & Insurance (ภาษี/ประกัน)
  323 | // ════════════════════════════════════════════
  324 | test.describe('หน้า Tax & Insurance', () => {
  325 |   test.beforeEach(async ({ page }) => {
  326 |     await loginAsAdmin(page);
  327 |   });
  328 | 
  329 |   test('โหลดหน้าภาษี/ประกันสำเร็จ', async ({ page }) => {
  330 |     await page.goto('/tax-insurance.html');
  331 |     await page.waitForLoadState('networkidle');
  332 |     await expect(page).toHaveTitle(/ภาษี|Insurance|Tax|PPK DriveHub/);
  333 |   });
  334 | });
  335 | 
  336 | // ════════════════════════════════════════════
  337 | // 11. หน้า Usage Log (บันทึกใช้รถ)
  338 | // ════════════════════════════════════════════
  339 | test.describe('หน้า Usage Log', () => {
  340 |   test.beforeEach(async ({ page }) => {
  341 |     await loginAsAdmin(page);
  342 |   });
  343 | 
  344 |   test('โหลดหน้าบันทึกใช้รถสำเร็จ', async ({ page }) => {
  345 |     await page.goto('/usage-log.html');
  346 |     await page.waitForLoadState('networkidle');
  347 |     await expect(page).toHaveTitle(/ใช้|Usage|PPK DriveHub/);
  348 |   });
  349 | });
  350 | 
  351 | // ════════════════════════════════════════════
  352 | // 12. หน้า Reports (รายงาน)
  353 | // ════════════════════════════════════════════
  354 | test.describe('หน้า Reports', () => {
  355 |   test.beforeEach(async ({ page }) => {
  356 |     await loginAsAdmin(page);
  357 |   });
  358 | 
  359 |   test('โหลดหน้ารายงานสำเร็จ', async ({ page }) => {
  360 |     await page.goto('/reports.html');
  361 |     await page.waitForLoadState('networkidle');
  362 |     await expect(page).toHaveTitle(/รายงาน|Reports|PPK DriveHub/);
  363 |   });
  364 | });
  365 | 
  366 | // ════════════════════════════════════════════
  367 | // 13. หน้า Notifications (แจ้งเตือน)
  368 | // ════════════════════════════════════════════
  369 | test.describe('หน้า Notifications', () => {
  370 |   test.beforeEach(async ({ page }) => {
  371 |     await loginAsAdmin(page);
  372 |   });
```