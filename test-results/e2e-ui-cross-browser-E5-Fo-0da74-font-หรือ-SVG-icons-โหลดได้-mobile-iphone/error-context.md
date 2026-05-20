# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-cross-browser.spec.mjs >> E5: Font & Icon Loading >> icon font หรือ SVG icons โหลดได้
- Location: tests\e2e\ui-cross-browser.spec.mjs:274:3

# Error details

```
Error: Cannot obtain admin token
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — Cross-Browser Compatibility Tests
  3   | // ทดสอบ: CSS features, JS APIs, Form inputs บน Firefox/Safari/Edge
  4   | // รัน: desktop-firefox, desktop-edge, desktop-safari (+ e2e-chromium)
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
  47  | // E1: CSS Custom Properties (Variables)
  48  | // ════════════════════════════════════════════
  49  | test.describe('E1: CSS Custom Properties', () => {
  50  |   test('--primary-color CSS variable resolve ได้', async ({ page }) => {
  51  |     await loginAsAdmin(page);
  52  |     await page.goto('/dashboard.html');
  53  |     await page.waitForLoadState('networkidle');
  54  |     const primaryColor = await page.evaluate(() => {
  55  |       return window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() ||
  56  |              window.getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() ||
  57  |              window.getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  58  |     });
  59  |     // ถ้ามี variable ต้องไม่ว่าง, ถ้าไม่มี variable ก็ผ่านได้
  60  |     expect(typeof primaryColor).toBe('string');
  61  |   });
  62  | 
  63  |   test('common.css โหลดได้ (status 200)', async ({ page }) => {
  64  |     const r = await page.request.get('/common.css');
  65  |     expect(r.status()).toBe(200);
  66  |     const contentType = r.headers()['content-type'] || '';
  67  |     expect(contentType).toContain('css');
  68  |   });
  69  | 
  70  |   test('login.html CSS render — background ≠ transparent', async ({ page }) => {
  71  |     await page.goto('/login.html');
  72  |     await page.waitForLoadState('networkidle');
  73  |     const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  74  |     // ต้องไม่เป็น undefined หรือ empty
  75  |     expect(bg).toBeTruthy();
  76  |   });
  77  | 
  78  |   test('CSS Grid ทำงานบน dashboard', async ({ page }) => {
  79  |     await loginAsAdmin(page);
  80  |     await page.goto('/dashboard.html');
  81  |     await page.waitForLoadState('networkidle');
  82  |     const gridSupport = await page.evaluate(() => CSS.supports('display', 'grid'));
  83  |     expect(gridSupport).toBe(true);
  84  |   });
  85  | 
  86  |   test('CSS clamp() รองรับได้', async ({ page }) => {
  87  |     await page.goto('/login.html');
  88  |     await page.waitForLoadState('networkidle');
  89  |     const clampSupport = await page.evaluate(() => CSS.supports('font-size', 'clamp(1rem, 2vw, 1.5rem)'));
  90  |     expect(clampSupport).toBe(true);
  91  |   });
  92  | });
  93  | 
  94  | // ════════════════════════════════════════════
  95  | // E2: JavaScript APIs
  96  | // ════════════════════════════════════════════
  97  | test.describe('E2: JavaScript APIs', () => {
  98  |   test('fetch API มีในทุก browser', async ({ page }) => {
  99  |     await page.goto('/login.html');
  100 |     const hasFetch = await page.evaluate(() => typeof window.fetch === 'function');
  101 |     expect(hasFetch).toBe(true);
  102 |   });
  103 | 
  104 |   test('localStorage API มีใน browser', async ({ page }) => {
  105 |     await page.goto('/login.html');
  106 |     const hasLS = await page.evaluate(() => {
  107 |       try {
  108 |         localStorage.setItem('_test', '1');
  109 |         localStorage.removeItem('_test');
  110 |         return true;
  111 |       } catch { return false; }
  112 |     });
  113 |     expect(hasLS).toBe(true);
  114 |   });
  115 | 
  116 |   test('URL API รองรับ URLSearchParams', async ({ page }) => {
  117 |     await page.goto('/login.html');
  118 |     const hasURL = await page.evaluate(() => {
  119 |       try {
  120 |         const u = new URL('http://example.com/path?a=1');
  121 |         return u.searchParams.get('a') === '1';
  122 |       } catch { return false; }
  123 |     });
  124 |     expect(hasURL).toBe(true);
  125 |   });
  126 | 
  127 |   test('Intl.DateTimeFormat th-TH รองรับ', async ({ page }) => {
  128 |     await page.goto('/login.html');
  129 |     const formatted = await page.evaluate(() => {
  130 |       try {
  131 |         return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long' }).format(new Date('2025-06-15'));
  132 |       } catch { return null; }
  133 |     });
  134 |     expect(formatted).not.toBeNull();
  135 |     expect(typeof formatted).toBe('string');
  136 |   });
  137 | 
  138 |   test('Promise API รองรับ', async ({ page }) => {
  139 |     await page.goto('/login.html');
```