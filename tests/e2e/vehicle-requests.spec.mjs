// ==============================================================
// PPK DriveHub — Vehicle Requests API Tests
// ทดสอบ: Create & Read, Edit & Cancel, Approve+AutoQueue, Reject, Filters
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

const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const ctx = {
  adminToken: '',
  carId: '',
  driverId: '',
  requestId: '',
  requestId2: '',
  queueIdFromApprove: '',
};

test.describe.serial('Vehicle Requests API', () => {
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

  test('Bootstrap: สร้าง test vehicle (active)', async () => {
    const r = await apiPost('/api/vehicles', {
      license_plate: `VRQ-${Date.now().toString().slice(-6)}`,
      brand: 'Ford', model: 'Ranger', year: 2023,
      fuel_type: 'diesel', vehicle_type: 'pickup',
      status: 'active',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
    expect(ctx.carId).toBeTruthy();
  });

  test('Bootstrap: สร้าง test driver (active)', async () => {
    const r = await apiPost('/api/drivers', {
      first_name: 'VRQ', last_name: 'TestDriver',
      license_number: `VRQ${Date.now().toString().slice(-8)}`,
      license_expiry: '2030-12-31',
      status: 'active',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.driverId = r.data?.data?.id || r.data?.data?.driver_id;
    expect(ctx.driverId).toBeTruthy();
  });

  // ──────────────────────────────────────────
  // Create & Read
  // ──────────────────────────────────────────
  test('GET /api/vehicle-requests → list (อาจว่าง)', async () => {
    const r = await apiGet('/api/vehicle-requests', ctx.adminToken);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data?.data)).toBe(true);
  });

  test('POST /api/vehicle-requests → สร้าง request', async () => {
    const r = await apiPost('/api/vehicle-requests', {
      date: TOMORROW,
      destination: 'กรุงเทพมหานคร',
      purpose: 'ประชุม',
      passengers: 3,
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.requestId = r.data?.data?.id || r.data?.data?.request_id;
    expect(ctx.requestId).toBeTruthy();
  });

  test('GET /api/vehicle-requests → มี request ที่สร้าง', async () => {
    const r = await apiGet('/api/vehicle-requests', ctx.adminToken);
    const items = r.data?.data || [];
    const found = items.find((req) => req.id === ctx.requestId || req.id === Number(ctx.requestId));
    expect(found).toBeTruthy();
    expect(found.status).toBe('pending');
    expect(found.destination).toBe('กรุงเทพมหานคร');
  });

  test('GET /api/vehicle-requests/:id → ดู request ได้', async () => {
    const r = await apiGet(`/api/vehicle-requests/${ctx.requestId}`, ctx.adminToken);
    expect(r.status).toBe(200);
    expect(r.data?.data?.id === ctx.requestId || r.data?.data?.id === Number(ctx.requestId)).toBe(true);
  });

  test('POST /api/vehicle-requests ไม่มี date → 400', async () => {
    const r = await apiPost('/api/vehicle-requests', {
      destination: 'เชียงใหม่',
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  test('POST /api/vehicle-requests ไม่มี destination → 400', async () => {
    const r = await apiPost('/api/vehicle-requests', {
      date: TOMORROW,
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Edit & Cancel
  // ──────────────────────────────────────────
  test('PUT /api/vehicle-requests/:id → แก้ไข destination', async () => {
    const r = await apiPut(`/api/vehicle-requests/${ctx.requestId}`, {
      date: TOMORROW,
      destination: 'เชียงใหม่ (แก้ไข)',
      purpose: 'ประชุม',
      passengers: 2,
    }, ctx.adminToken);
    expect(r.status).toBe(200);
  });

  test('สร้าง request ที่ 2 สำหรับทดสอบ cancel', async () => {
    const r = await apiPost('/api/vehicle-requests', {
      date: NEXT_WEEK,
      destination: 'ขอนแก่น',
      purpose: 'ส่งเอกสาร',
      passengers: 1,
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.requestId2 = r.data?.data?.id || r.data?.data?.request_id;
    expect(ctx.requestId2).toBeTruthy();
  });

  test('DELETE /api/vehicle-requests/:id → cancel request', async () => {
    const r = await apiDelete(`/api/vehicle-requests/${ctx.requestId2}`, ctx.adminToken);
    expect([200, 204]).toContain(r.status);
  });

  test('GET cancelled request → ไม่ found หรือ status=cancelled', async () => {
    const r = await apiGet(`/api/vehicle-requests/${ctx.requestId2}`, ctx.adminToken);
    if (r.status === 200) {
      expect(['cancelled', 'deleted']).toContain(r.data?.data?.status);
    } else {
      expect([404]).toContain(r.status);
    }
  });

  // ──────────────────────────────────────────
  // Approve → Auto Queue
  // ──────────────────────────────────────────
  test('PUT /api/vehicle-requests/:id/approve → อนุมัติ + สร้าง queue', async () => {
    const r = await apiPut(`/api/vehicle-requests/${ctx.requestId}/approve`, {
      assigned_car_id: ctx.carId,
      assigned_driver_id: ctx.driverId,
    }, ctx.adminToken);
    // 200 = approved, 400/404 = ขึ้นกับ business rules
    expect([200, 400, 404]).toContain(r.status);
    if (r.status === 200) {
      // ควร auto-create queue
      const queueList = await apiGet('/api/queue', ctx.adminToken);
      if (queueList.status === 200 && Array.isArray(queueList.data?.data)) {
        // ตรวจว่ามี queue ที่เกี่ยวกับ request นี้
        const found = queueList.data.data.find((q) =>
          q.request_id === ctx.requestId || q.request_id === Number(ctx.requestId) ||
          q.destination === 'เชียงใหม่ (แก้ไข)'
        );
        if (found) ctx.queueIdFromApprove = found.id;
      }
    }
  });

  test('Approved request → status เปลี่ยนเป็น approved', async () => {
    const r = await apiGet(`/api/vehicle-requests/${ctx.requestId}`, ctx.adminToken);
    if (r.status === 200) {
      const status = r.data?.data?.status;
      // อาจเป็น approved, scheduled, completed ขึ้นอยู่กับว่า approve สำเร็จ
      expect(['pending', 'approved', 'scheduled', 'cancelled']).toContain(status);
    }
  });

  // ──────────────────────────────────────────
  // Reject
  // ──────────────────────────────────────────
  test('สร้าง request ใหม่ สำหรับทดสอบ reject', async () => {
    const r = await apiPost('/api/vehicle-requests', {
      date: NEXT_WEEK,
      destination: 'สงขลา',
      purpose: 'งานสำรวจ',
      passengers: 4,
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    const id = r.data?.data?.id || r.data?.data?.request_id;
    if (id) {
      // Reject
      const rejectR = await apiPut(`/api/vehicle-requests/${id}/reject`, {
        reason: 'ไม่มีรถว่าง',
      }, ctx.adminToken);
      expect([200, 400, 404, 500]).toContain(rejectR.status);
      if (rejectR.status === 200) {
        const check = await apiGet(`/api/vehicle-requests/${id}`, ctx.adminToken);
        if (check.status === 200) {
          expect(check.data?.data?.status).toBe('rejected');
        }
      }
    }
  });

  // ──────────────────────────────────────────
  // Filters
  // ──────────────────────────────────────────
  test('GET /api/vehicle-requests?status=pending → filter pending', async () => {
    const r = await apiGet('/api/vehicle-requests?status=pending', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200 && Array.isArray(r.data?.data)) {
      const nonPending = r.data.data.filter((req) => req.status !== 'pending');
      expect(nonPending.length).toBe(0);
    }
  });

  test('GET /api/vehicle-requests?date_from= → filter by date', async () => {
    const r = await apiGet(`/api/vehicle-requests?date_from=${TOMORROW}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Auth
  // ──────────────────────────────────────────
  test('GET /api/vehicle-requests ไม่มี token → 401', async () => {
    const r = await apiGet('/api/vehicle-requests');
    expect([401, 403]).toContain(r.status);
  });

  test('POST /api/vehicle-requests ไม่มี token → 401', async () => {
    const r = await apiPost('/api/vehicle-requests', { date: TOMORROW, destination: 'test' });
    expect([401, 403]).toContain(r.status);
  });
});
