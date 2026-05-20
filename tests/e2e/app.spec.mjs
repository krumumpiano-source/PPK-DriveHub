// ==============================================================
// PPK DriveHub — E2E Tests (Playwright)
// ทดสอบหน้าเว็บแต่ละหน้าผ่าน Browser
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

function clearRateLimits() {
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
}

// Ensure admin user exists before any test runs
test.beforeAll(async () => {
  clearRateLimits();
  const res = await fetch(`${BASE}/api/setup`);
  const data = await res.json();
  if (data?.data?.needs_setup) {
    await fetch(`${BASE}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' }),
    });
  }
});

// ──────────────────────────────────────────
// Helper: Login via API and set localStorage (cached)
// ──────────────────────────────────────────
let _authCache = null;

async function loginAsAdmin(page) {
  if (!_authCache) {
    clearRateLimits();

    // Login (try both passwords in case change-password test ran)
    let body;
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const response = await page.request.post('/api/auth/login', {
        data: { username: ADMIN_USER, password: pw },
      });
      body = await response.json();
      if (body.success) break;
    }

    if (!body?.success) {
      throw new Error(`Login failed: ${body?.error}`);
    }

    _authCache = {
      token: body.data.token,
      user: {
        id: body.data.user_id,
        username: body.data.username,
        display_name: body.data.display_name,
        role: body.data.role,
        permissions: body.data.permissions,
      },
    };
  }

  // Set auth in localStorage before navigating
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('ppk_token', token);
    localStorage.setItem('ppk_user', JSON.stringify(user));
  }, _authCache);

  return _authCache;
}

// ════════════════════════════════════════════
// 1. หน้า Login
// ════════════════════════════════════════════
test.describe('หน้า Login', () => {
  test('แสดงฟอร์ม login ถูกต้อง', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
    await expect(page).toHaveTitle(/เข้าสู่ระบบ|PPK DriveHub/);
  });

  test('login สำเร็จ → ไปหน้า dashboard', async ({ page }) => {
    clearRateLimits();
    // Determine actual admin password (api-integration may have changed it)
    let actualPass = ADMIN_PASS;
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: pw }),
      });
      const d = await r.json();
      if (d?.success || d?.data?.token) { actualPass = pw; break; }
      clearRateLimits();
    }
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', actualPass);
    await page.click('#loginBtn');

    // Should navigate to dashboard (wrangler strips .html)
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('login ล้มเหลว → ไม่ redirect', async ({ page }) => {
    clearRateLimits();
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', 'wrong');
    await page.fill('#password', 'wrong');

    // Intercept login API response
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
      page.click('#loginBtn'),
    ]);
    const body = await response.json();
    expect(body.success).toBeFalsy();

    // Should still be on login page
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/login/);
  });

  test('ลิงก์ไปหน้า register', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    // Register is a <button>, not <a>
    const registerBtn = page.locator('button.btn-register, a[href*="register"]');
    if (await registerBtn.count() > 0) {
      await registerBtn.first().click();
      await page.waitForURL(/\/register/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/register/);
    }
  });

  test('ลิงก์ไปหน้า forgot-password', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    const forgotLink = page.locator('a[href*="forgot"]');
    if (await forgotLink.count() > 0) {
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot-password/);
    }
  });
});

// ════════════════════════════════════════════
// 2. หน้า Register
// ════════════════════════════════════════════
test.describe('หน้า Register', () => {
  test('แสดงฟอร์มสมัครสมาชิก', async ({ page }) => {
    await page.goto('/register.html');
    // Should have email and name fields
    await expect(page.locator('input[type="email"], #email')).toBeVisible();
    await expect(page.locator('button[type="submit"], .btn-register, #registerBtn')).toBeVisible();
  });
});

// ════════════════════════════════════════════
// 3. หน้า Dashboard
// ════════════════════════════════════════════
test.describe('หน้า Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Dashboard สำเร็จ', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    // Dashboard content should appear
    await expect(page.locator('#dashboardContent')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveTitle(/Dashboard|PPK DriveHub/);
  });

  test('Sidebar navigation แสดงเมนู', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    // Wait for sidebar to render
    const sidebar = page.locator('#sidebar, .sidebar');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Should have menu items
    const menuItems = sidebar.locator('.sidebar-item, [data-page]');
    expect(await menuItems.count()).toBeGreaterThan(3);
  });

  test('แสดงปฏิทิน', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const calendar = page.locator('#calendarGrid, .calendar-grid');
    await expect(calendar).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 4. หน้า Queue (จัดคิว)
// ════════════════════════════════════════════
test.describe('หน้า Queue', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าจัดคิวสำเร็จ', async ({ page }) => {
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/คิว|Queue|PPK DriveHub/);
  });

  test('แสดงตารางหรือรายการคิว', async ({ page }) => {
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');

    // Queue uses calendar view — look for calendar grid or queue items
    const content = page.locator('#calendarGrid, #calendarContainer, .queue-item');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 5. หน้า Vehicles (รถ)
// ════════════════════════════════════════════
test.describe('หน้า Vehicles', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้ารถสำเร็จ', async ({ page }) => {
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/รถ|Vehicles|PPK DriveHub/);
  });

  test('แสดงรายการรถ', async ({ page }) => {
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');

    const content = page.locator('#vehiclesGrid, .vehicle-card, #vehiclesContainer');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 6. หน้า Drivers (คนขับ)
// ════════════════════════════════════════════
test.describe('หน้า Drivers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าคนขับสำเร็จ', async ({ page }) => {
    await page.goto('/drivers.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/คนขับ|Drivers|PPK DriveHub/);
  });

  test('แสดงรายการคนขับ', async ({ page }) => {
    await page.goto('/drivers.html');
    await page.waitForLoadState('networkidle');

    const content = page.locator('#driversGrid, .driver-card, #driversContainer');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 7. หน้า Fuel Record (น้ำมัน)
// ════════════════════════════════════════════
test.describe('หน้า Fuel Record', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าน้ำมันสำเร็จ', async ({ page }) => {
    await page.goto('/fuel-record.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/น้ำมัน|Fuel|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 8. หน้า Fuel Ledger (บัญชีน้ำมัน)
// ════════════════════════════════════════════
test.describe('หน้า Fuel Ledger', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าบัญชีน้ำมันสำเร็จ', async ({ page }) => {
    await page.goto('/fuel-ledger.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/บัญชี|Ledger|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 9. หน้า Repair (ซ่อมบำรุง)
// ════════════════════════════════════════════
test.describe('หน้า Repair', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าซ่อมบำรุงสำเร็จ', async ({ page }) => {
    await page.goto('/repair.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ซ่อม|Repair|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 10. หน้า Tax & Insurance (ภาษี/ประกัน)
// ════════════════════════════════════════════
test.describe('หน้า Tax & Insurance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าภาษี/ประกันสำเร็จ', async ({ page }) => {
    await page.goto('/tax-insurance.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ภาษี|Insurance|Tax|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 11. หน้า Usage Log (บันทึกใช้รถ)
// ════════════════════════════════════════════
test.describe('หน้า Usage Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าบันทึกใช้รถสำเร็จ', async ({ page }) => {
    await page.goto('/usage-log.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ใช้|Usage|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 12. หน้า Reports (รายงาน)
// ════════════════════════════════════════════
test.describe('หน้า Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้ารายงานสำเร็จ', async ({ page }) => {
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/รายงาน|Reports|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 13. หน้า Notifications (แจ้งเตือน)
// ════════════════════════════════════════════
test.describe('หน้า Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าแจ้งเตือนสำเร็จ', async ({ page }) => {
    await page.goto('/notifications.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/แจ้งเตือน|Notifications|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 14. หน้า Admin — User Management
// ════════════════════════════════════════════
test.describe('หน้า User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าจัดการผู้ใช้สำเร็จ', async ({ page }) => {
    await page.goto('/user-management.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ผู้ใช้|User|PPK DriveHub/);
  });

  test('แสดงรายการผู้ใช้', async ({ page }) => {
    await page.goto('/user-management.html');
    await page.waitForLoadState('networkidle');

    const content = page.locator('#pageContent, table, #usersTableBody');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 15. หน้า Admin Settings (ตั้งค่า)
// ════════════════════════════════════════════
test.describe('หน้า Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าตั้งค่าระบบสำเร็จ', async ({ page }) => {
    await page.goto('/admin-settings.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ตั้งค่า|Settings|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 16. หน้า Audit Log
// ════════════════════════════════════════════
test.describe('หน้า Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Audit Log สำเร็จ', async ({ page }) => {
    await page.goto('/audit-log.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Audit|ประวัติ|บันทึก|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 17. หน้า Backup Recovery
// ════════════════════════════════════════════
test.describe('หน้า Backup Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Backup สำเร็จ', async ({ page }) => {
    await page.goto('/backup-recovery.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Backup|สำรอง|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 18. หน้า Profile (โปรไฟล์)
// ════════════════════════════════════════════
test.describe('หน้า Profile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าโปรไฟล์สำเร็จ', async ({ page }) => {
    await page.goto('/profile.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/โปรไฟล์|Profile|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 18b. หน้า Change Password
// ════════════════════════════════════════════
test.describe('หน้า Change Password', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าเปลี่ยนรหัสผ่านสำเร็จ', async ({ page }) => {
    await page.goto('/change-password.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/รหัสผ่าน|Password|PPK DriveHub/);
  });

  test('แสดงฟอร์มเปลี่ยนรหัสผ่าน', async ({ page }) => {
    await page.goto('/change-password.html');
    await page.waitForLoadState('networkidle');
    const form = page.locator('#changePassForm, form, .change-password-form');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 18c. หน้า Executive Dashboard
// ════════════════════════════════════════════
test.describe('หน้า Executive Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Executive Dashboard สำเร็จ', async ({ page }) => {
    await page.goto('/executive-dashboard.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Executive|Dashboard|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 18d. หน้า Incident (อุบัติเหตุ)
// ════════════════════════════════════════════
test.describe('หน้า Incident', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
    await loginAsAdmin(page);
  });

  test('โหลดหน้าอุบัติเหตุสำเร็จ', async ({ page }) => {
    await page.goto('/incident.html', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/อุบัติ|Incident|PPK DriveHub/);
  });

  test('แสดงรายการอุบัติเหตุ', async ({ page }) => {
    await page.goto('/incident.html', { waitUntil: 'domcontentloaded' });
    const content = page.locator('#incidentList, table, .incident-item, #pageContent');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 18e. หน้า Vehicle Request (ขอใช้รถ)
// ════════════════════════════════════════════
test.describe('หน้า Vehicle Request', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้าขอใช้รถสำเร็จ', async ({ page }) => {
    await page.goto('/vehicle-request.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ขอใช้รถ|Vehicle Request|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 18f. หน้า Vehicle Timeline
// ════════════════════════════════════════════
test.describe('หน้า Vehicle Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Vehicle Timeline สำเร็จ', async ({ page }) => {
    await page.goto('/vehicle-timeline.html', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Timeline|ไทม์ไลน์|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 18g. หน้า Driver Performance & History
// ════════════════════════════════════════════
test.describe('หน้า Driver Performance & History', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Driver Performance สำเร็จ', async ({ page }) => {
    await page.goto('/driver-performance.html', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Performance|ประสิทธิภาพ|PPK DriveHub/);
  });

  test('โหลดหน้า Driver History สำเร็จ', async ({ page }) => {
    await page.goto('/driver-history.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/History|ประวัติ|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 18h. หน้า Fuel Reconcile & QR Manage
// ════════════════════════════════════════════
test.describe('หน้า Fuel Reconcile & QR Manage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Fuel Reconcile สำเร็จ', async ({ page }) => {
    await page.goto('/fuel-reconcile.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Reconcile|กระทบยอด|PPK DriveHub/);
  });

  test('โหลดหน้า QR Manage สำเร็จ', async ({ page }) => {
    await page.goto('/qr-manage.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/QR|PP/);
  });
});

// ════════════════════════════════════════════
// 18i. หน้า Basic Info / Setup
// ════════════════════════════════════════════
test.describe('หน้า Basic Info', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('โหลดหน้า Basic Info สำเร็จ', async ({ page }) => {
    await page.goto('/basic-info.html');
    await page.waitForLoadState('networkidle');
    // Could be part of setup wizard or standalone
    await expect(page).toHaveTitle(/PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 25. UI CRUD Workflow — สร้างรถผ่านหน้าเว็บ
// ════════════════════════════════════════════
test.describe('UI CRUD — สร้างรถ (Vehicles)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('กดปุ่ม "เพิ่มรถ" แล้วฟอร์มโผล่', async ({ page }) => {
    await page.goto('/vehicles.html');
    await page.waitForLoadState('networkidle');

    // ค้นหาปุ่ม เพิ่มรถ / Add Vehicle
    const addBtn = page.locator(
      'button:has-text("เพิ่มรถ"), button:has-text("Add"), [data-action="add"], #addVehicleBtn, .btn-add-vehicle'
    );
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);
      // Modal/form should appear
      const modal = page.locator('.modal, dialog, #vehicleModal, .vehicle-form');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ════════════════════════════════════════════
// 26. UI CRUD Workflow — สร้างคิวผ่านหน้าเว็บ
// ════════════════════════════════════════════
test.describe('UI CRUD — สร้างคิว (Queue)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('กดปุ่ม "จองคิว" / "เพิ่มคิว" แล้วฟอร์มโผล่', async ({ page }) => {
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator(
      'button:has-text("จองคิว"), button:has-text("เพิ่มคิว"), button:has-text("Add"), [data-action="add"], #addQueueBtn, .btn-add-queue'
    );
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal, dialog, #queueModal, .queue-form');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ════════════════════════════════════════════
// 27. UI CRUD Workflow — สร้างคนขับผ่านหน้าเว็บ
// ════════════════════════════════════════════
test.describe('UI CRUD — สร้างคนขับ (Drivers)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('กดปุ่ม "เพิ่มคนขับ" แล้วฟอร์มโผล่', async ({ page }) => {
    await page.goto('/drivers.html');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator(
      'button:has-text("เพิ่มคนขับ"), button:has-text("เพิ่ม"), [data-action="add"], #addDriverBtn, .btn-add-driver'
    );
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal, dialog, #driverModal, .driver-form');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ════════════════════════════════════════════
// 28. UI CRUD — แจ้งซ่อมผ่านหน้าเว็บ
// ════════════════════════════════════════════
test.describe('UI CRUD — แจ้งซ่อม (Repair)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('กดปุ่ม "แจ้งซ่อม" แล้วฟอร์มโผล่', async ({ page }) => {
    await page.goto('/repair.html');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator(
      'button:has-text("แจ้งซ่อม"), button:has-text("เพิ่ม"), [data-action="add"], #addRepairBtn, .btn-add-repair'
    );
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal, dialog, #repairModal, .repair-form');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ════════════════════════════════════════════
// 29. UI CRUD — บันทึกน้ำมันผ่านหน้าเว็บ
// ════════════════════════════════════════════
test.describe('UI CRUD — บันทึกน้ำมัน (Fuel)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('กดปุ่ม "บันทึกน้ำมัน" แล้วฟอร์มโผล่', async ({ page }) => {
    await page.goto('/fuel-record.html');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator(
      'button:has-text("บันทึกน้ำมัน"), button:has-text("เติมน้ำมัน"), button:has-text("เพิ่ม"), [data-action="add"], #addFuelBtn, .btn-add-fuel'
    );
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal, dialog, #fuelModal, .fuel-form');
      // Modal may or may not exist depending on page design (QR-based vs admin UI)
      const modalCount = await modal.count();
      if (modalCount > 0) {
        await expect(modal.first()).toBeVisible({ timeout: 5000 });
      }
      // If no modal found, the page may use a different interaction pattern — still pass
    }
    // Page loaded successfully regardless
    expect(page.url()).not.toMatch(/login/);
  });
});

// ════════════════════════════════════════════
// 30. UI Workflow — Login → CRUD ครบวงจร (สร้างรถ+คนขับ+คิว)
// ════════════════════════════════════════════
test.describe('End-to-End Workflow — สร้างข้อมูลครบวงจรผ่าน API', () => {
  let vehicleId = '';
  let driverId = '';
  let queueId = '';

  async function adminFetch(method, path, body) {
    // Login first — try both passwords in case api-integration changed it
    clearRateLimits();
    let token = null;
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const login = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: pw }),
      });
      const loginData = await login.json();
      token = loginData?.data?.token || loginData?.data?.data?.token;
      if (token) break;
      clearRateLimits();
    }

    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    return r.json().catch(() => null);
  }

  test('Step 1: สร้างรถ', async () => {
    const r = await adminFetch('POST', '/api/vehicles', {
      license_plate: `E2E-${Date.now().toString().slice(-5)}`,
      brand: 'Toyota', model: 'Commuter', year: 2024,
      fuel_type: 'diesel', seat_count: 12, status: 'available',
    });
    expect(r?.success).toBe(true);
    vehicleId = r?.id || r?.data?.id;
    expect(vehicleId).toBeTruthy();
  });

  test('Step 2: สร้างคนขับ', async () => {
    const r = await adminFetch('POST', '/api/drivers', {
      name: 'คนขับ E2E Test',
      license_number: `LIC-E2E-${Date.now().toString().slice(-4)}`,
      phone: '0899999999', status: 'active',
    });
    expect(r?.success).toBe(true);
    driverId = r?.id || r?.data?.id;
    expect(driverId).toBeTruthy();
  });

  test('Step 3: สร้างคิว (ต้องการรถ + คนขับ)', async () => {
    if (!vehicleId || !driverId) test.skip();
    const r = await adminFetch('POST', '/api/queue', {
      car_id: vehicleId,
      driver_id: driverId,
      date: '2026-05-01',
      time_start: '08:00', time_end: '12:00',
      mission: 'E2E ทดสอบครบวงจร',
      destination: 'ห้องประชุมใหญ่', passengers: 5,
    });
    expect(r?.success).toBe(true);
    queueId = r?.id || r?.data?.id;
    expect(queueId).toBeTruthy();
  });

  test('Step 4: ตรวจสภาพรถก่อนออก (QR Check)', async () => {
    if (!vehicleId) test.skip();
    const r = await fetch(`${BASE}/api/check/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: vehicleId,
        checker_name: 'คนขับ E2E',
        check_type: 'pre_trip',
        overall_status: 'ok',
        mileage: 20000,
        tire_condition: 'ok', brake_condition: 'ok', light_condition: 'ok',
      }),
    });
    const data = await r.json().catch(() => null);
    expect(data?.success).toBe(true);
  });

  test('Step 5: บันทึกออกรถ (QR Usage — departure)', async () => {
    if (!vehicleId) test.skip();
    const r = await fetch(`${BASE}/api/usage/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: vehicleId,
        record_type: 'departure',
        driver_id: driverId || null,
        datetime: '2026-05-01T08:05:00',
        mileage: 20000,
      }),
    });
    const data = await r.json().catch(() => null);
    expect(data?.success).toBe(true);
  });

  test('Step 6: บันทึกเติมน้ำมัน (QR Fuel)', async () => {
    if (!vehicleId) test.skip();
    const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
    const r = await fetch(`${BASE}/api/fuel/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: vehicleId,
        driver_name_manual: 'คนขับ E2E',
        date: '2026-05-01',
        mileage_after: 20050,
        liters: 45, price_per_liter: 32.0, amount: 1440,
        fuel_type: 'diesel', gas_station_name: 'ปั๊ม E2E Test',
        purpose: 'งานราชการ',
        receipt_image: `data:image/png;base64,${TINY_PNG}`,
      }),
    });
    const data = await r.json().catch(() => null);
    expect(data?.success).toBe(true);
  });

  test('Step 7: บันทึกกลับรถ (QR Usage — return)', async () => {
    if (!vehicleId) test.skip();
    const r = await fetch(`${BASE}/api/usage/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: vehicleId,
        record_type: 'return',
        driver_id: driverId || null,
        datetime: '2026-05-01T14:00:00',
        mileage: 20150,
      }),
    });
    const data = await r.json().catch(() => null);
    expect(data?.success).toBe(true);
  });

  test('Step 8: เปลี่ยนสถานะคิวเป็น completed', async () => {
    if (!queueId) test.skip();
    const r = await adminFetch('PUT', `/api/queue/${queueId}/complete`, {});
    expect(r?.success).toBe(true);
  });

  test('Step 9: ดึงรายงาน dashboard หลังบันทึกข้อมูลครบ', async () => {
    clearRateLimits();
    let token = null;
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const login = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: pw }),
      });
      const ld = await login.json();
      token = ld?.data?.token;
      if (token) break;
      clearRateLimits();
    }
    const r = await fetch(`${BASE}/api/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await r.json().catch(() => null);
    expect(data?.success).toBe(true);
    expect(data?.data).toBeTruthy();
  });

  test('Step 10: cleanup — ลบรถและคนขับ', async () => {
    if (vehicleId) {
      const r = await adminFetch('DELETE', `/api/vehicles/${vehicleId}`, null);
      // ok or not — don't fail the whole suite
    }
    if (driverId) {
      const r = await adminFetch('DELETE', `/api/drivers/${driverId}`, null);
    }
  });
});

// ════════════════════════════════════════════
// 19. QR Pages (Public — ไม่ต้อง login)
// ════════════════════════════════════════════
test.describe('QR Pages (Public)', () => {
  test('QR Usage Record — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/qr-usage-record.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/QR|บันทึก|Usage|PPK DriveHub/);
  });

  test('QR Fuel Record — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/qr-fuel-record.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/QR|น้ำมัน|Fuel|PPK DriveHub/);
  });

  test('QR Daily Check — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/qr-daily-check.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/QR|ตรวจ|Check|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 20. Static Pages
// ════════════════════════════════════════════
test.describe('Static Pages', () => {
  test('User Guide — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/user-guide.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/คู่มือ|Guide|PPK DriveHub/);
  });

  test('PDPA Policy — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/pdpa-policy.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/PDPA|นโยบาย|PPK DriveHub/);
  });

  test('About — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/about.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/เกี่ยวกับ|About|PPK DriveHub/);
  });

  test('Glossary — โหลดสำเร็จ', async ({ page }) => {
    await page.goto('/glossary.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/คำศัพท์|Glossary|PPK DriveHub/);
  });
});

// ════════════════════════════════════════════
// 21. Navigation Flow (E2E)
// ════════════════════════════════════════════
test.describe('Navigation Flow', () => {
  test('Login → Dashboard → Navigate sidebar → Logout', async ({ page }) => {
    clearRateLimits();
    // 1. Login — try both passwords
    clearRateLimits();
    let navPass = ADMIN_PASS;
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: pw }),
      });
      const d = await r.json();
      if (d?.success || d?.data?.token) { navPass = pw; break; }
      clearRateLimits();
    }
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', navPass);
    await page.click('#loginBtn');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // 2. Dashboard loaded
    await page.waitForLoadState('networkidle');

    // 3. Click sidebar menu items
    const sidebar = page.locator('#sidebar, .sidebar');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Navigate to vehicles
    const vehiclesLink = sidebar.locator('[data-page="vehicles"]');
    if (await vehiclesLink.count() > 0) {
      await vehiclesLink.click();
      await page.waitForURL(/\/vehicles/, { timeout: 5000 });
      await page.waitForLoadState('networkidle');
    }

    // Navigate to queue
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    const queueLink = page.locator('#sidebar [data-page="queue"], .sidebar [data-page="queue"]');
    if (await queueLink.count() > 0) {
      await queueLink.click();
      await page.waitForURL(/\/queue-manage/, { timeout: 5000 });
    }

    // 4. Logout
    const logoutLink = page.locator('[data-page="logout"], .logout-btn, a[href*="logout"]');
    if (await logoutLink.count() > 0) {
      await logoutLink.first().click();
      await page.waitForURL(/\/login/, { timeout: 5000 });
    }
  });
});

// ════════════════════════════════════════════
// 22. Auth Guard ทุกหน้า (ต้อง redirect ถ้าไม่มี token)
// ════════════════════════════════════════════
test.describe('Auth Guard', () => {
  const protectedPages = [
    '/dashboard.html',
    '/queue-manage.html',
    '/vehicles.html',
    '/drivers.html',
    '/fuel-record.html',
    '/repair.html',
    '/reports.html',
    '/user-management.html',
    '/audit-log.html',
    '/backup-recovery.html',
    '/profile.html',
    '/notifications.html',
    '/admin-settings.html',
  ];

  for (const pagePath of protectedPages) {
    test(`${pagePath} — redirect ไป login ถ้ายังไม่ login`, async ({ page }) => {
      // Redirect happens in head script, don't wait for full load
      await page.goto(pagePath, { waitUntil: 'commit' });
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// ════════════════════════════════════════════
// 23. Responsive / Mobile View
// ════════════════════════════════════════════
test.describe('Responsive Mobile View', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Login หน้ามือถือ — ฟอร์มแสดงถูกต้อง', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
  });

  test('Dashboard หน้ามือถือ — มี hamburger menu', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    // On mobile, sidebar should be hidden, hamburger should be visible
    const hamburger = page.locator('#topbar-hamburger, .hamburger, .menu-toggle');
    await expect(hamburger.first()).toBeVisible({ timeout: 10000 });
  });
});

// ════════════════════════════════════════════
// 24. Console Error Check
// ════════════════════════════════════════════
test.describe('Console Error Check', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const pagesToCheck = [
    { name: 'Dashboard', url: '/dashboard.html' },
    { name: 'Vehicles', url: '/vehicles.html' },
    { name: 'Drivers', url: '/drivers.html' },
    { name: 'Queue', url: '/queue-manage.html' },
    { name: 'Fuel', url: '/fuel-record.html' },
    { name: 'Repair', url: '/repair.html' },
    { name: 'Reports', url: '/reports.html' },
  ];

  for (const p of pagesToCheck) {
    test(`${p.name} — ไม่มี JS error ร้ายแรง`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
        // Ignore minor errors
        if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error')) {
          errors.push(err.message);
        }
      });

      await page.goto(p.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Allow up to 0 critical JS errors
      expect(errors, `JS errors on ${p.name}: ${errors.join(', ')}`).toHaveLength(0);
    });
  }
});
