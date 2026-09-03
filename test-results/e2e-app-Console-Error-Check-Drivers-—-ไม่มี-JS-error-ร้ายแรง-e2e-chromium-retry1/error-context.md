# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> Console Error Check >> Drivers — ไม่มี JS error ร้ายแรง
- Location: tests\e2e\app.spec.mjs:1108:5

# Error details

```
Error: JS errors on Drivers: initNavigation is not defined, initNavigation is not defined

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 2
Received array:  ["initNavigation is not defined", "initNavigation is not defined"]
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
  1022 |       await queueLink.click();
  1023 |       await page.waitForURL(/\/queue-manage/, { timeout: 5000 });
  1024 |     }
  1025 | 
  1026 |     // 4. Logout
  1027 |     const logoutLink = page.locator('[data-page="logout"], .logout-btn, a[href*="logout"]');
  1028 |     if (await logoutLink.count() > 0) {
  1029 |       await logoutLink.first().click();
  1030 |       await page.waitForURL(/\/login/, { timeout: 5000 });
  1031 |     }
  1032 |   });
  1033 | });
  1034 | 
  1035 | // ════════════════════════════════════════════
  1036 | // 22. Auth Guard ทุกหน้า (ต้อง redirect ถ้าไม่มี token)
  1037 | // ════════════════════════════════════════════
  1038 | test.describe('Auth Guard', () => {
  1039 |   const protectedPages = [
  1040 |     '/dashboard.html',
  1041 |     '/queue-manage.html',
  1042 |     '/vehicles.html',
  1043 |     '/drivers.html',
  1044 |     '/fuel-record.html',
  1045 |     '/repair.html',
  1046 |     '/reports.html',
  1047 |     '/user-management.html',
  1048 |     '/audit-log.html',
  1049 |     '/backup-recovery.html',
  1050 |     '/profile.html',
  1051 |     '/notifications.html',
  1052 |     '/admin-settings.html',
  1053 |   ];
  1054 | 
  1055 |   for (const pagePath of protectedPages) {
  1056 |     test(`${pagePath} — redirect ไป login ถ้ายังไม่ login`, async ({ page }) => {
  1057 |       // Redirect happens in head script, don't wait for full load
  1058 |       await page.goto(pagePath, { waitUntil: 'commit' });
  1059 |       await page.waitForURL(/\/login/, { timeout: 10000 });
  1060 |       await expect(page).toHaveURL(/\/login/);
  1061 |     });
  1062 |   }
  1063 | });
  1064 | 
  1065 | // ════════════════════════════════════════════
  1066 | // 23. Responsive / Mobile View
  1067 | // ════════════════════════════════════════════
  1068 | test.describe('Responsive Mobile View', () => {
  1069 |   test.use({ viewport: { width: 375, height: 812 } });
  1070 | 
  1071 |   test('Login หน้ามือถือ — ฟอร์มแสดงถูกต้อง', async ({ page }) => {
  1072 |     await page.goto('/login.html');
  1073 |     await page.waitForLoadState('networkidle');
  1074 |     await expect(page.locator('#username')).toBeVisible();
  1075 |     await expect(page.locator('#loginBtn')).toBeVisible();
  1076 |   });
  1077 | 
  1078 |   test('Dashboard หน้ามือถือ — มี hamburger menu', async ({ page }) => {
  1079 |     await loginAsAdmin(page);
  1080 |     await page.goto('/dashboard.html');
  1081 |     await page.waitForLoadState('networkidle');
  1082 | 
  1083 |     // On mobile, sidebar should be hidden, hamburger should be visible
  1084 |     const hamburger = page.locator('#topbar-hamburger, .hamburger, .menu-toggle');
  1085 |     await expect(hamburger.first()).toBeVisible({ timeout: 10000 });
  1086 |   });
  1087 | });
  1088 | 
  1089 | // ════════════════════════════════════════════
  1090 | // 24. Console Error Check
  1091 | // ════════════════════════════════════════════
  1092 | test.describe('Console Error Check', () => {
  1093 |   test.beforeEach(async ({ page }) => {
  1094 |     await loginAsAdmin(page);
  1095 |   });
  1096 | 
  1097 |   const pagesToCheck = [
  1098 |     { name: 'Dashboard', url: '/dashboard.html' },
  1099 |     { name: 'Vehicles', url: '/vehicles.html' },
  1100 |     { name: 'Drivers', url: '/drivers.html' },
  1101 |     { name: 'Queue', url: '/queue-manage.html' },
  1102 |     { name: 'Fuel', url: '/fuel-record.html' },
  1103 |     { name: 'Repair', url: '/repair.html' },
  1104 |     { name: 'Reports', url: '/reports.html' },
  1105 |   ];
  1106 | 
  1107 |   for (const p of pagesToCheck) {
  1108 |     test(`${p.name} — ไม่มี JS error ร้ายแรง`, async ({ page }) => {
  1109 |       const errors = [];
  1110 |       page.on('pageerror', (err) => {
  1111 |         // Ignore minor errors
  1112 |         if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error')) {
  1113 |           errors.push(err.message);
  1114 |         }
  1115 |       });
  1116 | 
  1117 |       await page.goto(p.url);
  1118 |       await page.waitForLoadState('networkidle');
  1119 |       await page.waitForTimeout(2000);
  1120 | 
  1121 |       // Allow up to 0 critical JS errors
> 1122 |       expect(errors, `JS errors on ${p.name}: ${errors.join(', ')}`).toHaveLength(0);
       |                                                                      ^ Error: JS errors on Drivers: initNavigation is not defined, initNavigation is not defined
  1123 |     });
  1124 |   }
  1125 | });
  1126 | 
```