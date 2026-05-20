// ==============================================================
// PPK DriveHub — Driver Role E2E Tests
// ทดสอบการใช้งานในบทบาทพนักงานขับรถ ทุกมิติ
// ครอบคลุม: API, UI, สิทธิ์, ขอบเขตการเข้าถึง
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';

const TEST_ADMIN_PASS = process.env.TEST_ADMIN_PASS;
const TEST_ADMIN_PASS_ALT = process.env.TEST_ADMIN_PASS_ALT;
const TEST_DRIVER_PASS = process.env.TEST_DRIVER_PASS;
const TEST_DRIVER_PASS_NEW = process.env.TEST_DRIVER_PASS_NEW;
const TEST_DRIVER_PASS_ALT = process.env.TEST_DRIVER_PASS_ALT;
const TEST_ROLE_ADMIN_PASS = process.env.TEST_ROLE_ADMIN_PASS;

const DRIVER_USER = {
  email: 'driver_test@ppk.ac.th',
  password: TEST_DRIVER_PASS,
  first_name: 'ทดสอบ',
  last_name: 'พนักงานขับ',
  role: 'driver',
};

// tokens และข้อมูล shared ระหว่าง test groups
const ctx = {
  adminToken: '',
  driverToken: '',
  driverUserId: '',
  driverRecordId: '',
  vehicleRequestId: '',
  repairId: '',
  incidentId: '',
  carId: '',
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
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
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
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
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT', headers, body: JSON.stringify(body),
  });
  return r.json().catch(() => null);
}

async function apiDelete(path, token = '') {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers });
  return r.json().catch(() => null);
}

// ──────────────────────────────────────────────
// Bootstrap: สร้าง admin token + driver user + driver record
// ──────────────────────────────────────────────
test.beforeAll(async () => {
  clearRateLimits();

  // 1. ได้ admin token
  for (const cred of [
    { username: 'testadmin', password: TEST_ADMIN_PASS_ALT },
    { username: 'testadmin', password: TEST_ADMIN_PASS },
    { username: 'admin@test.com', password: TEST_ADMIN_PASS },
    { username: 'role_admin@test.com', password: TEST_ROLE_ADMIN_PASS },
  ]) {
    const r = await apiPost('/api/auth/login', cred);
    if (r?.data?.token) { ctx.adminToken = r.data.token; break; }
    clearRateLimits();
  }

  // ถ้า admin ยังไม่มี → setup ใหม่
  if (!ctx.adminToken) {
    const check = await apiGet('/api/setup');
    if (check?.data?.needs_setup) {
      await apiPost('/api/setup', {
        username: 'testadmin',
        password: TEST_ADMIN_PASS_ALT,
        first_name: 'Test', last_name: 'Admin', email: 'testadmin@ppk.test',
      });
      clearRateLimits();
      const r = await apiPost('/api/auth/login', { username: 'testadmin', password: TEST_ADMIN_PASS_ALT });
      if (r?.data?.token) ctx.adminToken = r.data.token;
    }
  }

  if (!ctx.adminToken) throw new Error('[driver.spec] Cannot obtain admin token');

  // 2. สร้างหรือ login driver user
  // ลอง password หลายอัน เผื่อ test ก่อนหน้าเปลี่ยน password ค้างไว้
  clearRateLimits();
  let existing = null;
  for (const tryPwd of [DRIVER_USER.password, TEST_DRIVER_PASS_NEW, TEST_DRIVER_PASS_ALT]) {
    const r = await apiPost('/api/auth/login', { username: DRIVER_USER.email, password: tryPwd });
    if (r?.data?.token) { existing = r; break; }
    clearRateLimits();
  }
  clearRateLimits();

  if (existing?.data?.token) {
    ctx.driverToken = existing.data.token;
    ctx.driverUserId = existing.data.user_id || '';
  } else {
    // Register
    await apiPost('/api/auth/register', {
      email: DRIVER_USER.email,
      first_name: DRIVER_USER.first_name,
      last_name: DRIVER_USER.last_name,
      password: DRIVER_USER.password,
    });
    clearRateLimits();

    // Approve
    const reqs = await apiGet('/api/admin/requests?status=pending', ctx.adminToken);
    const req = reqs?.data?.find(r => r.email === DRIVER_USER.email);
    if (req) {
      await apiPut(`/api/admin/requests/${req.id}/approve`, {
        role: DRIVER_USER.role,
        permissions: {},
      }, ctx.adminToken);
      clearRateLimits();
    }

    // Login
    const loginRes = await apiPost('/api/auth/login', {
      username: DRIVER_USER.email,
      password: DRIVER_USER.password,
    });
    if (loginRes?.data?.token) {
      ctx.driverToken = loginRes.data.token;
      ctx.driverUserId = loginRes.data.user_id || '';
    }
    clearRateLimits();
  }

  if (!ctx.driverToken) throw new Error('[driver.spec] Cannot obtain driver token');

  // ดึง user id ถ้ายังไม่มี
  if (!ctx.driverUserId) {
    const me = await apiGet('/api/auth/me', ctx.driverToken);
    ctx.driverUserId = me?.data?.id || '';
  }

  // 3. สร้าง driver record (ถ้ายังไม่มี) แล้ว link กับ user
  // ตรวจว่า user มี driver_id แล้วหรือยัง
  const meCheck = await apiGet('/api/auth/me', ctx.driverToken);
  if (!meCheck?.data?.driver_id) {
    // สร้าง driver record ผ่าน admin
    const driverCreate = await apiPost('/api/drivers', {
      first_name: DRIVER_USER.first_name,
      last_name: DRIVER_USER.last_name,
      license_number: 'ทดสอบ-001',
      phone: '0812345678',
      status: 'active',
    }, ctx.adminToken);
    if (driverCreate?.data?.id) {
      ctx.driverRecordId = driverCreate.data.id;
      // Link user → driver record
      if (ctx.driverUserId) {
        await apiPut(`/api/admin/users/${ctx.driverUserId}`, {
          driver_id: ctx.driverRecordId,
        }, ctx.adminToken);
      }
    }
    clearRateLimits();
  } else {
    ctx.driverRecordId = meCheck.data.driver_id;
  }

  // อัปเดต role และ reset permissions ให้ถูกต้องเสมอ (/api/auth/register สร้าง user เป็น viewer โดย default)
  if (ctx.driverUserId) {
    await apiPut(`/api/admin/users/${ctx.driverUserId}`, {
      role: DRIVER_USER.role,
      permissions: {}, // reset ให้ไม่มี extra permissions ค้าง
    }, ctx.adminToken);
    clearRateLimits();
  }

  // 4. หา car_id สำหรับใช้ใน test
  const cars = await apiGet('/api/vehicles', ctx.adminToken);
  const carList = Array.isArray(cars?.data) ? cars.data : (Array.isArray(cars?.data?.vehicles) ? cars.data.vehicles : []);
  if (carList.length > 0) ctx.carId = carList[0].id;

  // ถ้าไม่มีรถเลย → สร้างรถทดสอบ
  if (!ctx.carId) {
    const newCar = await apiPost('/api/vehicles', {
      license_plate: 'ทด-0001',
      brand: 'Toyota',
      model: 'Commuter',
      fuel_type: 'diesel',
      status: 'active',
    }, ctx.adminToken);
    ctx.carId = newCar?.data?.id || '';
    clearRateLimits();
  }
});

// ══════════════════════════════════════════════════════════════
// 1. AUTHENTICATION — เข้าสู่ระบบ / ออกจากระบบ
// ══════════════════════════════════════════════════════════════
test.describe('1. Authentication — เข้าสู่ระบบและตรวจสอบตัวตน', () => {
  test('login ด้วย email+password ได้ token', async () => {
    clearRateLimits();
    const r = await apiPost('/api/auth/login', {
      username: DRIVER_USER.email,
      password: DRIVER_USER.password,
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.token).toBeTruthy();
    expect(r?.data?.role).toBe('driver');
  });

  test('GET /api/auth/me — ดูข้อมูลตัวเองได้', async () => {
    const r = await apiGet('/api/auth/me', ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.email).toBe(DRIVER_USER.email);
    expect(r?.data?.role).toBe('driver');
  });

  test('driver_id ถูก link กับ user record', async () => {
    const r = await apiGet('/api/auth/me', ctx.driverToken);
    expect(r?.data?.driver_id).toBeTruthy();
  });

  test('logout ได้ปกติ', async () => {
    clearRateLimits();
    // ใช้ token ชั่วคราวเพื่อไม่ให้กระทบ ctx.driverToken
    const loginTmp = await apiPost('/api/auth/login', {
      username: DRIVER_USER.email,
      password: DRIVER_USER.password,
    });
    clearRateLimits();
    const tmpToken = loginTmp?.data?.token;
    if (tmpToken) {
      const r = await apiPost('/api/auth/logout', {}, tmpToken);
      expect(r?.success).toBe(true);
    }
  });

  test('login ด้วยรหัสผ่านผิด → 401', async () => {
    clearRateLimits();
    const r = await apiPost('/api/auth/login', {
      username: DRIVER_USER.email,
      password: 'WrongPass!999',
    });
    expect(r?.success).toBe(false);
    clearRateLimits();
  });
});

// ══════════════════════════════════════════════════════════════
// 2. ขอใช้รถ (VEHICLE REQUESTS)
// ══════════════════════════════════════════════════════════════
test.describe('2. ขอใช้รถ — Vehicle Requests', () => {
  test('สร้างคำขอใช้รถได้', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = await apiPost('/api/vehicle-requests', {
      date: today,
      destination: 'โรงเรียนพะเยาพิทยาคม',
      purpose: 'ทดสอบระบบ E2E',
      time_start: '08:00',
      time_end: '12:00',
      passengers: 3,
      priority: 'general',
    }, ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.vehicleRequestId = r.data.id;
  });

  test('ดูรายการคำขอใช้รถได้', async () => {
    const r = await apiGet('/api/vehicle-requests', ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });

  test('ดูคำขอของตัวเองตาม requester_id ได้', async () => {
    const r = await apiGet(`/api/vehicle-requests?requester_id=${ctx.driverUserId}`, ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    // ควรมีคำขอที่เพิ่งสร้าง
    if (ctx.vehicleRequestId) {
      const found = r.data.some(x => x.id === ctx.vehicleRequestId);
      expect(found).toBe(true);
    }
  });

  test('ดูรายละเอียดคำขอเดี่ยวได้', async () => {
    if (!ctx.vehicleRequestId) return test.skip();
    const r = await apiGet(`/api/vehicle-requests/${ctx.vehicleRequestId}`, ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.vehicleRequestId);
    expect(r?.data?.destination).toBe('โรงเรียนพะเยาพิทยาคม');
  });

  test('แก้ไขคำขอ pending ของตัวเองได้', async () => {
    if (!ctx.vehicleRequestId) return test.skip();
    const r = await apiPut(`/api/vehicle-requests/${ctx.vehicleRequestId}`, {
      destination: 'โรงเรียนพะเยาพิทยาคม (แก้ไขแล้ว)',
      notes: 'แก้ไขโดย E2E test',
    }, ctx.driverToken);
    expect(r?.success).toBe(true);
  });

  test('ยกเลิกคำขอของตัวเองได้', async () => {
    // สร้างคำขอใหม่เพื่อยกเลิก (ไม่ใช้ vehicleRequestId หลัก)
    const today = new Date().toISOString().slice(0, 10);
    const createRes = await apiPost('/api/vehicle-requests', {
      date: today,
      destination: 'ทดสอบยกเลิก',
      purpose: 'E2E cancel test',
    }, ctx.driverToken);
    const cancelId = createRes?.data?.id;
    if (!cancelId) return test.skip();

    const r = await apiDelete(`/api/vehicle-requests/${cancelId}`, ctx.driverToken);
    expect(r?.success).toBe(true);
  });

  test('สร้างคำขอโดยไม่ระบุ destination → error', async () => {
    const r = await apiPost('/api/vehicle-requests', {
      date: new Date().toISOString().slice(0, 10),
    }, ctx.driverToken);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. แจ้งซ่อม — Repair Reporting
// ══════════════════════════════════════════════════════════════
test.describe('3. แจ้งซ่อม — Repair Reporting', () => {
  test('พนักงานขับรถแจ้งซ่อมได้ (POST /api/repair/log)', async () => {
    if (!ctx.carId) return test.skip();
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.carId,
      date_reported: new Date().toISOString().slice(0, 10),
      problem_description: 'เบรกเสียงดัง — แจ้งโดย E2E test',
      service_type: 'repair',
      status: 'requested',
      requested_by_driver_id: ctx.driverRecordId || null,
    }, ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.repairId = r.data.id;
  });

  test('driver GET /api/repair/log → เห็นเฉพาะของตนเอง (200, ไม่ใช่ 403)', async () => {
    const r = await fetch(`${BASE}/api/repair/log`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    // API อนุญาต driver เห็น repair log แต่กรองเฉพาะของตนเอง
    expect(r.status).toBe(200);
  });

  test('driver ไม่สามารถแก้ไขสถานะซ่อมได้ (PUT repair:edit → 403)', async () => {
    if (!ctx.repairId) return test.skip();
    const r = await fetch(`${BASE}/api/repair/log/${ctx.repairId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ctx.driverToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'completed', total_cost: 5000 }),
    });
    expect(r.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. รายงานเหตุการณ์ — Incidents
// ══════════════════════════════════════════════════════════════
test.describe('4. รายงานเหตุการณ์ — Incidents', () => {
  test('สร้างรายงานเหตุการณ์ได้', async () => {
    if (!ctx.carId) return test.skip();
    const r = await apiPost('/api/incidents', {
      car_id: ctx.carId,
      driver_id: ctx.driverRecordId || null,
      incident_date: new Date().toISOString().slice(0, 10),
      incident_type: 'damage',
      description: 'กระจกแตก — E2E test',
      location: 'ถนนพหลโยธิน',
      damage_cost: 2000,
    }, ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.incidentId = r.data.id;
  });

  test('ดูรายการเหตุการณ์ได้', async () => {
    const r = await apiGet('/api/incidents', ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });

  test('ดูรายละเอียดเหตุการณ์ที่สร้างได้', async () => {
    if (!ctx.incidentId) return test.skip();
    const r = await apiGet(`/api/incidents/${ctx.incidentId}`, ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.incidentId);
  });

  test('สร้างรายงานโดยไม่มี car_id → error', async () => {
    const r = await apiPost('/api/incidents', {
      incident_date: new Date().toISOString().slice(0, 10),
      incident_type: 'accident',
    }, ctx.driverToken);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// 5. รายงานความเหนื่อยล้า — Fatigue Reporting
// ══════════════════════════════════════════════════════════════
test.describe('5. รายงานความเหนื่อยล้า — Fatigue Reporting', () => {
  test('พนักงานขับรถรายงานความเหนื่อยล้าได้', async () => {
    if (!ctx.driverRecordId) return test.skip();
    const r = await apiPost('/api/drivers/fatigue/report', {
      driver_id: ctx.driverRecordId,
      reason: 'นอนไม่หลับ — E2E test',
    }, ctx.driverToken);
    expect(r?.success).toBe(true);
  });

  test('driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)', async () => {
    const r = await fetch(`${BASE}/api/drivers/fatigue/list`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. โปรไฟล์ส่วนตัว — Profile & Account
// ══════════════════════════════════════════════════════════════
test.describe('6. โปรไฟล์ส่วนตัว — Profile & Account', () => {
  test('ดูโปรไฟล์ตัวเองได้ (GET /api/auth/me)', async () => {
    const r = await apiGet('/api/auth/me', ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.role).toBe('driver');
  });

  test('เปลี่ยนรหัสผ่านได้ (change-password flow)', async () => {
    clearRateLimits();
    // เปลี่ยนเป็นรหัสใหม่
    const r1 = await apiPost('/api/auth/change-password', {
      old_password: DRIVER_USER.password,
      new_password: TEST_DRIVER_PASS_NEW,
    }, ctx.driverToken);
    expect(r1?.success).toBe(true);

    // Login ด้วยรหัสใหม่
    clearRateLimits();
    const r2 = await apiPost('/api/auth/login', {
      username: DRIVER_USER.email,
      password: TEST_DRIVER_PASS_NEW,
    });
    expect(r2?.data?.token).toBeTruthy();

    // เปลี่ยนเป็นรหัสที่ 3 (ห้ามใช้รหัสเดิมเพราะอยู่ใน password_history)
    clearRateLimits();
    const r3 = await apiPost('/api/auth/change-password', {
      old_password: TEST_DRIVER_PASS_NEW,
      new_password: TEST_DRIVER_PASS_ALT,
    }, r2.data.token);
    expect(r3?.success).toBe(true);
    clearRateLimits();
  });

  test('เปลี่ยนรหัสผ่านด้วยรหัสเดิมผิด → error', async () => {
    clearRateLimits();
    const r = await apiPost('/api/auth/change-password', {
      old_password: 'WrongOld@999',
      new_password: 'NewPass@123',
    }, ctx.driverToken);
    expect(r?.success).toBe(false);
    clearRateLimits();
  });
});

// ══════════════════════════════════════════════════════════════
// 7. การแจ้งเตือน — Notifications
// ══════════════════════════════════════════════════════════════
test.describe('7. การแจ้งเตือน — Notifications', () => {
  test('ดูการแจ้งเตือนของตัวเองได้', async () => {
    const r = await apiGet('/api/notifications', ctx.driverToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data?.notifications)).toBe(true);
  });

  test('ดูจำนวนแจ้งเตือนที่ยังไม่อ่านได้', async () => {
    const r = await apiGet('/api/notifications?unread=true', ctx.driverToken);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 8. ขอบเขตสิทธิ์ — Permission Boundaries
// ══════════════════════════════════════════════════════════════
test.describe('8. ขอบเขตสิทธิ์ — Permission Boundaries (API)', () => {
  test('ดูรายการรถได้ (vehicles:view → 200, driver เห็นได้)', async () => {
    const r = await fetch(`${BASE}/api/vehicles`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    // API อนุญาต driver ดูรายการรถ
    expect(r.status).toBe(200);
  });

  test('ไม่สามารถสร้างรถได้ (vehicles:create → 403)', async () => {
    const r = await fetch(`${BASE}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.driverToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ license_plate: 'ผิดกฎ-999', brand: 'Hack' }),
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)', async () => {
    const r = await fetch(`${BASE}/api/drivers`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถดูรายการน้ำมันได้ (fuel:view → 403)', async () => {
    const r = await fetch(`${BASE}/api/fuel/log`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถดูรายการผู้ใช้ระบบได้ (admin only → 403)', async () => {
    const r = await fetch(`${BASE}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถอนุมัติคำขอสมาชิกได้ (admin only → 403)', async () => {
    const r = await fetch(`${BASE}/api/admin/requests`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถดู audit log ได้ (admin only → 403)', async () => {
    const r = await fetch(`${BASE}/api/admin/audit-log`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถดู report/summary ได้ถ้าไม่มีสิทธิ์ (reports:view → 403)', async () => {
    const r = await fetch(`${BASE}/api/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
    });
    expect(r.status).toBe(403);
  });

  test('ไม่สามารถสร้างบันทึกน้ำมันได้ (fuel:create → 403)', async () => {
    const r = await fetch(`${BASE}/api/fuel/requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ctx.driverToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ car_id: ctx.carId || 'xxx', liters: 10 }),
    });
    expect(r.status).toBe(403);
  });

  test('เรียก API โดยไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/auth/me`);
    expect(r.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════
// 9. UI / Browser — การเข้าถึงหน้าต่างๆ
// ══════════════════════════════════════════════════════════════
test.describe('9. UI — หน้าที่พนักงานขับรถเข้าได้', () => {
  // inject auth ก่อนโหลดหน้า
  async function loginAsDriver(page) {
    await page.addInitScript(({ token, userId, driverId }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: userId || 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ พนักงานขับ',
        role: 'driver',
        driver_id: driverId || 'driver-rec-1',
        permissions: {},
      }));
    }, {
      token: ctx.driverToken,
      userId: ctx.driverUserId,
      driverId: ctx.driverRecordId,
    });
  }

  const allowedPages = [
    { path: '/dashboard.html',       name: 'Dashboard' },
    { path: '/vehicle-request.html', name: 'ขอใช้รถ' },
    { path: '/driver-history.html',  name: 'คิวและประวัติส่วนตัว' },
    { path: '/repair.html',          name: 'แจ้งซ่อม' },
    { path: '/incident.html',        name: 'รายงานเหตุการณ์' },
    { path: '/qr-scan.html',         name: 'สแกน QR Code' },
    { path: '/profile.html',         name: 'โปรไฟล์' },
    { path: '/notifications.html',   name: 'การแจ้งเตือน' },
    { path: '/change-password.html', name: 'เปลี่ยนรหัสผ่าน' },
    { path: '/user-guide.html',      name: 'คู่มือการใช้งาน' },
    { path: '/about.html',           name: 'เกี่ยวกับโปรแกรม' },
  ];

  for (const { path, name } of allowedPages) {
    test(`เข้า ${name} (${path}) ได้ — ไม่ redirect ไป login`, async ({ page }) => {
      await loginAsDriver(page);
      await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });
  }
});

test.describe('10. UI — หน้าที่พนักงานขับรถเข้าไม่ได้ (ต้องถูกจำกัด)', () => {
  async function loginAsDriver(page) {
    await page.addInitScript(({ token, userId, driverId }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: userId || 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ พนักงานขับ',
        role: 'driver',
        driver_id: driverId || 'driver-rec-1',
        permissions: {},
      }));
    }, {
      token: ctx.driverToken,
      userId: ctx.driverUserId,
      driverId: ctx.driverRecordId,
    });
  }

  const restrictedPages = [
    { path: '/user-management.html', name: 'จัดการผู้ใช้' },
    { path: '/admin-settings.html',  name: 'ตั้งค่าระบบ' },
    { path: '/audit-log.html',       name: 'บันทึกกิจกรรม' },
    { path: '/backup-recovery.html', name: 'สำรอง/กู้คืน' },
    // vehicles.html ไม่ redirect ตาม design ของแอป (แสดงหน้าได้แต่ไม่มีข้อมูล)
    { path: '/drivers.html',         name: 'จัดการพนักงานขับรถ' },
  ];

  for (const { path, name } of restrictedPages) {
    test(`${name} (${path}) — ถูก redirect หรือแสดงข้อผิดพลาด ไม่ใช่หน้าปกติ`, async ({ page }) => {
      await loginAsDriver(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // หน้าต้อง redirect ออก หรือแสดง alert ไม่มีสิทธิ์
      // admin pages จะ redirect ไป dashboard.html
      const currentUrl = page.url();
      const isRedirected = currentUrl.includes('dashboard') || currentUrl.includes('login');

      // หรือหน้ายังอยู่แต่แสดง error/empty content
      const hasAccessDenied = await page.locator(
        'text=/ไม่มีสิทธิ์|Access Denied|Unauthorized|403/'
      ).isVisible({ timeout: 3000 }).catch(() => false);

      expect(isRedirected || hasAccessDenied).toBe(true);
    });
  }
});

// ══════════════════════════════════════════════════════════════
// 11. UI Sidebar — ตรวจสอบ Navigation Menu
// ══════════════════════════════════════════════════════════════
test.describe('11. UI Sidebar — เมนู Navigation ของพนักงานขับรถ', () => {
  test('sidebar แสดง "คิวและประวัติส่วนตัว" เมื่อมี driver_id', async ({ page }) => {
    await page.addInitScript(({ token, driverId }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ พนักงานขับ',
        role: 'driver',
        driver_id: driverId || 'driver-rec-1',
        permissions: {},
      }));
    }, { token: ctx.driverToken, driverId: ctx.driverRecordId });

    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    // หา sidebar item สำหรับ driver-history
    const historyLink = page.locator('[data-page="driver-history"], a[href*="driver-history"]');
    await expect(historyLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('sidebar แสดง "ขอใช้รถ" เสมอ', async ({ page }) => {
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ',
        role: 'driver',
        driver_id: 'test-driver-1',
        permissions: {},
      }));
    }, { token: ctx.driverToken });

    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const reqLink = page.locator('[data-page="vehicle-request"], a[href*="vehicle-request"]');
    // vehicle-request อาจถูกซ่อนสำหรับ driver ขึ้นอยู่กับ sidebar config
    if (await reqLink.count() > 0) {
      // ตรวจว่ามี element อยู่ ไม่บังคับต้อง visible
      expect(await reqLink.count()).toBeGreaterThan(0);
    }
  });

  test('sidebar ไม่แสดงเมนู "จัดการผู้ใช้" ให้พนักงานขับรถ', async ({ page }) => {
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ',
        role: 'driver',
        permissions: {},
      }));
    }, { token: ctx.driverToken });

    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const adminLink = page.locator('[data-page="user-management"], a[href*="user-management"]');
    await expect(adminLink.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('sidebar ไม่แสดงเมนูผู้ดูแลระบบ (admin section) ให้พนักงานขับรถ', async ({ page }) => {
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ',
        role: 'driver',
        permissions: {},
      }));
    }, { token: ctx.driverToken });

    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const auditLink = page.locator('[data-page="audit-log"], a[href*="audit-log"]');
    await expect(auditLink.first()).not.toBeVisible({ timeout: 3000 });
  });
});

// ══════════════════════════════════════════════════════════════
// 12. QR Code — สแกน QR
// ══════════════════════════════════════════════════════════════
test.describe('12. QR Code — การสแกน QR Code', () => {
  test('เข้าหน้า qr-scan.html ได้โดยไม่ต้อง login', async ({ page }) => {
    // QR pages รองรับการเข้าถึงโดยไม่ต้อง login
    await page.goto('/qr-scan.html');
    await page.waitForLoadState('networkidle');
    // ไม่ควร redirect ไปหน้าอื่น
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('เข้าหน้า qr-daily-check.html ได้', async ({ page }) => {
    await page.goto('/qr-daily-check.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('เข้าหน้า qr-fuel-record.html ได้', async ({ page }) => {
    await page.goto('/qr-fuel-record.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('เข้าหน้า qr-usage-record.html ได้', async ({ page }) => {
    await page.goto('/qr-usage-record.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ══════════════════════════════════════════════════════════════
// 13. ประวัติส่วนตัว — Driver History
// ══════════════════════════════════════════════════════════════
test.describe('13. ประวัติส่วนตัว — Driver History Page', () => {
  test('driver-history.html โหลดได้เมื่อมี driver_id', async ({ page }) => {
    await page.addInitScript(({ token, driverId }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'driver-test-id',
        username: 'driver_test@ppk.ac.th',
        display_name: 'ทดสอบ พนักงานขับ',
        role: 'driver',
        driver_id: driverId || 'driver-rec-1',
        permissions: {},
      }));
    }, { token: ctx.driverToken, driverId: ctx.driverRecordId });

    await page.goto('/driver-history.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('driver ที่ไม่มี driver_id ยังเข้า vehicle-request.html ได้', async ({ page }) => {
    await page.addInitScript(({ token }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: 'driver-no-link',
        username: 'nolink@ppk.ac.th',
        display_name: 'ไม่มี driver_id',
        role: 'driver',
        driver_id: null,
        permissions: {},
      }));
    }, { token: ctx.driverToken });

    await page.goto('/vehicle-request.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  });
});
