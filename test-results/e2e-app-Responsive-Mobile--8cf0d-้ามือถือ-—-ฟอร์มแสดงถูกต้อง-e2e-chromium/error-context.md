# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> Responsive Mobile View >> Login หน้ามือถือ — ฟอร์มแสดงถูกต้อง
- Location: tests\e2e\app.spec.mjs:1071:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#username')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#username')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e5]
      - heading "PPK DriveHub" [level=1] [ref=e9]
      - paragraph [ref=e10]:
        - text: ระบบจัดการยานพาหนะ
        - text: โรงเรียนพะเยาพิทยาคม
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: ใส่อีเมลโรงเรียน หรือ ชื่อผู้ใช้งาน
          - textbox "ใส่อีเมลโรงเรียน หรือ ชื่อผู้ใช้งาน" [active] [ref=e16]:
            - /placeholder: เช่น somchai@ppk.ac.th หรือ admin
          - generic [ref=e17]: "💡 ครูและบุคลากร: ใส่อีเมล @ppk.ac.th เพื่อเข้าใช้งานหรือเปิดบัญชีใหม่ได้ทันที"
        - button "ถัดไป ➔" [ref=e18] [cursor=pointer]:
          - generic [ref=e19]: ถัดไป
          - generic [ref=e20]: ➔
      - generic [ref=e22]: หรือเข้าใช้งานด้วยช่องทางอื่น
      - button "💬 เข้าสู่ระบบด้วย LINE" [ref=e23] [cursor=pointer]:
        - generic [ref=e24]: 💬
        - generic [ref=e25]: เข้าสู่ระบบด้วย LINE
  - contentinfo [ref=e26]:
    - paragraph [ref=e27]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
  974  | });
  975  | 
  976  | // ════════════════════════════════════════════
  977  | // 21. Navigation Flow (E2E)
  978  | // ════════════════════════════════════════════
  979  | test.describe('Navigation Flow', () => {
  980  |   test('Login → Dashboard → Navigate sidebar → Logout', async ({ page }) => {
  981  |     clearRateLimits();
  982  |     // 1. Login — try both passwords
  983  |     clearRateLimits();
  984  |     let navPass = ADMIN_PASS;
  985  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  986  |       const r = await fetch(`${BASE}/api/auth/login`, {
  987  |         method: 'POST',
  988  |         headers: { 'Content-Type': 'application/json' },
  989  |         body: JSON.stringify({ username: ADMIN_USER, password: pw }),
  990  |       });
  991  |       const d = await r.json();
  992  |       if (d?.success || d?.data?.token) { navPass = pw; break; }
  993  |       clearRateLimits();
  994  |     }
  995  |     await page.goto('/login.html');
  996  |     await page.waitForLoadState('networkidle');
  997  |     await page.fill('#username', ADMIN_USER);
  998  |     await page.fill('#password', navPass);
  999  |     await page.click('#loginBtn');
  1000 |     await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  1001 | 
  1002 |     // 2. Dashboard loaded
  1003 |     await page.waitForLoadState('networkidle');
  1004 | 
  1005 |     // 3. Click sidebar menu items
  1006 |     const sidebar = page.locator('#sidebar, .sidebar');
  1007 |     await expect(sidebar).toBeVisible({ timeout: 10000 });
  1008 | 
  1009 |     // Navigate to vehicles
  1010 |     const vehiclesLink = sidebar.locator('[data-page="vehicles"]');
  1011 |     if (await vehiclesLink.count() > 0) {
  1012 |       await vehiclesLink.click();
  1013 |       await page.waitForURL(/\/vehicles/, { timeout: 5000 });
  1014 |       await page.waitForLoadState('networkidle');
  1015 |     }
  1016 | 
  1017 |     // Navigate to queue
  1018 |     await page.goto('/dashboard.html');
  1019 |     await page.waitForLoadState('networkidle');
  1020 |     const queueLink = page.locator('#sidebar [data-page="queue"], .sidebar [data-page="queue"]');
  1021 |     if (await queueLink.count() > 0) {
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
> 1074 |     await expect(page.locator('#username')).toBeVisible();
       |                                             ^ Error: expect(locator).toBeVisible() failed
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
  1122 |       expect(errors, `JS errors on ${p.name}: ${errors.join(', ')}`).toHaveLength(0);
  1123 |     });
  1124 |   }
  1125 | });
  1126 | 
```