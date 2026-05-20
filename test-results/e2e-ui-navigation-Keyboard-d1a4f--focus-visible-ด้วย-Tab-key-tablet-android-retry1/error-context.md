# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-navigation.spec.mjs >> Keyboard & Accessibility >> sidebar links focus visible ด้วย Tab key
- Location: tests\e2e\ui-navigation.spec.mjs:216:3

# Error details

```
Error: Cannot obtain admin token
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — UI Navigation & Layout Tests
  3   | // ทดสอบ: Sidebar, Topbar, Active State, Keyboard Accessibility
  4   | // รัน: ทุก project (Desktop + Mobile + Tablet)
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
  17  | // Shared auth cache (ไม่ขึ้นกับ viewport)
  18  | let _authCache = null;
  19  | 
  20  | async function getAdminAuth(page) {
  21  |   if (_authCache) return _authCache;
  22  |   clearRateLimits();
  23  |   const check = await page.request.get('/api/setup');
  24  |   const checkData = await check.json().catch(() => ({}));
  25  |   if (checkData?.data?.needs_setup) {
  26  |     await page.request.post('/api/setup', {
  27  |       data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
  28  |     });
  29  |   }
  30  |   clearRateLimits();
  31  |   let token = null;
  32  |   for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  33  |     const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
  34  |     const d = await r.json().catch(() => ({}));
  35  |     if (d?.data?.token) { token = d.data.token; _authCache = { token, user: { id: d.data.user_id, username: d.data.username, display_name: d.data.display_name, role: d.data.role, permissions: d.data.permissions } }; break; }
  36  |     clearRateLimits();
  37  |   }
  38  |   return _authCache;
  39  | }
  40  | 
  41  | async function loginAsAdmin(page) {
  42  |   const auth = await getAdminAuth(page);
> 43  |   if (!auth) throw new Error('Cannot obtain admin token');
      |                    ^ Error: Cannot obtain admin token
  44  |   await page.addInitScript(({ token, user }) => {
  45  |     localStorage.setItem('ppk_token', token);
  46  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  47  |   }, auth);
  48  |   return auth;
  49  | }
  50  | 
  51  | // ════════════════════════════════════════════
  52  | // A1: Sidebar Behavior ตาม Viewport
  53  | // ════════════════════════════════════════════
  54  | test.describe('Sidebar — Desktop (>900px)', () => {
  55  |   test('desktop: sidebar มองเห็น, hamburger ซ่อน', async ({ page }) => {
  56  |     await page.setViewportSize({ width: 1280, height: 800 });
  57  |     await loginAsAdmin(page);
  58  |     await page.goto('/dashboard.html');
  59  |     await page.waitForLoadState('networkidle');
  60  |     const sidebar = page.locator('.sidebar');
  61  |     await expect(sidebar).toBeVisible();
  62  |     // hamburger ต้องซ่อนอยู่หรือไม่มีบน desktop
  63  |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger');
  64  |     if (await hamburger.count() > 0) {
  65  |       await expect(hamburger).toHaveCSS('display', /none|inline/);
  66  |     }
  67  |   });
  68  | 
  69  |   test('desktop 1024px: sidebar ยังมองเห็น', async ({ page }) => {
  70  |     await page.setViewportSize({ width: 1024, height: 768 });
  71  |     await loginAsAdmin(page);
  72  |     await page.goto('/dashboard.html');
  73  |     await page.waitForLoadState('networkidle');
  74  |     await expect(page.locator('.sidebar')).toBeVisible();
  75  |   });
  76  | });
  77  | 
  78  | test.describe('Sidebar — Mobile (<900px)', () => {
  79  |   test('mobile 390px: sidebar ซ่อน, hamburger โผล่', async ({ page }) => {
  80  |     await page.setViewportSize({ width: 390, height: 844 });
  81  |     await loginAsAdmin(page);
  82  |     await page.goto('/dashboard.html');
  83  |     await page.waitForLoadState('networkidle');
  84  |     // sidebar ต้องซ่อน (transform translateX หรือ display none)
  85  |     const sidebar = page.locator('.sidebar');
  86  |     const isVisible = await sidebar.evaluate(el => {
  87  |       const style = window.getComputedStyle(el);
  88  |       const transform = style.transform;
  89  |       return !transform.includes('matrix') || !transform.match(/-\d/) ? true : false;
  90  |     }).catch(() => true);
  91  |     // hamburger ต้องโผล่
  92  |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  93  |     await expect(hamburger).toBeVisible();
  94  |   });
  95  | 
  96  |   test('mobile: คลิก hamburger → sidebar เปิด', async ({ page }) => {
  97  |     await page.setViewportSize({ width: 390, height: 844 });
  98  |     await loginAsAdmin(page);
  99  |     await page.goto('/dashboard.html');
  100 |     await page.waitForLoadState('networkidle');
  101 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  102 |     await hamburger.click();
  103 |     await page.waitForTimeout(400); // รอ animation
  104 |     const sidebar = page.locator('.sidebar');
  105 |     await expect(sidebar).toHaveClass(/open/);
  106 |   });
  107 | 
  108 |   test('mobile: คลิก overlay → sidebar ปิด', async ({ page }) => {
  109 |     await page.setViewportSize({ width: 390, height: 844 });
  110 |     await loginAsAdmin(page);
  111 |     await page.goto('/dashboard.html');
  112 |     await page.waitForLoadState('networkidle');
  113 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  114 |     await hamburger.click();
  115 |     await page.waitForTimeout(400);
  116 |     const overlay = page.locator('.sidebar-overlay');
  117 |     if (await overlay.count() > 0) {
  118 |       // ใช้ JS click เพื่อหลีกเลี่ยง sidebar-brand intercepting pointer events
  119 |       await page.evaluate(() => {
  120 |         const el = document.querySelector('.sidebar-overlay');
  121 |         if (el) el.click();
  122 |       });
  123 |       await page.waitForTimeout(400);
  124 |       const sidebar = page.locator('.sidebar');
  125 |       const classes = await sidebar.getAttribute('class');
  126 |       expect(classes).not.toContain('open');
  127 |     }
  128 |   });
  129 | 
  130 |   test('mobile 375px (iPhone SE): sidebar ซ่อน, hamburger โผล่', async ({ page }) => {
  131 |     await page.setViewportSize({ width: 375, height: 667 });
  132 |     await loginAsAdmin(page);
  133 |     await page.goto('/dashboard.html');
  134 |     await page.waitForLoadState('networkidle');
  135 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  136 |     await expect(hamburger).toBeVisible();
  137 |   });
  138 | });
  139 | 
  140 | // ════════════════════════════════════════════
  141 | // A2: Top Bar & Header
  142 | // ════════════════════════════════════════════
  143 | test.describe('Topbar & Header', () => {
```