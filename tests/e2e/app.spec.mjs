// ==============================================================
// PPK DriveHub — E2E Tests (Playwright)
// ทดสอบหน้าเว็บแต่ละหน้าผ่าน Browser
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = 'Admin@1234';

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
    for (const pw of [ADMIN_PASS, 'Admin@5678']) {
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
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', ADMIN_PASS);
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
    // 1. Login
    await page.goto('/login.html');
    await page.waitForLoadState('networkidle');
    await page.fill('#username', ADMIN_USER);
    await page.fill('#password', ADMIN_PASS);
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
