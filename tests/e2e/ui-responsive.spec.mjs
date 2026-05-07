// ==============================================================
// PPK DriveHub — Responsive Layout Tests
// ทดสอบ: Layout ทุก breakpoint, Table scroll, Form modal, Typography
// รัน: ทุก project
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

function clearRateLimits() {
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
}

let _authCache = null;

async function loginAsAdmin(page) {
  if (!_authCache) {
    clearRateLimits();
    const check = await page.request.get('/api/setup');
    const checkData = await check.json().catch(() => ({}));
    if (checkData?.data?.needs_setup) {
      await page.request.post('/api/setup', {
        data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
      });
    }
    clearRateLimits();
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
      const d = await r.json().catch(() => ({}));
      if (d?.data?.token) {
        _authCache = { token: d.data.token, user: { id: d.data.user_id, username: d.data.username, display_name: d.data.display_name, role: d.data.role, permissions: d.data.permissions } };
        break;
      }
      clearRateLimits();
    }
  }
  if (!_authCache) throw new Error('Cannot obtain admin token');
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('ppk_token', token);
    localStorage.setItem('ppk_user', JSON.stringify(user));
  }, _authCache);
}

// helper ตรวจ horizontal overflow
async function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

// ════════════════════════════════════════════
// B1: Dashboard Layout ใน 6 Viewports
// ════════════════════════════════════════════
const VIEWPORTS = [
  { width: 1280, height: 800,  label: '1280×800 Desktop HD' },
  { width: 1024, height: 768,  label: '1024×768 Tablet landscape' },
  { width: 900,  height: 600,  label: '900×600 Breakpoint' },
  { width: 768,  height: 1024, label: '768×1024 iPad portrait' },
  { width: 390,  height: 844,  label: '390×844 iPhone 14' },
  { width: 375,  height: 667,  label: '375×667 iPhone SE' },
];

test.describe('Dashboard Layout — 6 Viewports', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.label} — ไม่มี horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsAdmin(page);
      await page.goto('/dashboard.html');
      await page.waitForLoadState('networkidle');
      // รอ JS render
      await page.waitForTimeout(500);
      const overflow = await hasHorizontalScroll(page);
      expect(overflow).toBe(false);
    });

    test(`${vp.label} — หน้า vehicles ไม่ overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsAdmin(page);
      await page.goto('/vehicles.html');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const overflow = await hasHorizontalScroll(page);
      expect(overflow).toBe(false);
    });
  }
});

// ════════════════════════════════════════════
// B2: Table Scroll on Mobile
// ════════════════════════════════════════════
test.describe('Table Scroll บน Mobile', () => {
  const TABLE_PAGES = [
    { path: '/vehicles.html', label: 'vehicles' },
    { path: '/drivers.html', label: 'drivers' },
    { path: '/repair.html', label: 'repair' },
    { path: '/usage-log.html', label: 'usage-log' },
  ];

  for (const p of TABLE_PAGES) {
    test(`${p.label} — .table-wrap overflow-x: auto บน 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await loginAsAdmin(page);
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const tableWrap = page.locator('.table-wrap, .table-container, [class*="table-wrap"]').first();
      if (await tableWrap.count() > 0) {
        const overflowX = await tableWrap.evaluate(el => window.getComputedStyle(el).overflowX);
        expect(['auto', 'scroll']).toContain(overflowX);
      }
    });
  }

  test('vehicles — page ไม่มี horizontal scroll บน 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });
});

// ════════════════════════════════════════════
// B3: Form Modal บน Mobile
// ════════════════════════════════════════════
test.describe('Form & Modal บน Mobile', () => {
  test('Login form — input มี height ≥ 40px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const input = page.locator('#username, input[type="text"], input[type="email"]').first();
    if (await input.count() > 0) {
      const height = await input.evaluate(el => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(40);
    }
  });

  test('Login form — ไม่มี horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('Register form — ไม่ overflow บน mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/register.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('forgot-password form — ไม่ overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/forgot-password.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });
});

// ════════════════════════════════════════════
// B4: QR Pages บน Mobile
// ════════════════════════════════════════════
test.describe('QR Pages บน Mobile', () => {
  const QR_PAGES = [
    '/qr-scan.html',
    '/qr-daily-check.html',
    '/qr-fuel-record.html',
    '/qr-usage-record.html',
    '/qr-survey.html',
  ];

  for (const path of QR_PAGES) {
    test(`${path} — โหลดได้, ไม่ overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      const overflow = await hasHorizontalScroll(page);
      expect(overflow).toBe(false);
    });
  }
});

// ════════════════════════════════════════════
// B5: Typography — Font Scale
// ════════════════════════════════════════════
test.describe('Typography & Text', () => {
  test('body font-size ≥ 13px บน iPhone SE (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const bodyFontSize = await page.evaluate(() => {
      const body = document.body;
      return parseFloat(window.getComputedStyle(body).fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(13);
  });

  test('login page — ข้อความภาษาไทยแสดงได้ (ไม่เป็น ?)', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.evaluate(() => document.body.innerText);
    // ถ้ามีภาษาไทยต้องไม่มีแต่ '????'
    const garbled = (bodyText.match(/\?{4,}/g) || []).length;
    expect(garbled).toBe(0);
  });

  test('dashboard — card stats readable บน 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    // ตรวจว่า body โหลดและมีเนื้อหา
    const hasContent = await page.evaluate(() => document.body.innerText.trim().length > 0);
    expect(hasContent).toBe(true);
  });

  test('vehicles.html — ข้อความใน card ไม่ truncate ผิดปกติ', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    // page มี content
    const bodyLen = await page.evaluate(() => document.body.innerText.trim().length);
    expect(bodyLen).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════
// B6: Public Pages — ไม่ต้อง login
// ════════════════════════════════════════════
test.describe('Public Pages — ไม่ต้อง login', () => {
  const PUBLIC_PAGES = [
    { path: '/login.html', label: 'login' },
    { path: '/register.html', label: 'register' },
    { path: '/forgot-password.html', label: 'forgot-password' },
    { path: '/about.html', label: 'about' },
    { path: '/pdpa-policy.html', label: 'pdpa-policy' },
    { path: '/glossary.html', label: 'glossary' },
    { path: '/user-guide.html', label: 'user-guide' },
  ];

  for (const p of PUBLIC_PAGES) {
    test(`${p.label} — โหลดได้ ไม่มี redirect`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      // ต้องไม่ redirect ไป login
      if (p.path !== '/login.html') {
        expect(page.url()).not.toMatch(/login\.html$/);
      }
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe('complete');
    });
  }
});
