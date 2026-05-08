# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-mobile-flows.spec.mjs >> C1: Login Flow — Mobile >> email input มี type=email (mobile keyboard ขึ้นถูก)
- Location: tests\e2e\ui-mobile-flows.spec.mjs:66:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
Call log:
  - navigating to "http://localhost:8788/login.html", waiting until "load"

```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — Mobile Workflow Tests
  3   | // ทดสอบ: Workflows จริงบนอุปกรณ์มือถือ (390px, 375px viewports)
  4   | // จุดประสงค์: verify ว่า critical flows ใช้งานได้บน phone
  5   | // รัน: mobile-android, mobile-iphone, mobile-iphone-se (+ e2e-chromium)
  6   | // ==============================================================
  7   | import { test, expect } from '@playwright/test';
  8   | import { execSync } from 'child_process';
  9   | 
  10  | const BASE = 'http://localhost:8788';
  11  | const ADMIN_USER = 'testadmin';
  12  | const ADMIN_PASS = process.env.TEST_ADMIN_PASS;
  13  | 
  14  | function clearRateLimits() {
  15  |   try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
  16  | }
  17  | 
  18  | let _authCache = null;
  19  | 
  20  | async function loginAsAdmin(page) {
  21  |   if (!_authCache) {
  22  |     clearRateLimits();
  23  |     const check = await page.request.get('/api/setup');
  24  |     const d = await check.json().catch(() => ({}));
  25  |     if (d?.data?.needs_setup) {
  26  |       await page.request.post('/api/setup', {
  27  |         data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
  28  |       });
  29  |     }
  30  |     clearRateLimits();
  31  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  32  |       const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
  33  |       const body = await r.json().catch(() => ({}));
  34  |       if (body?.data?.token) {
  35  |         _authCache = { token: body.data.token, user: { id: body.data.user_id, username: body.data.username, display_name: body.data.display_name, role: body.data.role, permissions: body.data.permissions } };
  36  |         break;
  37  |       }
  38  |       clearRateLimits();
  39  |     }
  40  |   }
  41  |   if (!_authCache) throw new Error('Cannot obtain admin token');
  42  |   await page.addInitScript(({ token, user }) => {
  43  |     localStorage.setItem('ppk_token', token);
  44  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  45  |   }, _authCache);
  46  | }
  47  | 
  48  | // ════════════════════════════════════════════
  49  | // C1: Login Flow บน Mobile
  50  | // ════════════════════════════════════════════
  51  | test.describe('C1: Login Flow — Mobile', () => {
  52  |   test('login page โหลด — form อยู่ตรงกลาง', async ({ page }) => {
  53  |     await page.goto('/login.html');
  54  |     await page.waitForLoadState('networkidle');
  55  |     const form = page.locator('form, .login-card, .auth-card, .card').first();
  56  |     await expect(form).toBeVisible();
  57  |     // ตรวจว่า form ไม่ overflow จาก viewport
  58  |     const vpWidth = page.viewportSize()?.width || 390;
  59  |     const box = await form.boundingBox();
  60  |     if (box) {
  61  |       expect(box.x).toBeGreaterThanOrEqual(0);
  62  |       expect(box.x + box.width).toBeLessThanOrEqual(vpWidth + 5);
  63  |     }
  64  |   });
  65  | 
  66  |   test('email input มี type=email (mobile keyboard ขึ้นถูก)', async ({ page }) => {
> 67  |     await page.goto('/login.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
  68  |     await page.waitForLoadState('networkidle');
  69  |     const emailInput = page.locator('input[type="email"], input[name="username"], #username').first();
  70  |     if (await emailInput.count() > 0) {
  71  |       const type = await emailInput.getAttribute('type');
  72  |       // email หรือ text ก็ยอมรับ (บาง app ใช้ username แทน email)
  73  |       expect(['email', 'text', null]).toContain(type);
  74  |     }
  75  |   });
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
```