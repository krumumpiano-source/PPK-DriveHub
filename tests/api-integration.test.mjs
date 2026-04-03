// ==============================================================
// PPK DriveHub — API Integration Tests
// ทดสอบ API endpoint ทุกตัวว่า response ตรง spec หรือไม่
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = process.env.BASE_URL || 'http://localhost:8788';

/** Utility: POST JSON */
async function post(path, body = {}, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

/** Utility: GET */
async function get(path, token = '') {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

/** Utility: PUT JSON */
async function put(path, body = {}, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

/** Utility: DELETE */
async function del(path, token = '') {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

// ──────────────────────────────────────────
// Shared state across tests (sequential run)
// ──────────────────────────────────────────
let adminToken = '';
let adminUserId = '';
let createdVehicleId = '';
let createdDriverId = '';
let createdQueueId = '';
let createdFuelId = '';
let createdRepairId = '';
let createdUsageId = '';
let createdCheckId = '';
let createdTaxId = '';
let createdInsuranceId = '';
let createdNotificationId = '';

// Recover auth + shared state if worker was restarted (libuv crash on Windows)
test.beforeEach(async () => {
  if (adminToken) return; // already authenticated
  // Clear rate limits so recovery login isn't blocked
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { timeout: 10000, stdio: 'pipe' }); } catch {}
  // Setup admin if needed
  const check = await get('/api/setup');
  if (check.data?.data?.needs_setup) {
    await post('/api/setup', {
      username: 'testadmin', password: 'Admin@1234',
      first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com',
    });
  }
  // Try login with both possible passwords
  for (const pw of ['Admin@1234', 'Admin@5678']) {
    const r = await post('/api/auth/login', { username: 'testadmin', password: pw });
    if (r.status === 200 && r.data?.data?.token) {
      adminToken = r.data.data.token;
      adminUserId = r.data.data.user_id;
      break;
    }
  }
  if (!adminToken) return;
  // Recover shared IDs from existing data
  if (!createdVehicleId) {
    const r = await get('/api/vehicles', adminToken);
    const v = r.data?.data?.vehicles;
    if (v?.length) createdVehicleId = v[0].id;
  }
  if (!createdDriverId) {
    const r = await get('/api/drivers', adminToken);
    const d = r.data?.data?.drivers;
    if (d?.length) createdDriverId = d[0].id;
  }
});

// ════════════════════════════════════════════
// 1. SETUP
// ════════════════════════════════════════════
test.describe.serial('1. Setup', () => {
  test('GET /api/setup — ตรวจว่าระบบต้องการ setup หรือไม่', async () => {
    const r = await get('/api/setup');
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(r.data.data).toHaveProperty('needs_setup');
    expect(typeof r.data.data.needs_setup).toBe('boolean');
  });

  test('POST /api/setup — สร้าง super_admin (ถ้ายังไม่มี)', async () => {
    const check = await get('/api/setup');
    if (!check.data.data.needs_setup) {
      test.skip();
      return;
    }
    const r = await post('/api/setup', {
      username: 'testadmin',
      password: 'Admin@1234',
      first_name: 'Test',
      last_name: 'Admin',
      email: 'testadmin@test.com',
    });
    expect([200, 201]).toContain(r.status);
    expect(r.data.success).toBe(true);
    expect(r.data.data || r.data).toHaveProperty('user_id');
  });
});

// ════════════════════════════════════════════
// 2. AUTH
// ════════════════════════════════════════════
test.describe.serial('2. Auth', () => {
  test('Ensure admin exists before login', async () => {
    const check = await get('/api/setup');
    if (check.data.data && check.data.data.needs_setup) {
      await post('/api/setup', {
        username: 'testadmin',
        password: 'Admin@1234',
        first_name: 'Test',
        last_name: 'Admin',
        email: 'testadmin@test.com',
      });
    }
  });

  test('POST /api/auth/login — เข้าสู่ระบบสำเร็จ', async () => {
    const r = await post('/api/auth/login', {
      username: 'testadmin',
      password: 'Admin@1234',
    });
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(r.data.data).toHaveProperty('token');
    expect(r.data.data).toHaveProperty('user_id');
    expect(r.data.data).toHaveProperty('role');
    adminToken = r.data.data.token;
    adminUserId = r.data.data.user_id;
  });

  test('POST /api/auth/login — รหัสผิดต้อง fail', async () => {
    const r = await post('/api/auth/login', {
      username: 'testadmin',
      password: 'wrongpassword',
    });
    expect([401, 400]).toContain(r.status);
    expect(r.data.success).toBe(false);
  });

  test('GET /api/auth/me — ดูข้อมูลตัวเอง', async () => {
    const r = await get('/api/auth/me', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(r.data.data).toHaveProperty('username');
    expect(r.data.data).toHaveProperty('role');
    expect(r.data.data).toHaveProperty('email');
  });

  test('GET /api/auth/me — ไม่มี token ต้อง 401', async () => {
    const r = await get('/api/auth/me');
    expect(r.status).toBe(401);
  });

  test('PUT /api/auth/profile — อัปเดตโปรไฟล์', async () => {
    const r = await put('/api/auth/profile', {
      first_name: 'TestUpdated',
      phone: '0891234567',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/auth/change-password — เปลี่ยนรหัสผ่าน', async () => {
    const r = await post('/api/auth/change-password', {
      old_password: 'Admin@1234',
      new_password: 'Admin@5678',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    // Re-login with new password to confirm & update token
    const login = await post('/api/auth/login', {
      username: 'testadmin',
      password: 'Admin@5678',
    });
    expect(login.status).toBe(200);
    adminToken = login.data.data.token;
  });

  test('POST /api/auth/accept-pdpa — ยอมรับ PDPA', async () => {
    const r = await post('/api/auth/accept-pdpa', {}, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/auth/register — สมัครสมาชิกใหม่', async () => {
    const r = await post('/api/auth/register', {
      email: `testuser_${Date.now()}@test.com`,
      first_name: 'New',
      last_name: 'User',
      phone: '0899999999',
    });
    expect([200, 201]).toContain(r.status);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/auth/forgot-password — ลืมรหัสผ่าน', async () => {
    const r = await post('/api/auth/forgot-password', {
      email: 'testadmin@test.com',
    });
    // always returns success (no email leak)
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 3. VEHICLES
// ════════════════════════════════════════════
test.describe.serial('3. Vehicles', () => {
  test('POST /api/vehicles — สร้างรถ', async () => {
    expect(adminToken).toBeTruthy();
    const r = await post('/api/vehicles', {
      license_plate: `TEST-${Date.now().toString().slice(-4)}`,
      brand: 'Toyota',
      model: 'Hiace',
      year: 2024,
      fuel_type: 'diesel',
      seat_count: 12,
      status: 'available',
    }, adminToken);
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdVehicleId = r.data.id || r.data.data?.id;
    expect(createdVehicleId).toBeTruthy();
  });

  test('GET /api/vehicles — ดูรายการรถ', async () => {
    const r = await get('/api/vehicles', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    const vehicles = r.data.vehicles || r.data.data?.vehicles || r.data.data;
    expect(Array.isArray(vehicles)).toBe(true);
    expect(vehicles.length).toBeGreaterThan(0);
  });

  test('GET /api/vehicles/:id — ดูรถรายคัน', async () => {
    const r = await get(`/api/vehicles/${createdVehicleId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(r.data.data || r.data.vehicle).toBeTruthy();
  });

  test('PUT /api/vehicles/:id — อัปเดตข้อมูลรถ', async () => {
    const r = await put(`/api/vehicles/${createdVehicleId}`, {
      model: 'Commuter',
      color: 'White',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/vehicles/qr-info?car_id= — ดูข้อมูลรถจาก QR (Public)', async () => {
    const r = await get(`/api/vehicles/qr-info?car_id=${createdVehicleId}`);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(r.data.data).toHaveProperty('license_plate');
  });

  test('GET /api/vehicles/:id/maintenance — ดูประวัติบำรุงรักษา', async () => {
    const r = await get(`/api/vehicles/${createdVehicleId}/maintenance`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/vehicles/inactive — ดูรายการรถที่ปิดใช้งาน', async () => {
    const r = await get('/api/vehicles/inactive', adminToken);
    // May return 200 or 404 depending on route setup
    expect([200, 404]).toContain(r.status);
  });
});

// ════════════════════════════════════════════
// 4. DRIVERS
// ════════════════════════════════════════════
test.describe.serial('4. Drivers', () => {
  test('POST /api/drivers — สร้างคนขับ', async () => {
    const r = await post('/api/drivers', {
      name: 'คนขับทดสอบ',
      license_number: 'DL-TEST-001',
      phone: '0811111111',
      status: 'active',
    }, adminToken);
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdDriverId = r.data.id || r.data.data?.id;
    expect(createdDriverId).toBeTruthy();
  });

  test('GET /api/drivers — ดูรายการคนขับ', async () => {
    const r = await get('/api/drivers', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    const drivers = r.data.drivers || r.data.data?.drivers || r.data.data;
    expect(Array.isArray(drivers)).toBe(true);
  });

  test('GET /api/drivers/:id — ดูข้อมูลคนขับ', async () => {
    const r = await get(`/api/drivers/${createdDriverId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/drivers/:id — อัปเดตข้อมูลคนขับ', async () => {
    const r = await put(`/api/drivers/${createdDriverId}`, {
      phone: '0822222222',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/drivers/fatigue/report — รายงานคนขับเหนื่อย', async () => {
    const r = await post('/api/drivers/fatigue/report', {
      driver_id: createdDriverId,
      reason: 'ง่วงนอน',
    }, adminToken);
    expect([200, 201]).toContain(r.status);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/drivers/fatigue/list — ดูรายการรายงานเหนื่อย', async () => {
    const r = await get('/api/drivers/fatigue/list', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/drivers/:id/leaves — สร้างใบลา', async () => {
    const r = await post(`/api/drivers/${createdDriverId}/leaves`, {
      start_date: '2026-04-10',
      end_date: '2026-04-11',
      leave_type: 'sick',
      reason: 'ป่วย',
    }, adminToken);
    expect([200, 201]).toContain(r.status);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/drivers/:id/leaves — ดูใบลา', async () => {
    const r = await get(`/api/drivers/${createdDriverId}/leaves`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 5. QUEUE
// ════════════════════════════════════════════
test.describe.serial('5. Queue', () => {
  test('POST /api/queue — สร้างคิว', async () => {
    const r = await post('/api/queue', {
      car_id: createdVehicleId,
      date: '2026-04-15',
      time_start: '08:00',
      time_end: '12:00',
      driver_id: createdDriverId,
      mission: 'ทดสอบระบบ',
      destination: 'ห้องประชุม',
      passengers: 5,
    }, adminToken);
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdQueueId = r.data.id || r.data.data?.id;
    expect(createdQueueId).toBeTruthy();
  });

  test('GET /api/queue — ดูรายการคิว', async () => {
    const r = await get('/api/queue', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(Array.isArray(r.data.data || r.data)).toBe(true);
  });

  test('GET /api/queue/:id — ดูคิวรายตัว', async () => {
    const r = await get(`/api/queue/${createdQueueId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/queue/:id — อัปเดตคิว', async () => {
    const r = await put(`/api/queue/${createdQueueId}`, {
      passengers: 8,
      notes: 'อัปเดตจำนวนผู้โดยสาร',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/queue/:id/freeze — แช่แข็งคิว', async () => {
    const r = await put(`/api/queue/${createdQueueId}/freeze`, {
      reason: 'รอผู้อนุมัติ',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/queue/:id/unfreeze — ปลดแช่แข็ง', async () => {
    const r = await put(`/api/queue/${createdQueueId}/unfreeze`, {}, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/queue/:id/ongoing — เริ่มใช้รถ', async () => {
    const r = await put(`/api/queue/${createdQueueId}/ongoing`, {}, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/queue/:id/complete — คิวเสร็จสิ้น', async () => {
    const r = await put(`/api/queue/${createdQueueId}/complete`, {}, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 6. FUEL
// ════════════════════════════════════════════
test.describe.serial('6. Fuel', () => {
  test('GET /api/fuel/types — ดูประเภทน้ำมัน', async () => {
    const r = await get('/api/fuel/types', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/fuel/record — บันทึกเติมน้ำมัน (QR Public)', async () => {
    const r = await post('/api/fuel/record', {
      car_id: createdVehicleId,
      driver_name_manual: 'คนขับทดสอบ',
      date: '2026-04-03',
      mileage_after: 15000,
      liters: 50,
      price_per_liter: 32.5,
      amount: 1625,
      fuel_type: 'diesel',
      gas_station_name: 'ปั๊มทดสอบ',
      purpose: 'ราชการ',
      receipt_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdFuelId = r.data.id || r.data.data?.id;
    expect(createdFuelId).toBeTruthy();
  });

  test('GET /api/fuel/log — ดูบันทึกน้ำมัน', async () => {
    const r = await get('/api/fuel/log', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/fuel/log/:id — ดูรายละเอียดน้ำมัน', async () => {
    const r = await get(`/api/fuel/log/${createdFuelId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/fuel/log/:id — อัปเดตบันทึกน้ำมัน', async () => {
    const r = await put(`/api/fuel/log/${createdFuelId}`, {
      notes: 'อัปเดตหมายเหตุ',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/fuel/summary — ดูสรุปน้ำมัน', async () => {
    const r = await get('/api/fuel/summary?month=2026-04', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/fuel/ledger — ดูบัญชีน้ำมัน', async () => {
    const r = await get('/api/fuel/ledger', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/fuel/monthly-summary — ดูสรุปรายเดือน', async () => {
    const r = await get('/api/fuel/monthly-summary?year_month=2026-04', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/fuel/requests — ดูคำขอเติมน้ำมัน', async () => {
    const r = await get('/api/fuel/requests', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/fuel/invoices — ดูใบแจ้งหนี้', async () => {
    const r = await get('/api/fuel/invoices', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 7. USAGE
// ════════════════════════════════════════════
test.describe.serial('7. Usage', () => {
  test('POST /api/usage/record — QR บันทึกออกรถ (Public)', async () => {
    const r = await post('/api/usage/record', {
      car_id: createdVehicleId,
      record_type: 'departure',
      driver_id: createdDriverId,
      datetime: '2026-04-03T08:00:00',
      mileage: 15000,
    });
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdUsageId = r.data.id || r.data.data?.id;
    expect(createdUsageId).toBeTruthy();
  });

  test('GET /api/usage — ดูบันทึกใช้รถ', async () => {
    const r = await get('/api/usage', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/usage/:id — ดูรายละเอียดบันทึก', async () => {
    const r = await get(`/api/usage/${createdUsageId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/usage/:id — อัปเดตบันทึก', async () => {
    const r = await put(`/api/usage/${createdUsageId}`, {
      notes: 'อัปเดตหมายเหตุ',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/usage/summary — ดูสรุปการใช้รถ', async () => {
    const r = await get('/api/usage/summary?month=2026-04', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 8. CHECK (Daily Inspection)
// ════════════════════════════════════════════
test.describe.serial('8. Check', () => {
  test('POST /api/check/daily — ตรวจสภาพรถ (QR Public)', async () => {
    const r = await post('/api/check/daily', {
      car_id: createdVehicleId,
      checker_name: 'ผู้ตรวจทดสอบ',
      check_type: 'pre_trip',
      overall_status: 'ok',
      mileage: 15100,
      tire_condition: 'ok',
      brake_condition: 'ok',
      light_condition: 'ok',
    });
    expect([200, 201]).toContain(r.status);
    expect(r.data.success).toBe(true);
    createdCheckId = r.data.id || r.data.data?.id;
  });

  test('GET /api/check/log — ดูบันทึกตรวจเช็ค', async () => {
    const r = await get('/api/check/log', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/check/alerts — ดูการแจ้งเตือนจากการตรวจเช็ค', async () => {
    const r = await get('/api/check/alerts', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 9. REPAIR
// ════════════════════════════════════════════
test.describe.serial('9. Repair', () => {
  test('POST /api/repair/log — สร้างรายการซ่อม', async () => {
    const r = await post('/api/repair/log', {
      car_id: createdVehicleId,
      date_reported: '2026-04-03',
      status: 'pending',
      issue_description: 'เบรคมีเสียง',
      reporter_name: 'ผู้แจ้งทดสอบ',
    }, adminToken);
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdRepairId = r.data.id || r.data.data?.id;
    expect(createdRepairId).toBeTruthy();
  });

  test('GET /api/repair/log — ดูรายการซ่อม', async () => {
    const r = await get('/api/repair/log', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/repair/log/:id — ดูรายละเอียดซ่อม', async () => {
    const r = await get(`/api/repair/log/${createdRepairId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/repair/log/:id — อัปเดตรายการซ่อม', async () => {
    const r = await put(`/api/repair/log/${createdRepairId}`, {
      status: 'in_progress',
      garage_name: 'อู่ทดสอบ',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/repair/scheduled — ดูรายการซ่อมตามกำหนด', async () => {
    const r = await get('/api/repair/scheduled', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 10. TAX & INSURANCE
// ════════════════════════════════════════════
test.describe.serial('10. Tax & Insurance', () => {
  test('POST /api/tax-insurance/tax — สร้างข้อมูลภาษี', async () => {
    const r = await post('/api/tax-insurance/tax', {
      car_id: createdVehicleId,
      tax_type: 'annual_tax',
      amount: 5000,
      paid_date: '2026-01-15',
      expiry_date: '2027-01-14',
    }, adminToken);
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdTaxId = r.data.id || r.data.data?.id;
    expect(createdTaxId).toBeTruthy();
  });

  test('GET /api/tax-insurance/tax — ดูข้อมูลภาษี', async () => {
    const r = await get('/api/tax-insurance/tax', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/tax-insurance/tax/:id — อัปเดตภาษี', async () => {
    const r = await put(`/api/tax-insurance/tax/${createdTaxId}`, {
      amount: 5500,
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/tax-insurance/insurance — สร้างข้อมูลประกัน', async () => {
    const r = await post('/api/tax-insurance/insurance', {
      car_id: createdVehicleId,
      insurance_type: 'voluntary',
      insurance_company: 'บริษัททดสอบ',
      policy_number: 'POL-TEST-001',
      amount: 15000,
      paid_date: '2026-01-01',
      expiry_date: '2027-01-01',
    }, adminToken);
    expect(r.status).toBe(201);
    expect(r.data.success).toBe(true);
    createdInsuranceId = r.data.id || r.data.data?.id;
    expect(createdInsuranceId).toBeTruthy();
  });

  test('GET /api/tax-insurance/insurance — ดูข้อมูลประกัน', async () => {
    const r = await get('/api/tax-insurance/insurance', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/tax-insurance/expiring — ดูรายการใกล้หมดอายุ', async () => {
    const r = await get('/api/tax-insurance/expiring?days=365', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 11. MAINTENANCE
// ════════════════════════════════════════════
test.describe.serial('11. Maintenance', () => {
  test('GET /api/maintenance/settings — ดูรายการบำรุงรักษา', async () => {
    const r = await get('/api/maintenance/settings', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/maintenance/status — ดูสถานะบำรุงรักษาทุกคัน', async () => {
    const r = await get('/api/maintenance/status', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/maintenance/alerts — ดูการแจ้งเตือนบำรุงรักษา', async () => {
    const r = await get('/api/maintenance/alerts', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/maintenance/vehicle — บันทึกบำรุงรักษา', async () => {
    const r = await post('/api/maintenance/vehicle', {
      car_id: createdVehicleId,
      item_key: 'engine_oil',
      last_km: 15000,
      last_date: '2026-04-03',
      next_km: 20000,
      next_date: '2026-07-03',
    }, adminToken);
    expect([200, 201]).toContain(r.status);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/maintenance/vehicle/:carId — ดูบำรุงรักษาตามรถ', async () => {
    const r = await get(`/api/maintenance/vehicle/${createdVehicleId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 12. REPORTS
// ════════════════════════════════════════════
test.describe.serial('12. Reports', () => {
  test('GET /api/reports/dashboard — สรุปภาพรวม', async () => {
    const r = await get('/api/reports/dashboard', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
    expect(r.data.data).toHaveProperty('vehicles');
    expect(r.data.data).toHaveProperty('drivers');
  });

  test('GET /api/reports/vehicles — รายงานรถ', async () => {
    const r = await get('/api/reports/vehicles', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/fuel — รายงานน้ำมัน', async () => {
    const r = await get('/api/reports/fuel', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/usage — รายงานการใช้รถ', async () => {
    const r = await get('/api/reports/usage', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/drivers — รายงานคนขับ', async () => {
    const r = await get('/api/reports/drivers', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/repairs — รายงานซ่อม', async () => {
    const r = await get('/api/reports/repairs', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/maintenance — รายงานบำรุงรักษา', async () => {
    const r = await get('/api/reports/maintenance', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/expiry — รายงานใกล้หมดอายุ', async () => {
    const r = await get('/api/reports/expiry', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/reports/data-quality — รายงานคุณภาพข้อมูล', async () => {
    const r = await get('/api/reports/data-quality', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 13. NOTIFICATIONS
// ════════════════════════════════════════════
test.describe.serial('13. Notifications', () => {
  test('GET /api/notifications — ดูการแจ้งเตือน', async () => {
    const r = await get('/api/notifications', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/notifications/read-all — อ่านทั้งหมด', async () => {
    const r = await put('/api/notifications/read-all', {}, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 14. ADMIN
// ════════════════════════════════════════════
test.describe.serial('14. Admin', () => {
  test('GET /api/admin/users — ดูรายชื่อผู้ใช้', async () => {
    const r = await get('/api/admin/users', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/admin/requests — ดูคำขอสมัครสมาชิก', async () => {
    const r = await get('/api/admin/requests', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/admin/settings — ดูการตั้งค่าระบบ', async () => {
    const r = await get('/api/admin/settings', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('PUT /api/admin/settings — อัปเดตการตั้งค่า', async () => {
    const r = await put('/api/admin/settings', {
      test_setting: 'test_value',
    }, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('GET /api/admin/audit-log — ดู Audit Log', async () => {
    const r = await get('/api/admin/audit-log', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});

// ════════════════════════════════════════════
// 15. BACKUP
// ════════════════════════════════════════════
test.describe.serial('15. Backup', () => {
  test('GET /api/backup — ดูรายการ Backup', async () => {
    const r = await get('/api/backup', adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/backup — สร้าง Backup', async () => {
    const r = await post('/api/backup', {}, adminToken);
    // อาจ return json download ถ้าไม่มี R2
    expect([200, 201]).toContain(r.status);
  });
});

// ════════════════════════════════════════════
// 16. SECURITY / CORS / HEADERS
// ════════════════════════════════════════════
test.describe.serial('16. Security Headers', () => {
  test('OPTIONS /api/auth/login — CORS preflight', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:8788' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toBeTruthy();
  });

  test('Security headers present', async () => {
    const res = await fetch(`${BASE}/api/setup`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  test('Invalid token returns 401', async () => {
    const r = await get('/api/auth/me', 'invalid-token-12345');
    expect(r.status).toBe(401);
  });
});

// ════════════════════════════════════════════
// 17. CLEANUP — ลบข้อมูลทดสอบ
// ════════════════════════════════════════════
test.describe.serial('17. Cleanup', () => {
  test('DELETE /api/usage/:id — ลบบันทึกใช้รถ', async () => {
    if (!createdUsageId) { test.skip(); return; }
    const r = await del(`/api/usage/${createdUsageId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('DELETE /api/fuel/log/:id — ลบบันทึกน้ำมัน', async () => {
    if (!createdFuelId) { test.skip(); return; }
    const r = await del(`/api/fuel/log/${createdFuelId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('DELETE /api/repair/log/:id — ลบรายการซ่อม', async () => {
    if (!createdRepairId) { test.skip(); return; }
    const r = await del(`/api/repair/log/${createdRepairId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('DELETE /api/tax-insurance/tax/:id — ลบภาษี', async () => {
    if (!createdTaxId) { test.skip(); return; }
    const r = await del(`/api/tax-insurance/tax/${createdTaxId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('DELETE /api/tax-insurance/insurance/:id — ลบประกัน', async () => {
    if (!createdInsuranceId) { test.skip(); return; }
    const r = await del(`/api/tax-insurance/insurance/${createdInsuranceId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('DELETE /api/queue/:id — ลบคิว', async () => {
    if (!createdQueueId) { test.skip(); return; }
    const r = await del(`/api/queue/${createdQueueId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('DELETE /api/drivers/:id — ลบคนขับ', async () => {
    if (!createdDriverId) { test.skip(); return; }
    const r = await del(`/api/drivers/${createdDriverId}`, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });

  test('POST /api/auth/logout — ออกจากระบบ', async () => {
    const r = await post('/api/auth/logout', {}, adminToken);
    expect(r.status).toBe(200);
    expect(r.data.success).toBe(true);
  });
});
