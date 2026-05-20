# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-responsive.spec.mjs >> Dashboard Layout — 6 Viewports >> 1024×768 Tablet landscape — หน้า vehicles ไม่ overflow
- Location: tests\e2e\ui-responsive.spec.mjs:77:5

# Error details

```
Error: Cannot obtain admin token
```

# Test source

```ts
  1   | // ==============================================================
  2   | // PPK DriveHub — Responsive Layout Tests
  3   | // ทดสอบ: Layout ทุก breakpoint, Table scroll, Form modal, Typography
  4   | // รัน: ทุก project
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
  18  | 
  19  | async function loginAsAdmin(page) {
  20  |   if (!_authCache) {
  21  |     clearRateLimits();
  22  |     const check = await page.request.get('/api/setup');
  23  |     const checkData = await check.json().catch(() => ({}));
  24  |     if (checkData?.data?.needs_setup) {
  25  |       await page.request.post('/api/setup', {
  26  |         data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
  27  |       });
  28  |     }
  29  |     clearRateLimits();
  30  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  31  |       const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
  32  |       const d = await r.json().catch(() => ({}));
  33  |       if (d?.data?.token) {
  34  |         _authCache = { token: d.data.token, user: { id: d.data.user_id, username: d.data.username, display_name: d.data.display_name, role: d.data.role, permissions: d.data.permissions } };
  35  |         break;
  36  |       }
  37  |       clearRateLimits();
  38  |     }
  39  |   }
> 40  |   if (!_authCache) throw new Error('Cannot obtain admin token');
      |                          ^ Error: Cannot obtain admin token
  41  |   await page.addInitScript(({ token, user }) => {
  42  |     localStorage.setItem('ppk_token', token);
  43  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  44  |   }, _authCache);
  45  | }
  46  | 
  47  | // helper ตรวจ horizontal overflow
  48  | async function hasHorizontalScroll(page) {
  49  |   return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  50  | }
  51  | 
  52  | // ════════════════════════════════════════════
  53  | // B1: Dashboard Layout ใน 6 Viewports
  54  | // ════════════════════════════════════════════
  55  | const VIEWPORTS = [
  56  |   { width: 1280, height: 800,  label: '1280×800 Desktop HD' },
  57  |   { width: 1024, height: 768,  label: '1024×768 Tablet landscape' },
  58  |   { width: 900,  height: 600,  label: '900×600 Breakpoint' },
  59  |   { width: 768,  height: 1024, label: '768×1024 iPad portrait' },
  60  |   { width: 390,  height: 844,  label: '390×844 iPhone 14' },
  61  |   { width: 375,  height: 667,  label: '375×667 iPhone SE' },
  62  | ];
  63  | 
  64  | test.describe('Dashboard Layout — 6 Viewports', () => {
  65  |   for (const vp of VIEWPORTS) {
  66  |     test(`${vp.label} — ไม่มี horizontal scroll`, async ({ page }) => {
  67  |       await page.setViewportSize({ width: vp.width, height: vp.height });
  68  |       await loginAsAdmin(page);
  69  |       await page.goto('/dashboard.html');
  70  |       await page.waitForLoadState('networkidle');
  71  |       // รอ JS render
  72  |       await page.waitForTimeout(500);
  73  |       const overflow = await hasHorizontalScroll(page);
  74  |       expect(overflow).toBe(false);
  75  |     });
  76  | 
  77  |     test(`${vp.label} — หน้า vehicles ไม่ overflow`, async ({ page }) => {
  78  |       await page.setViewportSize({ width: vp.width, height: vp.height });
  79  |       await loginAsAdmin(page);
  80  |       await page.goto('/vehicles.html');
  81  |       await page.waitForLoadState('networkidle');
  82  |       await page.waitForTimeout(500);
  83  |       const overflow = await hasHorizontalScroll(page);
  84  |       expect(overflow).toBe(false);
  85  |     });
  86  |   }
  87  | });
  88  | 
  89  | // ════════════════════════════════════════════
  90  | // B2: Table Scroll on Mobile
  91  | // ════════════════════════════════════════════
  92  | test.describe('Table Scroll บน Mobile', () => {
  93  |   const TABLE_PAGES = [
  94  |     { path: '/vehicles.html', label: 'vehicles' },
  95  |     { path: '/drivers.html', label: 'drivers' },
  96  |     { path: '/repair.html', label: 'repair' },
  97  |     { path: '/usage-log.html', label: 'usage-log' },
  98  |   ];
  99  | 
  100 |   for (const p of TABLE_PAGES) {
  101 |     test(`${p.label} — .table-wrap overflow-x: auto บน 390px`, async ({ page }) => {
  102 |       await page.setViewportSize({ width: 390, height: 844 });
  103 |       await loginAsAdmin(page);
  104 |       await page.goto(p.path);
  105 |       await page.waitForLoadState('networkidle');
  106 |       await page.waitForTimeout(500);
  107 |       const tableWrap = page.locator('.table-wrap, .table-container, [class*="table-wrap"]').first();
  108 |       if (await tableWrap.count() > 0) {
  109 |         const overflowX = await tableWrap.evaluate(el => window.getComputedStyle(el).overflowX);
  110 |         expect(['auto', 'scroll']).toContain(overflowX);
  111 |       }
  112 |     });
  113 |   }
  114 | 
  115 |   test('vehicles — page ไม่มี horizontal scroll บน 390px', async ({ page }) => {
  116 |     await page.setViewportSize({ width: 390, height: 844 });
  117 |     await loginAsAdmin(page);
  118 |     await page.goto('/vehicles.html');
  119 |     await page.waitForLoadState('networkidle');
  120 |     await page.waitForTimeout(500);
  121 |     const overflow = await hasHorizontalScroll(page);
  122 |     expect(overflow).toBe(false);
  123 |   });
  124 | });
  125 | 
  126 | // ════════════════════════════════════════════
  127 | // B3: Form Modal บน Mobile
  128 | // ════════════════════════════════════════════
  129 | test.describe('Form & Modal บน Mobile', () => {
  130 |   test('Login form — input มี height ≥ 40px', async ({ page }) => {
  131 |     await page.setViewportSize({ width: 390, height: 844 });
  132 |     await page.goto('/login.html');
  133 |     await page.waitForLoadState('networkidle');
  134 |     const input = page.locator('#username, input[type="text"], input[type="email"]').first();
  135 |     if (await input.count() > 0) {
  136 |       const height = await input.evaluate(el => el.getBoundingClientRect().height);
  137 |       expect(height).toBeGreaterThanOrEqual(40);
  138 |     }
  139 |   });
  140 | 
```