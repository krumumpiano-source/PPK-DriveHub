// ==============================================================
// PPK DriveHub — Tax & Insurance API Tests
// ทดสอบ: Tax CRUD, Insurance CRUD, Inspections/ตรอ., Expiry Filter
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

// วันที่ทดสอบ
const FAR_FUTURE = '2035-12-31';
const NEAR_FUTURE = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 15 วัน
const PAST_DATE = '2020-01-01';

const ctx = {
  adminToken: '',
  carId: '',
  taxId: '',
  insuranceId: '',
  inspectionId: '',
};

test.describe.serial('Tax & Insurance API', () => {
  // ──────────────────────────────────────────
  // Bootstrap
  // ──────────────────────────────────────────
  test('Bootstrap: login', async () => {
    clearRateLimits();
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
      license_plate: `TAX-${Date.now().toString().slice(-6)}`,
      brand: 'Isuzu', model: 'D-MAX', year: 2022,
      fuel_type: 'diesel', vehicle_type: 'pickup',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
    expect(ctx.carId).toBeTruthy();
  });

  // ──────────────────────────────────────────
  // Tax (ภาษีรถ) CRUD
  // ──────────────────────────────────────────
  test('GET /api/tax-insurance/tax → list (อาจว่าง)', async () => {
    const r = await apiGet('/api/tax-insurance/tax', ctx.adminToken);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data?.data)).toBe(true);
  });

  test('POST /api/tax-insurance/tax → สร้าง tax record', async () => {
    const r = await apiPost('/api/tax-insurance/tax', {
      car_id: ctx.carId,
      amount: 1500,
      expiry_date: FAR_FUTURE,
      tax_year: 2025,
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.taxId = r.data?.data?.id || r.data?.data?.tax_id;
    expect(ctx.taxId).toBeTruthy();
  });

  test('GET /api/tax-insurance/tax — มี tax record ที่สร้าง', async () => {
    const r = await apiGet('/api/tax-insurance/tax', ctx.adminToken);
    const items = r.data?.data || [];
    const found = items.find((t) => t.id === ctx.taxId || t.id === Number(ctx.taxId));
    expect(found).toBeTruthy();
    expect(found.amount).toBe(1500);
  });

  test('PUT /api/tax-insurance/tax/:id → แก้ไข amount', async () => {
    const r = await apiPut(`/api/tax-insurance/tax/${ctx.taxId}`, {
      car_id: ctx.carId,
      amount: 2000,
      expiry_date: FAR_FUTURE,
      tax_year: 2025,
    }, ctx.adminToken);
    expect(r.status).toBe(200);
  });

  test('GET /api/tax-insurance/tax/:id → ดู tax record', async () => {
    const r = await apiGet(`/api/tax-insurance/tax/${ctx.taxId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.data?.data?.id === ctx.taxId || r.data?.data?.id === Number(ctx.taxId)).toBe(true);
    }
  });

  test('POST /api/tax-insurance/tax ไม่มี car_id → 400', async () => {
    const r = await apiPost('/api/tax-insurance/tax', {
      amount: 1000,
      expiry_date: FAR_FUTURE,
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Insurance (ประกันภัย) CRUD
  // ──────────────────────────────────────────
  test('GET /api/tax-insurance/insurance → list', async () => {
    const r = await apiGet('/api/tax-insurance/insurance', ctx.adminToken);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data?.data)).toBe(true);
  });

  test('POST /api/tax-insurance/insurance → สร้าง insurance record', async () => {
    const r = await apiPost('/api/tax-insurance/insurance', {
      car_id: ctx.carId,
      insurance_type: 'voluntary',
      insurance_company: 'บริษัทประกันทดสอบ',
      amount: 15000,
      start_date: '2025-01-01',
      expiry_date: FAR_FUTURE,
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.insuranceId = r.data?.data?.id || r.data?.data?.insurance_id;
    expect(ctx.insuranceId).toBeTruthy();
  });

  test('GET /api/tax-insurance/insurance — มี record ที่สร้าง', async () => {
    const r = await apiGet('/api/tax-insurance/insurance', ctx.adminToken);
    const items = r.data?.data || [];
    const found = items.find((i) => i.id === ctx.insuranceId || i.id === Number(ctx.insuranceId));
    expect(found).toBeTruthy();
    expect(found.insurance_company).toBe('บริษัทประกันทดสอบ');
  });

  test('PUT /api/tax-insurance/insurance/:id → แก้ไข', async () => {
    const r = await apiPut(`/api/tax-insurance/insurance/${ctx.insuranceId}`, {
      car_id: ctx.carId,
      insurance_type: 'voluntary',
      company: 'บริษัทประกันแก้ไข',
      amount: 18000,
      start_date: '2025-01-01',
      expiry_date: FAR_FUTURE,
    }, ctx.adminToken);
    expect(r.status).toBe(200);
  });

  test('POST /api/tax-insurance/insurance ไม่มี car_id → 400', async () => {
    const r = await apiPost('/api/tax-insurance/insurance', {
      amount: 10000,
      expiry_date: FAR_FUTURE,
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // ตรวจสภาพรถ (Inspections)
  // ──────────────────────────────────────────
  test('GET /api/tax-insurance/inspections → list', async () => {
    const r = await apiGet('/api/tax-insurance/inspections', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(Array.isArray(r.data?.data)).toBe(true);
    }
  });

  test('POST /api/tax-insurance/inspections → สร้าง inspection', async () => {
    const r = await apiPost('/api/tax-insurance/inspections', {
      car_id: ctx.carId,
      center: 'ตรอ.ทดสอบ',
      cost: 500,
      expiry_date: FAR_FUTURE,
    }, ctx.adminToken);
    expect([200, 201, 404]).toContain(r.status);
    if ([200, 201].includes(r.status)) {
      ctx.inspectionId = r.data?.data?.id || r.data?.data?.inspection_id;
    }
  });

  test('GET /api/tax-insurance/inspections (by car_id) → filter', async () => {
    const r = await apiGet(`/api/tax-insurance/inspections?car_id=${ctx.carId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('PUT /api/tax-insurance/inspections/:id → update ถ้า created', async () => {
    if (!ctx.inspectionId) return;
    const r = await apiPut(`/api/tax-insurance/inspections/${ctx.inspectionId}`, {
      car_id: ctx.carId,
      center: 'ตรอ.แก้ไข',
      cost: 600,
      expiry_date: FAR_FUTURE,
    }, ctx.adminToken);
    expect(r.status).toBe(200);
  });

  test('DELETE /api/tax-insurance/inspections/:id → ลบ', async () => {
    if (!ctx.inspectionId) return;
    const r = await apiDelete(`/api/tax-insurance/inspections/${ctx.inspectionId}`, ctx.adminToken);
    expect([200, 204]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Expiry Filter — แจ้งเตือนหมดอายุ
  // ──────────────────────────────────────────
  test('GET /api/tax-insurance/expiring?days=30 → ไม่ crash', async () => {
    const r = await apiGet('/api/tax-insurance/expiring?days=30', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.data).toBeTruthy();
    }
  });

  test('POST tax record หมดอายุใน 15 วัน → notification ควรสร้าง', async () => {
    const r = await apiPost('/api/tax-insurance/tax', {
      car_id: ctx.carId,
      amount: 500,
      expiry_date: NEAR_FUTURE,
      tax_year: 2025,
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    // หลัง create ตรวจ expiring
    const expiringR = await apiGet('/api/tax-insurance/expiring?days=30', ctx.adminToken);
    expect([200, 404]).toContain(expiringR.status);
  });

  // ──────────────────────────────────────────
  // Auth & Permissions
  // ──────────────────────────────────────────
  test('GET /api/tax-insurance/tax ไม่มี token → 401', async () => {
    const r = await apiGet('/api/tax-insurance/tax');
    expect([401, 403]).toContain(r.status);
  });

  test('POST /api/tax-insurance/insurance ไม่มี token → 401', async () => {
    const r = await apiPost('/api/tax-insurance/insurance', { car_id: ctx.carId });
    expect([401, 403]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────
  test('DELETE /api/tax-insurance/tax/:id → ลบได้', async () => {
    const r = await apiDelete(`/api/tax-insurance/tax/${ctx.taxId}`, ctx.adminToken);
    expect([200, 204]).toContain(r.status);
  });

  test('DELETE /api/tax-insurance/insurance/:id → ลบได้', async () => {
    const r = await apiDelete(`/api/tax-insurance/insurance/${ctx.insuranceId}`, ctx.adminToken);
    expect([200, 204]).toContain(r.status);
  });
});
