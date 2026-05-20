# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-tablet.spec.mjs >> F3: Android Tablet Portrait (768×1024) >> dashboard โหลดได้
- Location: tests\e2e\ui-tablet.spec.mjs:146:3

# Error details

```
Error: Cannot obtain admin token
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — Tablet Layout Tests
  3   | // ทดสอบ: iPad Portrait/Landscape, Android Tablet
  4   | // รัน: tablet-ipad, tablet-android (+ e2e-chromium)
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
  46  | async function hasHorizontalScroll(page) {
  47  |   return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  48  | }
  49  | 
  50  | // ════════════════════════════════════════════
  51  | // F1: iPad Portrait (820×1180)
  52  | // ════════════════════════════════════════════
  53  | test.describe('F1: iPad Portrait (820×1180)', () => {
  54  |   test.beforeEach(async ({ page }) => {
  55  |     await page.setViewportSize({ width: 820, height: 1180 });
  56  |   });
  57  | 
  58  |   test('dashboard โหลดได้ ไม่มี horizontal scroll', async ({ page }) => {
  59  |     await loginAsAdmin(page);
  60  |     await page.goto('/dashboard.html');
  61  |     await page.waitForLoadState('networkidle');
  62  |     await page.waitForTimeout(400);
  63  |     const overflow = await hasHorizontalScroll(page);
  64  |     expect(overflow).toBe(false);
  65  |   });
  66  | 
  67  |   test('iPad portrait (820px < 900px): hamburger โผล่', async ({ page }) => {
  68  |     await loginAsAdmin(page);
  69  |     await page.goto('/dashboard.html');
  70  |     await page.waitForLoadState('networkidle');
  71  |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  72  |     if (await hamburger.count() > 0) {
  73  |       await expect(hamburger).toBeVisible();
  74  |     }
  75  |   });
  76  | 
  77  |   test('vehicles.html ไม่มี horizontal scroll', async ({ page }) => {
  78  |     await loginAsAdmin(page);
  79  |     await page.goto('/vehicles.html');
  80  |     await page.waitForLoadState('networkidle');
  81  |     await page.waitForTimeout(400);
  82  |     const overflow = await hasHorizontalScroll(page);
  83  |     expect(overflow).toBe(false);
  84  |   });
  85  | 
  86  |   test('queue-manage.html ไม่มี horizontal scroll', async ({ page }) => {
  87  |     await loginAsAdmin(page);
  88  |     await page.goto('/queue-manage.html');
  89  |     await page.waitForLoadState('networkidle');
  90  |     await page.waitForTimeout(400);
  91  |     const overflow = await hasHorizontalScroll(page);
  92  |     expect(overflow).toBe(false);
  93  |   });
  94  | 
  95  |   test('login page ไม่มี horizontal scroll', async ({ page }) => {
  96  |     await page.goto('/login.html');
  97  |     await page.waitForLoadState('networkidle');
  98  |     const overflow = await hasHorizontalScroll(page);
  99  |     expect(overflow).toBe(false);
  100 |   });
  101 | });
  102 | 
  103 | // ════════════════════════════════════════════
  104 | // F2: iPad Landscape (1180×820 — >900px → sidebar visible)
  105 | // ════════════════════════════════════════════
  106 | test.describe('F2: iPad Landscape (1180×820)', () => {
  107 |   test.beforeEach(async ({ page }) => {
  108 |     await page.setViewportSize({ width: 1180, height: 820 });
  109 |   });
  110 | 
  111 |   test('dashboard: sidebar มองเห็นโดยตรง (>900px)', async ({ page }) => {
  112 |     await loginAsAdmin(page);
  113 |     await page.goto('/dashboard.html');
  114 |     await page.waitForLoadState('networkidle');
  115 |     const sidebar = page.locator('.sidebar');
  116 |     await expect(sidebar).toBeVisible();
  117 |   });
  118 | 
  119 |   test('iPad landscape ไม่มี horizontal scroll', async ({ page }) => {
  120 |     await loginAsAdmin(page);
  121 |     await page.goto('/dashboard.html');
  122 |     await page.waitForLoadState('networkidle');
  123 |     await page.waitForTimeout(400);
  124 |     const overflow = await hasHorizontalScroll(page);
  125 |     expect(overflow).toBe(false);
  126 |   });
  127 | 
  128 |   test('vehicles table landscape ไม่มี overflow', async ({ page }) => {
  129 |     await loginAsAdmin(page);
  130 |     await page.goto('/vehicles.html');
  131 |     await page.waitForLoadState('networkidle');
  132 |     await page.waitForTimeout(400);
  133 |     const overflow = await hasHorizontalScroll(page);
  134 |     expect(overflow).toBe(false);
  135 |   });
  136 | });
  137 | 
  138 | // ════════════════════════════════════════════
  139 | // F3: Android Tablet 768px (tablet portrait)
```