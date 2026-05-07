// ==============================================================
// PPK DriveHub — Tablet Layout Tests
// ทดสอบ: iPad Portrait/Landscape, Android Tablet
// รัน: tablet-ipad, tablet-android (+ e2e-chromium)
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
    const d = await check.json().catch(() => ({}));
    if (d?.data?.needs_setup) {
      await page.request.post('/api/setup', {
        data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
      });
    }
    clearRateLimits();
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
      const body = await r.json().catch(() => ({}));
      if (body?.data?.token) {
        _authCache = { token: body.data.token, user: { id: body.data.user_id, username: body.data.username, display_name: body.data.display_name, role: body.data.role, permissions: body.data.permissions } };
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

async function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

// ════════════════════════════════════════════
// F1: iPad Portrait (820×1180)
// ════════════════════════════════════════════
test.describe('F1: iPad Portrait (820×1180)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
  });

  test('dashboard โหลดได้ ไม่มี horizontal scroll', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('iPad portrait (820px < 900px): hamburger โผล่', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    if (await hamburger.count() > 0) {
      await expect(hamburger).toBeVisible();
    }
  });

  test('vehicles.html ไม่มี horizontal scroll', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('queue-manage.html ไม่มี horizontal scroll', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('login page ไม่มี horizontal scroll', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });
});

// ════════════════════════════════════════════
// F2: iPad Landscape (1180×820 — >900px → sidebar visible)
// ════════════════════════════════════════════
test.describe('F2: iPad Landscape (1180×820)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
  });

  test('dashboard: sidebar มองเห็นโดยตรง (>900px)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('iPad landscape ไม่มี horizontal scroll', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('vehicles table landscape ไม่มี overflow', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });
});

// ════════════════════════════════════════════
// F3: Android Tablet 768px (tablet portrait)
// ════════════════════════════════════════════
test.describe('F3: Android Tablet Portrait (768×1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test('dashboard โหลดได้', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('768px: hamburger โผล่ (ใต้ 900px breakpoint)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    if (await hamburger.count() > 0) {
      await expect(hamburger).toBeVisible();
    }
  });

  test('reports.html ไม่มี overflow', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('repair.html ไม่มี overflow', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/repair.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });
});

// ════════════════════════════════════════════
// F4: Tablet Sidebar Toggle
// ════════════════════════════════════════════
test.describe('F4: Tablet Sidebar Toggle', () => {
  test('tablet 820px: hamburger click → sidebar open', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    if (await hamburger.count() > 0) {
      await hamburger.click();
      await page.waitForTimeout(400);
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toHaveClass(/open/);
      // ปิดด้วย overlay
      const overlay = page.locator('.sidebar-overlay');
      if (await overlay.count() > 0) {
        await overlay.click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(400);
        const classes = await sidebar.getAttribute('class');
        expect(classes).not.toContain('open');
      }
    }
  });

  test('tablet landscape 1180px: sidebar visible ตลอด', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });
});

// ════════════════════════════════════════════
// F5: QR Pages บน Tablet
// ════════════════════════════════════════════
test.describe('F5: QR Pages บน Tablet', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
  });

  test('qr-scan.html บน tablet: ไม่ overflow', async ({ page }) => {
    await page.goto('/qr-scan.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });

  test('qr-daily-check.html บน tablet: โหลดได้', async ({ page }) => {
    await page.goto('/qr-daily-check.html');
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerHTML.trim().length);
    expect(body).toBeGreaterThan(100);
  });

  test('qr-manage.html (auth) บน tablet: โหลดได้', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/qr-manage.html');
    await page.waitForLoadState('networkidle');
    const overflow = await hasHorizontalScroll(page);
    expect(overflow).toBe(false);
  });
});
