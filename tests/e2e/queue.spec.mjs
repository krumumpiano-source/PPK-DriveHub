// ==============================================================
// PPK DriveHub — Queue Recorder (ผู้บันทึกคิว) E2E Tests
// ทดสอบการใช้งานในบทบาทผู้บันทึกคิว ทุกมิติ
// ครอบคลุม: API CRUD, สถานะคิว, ตรวจ validation, permission boundary, UI
// Role: vehicle (queue: 'delete' → ครอบคลุม view/create/edit/delete ทั้งหมด)
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';

// ──────────────────────────────────────────────
// ผู้ใช้งานในการทดสอบ
// ──────────────────────────────────────────────
const QUEUE_USER = {
  email: 'queue_recorder@ppk.ac.th',
  password: 'Queue@Record1',
  first_name: 'ผู้บันทึก',
  last_name: 'คิว',
  role: 'vehicle',
  permissions: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
};

// ข้อมูล shared ระหว่าง test groups
const ctx = {
  adminToken: '',
  queueToken: '',
  queueUserId: '',
  carId: '',              // รถปกติ
  carUnderRepairId: '',   // รถที่อยู่ระหว่างซ่อม (สำหรับทดสอบ validation)
  driverId: '',           // พนักงานขับรถ active
  expiredDriverId: '',    // พนักงานขับรถใบขับขี่หมด
  inactiveDriverId: '',   // พนักงานขับรถ inactive
  backupDriverId: '',     // พนักงานสำรอง
  queueId: '',            // คิวหลักสำหรับทดสอบ state transitions
  queueIdForDelete: '',   // คิวสำหรับทดสอบลบ
  queueIdForConflict: '', // คิวที่ใช้ทดสอบ conflict
  queueIdForEval: '',     // คิวที่ completed สำหรับประเมิน
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

async function apiDelete(path, token = '') {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers });
  return r.json().catch(() => null);
}

// สร้างวันที่อนาคต n วัน (YYYY-MM-DD)
function futureDate(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────
// Bootstrap: ตั้งค่า admin + queue recorder user + ข้อมูลพื้นฐาน
// ──────────────────────────────────────────────
test.beforeAll(async () => {
  clearRateLimits();

  // 1. ได้ admin token
  for (const cred of [
    { username: 'testadmin', password: 'Admin@5678' },
    { username: 'testadmin', password: 'Admin@1234' },
    { username: 'role_admin@test.com', password: 'Role@Admin1' },
  ]) {
    const r = await apiPost('/api/auth/login', { username: cred.username, password: cred.password });
    if (r?.data?.token) { ctx.adminToken = r.data.token; break; }
    clearRateLimits();
  }

  if (!ctx.adminToken) {
    const check = await apiGet('/api/setup');
    if (check?.data?.needs_setup) {
      await apiPost('/api/setup', {
        username: 'testadmin', password: 'Admin@5678',
        first_name: 'Test', last_name: 'Admin', email: 'testadmin@ppk.test',
      });
      clearRateLimits();
      const r = await apiPost('/api/auth/login', { username: 'testadmin', password: 'Admin@5678' });
      if (r?.data?.token) ctx.adminToken = r.data.token;
    }
  }
  if (!ctx.adminToken) throw new Error('[queue.spec] Cannot obtain admin token');

  // 2. สร้าง / login queue recorder user
  clearRateLimits();
  const existing = await apiPost('/api/auth/login', {
    username: QUEUE_USER.email, password: QUEUE_USER.password,
  });
  clearRateLimits();

  if (existing?.data?.token) {
    ctx.queueToken = existing.data.token;
    ctx.queueUserId = existing.data.user_id || '';
  } else {
    await apiPost('/api/auth/register', {
      email: QUEUE_USER.email,
      first_name: QUEUE_USER.first_name,
      last_name: QUEUE_USER.last_name,
      password: QUEUE_USER.password,
    });
    clearRateLimits();

    const reqs = await apiGet('/api/admin/requests?status=pending', ctx.adminToken);
    const req = reqs?.data?.find(r => r.email === QUEUE_USER.email);
    if (req) {
      await apiPut(`/api/admin/requests/${req.id}/approve`, {
        role: QUEUE_USER.role,
        permissions: QUEUE_USER.permissions,
      }, ctx.adminToken);
    }
    clearRateLimits();

    const loginRes = await apiPost('/api/auth/login', {
      username: QUEUE_USER.email, password: QUEUE_USER.password,
    });
    clearRateLimits();
    if (loginRes?.data?.token) {
      ctx.queueToken = loginRes.data.token;
      ctx.queueUserId = loginRes.data.user_id || '';
    }
  }
  if (!ctx.queueToken) throw new Error('[queue.spec] Cannot obtain queue recorder token');

  // อัปเดต permission ให้ถูกต้องเสมอ
  if (!ctx.queueUserId) {
    const me = await apiGet('/api/auth/me', ctx.queueToken);
    ctx.queueUserId = me?.data?.id || '';
  }
  if (ctx.queueUserId) {
    await apiPut(`/api/admin/users/${ctx.queueUserId}`, {
      role: QUEUE_USER.role,
      permissions: QUEUE_USER.permissions,
    }, ctx.adminToken);
    clearRateLimits();
  }

  // 3. เตรียมรถทดสอบ — รถปกติ
  const cars = await apiGet('/api/vehicles', ctx.adminToken);
  const carList = Array.isArray(cars?.data) ? cars.data
    : (Array.isArray(cars?.data?.vehicles) ? cars.data.vehicles : []);
  const activeCar = carList.find(c => c.status === 'active');
  if (activeCar) {
    ctx.carId = activeCar.id;
  } else {
    const nc = await apiPost('/api/vehicles', {
      license_plate: 'ทด-Q001',
      brand: 'Toyota', model: 'Commuter',
      fuel_type: 'diesel', status: 'active',
    }, ctx.adminToken);
    ctx.carId = nc?.data?.id || '';
    clearRateLimits();
  }

  // 4. รถที่อยู่ระหว่างซ่อม
  const repairCar = carList.find(c => c.status === 'under_repair' && c.id !== ctx.carId);
  if (repairCar) {
    ctx.carUnderRepairId = repairCar.id;
  } else {
    const rc = await apiPost('/api/vehicles', {
      license_plate: 'ทด-Q002',
      brand: 'Toyota', model: 'Commuter',
      fuel_type: 'diesel', status: 'under_repair',
    }, ctx.adminToken);
    ctx.carUnderRepairId = rc?.data?.id || '';
    clearRateLimits();
  }

  // 5. เตรียมพนักงานขับรถ — active + ใบขับขี่ยังไม่หมด
  const drivers = await apiGet('/api/drivers', ctx.adminToken);
  const driverList = Array.isArray(drivers?.data) ? drivers.data
    : (Array.isArray(drivers?.data?.drivers) ? drivers.data.drivers : []);
  const activeDriver = driverList.find(d =>
    d.status === 'active' &&
    (!d.license_expiry || d.license_expiry > futureDate(30))
  );
  if (activeDriver) {
    ctx.driverId = activeDriver.id;
  } else {
    const nd = await apiPost('/api/drivers', {
      first_name: 'ขับรถ', last_name: 'ทดสอบ',
      license_number: 'Q-DRV-001',
      license_expiry: futureDate(365),
      phone: '0811111111', status: 'active',
    }, ctx.adminToken);
    ctx.driverId = nd?.data?.id || '';
    clearRateLimits();
  }

  // พนักงานสำรอง (ต่างจาก driver หลัก)
  const backupDriver = driverList.find(d =>
    d.status === 'active' &&
    d.id !== ctx.driverId &&
    (!d.license_expiry || d.license_expiry > futureDate(30))
  );
  if (backupDriver) {
    ctx.backupDriverId = backupDriver.id;
  } else {
    const bd = await apiPost('/api/drivers', {
      first_name: 'สำรอง', last_name: 'ทดสอบ',
      license_number: 'Q-DRV-002',
      license_expiry: futureDate(365),
      phone: '0822222222', status: 'active',
    }, ctx.adminToken);
    ctx.backupDriverId = bd?.data?.id || '';
    clearRateLimits();
  }

  // พนักงานขับรถใบขับขี่หมดอายุ
  const expiredDriver = driverList.find(d => d.license_expiry && d.license_expiry < new Date().toISOString().slice(0, 10));
  if (expiredDriver) {
    ctx.expiredDriverId = expiredDriver.id;
  } else {
    const ed = await apiPost('/api/drivers', {
      first_name: 'หมดอายุ', last_name: 'ทดสอบ',
      license_number: 'Q-DRV-EXP',
      license_expiry: '2020-01-01',
      phone: '0833333333', status: 'active',
    }, ctx.adminToken);
    ctx.expiredDriverId = ed?.data?.id || '';
    clearRateLimits();
  }

  // พนักงานขับรถ inactive
  const inactiveDriver = driverList.find(d => d.status === 'inactive');
  if (inactiveDriver) {
    ctx.inactiveDriverId = inactiveDriver.id;
  } else {
    const id = await apiPost('/api/drivers', {
      first_name: 'ปิด', last_name: 'ทดสอบ',
      license_number: 'Q-DRV-INA',
      license_expiry: futureDate(365),
      phone: '0844444444', status: 'inactive',
    }, ctx.adminToken);
    ctx.inactiveDriverId = id?.data?.id || '';
    clearRateLimits();
  }
});

// ══════════════════════════════════════════════════════════════
// 1. AUTHENTICATION — เข้าสู่ระบบและตรวจสอบ token
// ══════════════════════════════════════════════════════════════
test.describe('1. Authentication — เข้าสู่ระบบ', () => {
  test('login ด้วย email+password ได้ token', async () => {
    clearRateLimits();
    const r = await apiPost('/api/auth/login', {
      username: QUEUE_USER.email, password: QUEUE_USER.password,
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.token).toBeTruthy();
    expect(r?.data?.role).toBe('vehicle');
  });

  test('GET /api/auth/me — ดูข้อมูลตัวเองได้', async () => {
    const r = await apiGet('/api/auth/me', ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.email).toBe(QUEUE_USER.email);
    expect(r?.data?.role).toBe('vehicle');
  });

  test('login รหัสผ่านผิด → 401 / success: false', async () => {
    clearRateLimits();
    const r = await apiPost('/api/auth/login', {
      username: QUEUE_USER.email, password: 'WrongPass!999',
    });
    expect(r?.success).toBe(false);
    clearRateLimits();
  });

  test('ไม่มี token → GET /api/queue ต้อง 401', async () => {
    const r = await apiGet('/api/queue', '');
    expect([401, 403]).toContain(r?.status ?? (r?.success === false ? 401 : 200));
  });
});

// ══════════════════════════════════════════════════════════════
// 2. GET QUEUE — ดูรายการคิว
// ══════════════════════════════════════════════════════════════
test.describe('2. GET Queue — ดูรายการคิว', () => {
  test('GET /api/queue — ดูรายการคิวทั้งหมดได้', async () => {
    const r = await apiGet('/api/queue', ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });

  test('GET /api/queue?status=scheduled — กรองตามสถานะได้', async () => {
    const r = await apiGet('/api/queue?status=scheduled', ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    r.data.forEach(q => expect(q.status).toBe('scheduled'));
  });

  test('GET /api/queue?date=YYYY-MM-DD — กรองตามวันที่ได้', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = await apiGet(`/api/queue?date=${today}`, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });

  test('GET /api/queue?date_from&date_to — กรองช่วงวันที่ได้', async () => {
    const from = new Date().toISOString().slice(0, 10);
    const to = futureDate(30);
    const r = await apiGet(`/api/queue?date_from=${from}&date_to=${to}`, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });

  test('GET /api/queue?car_id=... — กรองตามรถได้', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/queue?car_id=${ctx.carId}`, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    r.data.forEach(q => expect(q.car_id).toBe(ctx.carId));
  });

  test('GET /api/queue/rules — ดูกฎคิวได้', async () => {
    const r = await apiGet('/api/queue/rules', ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(r?.data).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════
// 3. CREATE QUEUE — สร้างคิวใหม่
// ══════════════════════════════════════════════════════════════
test.describe('3. POST /api/queue — สร้างคิว', () => {
  test('สร้างคิวพื้นฐาน (minimal required fields) สำเร็จ', async () => {
    // หมายเหตุ: driver_id เป็น NOT NULL ใน schema → ต้องระบุเสมอ
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(5),
      time_start: '08:00',
      time_end: '12:00',
      driver_id: ctx.driverId,
      mission: 'ทดสอบสร้างคิวพื้นฐาน',
      destination: 'สำนักงาน',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.queueId = r.data.id;
  });

  test('สร้างคิวครบฟิลด์ (full fields) สำเร็จ', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(6),
      time_start: '09:00',
      time_end: '17:00',
      driver_id: ctx.driverId,
      backup_driver_id: ctx.backupDriverId || null,
      mission: 'ทดสอบสร้างคิวเต็มรูปแบบ',
      destination: 'โรงเรียนพะเยาพิทยาคม',
      passengers: '5 คน',
      requested_by: 'ผู้ทดสอบ',
      notes: 'หมายเหตุทดสอบ',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.queueIdForConflict = r.data.id;
  });

  test('สร้างคิวสำหรับทดสอบลบ', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(20),
      time_start: '08:00',
      time_end: '10:00',
      driver_id: ctx.driverId,
      mission: 'คิวสำหรับทดสอบลบ',
      destination: 'เพื่อลบ',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
    ctx.queueIdForDelete = r?.data?.id || '';
  });

  test('ขาด car_id → error', async () => {
    const r = await apiPost('/api/queue', {
      date: futureDate(7),
      time_start: '08:00', time_end: '12:00',
      mission: 'ทดสอบ',
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
  });

  test('ขาด date → error', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      time_start: '08:00', time_end: '12:00',
      mission: 'ทดสอบ',
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
  });

  test('รถอยู่ระหว่างซ่อม → ไม่สามารถจองได้', async () => {
    if (!ctx.carUnderRepairId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carUnderRepairId,
      date: futureDate(8),
      time_start: '08:00', time_end: '12:00',
      mission: 'ทดสอบรถซ่อม',
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/ซ่อม/);
  });

  test('พนักงานใบขับขี่หมดอายุ → ไม่สามารถจองได้', async () => {
    if (!ctx.carId || !ctx.expiredDriverId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(9),
      time_start: '08:00', time_end: '12:00',
      driver_id: ctx.expiredDriverId,
      mission: 'ทดสอบพนักงานหมดอายุ',
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/หมดอายุ/);
  });

  test('พนักงาน inactive → ไม่สามารถจองได้', async () => {
    if (!ctx.carId || !ctx.inactiveDriverId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(10),
      time_start: '08:00', time_end: '12:00',
      driver_id: ctx.inactiveDriverId,
      mission: 'ทดสอบพนักงาน inactive',
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/ปิดใช้งาน/);
  });

  test('conflict: รถซ้อนเวลากัน → 409', async () => {
    if (!ctx.carId || !ctx.queueIdForConflict) return;
    // สร้างคิวที่ซ้อนเวลากับ queueIdForConflict (futureDate(6) 09:00-17:00)
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(6),
      time_start: '10:00', time_end: '14:00', // ซ้อนกับ 09:00-17:00
      mission: 'ทดสอบ conflict',
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    // อาจเป็น 409 หรือ error message เรื่อง conflict
    const msg = (r?.message || r?.error || '').toLowerCase();
    const isConflict = msg.includes('ซ้อน') || msg.includes('conflict') || r?.status === 409;
    expect(isConflict).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. GET SINGLE QUEUE — ดูคิวเดี่ยว
// ══════════════════════════════════════════════════════════════
test.describe('4. GET /api/queue/:id — ดูคิวเดี่ยว', () => {
  test('ดูรายละเอียดคิวตาม ID ได้', async () => {
    if (!ctx.queueId) return;
    const r = await apiGet(`/api/queue/${ctx.queueId}`, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.queueId);
    expect(r?.data?.car_id).toBe(ctx.carId);
  });

  test('ดูคิวที่ไม่มี → 404', async () => {
    const r = await apiGet('/api/queue/non-existent-id-99999', ctx.queueToken);
    expect(r?.success).toBe(false);
  });

  test('ข้อมูลที่ return มีฟิลด์ครบ (join ข้อมูล)', async () => {
    if (!ctx.queueId) return;
    const r = await apiGet(`/api/queue/${ctx.queueId}`, ctx.queueToken);
    expect(r?.success).toBe(true);
    const q = r.data;
    // ต้องมีฟิลด์หลัก
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('date');
    expect(q).toHaveProperty('time_start');
    expect(q).toHaveProperty('time_end');
    expect(q).toHaveProperty('car_id');
    expect(q).toHaveProperty('status');
    // ฟิลด์จาก JOIN
    expect(q).toHaveProperty('license_plate');
  });
});

// ══════════════════════════════════════════════════════════════
// 5. PUT /api/queue/:id — แก้ไขคิว
// ══════════════════════════════════════════════════════════════
test.describe('5. PUT /api/queue/:id — แก้ไขคิว', () => {
  test('แก้ไข mission และ destination ของคิวได้', async () => {
    if (!ctx.queueId) return;
    const r = await apiPut(`/api/queue/${ctx.queueId}`, {
      mission: 'ภารกิจที่แก้ไขแล้ว',
      destination: 'ปลายทางใหม่',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);

    // ยืนยันว่าข้อมูลเปลี่ยนจริง
    const check = await apiGet(`/api/queue/${ctx.queueId}`, ctx.queueToken);
    expect(check?.data?.mission).toBe('ภารกิจที่แก้ไขแล้ว');
    expect(check?.data?.destination).toBe('ปลายทางใหม่');
  });

  test('แก้ไขเพิ่ม driver และ backup driver ได้', async () => {
    if (!ctx.queueId || !ctx.driverId) return;
    const r = await apiPut(`/api/queue/${ctx.queueId}`, {
      driver_id: ctx.driverId,
      backup_driver_id: ctx.backupDriverId || null,
      passengers: '3 คน',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  test('แก้ไขเปลี่ยนรถเป็นรถที่อยู่ระหว่างซ่อม → error', async () => {
    if (!ctx.queueId || !ctx.carUnderRepairId) return;
    const r = await apiPut(`/api/queue/${ctx.queueId}`, {
      car_id: ctx.carUnderRepairId,
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/ซ่อม/);
  });

  test('แก้ไขเปลี่ยนพนักงานเป็นใบขับขี่หมด → error', async () => {
    if (!ctx.queueId || !ctx.expiredDriverId) return;
    const r = await apiPut(`/api/queue/${ctx.queueId}`, {
      driver_id: ctx.expiredDriverId,
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/หมดอายุ/);
  });

  test('แก้ไขไม่มีฟิลด์ใดเลย → error', async () => {
    if (!ctx.queueId) return;
    const r = await apiPut(`/api/queue/${ctx.queueId}`, {}, ctx.queueToken);
    expect(r?.success).toBe(false);
  });

  test('แก้ไข notes ได้', async () => {
    if (!ctx.queueId) return;
    const r = await apiPut(`/api/queue/${ctx.queueId}`, {
      notes: 'หมายเหตุที่แก้ไข',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/queue/${ctx.queueId}`, ctx.queueToken);
    expect(check?.data?.notes).toBe('หมายเหตุที่แก้ไข');
  });
});

// ══════════════════════════════════════════════════════════════
// 6. STATUS TRANSITIONS — การเปลี่ยนสถานะคิว
// ══════════════════════════════════════════════════════════════
test.describe('6. Status Transitions — การเปลี่ยนสถานะคิว', () => {
  // สร้างคิวใหม่สำหรับแต่ละ state test เพื่อไม่ให้กระทบกัน
  let queueForFreeze = '';
  let queueForCancel = '';
  let queueForComplete = '';
  let queueForOngoing = '';

  test.beforeAll(async () => {
    if (!ctx.carId) return;

    // คิวสำหรับ freeze/unfreeze
    const r1 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(15),
      time_start: '07:00', time_end: '09:00',
      mission: 'ทดสอบ freeze',
    }, ctx.queueToken);
    queueForFreeze = r1?.data?.id || '';

    // คิวสำหรับ cancel
    const r2 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(15),
      time_start: '10:00', time_end: '12:00',
      mission: 'ทดสอบ cancel',
    }, ctx.queueToken);
    queueForCancel = r2?.data?.id || '';

    // คิวสำหรับ complete (ต้องผ่าน ongoing ก่อน)
    const r3 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(15),
      time_start: '13:00', time_end: '15:00',
      mission: 'ทดสอบ complete',
    }, ctx.queueToken);
    queueForComplete = r3?.data?.id || '';
    ctx.queueIdForEval = queueForComplete;

    // คิวสำหรับ ongoing เท่านั้น
    const r4 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(15),
      time_start: '16:00', time_end: '18:00',
      mission: 'ทดสอบ ongoing',
    }, ctx.queueToken);
    queueForOngoing = r4?.data?.id || '';
  });

  // ── Freeze / Unfreeze ──
  test('PUT /:id/freeze — อายัดคิวได้', async () => {
    if (!queueForFreeze) return;
    const r = await apiPut(`/api/queue/${queueForFreeze}/freeze`, {
      frozen_reason: 'รอการยืนยัน',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);

    const check = await apiGet(`/api/queue/${queueForFreeze}`, ctx.queueToken);
    expect(check?.data?.status).toBe('frozen');
    expect(check?.data?.frozen_reason).toBe('รอการยืนยัน');
    expect(check?.data?.frozen_by).toBeTruthy();
  });

  test('PUT /:id/unfreeze — ปลดอายัดคิวได้', async () => {
    if (!queueForFreeze) return;
    const r = await apiPut(`/api/queue/${queueForFreeze}/unfreeze`, {}, ctx.queueToken);
    expect(r?.success).toBe(true);

    const check = await apiGet(`/api/queue/${queueForFreeze}`, ctx.queueToken);
    expect(check?.data?.status).toBe('scheduled');
    expect(check?.data?.frozen_by).toBeFalsy();
  });

  // ── Cancel ──
  test('PUT /:id/cancel — ยกเลิกคิวพร้อมเหตุผลได้', async () => {
    if (!queueForCancel) return;
    const r = await apiPut(`/api/queue/${queueForCancel}/cancel`, {
      cancel_reason: 'ยกเลิกเนื่องจากสภาพอากาศไม่เอื้ออำนวย',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);

    const check = await apiGet(`/api/queue/${queueForCancel}`, ctx.queueToken);
    expect(check?.data?.status).toBe('cancelled');
    expect(check?.data?.cancel_reason).toBe('ยกเลิกเนื่องจากสภาพอากาศไม่เอื้ออำนวย');
  });

  test('PUT /:id/cancel — ยกเลิกโดยไม่มีเหตุผลก็ได้ (optional)', async () => {
    if (!ctx.queueId) return;
    // สร้างคิวใหม่แทนเพื่อไม่กระทบ test อื่น
    const nc = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(25),
      time_start: '08:00', time_end: '09:00',
      mission: 'ทดสอบ cancel ไม่มีเหตุผล',
    }, ctx.queueToken);
    if (!nc?.data?.id) return;
    const r = await apiPut(`/api/queue/${nc.data.id}/cancel`, {}, ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  // ── Ongoing ──
  test('PUT /:id/ongoing — เริ่มดำเนินการคิวได้', async () => {
    if (!queueForOngoing) return;
    const r = await apiPut(`/api/queue/${queueForOngoing}/ongoing`, {}, ctx.queueToken);
    expect(r?.success).toBe(true);

    const check = await apiGet(`/api/queue/${queueForOngoing}`, ctx.queueToken);
    expect(check?.data?.status).toBe('ongoing');
  });

  // ── Complete ──
  test('PUT /:id/ongoing แล้ว /complete — เสร็จสมบูรณ์', async () => {
    if (!queueForComplete) return;
    // ก่อน complete ต้อง ongoing
    await apiPut(`/api/queue/${queueForComplete}/ongoing`, {}, ctx.queueToken);
    const r = await apiPut(`/api/queue/${queueForComplete}/complete`, {}, ctx.queueToken);
    expect(r?.success).toBe(true);

    const check = await apiGet(`/api/queue/${queueForComplete}`, ctx.queueToken);
    expect(check?.data?.status).toBe('completed');
    ctx.queueIdForEval = queueForComplete; // ใช้ต่อใน test 7
  });
});

// ══════════════════════════════════════════════════════════════
// 7. TRIP EVALUATION — ประเมินการเดินทาง
// ══════════════════════════════════════════════════════════════
test.describe('7. Trip Evaluation — ประเมินการเดินทาง', () => {
  test('POST /:id/evaluate — ประเมินคิวที่ completed ได้', async () => {
    if (!ctx.queueIdForEval) return;
    const r = await apiPost(`/api/queue/${ctx.queueIdForEval}/evaluate`, {
      driver_behavior_score: 5,
      vehicle_condition_score: 4,
      punctuality_score: 5,
      overall_score: 5,
      problems: '',
      suggestions: 'ดีมาก',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('ประเมินซ้ำ (duplicate) → error', async () => {
    if (!ctx.queueIdForEval) return;
    const r = await apiPost(`/api/queue/${ctx.queueIdForEval}/evaluate`, {
      overall_score: 3,
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/ประเมิน.*แล้ว|already/i);
  });

  test('ประเมินคิวที่ยังไม่ completed → error', async () => {
    if (!ctx.queueId) return;
    // queueId ยังอยู่ใน scheduled
    const r = await apiPost(`/api/queue/${ctx.queueId}/evaluate`, {
      overall_score: 4,
    }, ctx.queueToken);
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error || '').toMatch(/เสร็จสิ้น|completed/i);
  });

  test('GET /:id/evaluation — ดูผลประเมินได้', async () => {
    if (!ctx.queueIdForEval) return;
    const r = await apiGet(`/api/queue/${ctx.queueIdForEval}/evaluation`, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    expect(r.data.length).toBeGreaterThan(0);
    // ตรวจ structure
    const ev = r.data[0];
    expect(ev).toHaveProperty('queue_id');
    expect(ev).toHaveProperty('overall_score');
    expect(ev).toHaveProperty('evaluator_name');
  });
});

// ══════════════════════════════════════════════════════════════
// 8. DELETE QUEUE — ลบคิว
// ══════════════════════════════════════════════════════════════
test.describe('8. DELETE /api/queue/:id — ลบคิว', () => {
  test('ลบคิวที่มีอยู่ได้', async () => {
    if (!ctx.queueIdForDelete) return;
    const r = await apiDelete(`/api/queue/${ctx.queueIdForDelete}`, ctx.queueToken);
    expect(r?.success).toBe(true);

    // ยืนยันว่าหายไปจริง
    const check = await apiGet(`/api/queue/${ctx.queueIdForDelete}`, ctx.queueToken);
    expect(check?.success).toBe(false);
  });

  test('ลบคิวที่ไม่มี → ไม่ error (idempotent)', async () => {
    const r = await apiDelete('/api/queue/non-existent-id-delete', ctx.queueToken);
    // อาจ success (DELETE idempotent) หรือ false ก็ได้
    expect(r).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════
// 9. PERMISSION BOUNDARIES — ขอบเขตสิทธิ์
// ══════════════════════════════════════════════════════════════
test.describe('9. Permission Boundaries — ขอบเขตสิทธิ์', () => {
  // ─── สิ่งที่ทำได้ ───
  test('queue recorder → GET /api/vehicles ได้ (view)', async () => {
    const r = await apiGet('/api/vehicles', ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  test('queue recorder → GET /api/drivers ได้ (view)', async () => {
    const r = await apiGet('/api/drivers', ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  test('queue recorder → GET /api/reports/dashboard ได้ (view)', async () => {
    const r = await apiGet('/api/reports/dashboard', ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  test('queue recorder → GET /api/queue ได้ (queue:view)', async () => {
    const r = await apiGet('/api/queue', ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  // ─── สิ่งที่ทำไม่ได้ ───
  test('queue recorder → POST /api/vehicles ได้ (vehicle role มีสิทธิ์ vehicles:delete)', async () => {
    // vehicle role มี vehicles:delete → ครอบคลุม create ได้ (delete > edit > create > view)
    const r = await apiPost('/api/vehicles', {
      license_plate: 'QTEST-ALLOWED', brand: 'Toyota', model: 'Hiace',
      fuel_type: 'diesel', status: 'active',
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
    // cleanup ถ้าสร้างสำเร็จ
    if (r?.data?.id) await apiDelete(`/api/vehicles/${r.data.id}`, ctx.queueToken);
  });

  test('queue recorder → POST /api/fuel/log ต้อง 403 (ไม่มีสิทธิ์ fuel)', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/fuel/log', {
      car_id: ctx.carId,
      date: new Date().toISOString().slice(0, 10),
      liters: 30, price_per_liter: 35,
    }, ctx.queueToken);
    const status = r?.status ?? (r?.success === false ? 403 : 200);
    expect([401, 403]).toContain(status);
  });

  test('queue recorder → POST /api/repair/log ได้ (ทุกคนแจ้งซ่อมได้ ไม่ต้องมีสิทธิ์ repair)', async () => {
    // API comment: "ทุกคนแจ้งซ่อมได้ (driver, repair, admin)" — ไม่มี permission guard
    if (!ctx.carId) return;
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.carId,
      date: new Date().toISOString().slice(0, 10),
      issue_description: 'ทดสอบแจ้งซ่อม',
      cost: 1000,
    }, ctx.queueToken);
    expect(r?.success).toBe(true);
  });

  test('queue recorder → GET /api/admin/users ต้อง 403 (ไม่ใช่ admin)', async () => {
    const r = await apiGet('/api/admin/users', ctx.queueToken);
    const status = r?.status ?? (r?.success === false ? 403 : 200);
    expect([401, 403]).toContain(status);
  });

  test('queue recorder → GET /api/admin/audit-log ต้อง 403 (ไม่ใช่ admin)', async () => {
    // path ถูกต้องคือ /api/admin/audit-log ซึ่ง requireAdmin(user)
    const r = await apiGet('/api/admin/audit-log', ctx.queueToken);
    const status = r?.status ?? (r?.success === false ? 403 : 200);
    expect([401, 403]).toContain(status);
  });

  test('queue recorder → GET /api/backup ต้อง 403 (ไม่ใช่ admin)', async () => {
    const r = await apiGet('/api/backup', ctx.queueToken);
    const status = r?.status ?? (r?.success === false ? 403 : 200);
    expect([401, 403]).toContain(status);
  });
});

// ══════════════════════════════════════════════════════════════
// 10. UI — ทดสอบหน้า queue-manage.html ผ่าน browser
// ══════════════════════════════════════════════════════════════
test.describe('10. UI — queue-manage.html', () => {
  async function setQueueAuth(page) {
    await page.addInitScript(({ token, userId }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: userId || 'queue-user-id',
        username: 'queue_recorder@ppk.ac.th',
        display_name: 'ผู้บันทึกคิว',
        role: 'vehicle',
        permissions: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
      }));
    }, { token: ctx.queueToken, userId: ctx.queueUserId });
  }

  test('queue-manage.html โหลดได้โดยไม่ redirect ไป login', async ({ page }) => {
    if (!ctx.queueToken) return test.skip();
    await setQueueAuth(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('หน้าแสดง header "จัดคิว"', async ({ page }) => {
    if (!ctx.queueToken) return test.skip();
    await setQueueAuth(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    const heading = await page.locator('h1').first().textContent().catch(() => '');
    expect(heading).toMatch(/คิว/);
  });

  test('ปฏิทินหรือตาราง queue แสดงผลได้', async ({ page }) => {
    if (!ctx.queueToken) return test.skip();
    await setQueueAuth(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    // ตรวจว่ามี calendar grid หรือ container
    const calendar = page.locator('.calendar-grid, .calendar-container, #calendarGrid, [class*="calendar"]').first();
    await expect(calendar).toBeVisible({ timeout: 10000 });
  });

  test('ปุ่ม "สร้างคิวใหม่" หรือ "เพิ่มคิว" ปรากฏ (มีสิทธิ์ create)', async ({ page }) => {
    if (!ctx.queueToken) return test.skip();
    await setQueueAuth(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    // ค้นหาปุ่มที่น่าจะเป็น "สร้างคิว" / "เพิ่มคิว"
    const btn = page.getByRole('button', { name: /สร้างคิว|เพิ่มคิว|จองคิว|คิวใหม่/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
  });

  test('เปิด modal สร้างคิวแล้วเลือกรถได้', async ({ page }) => {
    if (!ctx.queueToken || !ctx.carId) return test.skip();
    await setQueueAuth(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');

    const btn = page.getByRole('button', { name: /สร้างคิว|เพิ่มคิว|จองคิว|คิวใหม่/i }).first();
    await btn.click();
    // Modal ต้องปรากฏ
    const modal = page.locator('.modal, [role="dialog"], #queueModal').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('Sidebar ไม่แสดงเมนูที่ไม่มีสิทธิ์ (เช่น User Management)', async ({ page }) => {
    if (!ctx.queueToken) return test.skip();
    await setQueueAuth(page);
    await page.goto('/queue-manage.html');
    await page.waitForLoadState('networkidle');
    // user-management ควรไม่ปรากฏใน sidebar สำหรับ vehicle role
    const userMgmtLink = page.locator('a[href*="user-management"]').first();
    const isVisible = await userMgmtLink.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('เข้าหน้า user-management.html โดยตรง → redirect ไป login หรือ unauthorized', async ({ page }) => {
    if (!ctx.queueToken) return test.skip();
    // ไม่ set auth ให้ browser page นี้ (หรือใช้ token ที่ไม่มีสิทธิ์)
    await page.addInitScript(({ token, userId }) => {
      localStorage.setItem('ppk_token', token);
      localStorage.setItem('ppk_user', JSON.stringify({
        id: userId || 'queue-user-id',
        username: 'queue_recorder@ppk.ac.th',
        display_name: 'ผู้บันทึกคิว',
        role: 'vehicle',
        permissions: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
      }));
    }, { token: ctx.queueToken, userId: ctx.queueUserId });

    await page.goto('/user-management.html');
    await page.waitForLoadState('networkidle');
    // ควร redirect หรือแสดง unauthorized
    const url = page.url();
    const body = await page.locator('body').textContent().catch(() => '');
    const isBlocked = url.includes('login') || body.includes('ไม่มีสิทธิ์') || body.includes('unauthorized');
    expect(isBlocked).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 11. EDGE CASES & DATA INTEGRITY
// ══════════════════════════════════════════════════════════════
test.describe('11. Edge Cases & Data Integrity', () => {
  test('คิวที่สร้างมีข้อมูล created_by, created_at', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date: futureDate(30),
      time_start: '07:00', time_end: '08:00',
      mission: 'ทดสอบ data integrity',
    }, ctx.queueToken);
    if (!r?.data?.id) return;

    const check = await apiGet(`/api/queue/${r.data.id}`, ctx.queueToken);
    expect(check?.data?.created_by).toBeTruthy();
    expect(check?.data?.created_at).toBeTruthy();

    // cleanup
    await apiDelete(`/api/queue/${r.data.id}`, ctx.queueToken);
  });

  test('สร้างคิวหลายคันในวันเดียวกัน เวลาไม่ซ้อน → สำเร็จทั้งคู่', async () => {
    // driver_id required (NOT NULL constraint)
    if (!ctx.carId || !ctx.driverId || !ctx.backupDriverId) return;
    const date = futureDate(40);
    // หา car อื่นที่ active ถ้ามี
    const cars = await apiGet('/api/vehicles', ctx.adminToken);
    const carList = Array.isArray(cars?.data) ? cars.data : [];
    const secondCar = carList.find(c => c.status === 'active' && c.id !== ctx.carId);

    if (!secondCar) return; // skip ถ้าไม่มีรถ 2 คัน

    const r1 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date, time_start: '08:00', time_end: '10:00',
      driver_id: ctx.driverId,
      mission: 'คิว A',
    }, ctx.queueToken);

    const r2 = await apiPost('/api/queue', {
      car_id: secondCar.id,
      date, time_start: '08:00', time_end: '10:00', // เวลาเดียวกันแต่คนละคัน
      driver_id: ctx.backupDriverId,
      mission: 'คิว B',
    }, ctx.queueToken);

    expect(r1?.success).toBe(true);
    expect(r2?.success).toBe(true);

    // cleanup
    if (r1?.data?.id) await apiDelete(`/api/queue/${r1.data.id}`, ctx.queueToken);
    if (r2?.data?.id) await apiDelete(`/api/queue/${r2.data.id}`, ctx.queueToken);
  });

  test('คิวเดิมกับรถเดิมแต่เวลาต่อเนื่อง (ไม่ซ้อน) → สำเร็จ', async () => {
    // driver_id required (NOT NULL constraint)
    if (!ctx.carId || !ctx.driverId || !ctx.backupDriverId) return;
    const date = futureDate(45);

    const r1 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date, time_start: '08:00', time_end: '10:00',
      driver_id: ctx.driverId,
      mission: 'คิวตอนเช้า',
    }, ctx.queueToken);

    const r2 = await apiPost('/api/queue', {
      car_id: ctx.carId,
      date, time_start: '10:00', time_end: '12:00', // เริ่มตรงที่อันแรกจบ (ไม่ซ้อน)
      driver_id: ctx.backupDriverId, // ใช้พนักงานต่างคนเพื่อไม่ conflict กัน
      mission: 'คิวตอนบ่าย',
    }, ctx.queueToken);

    expect(r1?.success).toBe(true);
    expect(r2?.success).toBe(true);

    // cleanup
    if (r1?.data?.id) await apiDelete(`/api/queue/${r1.data.id}`, ctx.queueToken);
    if (r2?.data?.id) await apiDelete(`/api/queue/${r2.data.id}`, ctx.queueToken);
  });

  test('GET /api/queue filter driver_id — แสดงเฉพาะคิวของพนักงานคนนั้น', async () => {
    if (!ctx.driverId) return;
    const r = await apiGet(`/api/queue?driver_id=${ctx.driverId}`, ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    r.data.forEach(q => expect(q.driver_id).toBe(ctx.driverId));
  });

  test('GET /api/queue?status=cancelled — คิวที่ยกเลิกไปแล้วปรากฏ', async () => {
    const r = await apiGet('/api/queue?status=cancelled', ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    r.data.forEach(q => expect(q.status).toBe('cancelled'));
  });

  test('GET /api/queue?status=completed — คิวที่เสร็จแล้วปรากฏ', async () => {
    const r = await apiGet('/api/queue?status=completed', ctx.queueToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    r.data.forEach(q => expect(q.status).toBe('completed'));
  });
});
