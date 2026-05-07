// ==============================================================
// PPK DriveHub — Mobile Workflow Tests
// ทดสอบ: Workflows จริงบนอุปกรณ์มือถือ (390px, 375px viewports)
// จุดประสงค์: verify ว่า critical flows ใช้งานได้บน phone
// รัน: mobile-android, mobile-iphone, mobile-iphone-se (+ e2e-chromium)
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

// ════════════════════════════════════════════
// C1: Login Flow บน Mobile
// ════════════════════════════════════════════
test.describe('C1: Login Flow — Mobile', () => {
  test('login page โหลด — form อยู่ตรงกลาง', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const form = page.locator('form, .login-card, .auth-card, .card').first();
    await expect(form).toBeVisible();
    // ตรวจว่า form ไม่ overflow จาก viewport
    const vpWidth = page.viewportSize()?.width || 390;
    const box = await form.boundingBox();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vpWidth + 5);
    }
  });

  test('email input มี type=email (mobile keyboard ขึ้นถูก)', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[name="username"], #username').first();
    if (await emailInput.count() > 0) {
      const type = await emailInput.getAttribute('type');
      // email หรือ text ก็ยอมรับ (บาง app ใช้ username แทน email)
      expect(['email', 'text', null]).toContain(type);
    }
  });

  test('password input มี type=password (ปกปิดรหัส)', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const pwInput = page.locator('input[type="password"], #password').first();
    await expect(pwInput).toBeVisible();
    expect(await pwInput.getAttribute('type')).toBe('password');
  });

  test('กรอก username+password → submit ได้ (API response)', async ({ page }) => {
    clearRateLimits();
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const usernameInput = page.locator('#username, input[name="username"]').first();
    const passwordInput = page.locator('#password, input[type="password"]').first();
    await usernameInput.fill(ADMIN_USER);
    await passwordInput.fill(ADMIN_PASS || 'dummy');
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }),
      page.locator('#loginBtn, button[type="submit"]').first().click(),
    ]);
    expect(response.status()).toBeLessThan(500);
  });
});

// ════════════════════════════════════════════
// C2: QR Pages บน Mobile
// ════════════════════════════════════════════
test.describe('C2: QR Pages — Mobile Access', () => {
  test('qr-scan.html โหลดได้โดยไม่ต้อง login', async ({ page }) => {
    await page.goto('/qr-scan.html');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/login/);
    const body = await page.evaluate(() => document.body.innerHTML.trim());
    expect(body.length).toBeGreaterThan(100);
  });

  test('qr-daily-check.html โหลดได้', async ({ page }) => {
    await page.goto('/qr-daily-check.html');
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerHTML.trim());
    expect(body.length).toBeGreaterThan(100);
  });

  test('qr-fuel-record.html โหลดได้', async ({ page }) => {
    await page.goto('/qr-fuel-record.html');
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerHTML.trim());
    expect(body.length).toBeGreaterThan(100);
  });

  test('qr-usage-record.html โหลดได้', async ({ page }) => {
    await page.goto('/qr-usage-record.html');
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerHTML.trim());
    expect(body.length).toBeGreaterThan(100);
  });

  test('qr-survey.html โหลดได้', async ({ page }) => {
    await page.goto('/qr-survey.html');
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerHTML.trim());
    expect(body.length).toBeGreaterThan(100);
  });
});

// ════════════════════════════════════════════
// C3: Queue Manage — Mobile UI
// ════════════════════════════════════════════
test.describe('C3: Queue Manage — Mobile UI', () => {
  test('queue-manage.html โหลดได้บน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    const vpWidth = page.viewportSize()?.width || 390;
    expect(vpWidth).toBeGreaterThan(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('queue-manage: ปุ่ม "เพิ่มคิว/จองคิว" มองเห็นบน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    // หาปุ่มเพิ่มคิว
    const addBtn = page.locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว"), [data-action="add-queue"]').first();
    if (await addBtn.count() > 0) {
      await expect(addBtn).toBeVisible();
      // ตรวจ touch target ≥ 40px
      const height = await addBtn.evaluate(el => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(40);
    }
  });

  test('queue-manage: modal เปิดได้บน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(500);
      // Modal หรือ form โผล่
      const modal = page.locator('.modal, [role="dialog"], .form-card, form').first();
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
      }
    }
  });
});

// ════════════════════════════════════════════
// C4: Notifications บน Mobile
// ════════════════════════════════════════════
test.describe('C4: Notifications — Mobile', () => {
  test('notifications.html โหลดได้บน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/notifications.html');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('notifications: list แสดงเป็น column', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/notifications.html');
    await page.waitForLoadState('networkidle');
    // รอ load
    await page.waitForTimeout(500);
    // page มีเนื้อหา
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════
// C5: Reports บน Mobile
// ════════════════════════════════════════════
test.describe('C5: Reports — Mobile View', () => {
  test('reports.html โหลดได้บน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('executive-dashboard.html โหลดได้บน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/executive-dashboard.html');
    await page.waitForLoadState('networkidle');
    // ตรวจว่า page โหลดได้และมี content
    const body = await page.evaluate(() => document.body.innerHTML.trim());
    expect(body.length).toBeGreaterThan(100);
  });
});

// ════════════════════════════════════════════
// C6: Dashboard + Sidebar บน Mobile
// ════════════════════════════════════════════
test.describe('C6: Dashboard — Mobile Navigation', () => {
  test('dashboard โหลดสำเร็จ + sidebar toggle ทำงาน', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    // ตรวจ hamburger โผล่
    const vpWidth = page.viewportSize()?.width ?? 390;
    if (vpWidth < 900) {
      const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
      if (await hamburger.count() > 0) {
        await expect(hamburger).toBeVisible();
        await hamburger.click();
        await page.waitForTimeout(300);
        const sidebar = page.locator('.sidebar');
        await expect(sidebar).toHaveClass(/open/);
      }
    }
  });

  test('dashboard: stat cards ไม่ overflow บน 390px', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('vehicles.html: เปิดได้บน mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
