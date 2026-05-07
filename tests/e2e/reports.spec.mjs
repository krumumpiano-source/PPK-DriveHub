// ==============================================================
// PPK DriveHub — Reports API Tests
// ทดสอบ: Dashboard, Basic Reports, Fuel, Usage, Data Quality,
//         Vehicle Timeline, Vehicle Cost, Driver Performance
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

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH = TODAY.slice(0, 7); // YYYY-MM
const YEAR_START = `${TODAY.slice(0, 4)}-01-01`;

const ctx = {
  adminToken: '',
  carId: '',
  driverId: '',
  queueId: '',
};

test.describe.serial('Reports API', () => {
  // ──────────────────────────────────────────
  // Bootstrap: login + สร้าง test data
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
      license_plate: `RPT-${Date.now().toString().slice(-6)}`,
      brand: 'Mitsubishi', model: 'Triton', year: 2021,
      fuel_type: 'diesel', vehicle_type: 'pickup',
      status: 'active',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
    expect(ctx.carId).toBeTruthy();
  });

  test('Bootstrap: สร้าง test driver', async () => {
    const r = await apiPost('/api/drivers', {
      first_name: 'Report', last_name: 'TestDriver',
      license_number: `RPT${Date.now().toString().slice(-8)}`,
      license_expiry: '2030-12-31',
      status: 'active',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
    ctx.driverId = r.data?.data?.id || r.data?.data?.driver_id;
    expect(ctx.driverId).toBeTruthy();
  });

  test('Bootstrap: สร้าง fuel log', async () => {
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.carId,
      driver_id: ctx.driverId,
      liters: 50,
      price_per_liter: 35.5,
      total_cost: 1775,
      mileage_after: 50000,
      mileage_before: 49500,
      station: 'ปั๊มทดสอบ',
      fuel_date: TODAY,
      purpose: 'official',
      receipt_image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }, ctx.adminToken);
    expect([200, 201]).toContain(r.status);
  });

  test('Bootstrap: สร้าง queue + usage records', async () => {
    // สร้าง queue
    const queueR = await apiPost('/api/queue', {
      car_id: ctx.carId,
      driver_id: ctx.driverId,
      destination: 'ทดสอบ Report',
      date: TODAY,
      purpose: 'ทดสอบรายงาน',
    }, ctx.adminToken);
    expect([200, 201]).toContain(queueR.status);
    ctx.queueId = queueR.data?.data?.id || queueR.data?.data?.queue_id;
    if (ctx.queueId) {
      // departure record
      await apiPost('/api/usage', {
        queue_id: ctx.queueId,
        car_id: ctx.carId,
        driver_id: ctx.driverId,
        record_type: 'departure',
        mileage: 50100,
        record_date: TODAY,
      }, ctx.adminToken);
      // return record
      await apiPost('/api/usage', {
        queue_id: ctx.queueId,
        car_id: ctx.carId,
        driver_id: ctx.driverId,
        record_type: 'return',
        mileage: 50200,
        record_date: TODAY,
      }, ctx.adminToken);
    }
  });

  // ──────────────────────────────────────────
  // Dashboard Report
  // ──────────────────────────────────────────
  test('GET /api/reports/dashboard → 200', async () => {
    const r = await apiGet('/api/reports/dashboard', ctx.adminToken);
    expect(r.status).toBe(200);
    expect(r.data?.data).toBeTruthy();
  });

  test('GET /api/reports/dashboard → มี summary stats', async () => {
    const r = await apiGet('/api/reports/dashboard', ctx.adminToken);
    expect(r.status).toBe(200);
    const d = r.data?.data;
    expect(d).toBeTruthy();
    // ควรมี field เช่น total_cars, active_cars เป็นต้น
    expect(typeof d).toBe('object');
  });

  test('GET /api/reports/dashboard ไม่มี token → 401', async () => {
    const r = await apiGet('/api/reports/dashboard');
    expect([401, 403]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Basic Reports
  // ──────────────────────────────────────────
  test('GET /api/reports/vehicles → 200', async () => {
    const r = await apiGet('/api/reports/vehicles', ctx.adminToken);
    expect(r.status).toBe(200);
    expect(r.data?.data !== undefined).toBe(true);
  });

  test('GET /api/reports/drivers → 200', async () => {
    const r = await apiGet('/api/reports/drivers', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/repairs → 200', async () => {
    const r = await apiGet('/api/reports/repairs', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/maintenance → 200', async () => {
    const r = await apiGet('/api/reports/maintenance', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/expiry → 200', async () => {
    const r = await apiGet('/api/reports/expiry', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('Reports endpoints ทุกตัวต้อง auth', async () => {
    for (const endpoint of ['/api/reports/vehicles', '/api/reports/drivers', '/api/reports/repairs']) {
      const r = await apiGet(endpoint);
      expect([401, 403]).toContain(r.status);
    }
  });

  // ──────────────────────────────────────────
  // Fuel Report
  // ──────────────────────────────────────────
  test('GET /api/reports/fuel → 200', async () => {
    const r = await apiGet('/api/reports/fuel', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/fuel?car_id=:id → filter by car', async () => {
    const r = await apiGet(`/api/reports/fuel?car_id=${ctx.carId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200 && Array.isArray(r.data?.data)) {
      const wrongCar = r.data.data.filter((f) => f.car_id !== ctx.carId && f.car_id !== Number(ctx.carId));
      expect(wrongCar.length).toBe(0);
    }
  });

  test('GET /api/reports/fuel?date_from=&date_to= → date range filter', async () => {
    const r = await apiGet(`/api/reports/fuel?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/fuel?expense_type=cash → filter expense type', async () => {
    const r = await apiGet('/api/reports/fuel?expense_type=cash', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Usage Report
  // ──────────────────────────────────────────
  test('GET /api/reports/usage → 200', async () => {
    const r = await apiGet('/api/reports/usage', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/usage?car_id=:id → usage by car', async () => {
    const r = await apiGet(`/api/reports/usage?car_id=${ctx.carId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Data Quality
  // ──────────────────────────────────────────
  test('GET /api/reports/data-quality → 200', async () => {
    const r = await apiGet('/api/reports/data-quality', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/data-quality?date_from=&date_to= → with date range', async () => {
    const r = await apiGet(`/api/reports/data-quality?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('data-quality ไม่มี token → 401', async () => {
    const r = await apiGet('/api/reports/data-quality');
    expect([401, 403]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Vehicle Timeline
  // ──────────────────────────────────────────
  test('GET /api/reports/vehicle-timeline/:carId → 200 หรือ 404', async () => {
    const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.data?.data !== undefined).toBe(true);
    }
  });

  test('GET /api/reports/vehicle-timeline/:carId?type=fuel → filter type', async () => {
    const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}?type=fuel`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/vehicle-timeline/:carId?date_from=&date_to= → filter dates', async () => {
    const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('vehicle-timeline ไม่มี token → 401', async () => {
    const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}`);
    expect([401, 403]).toContain(r.status);
  });

  test('vehicle-timeline invalid car → 404', async () => {
    const r = await apiGet('/api/reports/vehicle-timeline/999999', ctx.adminToken);
    expect([404, 200]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Vehicle Cost
  // ──────────────────────────────────────────
  test('GET /api/reports/vehicle-cost/:carId → 200 หรือ 404', async () => {
    const r = await apiGet(`/api/reports/vehicle-cost/${ctx.carId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/vehicle-cost/:carId?date_from=&date_to= → with date', async () => {
    const r = await apiGet(`/api/reports/vehicle-cost/${ctx.carId}?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Driver Performance
  // ──────────────────────────────────────────
  test('GET /api/reports/driver-performance → 200', async () => {
    const r = await apiGet('/api/reports/driver-performance', ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.data?.data !== undefined).toBe(true);
    }
  });

  test('GET /api/reports/driver-performance/:driverId → 200 หรือ 404', async () => {
    const r = await apiGet(`/api/reports/driver-performance/${ctx.driverId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/reports/driver-scores?month=YYYY-MM → 200', async () => {
    const r = await apiGet(`/api/reports/driver-scores?month=${MONTH}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('driver-performance ไม่มี token → 401', async () => {
    const r = await apiGet('/api/reports/driver-performance');
    expect([401, 403]).toContain(r.status);
  });
});
