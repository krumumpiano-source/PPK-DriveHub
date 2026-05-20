// ==============================================================
// PPK DriveHub — Role-Based Access E2E Tests
// ทดสอบสิทธิ์การเข้าถึงทุกบทบาท: admin, viewer, fuel, repair, vehicle
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';

// Role users (สร้างผ่าน register → approve flow)
const USERS = {
  admin:   { email: 'role_admin@test.com',   password: 'Role@Admin1',   role: 'super_admin' },
  viewer:  { email: 'role_viewer@test.com',  password: 'Role@Viewer1',  role: 'viewer'      },
  fuel:    { email: 'role_fuel@test.com',    password: 'Role@Fuel1',    role: 'fuel'        },
  repair:  { email: 'role_repair@test.com',  password: 'Role@Repair1',  role: 'repair'      },
  vehicle: { email: 'role_vehicle@test.com', password: 'Role@Vehicle1', role: 'vehicle'     },
};

const tokens = {};

// Default permissions per role
const DEFAULT_PERMISSIONS = {
  viewer:  { reports: 'view', vehicles: 'view', drivers: 'view', fuel: 'view', repair: 'view', queue: 'view', usage: 'view' },
  fuel:    { fuel: 'delete', reports: 'view', vehicles: 'view' },
  repair:  { repair: 'delete', vehicles: 'view', reports: 'view' },
  vehicle: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
};

function clearRateLimits() {
  try {
    execSync(
      'npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"',
      { stdio: 'pipe', timeout: 10000 }
    );
  } catch {}
}

async function apiPost(path, body, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return r.json().catch(() => null);
}
async function apiGet(path, token = '') {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const r = await fetch(`${BASE}${path}`, { headers });
  return r.json().catch(() => null);
}
async function apiPut(path, body, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return r.json().catch(() => null);
}

// ──────────────────────────────────────────
// Bootstrap: ตั้งค่า admin + สร้าง users ทุก role
// ──────────────────────────────────────────
test.beforeAll(async () => {
  clearRateLimits();

  // Setup super admin ถ้าจำเป็น
  const check = await apiGet('/api/setup');
  if (check?.data?.needs_setup) {
    await apiPost('/api/setup', {
      username: 'role_admin',
      password: USERS.admin.password,
      first_name: 'Role', last_name: 'Admin', email: USERS.admin.email,
    });
  }

  // Login admin (ลอง testadmin ก่อน, ถ้าไม่ได้ลอง role_admin)
  clearRateLimits();
  for (const cred of [
    { username: 'testadmin', password: 'Admin@5678' },
    { username: 'testadmin', password: 'Admin@1234' },
    { username: USERS.admin.email, password: USERS.admin.password },
  ]) {
    const r = await apiPost('/api/auth/login', { username: cred.username, password: cred.password });
    if (r?.data?.token) { tokens.admin = r.data.token; break; }
    clearRateLimits();
  }
  if (!tokens.admin) throw new Error('[roles.spec] Cannot obtain admin token');

  // สร้าง role users ผ่าน register → approve flow
  const roleList = ['viewer', 'fuel', 'repair', 'vehicle'];
  for (const roleName of roleList) {
    const u = USERS[roleName];
    // Try login first — user might already exist from a previous run
    const existing = await apiPost('/api/auth/login', { username: u.email, password: u.password });
    clearRateLimits();
    if (existing?.data?.token) {
      tokens[roleName] = existing.data.token;
      continue; // Already exists and active, skip register/approve
    }
    // Register (สร้าง request)
    await apiPost('/api/auth/register', {
      email: u.email,
      first_name: roleName,
      last_name: 'Tester',
      password: u.password,
    });
    clearRateLimits();
  }

  // Approve pending requests for users that still need tokens
  const requests = await apiGet('/api/admin/requests?status=pending', tokens.admin);
  const pendingReqs = requests?.data || [];
  for (const roleName of roleList) {
    if (tokens[roleName]) continue; // Already logged in above
    const u = USERS[roleName];
    const req = pendingReqs.find(r => r.email === u.email);
    if (req) {
      await apiPut(`/api/admin/requests/${req.id}/approve`, {
        role: u.role,
        permissions: DEFAULT_PERMISSIONS[roleName] || {},
      }, tokens.admin);
    }
    clearRateLimits();
  }

  // Login แต่ละ role (สำหรับที่ยังไม่มี token)
  for (const roleName of roleList) {
    if (tokens[roleName]) continue;
    const u = USERS[roleName];
    const login = await apiPost('/api/auth/login', { username: u.email, password: u.password });
    if (login?.data?.token) tokens[roleName] = login.data.token;
    clearRateLimits();
  }

  // Ensure correct permissions for all role users via admin API
  const userList = await apiGet('/api/admin/users', tokens.admin);
  const allUsers = Array.isArray(userList?.data) ? userList.data : [];
  for (const roleName of roleList) {
    const u = USERS[roleName];
    const userData = allUsers.find(x => x.email === u.email);
    if (userData && DEFAULT_PERMISSIONS[roleName]) {
      await apiPut(`/api/admin/users/${userData.id}`, {
        permissions: DEFAULT_PERMISSIONS[roleName],
      }, tokens.admin);
    }
  }
});

// ══════════════════════════════════════════════
// Helper: login user ใน browser (sets localStorage)
// ══════════════════════════════════════════════
function setAuthInBrowser(page, roleName) {
  const token = tokens[roleName];
  const role = USERS[roleName].role;
  return page.addInitScript(({ token, role, username }) => {
    localStorage.setItem('ppk_token', token);
    localStorage.setItem('ppk_user', JSON.stringify({
      id: 'test-id', username, display_name: username, role, permissions: {},
    }));
  }, { token, role, username: USERS[roleName]?.email || roleName });
}

// ==============================================================
// 1. ADMIN — เข้าถึงได้ทุกหน้า
// ==============================================================
test.describe('Admin — ทุกหน้าต้องเข้าถึงได้', () => {
  const allPages = [
    '/dashboard.html', '/queue-manage.html', '/vehicles.html', '/drivers.html',
    '/fuel-record.html', '/fuel-ledger.html', '/repair.html', '/usage-log.html',
    '/reports.html', '/tax-insurance.html', '/notifications.html',
    '/user-management.html', '/admin-settings.html', '/audit-log.html',
    '/backup-recovery.html', '/profile.html',
    '/incident.html', '/vehicle-request.html',
    '/executive-dashboard.html', '/driver-performance.html',
  ];

  for (const p of allPages) {
    test(`Admin เข้า ${p} ได้`, async ({ page }) => {
      // Abort CDN requests to prevent blocking domcontentloaded (flatpickr, chart.js, etc.)
      await page.route('https://cdn.jsdelivr.net/**', route => route.abort());

      await page.addInitScript(({ token }) => {
        localStorage.setItem('ppk_token', token);
        localStorage.setItem('ppk_user', JSON.stringify({
          id: 'admin-id', username: 'role_admin', display_name: 'Admin',
          role: 'super_admin', permissions: {},
        }));
      }, { token: tokens.admin || 'fallback' });

      await page.goto(p, { waitUntil: 'domcontentloaded' });
      // ต้องไม่ redirect ไป login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });
  }
});

// ==============================================================
// 2. VIEWER — อ่านได้ แต่ไม่สามารถทำ CRUD
// ==============================================================
test.describe('Viewer — สิทธิ์อ่านอย่างเดียว', () => {
  test.beforeEach(async ({ page }) => {
    if (!tokens.viewer) {
      test.skip();
    }
  });

  test('Viewer เข้า dashboard ได้', async ({ page }) => {
    if (!tokens.viewer) return test.skip();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'viewer-id', username: 'role_viewer', display_name: 'Viewer',
        role: 'viewer', permissions: {},
      }));
    }, { token: tokens.viewer });
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('Viewer เข้า reports ได้', async ({ page }) => {
    if (!tokens.viewer) return test.skip();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'viewer-id', username: 'role_viewer', display_name: 'Viewer',
        role: 'viewer', permissions: {},
      }));
    }, { token: tokens.viewer });
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('Viewer — GET /api/reports/dashboard สำเร็จ', async () => {
    if (!tokens.viewer) return;
    const r = await apiGet('/api/reports/dashboard', tokens.viewer);
    expect(r?.success).toBe(true);
  });

  test('Viewer — POST /api/vehicles ต้อง 403', async () => {
    if (!tokens.viewer) return;
    const r = await apiPost('/api/vehicles', {
      license_plate: 'VIEWER-TEST', brand: 'Toyota', model: 'Hiace',
      year: 2024, fuel_type: 'diesel', seat_count: 12,
    }, tokens.viewer);
    expect([403, 401]).toContain(r?.status || (r?.success === false ? 403 : 200));
  });
});

// ==============================================================
// 3. FUEL ROLE — เข้าถึงหน้าน้ำมันได้ แต่ไม่ได้สิทธิ์ admin
// ==============================================================
test.describe('Fuel Role — สิทธิ์น้ำมัน', () => {
  test('Fuel เข้า fuel-record ได้', async ({ page }) => {
    if (!tokens.fuel) return test.skip();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'fuel-id', username: 'role_fuel', display_name: 'Fuel User',
        role: 'fuel', permissions: { fuel: { view: true, create: true } },
      }));
    }, { token: tokens.fuel });
    await page.goto('/fuel-record.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('Fuel — GET /api/fuel/log สำเร็จ', async () => {
    if (!tokens.fuel) return;
    const r = await apiGet('/api/fuel/log', tokens.fuel);
    expect(r?.success).toBe(true);
  });

  test('Fuel role — GET /api/admin/users ต้อง 403', async () => {
    if (!tokens.fuel) return;
    const r = await apiGet('/api/admin/users', tokens.fuel);
    expect([403, 401]).toContain(r?.status || (r?.success === false ? 403 : 200));
  });
});

// ==============================================================
// 4. REPAIR ROLE — สิทธิ์ซ่อมบำรุง
// ==============================================================
test.describe('Repair Role — สิทธิ์ซ่อม', () => {
  test('Repair เข้า repair.html ได้', async ({ page }) => {
    if (!tokens.repair) return test.skip();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'repair-id', username: 'role_repair', display_name: 'Repair User',
        role: 'repair', permissions: { repair: { view: true, create: true, edit: true } },
      }));
    }, { token: tokens.repair });
    await page.goto('/repair.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('Repair — GET /api/repair/log สำเร็จ', async () => {
    if (!tokens.repair) return;
    const r = await apiGet('/api/repair/log', tokens.repair);
    expect(r?.success).toBe(true);
  });
});

// ==============================================================
// 5. VEHICLE ROLE — สิทธิ์จัดคิว/ยานพาหนะ
// ==============================================================
test.describe('Vehicle Role — สิทธิ์จัดคิว', () => {
  test('Vehicle เข้า queue-manage ได้', async ({ page }) => {
    if (!tokens.vehicle) return test.skip();
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'vehicle-id', username: 'role_vehicle', display_name: 'Vehicle User',
        role: 'vehicle', permissions: { queue: { view: true, create: true, edit: true } },
      }));
    }, { token: tokens.vehicle });
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('Vehicle — GET /api/queue สำเร็จ', async () => {
    if (!tokens.vehicle) return;
    const r = await apiGet('/api/queue', tokens.vehicle);
    expect(r?.success).toBe(true);
  });
});

// ==============================================================
// 6. ป้องกัน Unauthenticated access ทุกหน้า protected
// ==============================================================
test.describe('Auth Guard — ทุกหน้าต้อง redirect ถ้าไม่มี token', () => {
  const protectedPages = [
    '/dashboard.html', '/queue-manage.html', '/vehicles.html', '/drivers.html',
    '/fuel-record.html', '/repair.html', '/reports.html', '/user-management.html',
    '/audit-log.html', '/backup-recovery.html', '/profile.html', '/notifications.html',
    '/admin-settings.html', '/incident.html', '/vehicle-request.html',
  ];

  for (const p of protectedPages) {
    test(`${p} — redirect ไป login ถ้าไม่ login`, async ({ page }) => {
      await page.goto(p, { waitUntil: 'commit' });
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toMatch(/login/);
    });
  }
});

// ==============================================================
// 7. Public pages — ทุกคนเข้าได้โดยไม่ login
// ==============================================================
test.describe('Public Pages — เข้าได้โดยไม่ login', () => {
  const publicPages = [
    '/register.html', '/forgot-password.html',
    '/qr-usage-record.html', '/qr-fuel-record.html', '/qr-daily-check.html',
    '/qr-survey.html', '/user-guide.html', '/pdpa-policy.html',
    '/about.html', '/glossary.html',
  ];

  for (const p of publicPages) {
    test(`${p} — โหลดได้โดยไม่ login`, async ({ page }) => {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });
  }
});
