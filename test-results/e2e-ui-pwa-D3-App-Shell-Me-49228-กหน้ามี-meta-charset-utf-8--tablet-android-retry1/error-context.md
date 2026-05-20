# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-pwa.spec.mjs >> D3: App Shell & Meta Tags >> ทุกหน้ามี <meta charset="utf-8">
- Location: tests\e2e\ui-pwa.spec.mjs:180:3

# Error details

```
Error: Cannot obtain admin token
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
        - text: โรงเรียนพะเยาพิทยาคม 2569
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: ชื่อผู้ใช้ / รหัสประจำตัว
          - textbox "ชื่อผู้ใช้ / รหัสประจำตัว" [active] [ref=e15]:
            - /placeholder: กรอกชื่อผู้ใช้หรืออีเมล
          - generic [ref=e16]: "💡 ผู้สมัครใหม่: ใช้ email ที่สมัครไว้ เป็นชื่อผู้ใช้"
        - generic [ref=e17]:
          - generic [ref=e18]: รหัสผ่าน
          - generic [ref=e19]:
            - textbox "รหัสผ่าน" [ref=e20]:
              - /placeholder: กรอกรหัสผ่าน
            - button "👁️" [ref=e21] [cursor=pointer]
        - link "ลืมรหัสผ่าน?" [ref=e23] [cursor=pointer]:
          - /url: forgot-password.html
        - button "➡️ เข้าสู่ระบบ" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: ➡️
          - generic [ref=e26]: เข้าสู่ระบบ
      - generic [ref=e28]: หรือ
      - button "✍️ สมัครเข้าใช้งานครั้งแรก" [ref=e29] [cursor=pointer]:
        - generic [ref=e30]: ✍️
        - generic [ref=e31]: สมัครเข้าใช้งานครั้งแรก
  - contentinfo [ref=e32]:
    - paragraph [ref=e33]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — PWA & Service Worker Tests
  3   | // ทดสอบ: manifest.json, service worker, offline mode, installability
  4   | // รัน: e2e-chromium (+ mobile projects)
  5   | // ==============================================================
  6   | import { test, expect } from '@playwright/test';
  7   | import { execSync } from 'child_process';
  8   | 
  9   | const BASE = 'http://localhost:8788';
  10  | const ADMIN_USER = 'testadmin';
  11  | const ADMIN_PASS = process.env.TEST_ADMIN_PASS;
  12  | 
  13  | function clearRateLimits() {
  14  |   try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
  15  | }
  16  | 
  17  | let _authCache = null;
  18  | async function loginAsAdmin(page) {
  19  |   if (!_authCache) {
  20  |     clearRateLimits();
  21  |     const check = await page.request.get('/api/setup');
  22  |     const d = await check.json().catch(() => ({}));
  23  |     if (d?.data?.needs_setup) {
  24  |       await page.request.post('/api/setup', {
  25  |         data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
  26  |       });
  27  |     }
  28  |     clearRateLimits();
  29  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  30  |       const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
  31  |       const body = await r.json().catch(() => ({}));
  32  |       if (body?.data?.token) {
  33  |         _authCache = { token: body.data.token, user: { id: body.data.user_id, username: body.data.username, display_name: body.data.display_name, role: body.data.role, permissions: body.data.permissions } };
  34  |         break;
  35  |       }
  36  |       clearRateLimits();
  37  |     }
  38  |   }
> 39  |   if (!_authCache) throw new Error('Cannot obtain admin token');
      |                          ^ Error: Cannot obtain admin token
  40  |   await page.addInitScript(({ token, user }) => {
  41  |     localStorage.setItem('ppk_token', token);
  42  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  43  |   }, _authCache);
  44  | }
  45  | 
  46  | // ════════════════════════════════════════════
  47  | // D1: PWA Manifest
  48  | // ════════════════════════════════════════════
  49  | test.describe('D1: PWA Manifest', () => {
  50  |   test('GET /manifest.json → 200 + valid JSON', async ({ page }) => {
  51  |     const r = await page.request.get('/manifest.json');
  52  |     expect(r.status()).toBe(200);
  53  |     const body = await r.json().catch(() => null);
  54  |     expect(body).not.toBeNull();
  55  |     expect(body.name || body.short_name).toBeTruthy();
  56  |   });
  57  | 
  58  |   test('manifest มี display: standalone', async ({ page }) => {
  59  |     const r = await page.request.get('/manifest.json');
  60  |     const body = await r.json().catch(() => ({}));
  61  |     expect(body.display).toBe('standalone');
  62  |   });
  63  | 
  64  |   test('manifest มี icons array ไม่ว่าง', async ({ page }) => {
  65  |     const r = await page.request.get('/manifest.json');
  66  |     const body = await r.json().catch(() => ({}));
  67  |     expect(Array.isArray(body.icons)).toBe(true);
  68  |     expect(body.icons.length).toBeGreaterThan(0);
  69  |   });
  70  | 
  71  |   test('manifest มี start_url', async ({ page }) => {
  72  |     const r = await page.request.get('/manifest.json');
  73  |     const body = await r.json().catch(() => ({}));
  74  |     expect(typeof body.start_url).toBe('string');
  75  |     expect(body.start_url.length).toBeGreaterThan(0);
  76  |   });
  77  | 
  78  |   test('dashboard.html มี <link rel="manifest">', async ({ page }) => {
  79  |     await loginAsAdmin(page);
  80  |     await page.goto('/dashboard.html');
  81  |     await page.waitForLoadState('networkidle');
  82  |     const manifestLink = await page.evaluate(() => {
  83  |       const el = document.querySelector('link[rel="manifest"]');
  84  |       return el ? el.getAttribute('href') : null;
  85  |     });
  86  |     expect(manifestLink).not.toBeNull();
  87  |   });
  88  | 
  89  |   test('dashboard.html มี <meta name="theme-color">', async ({ page }) => {
  90  |     await loginAsAdmin(page);
  91  |     await page.goto('/dashboard.html');
  92  |     await page.waitForLoadState('networkidle');
  93  |     const themeColor = await page.evaluate(() => {
  94  |       const el = document.querySelector('meta[name="theme-color"]');
  95  |       return el ? el.getAttribute('content') : null;
  96  |     });
  97  |     // theme-color ต้องมี (อาจ inject โดย common.js)
  98  |     expect(themeColor).not.toBeNull();
  99  |   });
  100 | });
  101 | 
  102 | // ════════════════════════════════════════════
  103 | // D2: Service Worker
  104 | // ════════════════════════════════════════════
  105 | test.describe('D2: Service Worker', () => {
  106 |   test('GET /sw.js → 200', async ({ page }) => {
  107 |     const r = await page.request.get('/sw.js');
  108 |     expect(r.status()).toBe(200);
  109 |   });
  110 | 
  111 |   test('sw.js มีเนื้อหา (ไม่ว่าง)', async ({ page }) => {
  112 |     const r = await page.request.get('/sw.js');
  113 |     const text = await r.text();
  114 |     expect(text.trim().length).toBeGreaterThan(10);
  115 |   });
  116 | 
  117 |   test('dashboard: serviceWorker API มีใน browser', async ({ page }) => {
  118 |     await loginAsAdmin(page);
  119 |     await page.goto('/dashboard.html');
  120 |     await page.waitForLoadState('networkidle');
  121 |     const hasServiceWorker = await page.evaluate(() => 'serviceWorker' in navigator);
  122 |     expect(hasServiceWorker).toBe(true);
  123 |   });
  124 | 
  125 |   test('service worker register ได้ (ไม่ throw error)', async ({ page }) => {
  126 |     await loginAsAdmin(page);
  127 |     // Track SW registration errors
  128 |     const swErrors = [];
  129 |     page.on('pageerror', err => {
  130 |       if (err.message.toLowerCase().includes('serviceworker')) {
  131 |         swErrors.push(err.message);
  132 |       }
  133 |     });
  134 |     await page.goto('/dashboard.html');
  135 |     await page.waitForLoadState('networkidle');
  136 |     await page.waitForTimeout(1000); // รอ SW register
  137 |     expect(swErrors.length).toBe(0);
  138 |   });
  139 | });
```