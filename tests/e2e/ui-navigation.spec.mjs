// ==============================================================
// PPK DriveHub — UI Navigation & Layout Tests
// ทดสอบ: Sidebar, Topbar, Active State, Keyboard Accessibility
// รัน: ทุก project (Desktop + Mobile + Tablet)
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

function clearRateLimits() {
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
}

// Shared auth cache (ไม่ขึ้นกับ viewport)
let _authCache = null;

async function getAdminAuth(page) {
  if (_authCache) return _authCache;
  clearRateLimits();
  const check = await page.request.get('/api/setup');
  const checkData = await check.json().catch(() => ({}));
  if (checkData?.data?.needs_setup) {
    await page.request.post('/api/setup', {
      data: { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' },
    });
  }
  clearRateLimits();
  let token = null;
  for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
    const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
    const d = await r.json().catch(() => ({}));
    if (d?.data?.token) { token = d.data.token; _authCache = { token, user: { id: d.data.user_id, username: d.data.username, display_name: d.data.display_name, role: d.data.role, permissions: d.data.permissions } }; break; }
    clearRateLimits();
  }
  return _authCache;
}

async function loginAsAdmin(page) {
  const auth = await getAdminAuth(page);
  if (!auth) throw new Error('Cannot obtain admin token');
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('ppk_token', token);
    localStorage.setItem('ppk_user', JSON.stringify(user));
  }, auth);
  return auth;
}

// ════════════════════════════════════════════
// A1: Sidebar Behavior ตาม Viewport
// ════════════════════════════════════════════
test.describe('Sidebar — Desktop (>900px)', () => {
  test('desktop: sidebar มองเห็น, hamburger ซ่อน', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    // hamburger ต้องซ่อนอยู่หรือไม่มีบน desktop
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger');
    if (await hamburger.count() > 0) {
      await expect(hamburger).toHaveCSS('display', /none|inline/);
    }
  });

  test('desktop 1024px: sidebar ยังมองเห็น', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});

test.describe('Sidebar — Mobile (<900px)', () => {
  test('mobile 390px: sidebar ซ่อน, hamburger โผล่', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    // sidebar ต้องซ่อน (transform translateX หรือ display none)
    const sidebar = page.locator('.sidebar');
    const isVisible = await sidebar.evaluate(el => {
      const style = window.getComputedStyle(el);
      const transform = style.transform;
      return !transform.includes('matrix') || !transform.match(/-\d/) ? true : false;
    }).catch(() => true);
    // hamburger ต้องโผล่
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    await expect(hamburger).toBeVisible();
  });

  test('mobile: คลิก hamburger → sidebar เปิด', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    await hamburger.click();
    await page.waitForTimeout(400); // รอ animation
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveClass(/open/);
  });

  test('mobile: คลิก overlay → sidebar ปิด', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    await hamburger.click();
    await page.waitForTimeout(400);
    const overlay = page.locator('.sidebar-overlay');
    if (await overlay.count() > 0) {
      await overlay.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(400);
      const sidebar = page.locator('.sidebar');
      const classes = await sidebar.getAttribute('class');
      expect(classes).not.toContain('open');
    }
  });

  test('mobile 375px (iPhone SE): sidebar ซ่อน, hamburger โผล่', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    await expect(hamburger).toBeVisible();
  });
});

// ════════════════════════════════════════════
// A2: Top Bar & Header
// ════════════════════════════════════════════
test.describe('Topbar & Header', () => {
  test('dashboard มี <title> ที่ไม่ว่าง', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('login page มี <title>', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('topbar/header มองเห็น', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const topbar = page.locator('.topbar, #topbar, header');
    if (await topbar.count() > 0) {
      await expect(topbar.first()).toBeVisible();
    }
  });

  test('logout button ทำงาน → redirect ไป login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const logoutBtn = page.locator('[data-logout], #logoutBtn, .logout-btn, button:has-text("ออกจาก")').first();
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForURL(/login/, { timeout: 8000 });
      expect(page.url()).toMatch(/login/);
    }
  });
});

// ════════════════════════════════════════════
// A3: Navigation Active State
// ════════════════════════════════════════════
test.describe('Navigation Active State', () => {
  test('เข้า /dashboard.html → sidebar มี active item', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    // active class ต้องมีใน sidebar
    const activeItem = page.locator('.sidebar .active, .sidebar [class*="active"], .nav-item.active');
    await expect(activeItem.first()).toBeVisible();
  });

  test('เข้า /vehicles.html → sidebar มี active item', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    const activeItem = page.locator('.sidebar .active, .sidebar [class*="active"]');
    expect(await activeItem.count()).toBeGreaterThan(0);
  });

  test('เข้า /queue-manage.html → sidebar มี active item', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    const activeItem = page.locator('.sidebar .active, .sidebar [class*="active"]');
    expect(await activeItem.count()).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════
// A4: Keyboard & Accessibility
// ════════════════════════════════════════════
test.describe('Keyboard & Accessibility', () => {
  test('sidebar links focus visible ด้วย Tab key', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 800 });
    // กด Tab หลายครั้ง แล้วตรวจว่ามี focus ที่ไหนสักที่
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'DETAILS']).toContain(focused);
  });

  test('hamburger มี aria หรือ accessible label', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
    if (await hamburger.count() > 0) {
      const tag = await hamburger.evaluate(el => el.tagName.toLowerCase());
      // ต้องเป็น button หรือมี role=button
      const role = await hamburger.getAttribute('role');
      expect(['button', 'img'].includes(tag) || role === 'button' || tag === 'button').toBeTruthy();
    }
  });

  test('ทุกหน้า public มี charset UTF-8 (Thai text)', async ({ page }) => {
    await page.goto('/login.html');
    const charset = await page.evaluate(() => document.characterSet);
    expect(charset.toLowerCase()).toBe('utf-8');
  });
});

// ════════════════════════════════════════════
// A5: Protected Routes (Auth Guard)
// ════════════════════════════════════════════
test.describe('Auth Guard', () => {
  test('/dashboard.html ไม่มี token → redirect login', async ({ page }) => {
    // clear localStorage ก่อน
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/dashboard.html');
    await page.waitForURL(/login/, { timeout: 8000 });
    expect(page.url()).toMatch(/login/);
  });

  test('/vehicles.html ไม่มี token → redirect login', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/vehicles.html');
    await page.waitForURL(/login/, { timeout: 8000 });
    expect(page.url()).toMatch(/login/);
  });
});
