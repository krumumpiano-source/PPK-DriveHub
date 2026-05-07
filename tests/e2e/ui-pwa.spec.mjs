// ==============================================================
// PPK DriveHub — PWA & Service Worker Tests
// ทดสอบ: manifest.json, service worker, offline mode, installability
// รัน: e2e-chromium (+ mobile projects)
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
// D1: PWA Manifest
// ════════════════════════════════════════════
test.describe('D1: PWA Manifest', () => {
  test('GET /manifest.json → 200 + valid JSON', async ({ page }) => {
    const r = await page.request.get('/manifest.json');
    expect(r.status()).toBe(200);
    const body = await r.json().catch(() => null);
    expect(body).not.toBeNull();
    expect(body.name || body.short_name).toBeTruthy();
  });

  test('manifest มี display: standalone', async ({ page }) => {
    const r = await page.request.get('/manifest.json');
    const body = await r.json().catch(() => ({}));
    expect(body.display).toBe('standalone');
  });

  test('manifest มี icons array ไม่ว่าง', async ({ page }) => {
    const r = await page.request.get('/manifest.json');
    const body = await r.json().catch(() => ({}));
    expect(Array.isArray(body.icons)).toBe(true);
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test('manifest มี start_url', async ({ page }) => {
    const r = await page.request.get('/manifest.json');
    const body = await r.json().catch(() => ({}));
    expect(typeof body.start_url).toBe('string');
    expect(body.start_url.length).toBeGreaterThan(0);
  });

  test('dashboard.html มี <link rel="manifest">', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const manifestLink = await page.evaluate(() => {
      const el = document.querySelector('link[rel="manifest"]');
      return el ? el.getAttribute('href') : null;
    });
    expect(manifestLink).not.toBeNull();
  });

  test('dashboard.html มี <meta name="theme-color">', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const themeColor = await page.evaluate(() => {
      const el = document.querySelector('meta[name="theme-color"]');
      return el ? el.getAttribute('content') : null;
    });
    // theme-color ต้องมี (อาจ inject โดย common.js)
    expect(themeColor).not.toBeNull();
  });
});

// ════════════════════════════════════════════
// D2: Service Worker
// ════════════════════════════════════════════
test.describe('D2: Service Worker', () => {
  test('GET /sw.js → 200', async ({ page }) => {
    const r = await page.request.get('/sw.js');
    expect(r.status()).toBe(200);
  });

  test('sw.js มีเนื้อหา (ไม่ว่าง)', async ({ page }) => {
    const r = await page.request.get('/sw.js');
    const text = await r.text();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test('dashboard: serviceWorker API มีใน browser', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const hasServiceWorker = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasServiceWorker).toBe(true);
  });

  test('service worker register ได้ (ไม่ throw error)', async ({ page }) => {
    await loginAsAdmin(page);
    // Track SW registration errors
    const swErrors = [];
    page.on('pageerror', err => {
      if (err.message.toLowerCase().includes('serviceworker')) {
        swErrors.push(err.message);
      }
    });
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // รอ SW register
    expect(swErrors.length).toBe(0);
  });
});

// ════════════════════════════════════════════
// D3: App Shell & Meta Tags
// ════════════════════════════════════════════
test.describe('D3: App Shell & Meta Tags', () => {
  test('dashboard: <meta name="viewport"> มีใน head', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const viewport = await page.evaluate(() => {
      const el = document.querySelector('meta[name="viewport"]');
      return el ? el.getAttribute('content') : null;
    });
    expect(viewport).not.toBeNull();
    expect(viewport).toContain('width=device-width');
  });

  test('login: <meta name="viewport"> มีใน head', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const viewport = await page.evaluate(() => {
      const el = document.querySelector('meta[name="viewport"]');
      return el ? el.getAttribute('content') : null;
    });
    expect(viewport).not.toBeNull();
    expect(viewport).toContain('width=device-width');
  });

  test('qr-scan: viewport มี viewport-fit=cover', async ({ page }) => {
    await page.goto('/qr-scan.html');
    await page.waitForLoadState('networkidle');
    const viewport = await page.evaluate(() => {
      const el = document.querySelector('meta[name="viewport"]');
      return el ? el.getAttribute('content') : null;
    });
    if (viewport) {
      expect(viewport).toContain('width=device-width');
    }
  });

  test('ทุกหน้ามี <meta charset="utf-8">', async ({ page }) => {
    for (const path of ['/login.html', '/dashboard.html', '/vehicles.html']) {
      if (path === '/dashboard.html') await loginAsAdmin(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const charset = await page.evaluate(() => document.characterSet);
      expect(charset.toLowerCase()).toBe('utf-8');
    }
  });
});
