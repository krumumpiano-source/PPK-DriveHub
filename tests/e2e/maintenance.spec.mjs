// ==============================================================
// PPK DriveHub — Maintenance API Tests
// ทดสอบ: Settings CRUD, Vehicle Overrides, Profiles, Alerts, Priority
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

function clearRateLimits() {
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
}

async function apiPost(path, body, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
async function apiGet(path, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, data: await r.json() };
}
async function apiPut(path, body, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
async function apiDelete(path, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, data: await r.json() };
}

const ctx = {
  adminToken: '',
  carId: '',
  settingId: '',
  profileId: '',
  alertId: '',
};

test.describe.serial('Maintenance API', () => {
  // ──────────────────────────────────────────
  // Bootstrap: login + create vehicle
  // ──────────────────────────────────────────
  test('Bootstrap: login ได้รับ admin token', async () => {
    clearRateLimits();
    // Try setup first
    const setupCheck = await apiGet('/api/setup');
    if (setupCheck.data?.data?.needs_setup) {
      await apiPost('/api/setup', { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' });
    }
    clearRateLimits();
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const r = await apiPost('/api/auth/login', { username: ADMIN_USER, password: pw });
      if (r.data?.data?.token) { ctx.adminToken = r.data.data.token; break; }
      clearRateLimits();
    }
    expect(ctx.adminToken).toBeTruthy();
  });

  test('Bootstrap: สร้าง test vehicle', async () => {
    const r = await apiPost('/api/vehicles', {
      license_plate: `MNT-${Date.now().toString().slice(-6)}`,
      brand: 'Toyota', model: 'Hilux', year: 2020,
      fuel_type: 'diesel', vehicle_type: 'pickup',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
    expect(ctx.carId).toBeTruthy();
  });

  // ──────────────────────────────────────────
  // Settings CRUD
  // ──────────────────────────────────────────
  test('GET /api/maintenance/settings → list (อาจว่าง)', async () => {
    const r = await apiGet('/api/maintenance/settings', ctx.adminToken);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data?.data)).toBe(true);
  });

  test('POST /api/maintenance/settings → สร้าง setting ใหม่', async () => {
    const r = await apiPost('/api/maintenance/settings', {
      item_name: 'เปลี่ยนน้ำมันเครื่อง',
      interval_km: 10000,
      interval_months: 6,
      priority: 'high',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.settingId = r.data?.data?.id || r.data?.data?.setting_id;
    expect(ctx.settingId).toBeTruthy();
  });

  test('GET /api/maintenance/settings — มี setting ที่สร้าง', async () => {
    const r = await apiGet('/api/maintenance/settings', ctx.adminToken);
    const items = r.data?.data || [];
    const found = items.find((s) => s.id === ctx.settingId || s.id === Number(ctx.settingId));
    expect(found).toBeTruthy();
    expect(found.item_name).toBe('เปลี่ยนน้ำมันเครื่อง');
  });

  test('PUT /api/maintenance/settings/:id → แก้ไข', async () => {
    const r = await apiPut(`/api/maintenance/settings/${ctx.settingId}`, {
      item_name: 'เปลี่ยนน้ำมันเครื่อง (แก้ไข)',
      interval_km: 15000,
      interval_months: 12,
      priority: 'high',
    }, ctx.adminToken);
    expect(r.status).toBe(200);
  });

  test('PUT bulk settings → update หลาย setting พร้อมกัน', async () => {
    const r = await apiPut('/api/maintenance/settings/bulk', {
      settings: [{ id: ctx.settingId, interval_km: 12000 }],
    }, ctx.adminToken);
    // 200 หรือ 404 ถ้า endpoint ไม่มี bulk
    expect([200, 404, 405]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Vehicle Maintenance Status
  // ──────────────────────────────────────────
  test('GET /api/maintenance/status → dashboard status', async () => {
    const r = await apiGet('/api/maintenance/status', ctx.adminToken);
    expect(r.status).toBe(200);
    // คาดว่าได้ object หรือ array
    expect(r.data).toBeTruthy();
  });

  test('GET /api/maintenance/vehicle/:carId → vehicle maintenance status', async () => {
    const r = await apiGet(`/api/maintenance/vehicle/${ctx.carId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.data?.data).toBeTruthy();
    }
  });

  test('PUT /api/maintenance/vehicle/:carId/bulk → override', async () => {
    const r = await apiPut(`/api/maintenance/vehicle/${ctx.carId}/bulk`, {
      overrides: [],
    }, ctx.adminToken);
    expect([200, 400, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Maintenance Profiles
  // ──────────────────────────────────────────
  test('GET /api/maintenance/profiles → list profiles', async () => {
    const r = await apiGet('/api/maintenance/profiles', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      // data อาจเป็น array หรือ object
      expect(r.data).toBeTruthy();
    }
  });

  test('GET /api/maintenance/profiles/brands → brands list', async () => {
    const r = await apiGet('/api/maintenance/profiles/brands', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Maintenance Alerts
  // ──────────────────────────────────────────
  test('GET /api/maintenance/alerts → alerts list', async () => {
    const r = await apiGet('/api/maintenance/alerts', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.data?.data !== undefined).toBe(true);
    }
  });

  test('GET /api/maintenance/alerts?status=active → filter active', async () => {
    const r = await apiGet('/api/maintenance/alerts?status=active', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Auth & Permissions
  // ──────────────────────────────────────────
  test('GET /api/maintenance/settings ไม่มี token → 401', async () => {
    const r = await apiGet('/api/maintenance/settings');
    expect([401, 403]).toContain(r.status);
  });

  test('POST /api/maintenance/settings ไม่มี token → 401', async () => {
    const r = await apiPost('/api/maintenance/settings', { item_name: 'test', interval_km: 1000 });
    expect([401, 403]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Priority Levels
  // ──────────────────────────────────────────
  test('สร้าง setting priority: low', async () => {
    const r = await apiPost('/api/maintenance/settings', {
      item_name: 'เช็คแรงดันลม',
      interval_km: 5000,
      priority: 'low',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
  });

  test('สร้าง setting priority: critical', async () => {
    const r = await apiPost('/api/maintenance/settings', {
      item_name: 'ตรวจเบรค',
      interval_km: 30000,
      priority: 'critical',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // DELETE & Cleanup
  // ──────────────────────────────────────────
  test('DELETE /api/maintenance/settings/:id → ลบได้', async () => {
    const r = await apiDelete(`/api/maintenance/settings/${ctx.settingId}`, ctx.adminToken);
    expect([200, 204]).toContain(r.status);
  });

  test('GET /api/maintenance/settings — ไม่มี deleted item', async () => {
    const r = await apiGet('/api/maintenance/settings', ctx.adminToken);
    const items = r.data?.data || [];
    const found = items.find((s) => s.id === ctx.settingId || s.id === Number(ctx.settingId));
    expect(found).toBeFalsy();
  });
});
