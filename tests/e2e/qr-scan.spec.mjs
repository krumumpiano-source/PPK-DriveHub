// ==============================================================
// PPK DriveHub — QR Scan & บันทึกใช้รถ E2E Tests
// ทดสอบกระบวนการสแกน QR โค้ด บันทึกออก/กลับ
// ทั้งแบบสมบูรณ์ (departure → return) และแบบลืมจนครบ (auto-heal)
// ครอบคลุม: validation, latest-status, daily-check, survey, CRUD, permissions, UI
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';

// ──────────────────────────────────────────────
// Datetime constants — fixed values, clearly different per scenario
// (เพื่อหลีกเลี่ยงปัญหา second-precision ambiguity)
// ──────────────────────────────────────────────
const DT = {
  DEP:        '2020-01-01 08:00:00',  // flow สมบูรณ์ — departure
  RET:        '2020-01-01 14:00:00',  // flow สมบูรณ์ — return
  REFUEL:     '2020-01-01 16:00:00',  // refuel
  INSPECTION: '2020-01-01 17:00:00',  // inspection
  AH_DEP1:    '2020-01-02 08:00:00',  // auto-heal return — departure 1
  AH_DEP2:    '2020-01-02 16:00:00',  // auto-heal return — departure 2
  AD_RET1:    '2020-01-03 08:00:00',  // auto-heal dep — return 1
  AD_RET2:    '2020-01-03 16:00:00',  // auto-heal dep — return 2
  MAN_DEP:    '2020-01-04 08:00:00',  // manual driver name — departure
  MAN_RET:    '2020-01-04 14:00:00',  // manual driver name — return
  QID_DEP:    '2020-01-05 08:00:00',  // queue-linked — departure
  CRUD_DEP:   '2020-01-06 08:00:00',  // CRUD test — departure
  PERM_REF:   '2020-01-07 08:00:00',  // permission test — refuel
};

// ──────────────────────────────────────────────
// Context shared ระหว่าง describe groups
// ──────────────────────────────────────────────
const ctx = {
  adminToken: '',
  carId: '',           // รถหลัก สำหรับ flow สมบูรณ์ + daily check + survey
  carAutoHealId: '',   // รถ สำหรับ auto-heal return (dep→dep)
  carAutoDepId: '',    // รถ สำหรับ auto-heal departure (ret→ret)
  carManualId: '',     // รถ สำหรับ manual driver name
  carQueueId: '',      // รถ สำหรับ queue-linked test
  driverId: '',        // พนักงานขับรถหลัก
  driverAutoHealId: '', // พนักงานสำหรับ auto-heal (ทดสอบ discipline_score)
  queueId: '',         // คิวสำหรับ queue-linked test
  usageRecordId: '',   // record สำหรับทดสอบ CRUD
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

/** datetime ปัจจุบัน รูปแบบ "YYYY-MM-DD HH:MM:SS" */
function nowDatetime() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/** วันที่อนาคต n วัน (YYYY-MM-DD) */
function futureDate(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** รอ ms milliseconds */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// Bootstrap: ตั้งค่า admin + ข้อมูลพื้นฐานทั้งหมด
// ──────────────────────────────────────────────
test.beforeAll(async () => {
  clearRateLimits();

  // 1. ได้ admin token
  for (const cred of [
    { username: 'testadmin', password: 'Admin@5678' },
    { username: 'testadmin', password: 'Admin@1234' },
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
  if (!ctx.adminToken) throw new Error('[qr-scan.spec] Cannot obtain admin token');

  // 2. สร้างรถทดสอบ 5 คัน — idempotent (ดึงถ้ามีอยู่แล้ว)
  async function createCar(plate) {
    // ตรวจว่ามีอยู่แล้วหรือไม่ (qr-info ค้นหาด้วย license_plate ได้)
    const existing = await apiGet(`/api/vehicles/qr-info?car_id=${encodeURIComponent(plate)}`);
    if (existing?.success && existing?.data?.id) return existing.data.id;
    const r = await apiPost('/api/vehicles', {
      license_plate: plate, brand: 'Toyota', model: 'Commuter',
      fuel_type: 'diesel', status: 'active',
    }, ctx.adminToken);
    clearRateLimits();
    return r?.data?.id || r?.id || '';
  }

  ctx.carId        = await createCar('QR-001');
  ctx.carAutoHealId = await createCar('QR-002');
  ctx.carAutoDepId  = await createCar('QR-003');
  ctx.carManualId   = await createCar('QR-004');
  ctx.carQueueId    = await createCar('QR-005');

  if (!ctx.carId) throw new Error('[qr-scan.spec] Cannot create main test car');

  // 3. สร้างพนักงานขับรถ 2 คน — idempotent
  async function createDriver(firstName, licNum) {
    // ตรวจว่ามีอยู่แล้วหรือไม่
    const existing = await apiGet(`/api/drivers?search=${encodeURIComponent(licNum)}`, ctx.adminToken);
    const found = (existing?.data?.drivers || []).find(d => d.license_number === licNum);
    if (found) return found.id;
    const r = await apiPost('/api/drivers', {
      first_name: firstName, last_name: 'ทดสอบQR',
      license_number: licNum,
      license_expiry: futureDate(365),
      phone: '0811111111', status: 'active',
    }, ctx.adminToken);
    clearRateLimits();
    return r?.data?.id || r?.id || '';
  }

  ctx.driverId         = await createDriver('หลัก', 'QR-DRV-001');
  ctx.driverAutoHealId = await createDriver('ออโต้', 'QR-DRV-002');

  if (!ctx.driverId) throw new Error('[qr-scan.spec] Cannot create test driver');

  // 4. สร้างคิวสำหรับ queue-linked test
  const qr = await apiPost('/api/queue', {
    car_id: ctx.carQueueId,
    driver_id: ctx.driverId,
    date: futureDate(7),
    time_start: '08:00', time_end: '12:00',
    mission: 'ทดสอบ QR linked', destination: 'สำนักงาน',
  }, ctx.adminToken);
  clearRateLimits();
  ctx.queueId = qr?.data?.id || '';
});

// ══════════════════════════════════════════════════════════
// 1. Public QR — ข้อมูลรถ (/api/vehicles/qr-info)
// PUBLIC endpoint — ไม่ต้องมี token
// ══════════════════════════════════════════════════════════
test.describe('1. Public QR — ข้อมูลรถ (qr-info)', () => {
  test('ดึงข้อมูลรถด้วย car_id สำเร็จ', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/vehicles/qr-info?car_id=${ctx.carId}`);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.carId);
    expect(r?.data?.license_plate).toBe('QR-001');
    expect(r?.data?.fuel_type).toBe('diesel');
    expect(r?.data?.brand).toBe('Toyota');
  });

  test('ดึงข้อมูลรถด้วย license_plate สำเร็จ', async () => {
    const r = await apiGet('/api/vehicles/qr-info?car_id=QR-001');
    expect(r?.success).toBe(true);
    expect(r?.data?.license_plate).toBe('QR-001');
  });

  test('car_id ไม่ถูกต้อง → ไม่พบ', async () => {
    const r = await apiGet('/api/vehicles/qr-info?car_id=NON-EXISTENT-CAR-XYZ');
    expect(r?.success).toBe(false);
  });

  test('ไม่ส่ง car_id → error', async () => {
    const r = await apiGet('/api/vehicles/qr-info');
    expect(r?.success).toBe(false);
  });

  test('ไม่ต้องมี token (PUBLIC endpoint)', async () => {
    if (!ctx.carId) return;
    // เรียกโดยไม่มี Authorization header
    const r = await fetch(`${BASE}/api/vehicles/qr-info?car_id=${ctx.carId}`)
      .then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 2. Public QR — สถานะล่าสุดของรถ (/api/usage/latest-status)
// PUBLIC endpoint — ไม่ต้องมี token
// ══════════════════════════════════════════════════════════
test.describe('2. Public QR — สถานะล่าสุดของรถ (latest-status)', () => {
  test('รถใหม่ที่ยังไม่มีบันทึก → status: unknown', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
    expect(r?.success).toBe(true);
    expect(r?.data?.status).toBe('unknown');
    expect(r?.data?.mileage).toBeNull();
    expect(r?.data?.datetime).toBeNull();
  });

  test('ไม่ส่ง car_id → error', async () => {
    const r = await apiGet('/api/usage/latest-status');
    expect(r?.success).toBe(false);
  });

  test('ไม่ต้องมี token (PUBLIC endpoint)', async () => {
    if (!ctx.carId) return;
    const r = await fetch(`${BASE}/api/usage/latest-status?car_id=${ctx.carId}`)
      .then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 3. Validation — POST /api/usage/record
// ══════════════════════════════════════════════════════════
test.describe('3. Validation — POST /api/usage/record', () => {
  test('ไม่มี car_id → error', async () => {
    const r = await apiPost('/api/usage/record', {
      record_type: 'departure',
      driver_id: ctx.driverId || 'x',
    });
    expect(r?.success).toBe(false);
    expect(r?.message || r?.error).toBeTruthy();
  });

  test('ไม่มี record_type → error', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      driver_id: ctx.driverId || 'x',
    });
    expect(r?.success).toBe(false);
  });

  test('ไม่มี driver_id และ driver_name_manual → error', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'departure',
      // ไม่มี driver_id และ driver_name_manual
    });
    expect(r?.success).toBe(false);
  });

  test('record_type ไม่ถูกต้อง → error', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'invalid_type_xyz',
      driver_id: ctx.driverId || 'x',
    });
    expect(r?.success).toBe(false);
  });

  test('เลขไมล์ติดลบ → error', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'departure',
      driver_id: ctx.driverId || 'x',
      mileage: -500,
    });
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 4. Flow สมบูรณ์ — บันทึกออก (departure) → บันทึกกลับ (return)
// ใช้รถ ctx.carId + ctx.driverId
// ══════════════════════════════════════════════════════════
test.describe('4. Flow สมบูรณ์ — บันทึกออกและกลับ', () => {
  test('สถานะเริ่มต้นของรถ → unknown', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
    expect(r?.success).toBe(true);
    expect(r?.data?.status).toBe('unknown');
  });

  test('บันทึกออก (departure) สมบูรณ์ — สำเร็จ ไม่มี auto_heal', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'departure',
      driver_id: ctx.driverId,
      datetime: DT.DEP,
      mileage: 10000,
      destination: 'สำนักงานใหญ่',
      purpose: 'ราชการ',
      requester_name: 'ผู้บันทึกทดสอบ',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    // ออกครั้งแรก — ไม่ควรมี auto_heal
    expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
    expect(r?.data?.auto_healed?.length).toBe(0);
  });

  test('สถานะหลังบันทึกออก → out', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
    expect(r?.success).toBe(true);
    expect(r?.data?.status).toBe('out');
    expect(r?.data?.last_record_type).toBe('departure');
    expect(r?.data?.mileage).toBe(10000);
  });

  test('บันทึกกลับ (return) สมบูรณ์ — สำเร็จ ไม่มี auto_heal', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'return',
      driver_id: ctx.driverId,
      datetime: DT.RET,  // 14:00 > 08:00 — ชัดเจน
      mileage: 10120,
      notes: 'กลับเรียบร้อย',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    // กลับหลัง departure → ไม่มี auto_heal
    expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
    expect(r?.data?.auto_healed?.length).toBe(0);
  });

  test('สถานะหลังบันทึกกลับ → in', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
    expect(r?.success).toBe(true);
    expect(r?.data?.status).toBe('in');
    expect(r?.data?.last_record_type).toBe('return');
    expect(r?.data?.mileage).toBe(10120);
  });

  test('ดู usage records ผ่าน admin → มีทั้ง departure และ return', async () => {
    if (!ctx.carId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?car_id=${ctx.carId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    const depRows = rows.filter(x => x.record_type === 'departure');
    const retRows = rows.filter(x => x.record_type === 'return');
    expect(depRows.length).toBeGreaterThanOrEqual(1);
    expect(retRows.length).toBeGreaterThanOrEqual(1);
    // ตรวจสอบ driver_id ตรงกัน
    const dep = depRows[0];
    expect(dep.driver_id).toBe(ctx.driverId);
    expect(dep.destination).toBe('สำนักงานใหญ่');
    expect(dep.purpose).toBe('ราชการ');
  });

  test('บันทึก record_type: refuel สำเร็จ', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'refuel',
      driver_id: ctx.driverId,
      datetime: DT.REFUEL,
      mileage: 10150,
      notes: 'เติมน้ำมัน 40 ลิตร',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('บันทึก record_type: inspection สำเร็จ', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carId,
      record_type: 'inspection',
      driver_id: ctx.driverId,
      datetime: DT.INSPECTION,
      notes: 'ตรวจสภาพรถประจำเดือน',
    });
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 5. Flow ลืมบันทึกกลับ — Auto-Heal Return
//    departure → departure → auto-heal สร้าง return อัตโนมัติ
//    (ลด discipline_score ของพนักงาน)
// ══════════════════════════════════════════════════════════
test.describe('5. Flow ลืมบันทึกกลับ — Auto-Heal Return', () => {
  test('บันทึกออกครั้งที่ 1 สำเร็จ — ไม่มี auto_heal', async () => {
    if (!ctx.carAutoHealId || !ctx.driverAutoHealId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carAutoHealId,
      record_type: 'departure',
      driver_id: ctx.driverAutoHealId,
      datetime: DT.AH_DEP1,
      mileage: 20000,
      destination: 'ตลาด',
    });
    expect(r?.success).toBe(true);
    // บันทึกแรก ไม่มี auto_heal
    expect(r?.data?.auto_healed?.length).toBe(0);
  });

  test('สถานะหลังออกครั้งที่ 1 → out', async () => {
    if (!ctx.carAutoHealId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoHealId}`);
    expect(r?.data?.status).toBe('out');
  });

  test('บันทึกออกครั้งที่ 2 (ลืมบันทึกกลับ) → auto-heal สร้าง return อัตโนมัติ', async () => {
    if (!ctx.carAutoHealId || !ctx.driverAutoHealId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carAutoHealId,
      record_type: 'departure',
      driver_id: ctx.driverAutoHealId,
      datetime: DT.AH_DEP2,  // 16:00 > 08:00 ชัดเจน
      mileage: 20200,
      destination: 'โรงเรียน',
    });
    expect(r?.success).toBe(true);
    // ต้องมี auto_heal!
    expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
    expect(r?.data?.auto_healed?.length).toBeGreaterThan(0);
    const healTypes = (r?.data?.auto_healed || []).map(h => h.type);
    expect(healTypes).toContain('auto_return');
  });

  test('auto_return record ถูกสร้างใน DB', async () => {
    if (!ctx.carAutoHealId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?car_id=${ctx.carAutoHealId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const records = r?.data || [];
    const autoReturn = records.find(rec => rec.data_quality === 'auto_return');
    expect(autoReturn).toBeTruthy();
    expect(autoReturn?.record_type).toBe('return');
    expect(autoReturn?.auto_notes).toMatch(/ระบบสร้างอัตโนมัติ/);
  });

  test('มี record ทั้งหมด 3 รายการ (dep1, auto_return, dep2)', async () => {
    if (!ctx.carAutoHealId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?car_id=${ctx.carAutoHealId}`, ctx.adminToken);
    const records = r?.data || [];
    // departure: 2, return: 1 (auto_return)
    const deps = records.filter(x => x.record_type === 'departure');
    const rets = records.filter(x => x.record_type === 'return');
    expect(deps.length).toBeGreaterThanOrEqual(2);
    expect(rets.length).toBeGreaterThanOrEqual(1);
  });

  test('discipline_score ของพนักงานถูกหักหลัง auto-heal', async () => {
    if (!ctx.driverAutoHealId || !ctx.adminToken) return;
    const r = await apiGet(`/api/drivers/${ctx.driverAutoHealId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    // ค่าเดิม = 100 (default), หลัง auto_return ต้องน้อยกว่า 100
    const score = r?.data?.discipline_score;
    expect(typeof score).toBe('number');
    expect(score).toBeLessThan(100);
  });
});

// ══════════════════════════════════════════════════════════
// 6. Flow ลืมบันทึกออก — Auto-Heal Departure
//    return → return → auto-heal สร้าง departure อัตโนมัติ
// ══════════════════════════════════════════════════════════
test.describe('6. Flow ลืมบันทึกออก — Auto-Heal Departure', () => {
  test('บันทึกกลับครั้งที่ 1 (ไม่มี departure ก่อน) สำเร็จ — ไม่มี auto_heal', async () => {
    if (!ctx.carAutoDepId || !ctx.driverAutoHealId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carAutoDepId,
      record_type: 'return',
      driver_id: ctx.driverAutoHealId,
      datetime: DT.AD_RET1,
      mileage: 30100,
    });
    expect(r?.success).toBe(true);
    // บันทึกแรก (ไม่มี previous return) → ไม่มี auto_heal
    expect(r?.data?.auto_healed?.length).toBe(0);
  });

  test('สถานะหลังกลับครั้งที่ 1 → in', async () => {
    if (!ctx.carAutoDepId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoDepId}`);
    expect(r?.data?.status).toBe('in');
  });

  test('บันทึกกลับครั้งที่ 2 (ลืมบันทึกออก) → auto-heal สร้าง departure อัตโนมัติ', async () => {
    if (!ctx.carAutoDepId || !ctx.driverAutoHealId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carAutoDepId,
      record_type: 'return',
      driver_id: ctx.driverAutoHealId,
      datetime: DT.AD_RET2,  // 16:00 > 08:00 ชัดเจน
      mileage: 30300,
    });
    expect(r?.success).toBe(true);
    // ต้องมี auto_heal!
    expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
    expect(r?.data?.auto_healed?.length).toBeGreaterThan(0);
    const healTypes = (r?.data?.auto_healed || []).map(h => h.type);
    expect(healTypes).toContain('auto_departure');
  });

  test('auto_departure record ถูกสร้างใน DB', async () => {
    if (!ctx.carAutoDepId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?car_id=${ctx.carAutoDepId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const records = r?.data || [];
    const autoDep = records.find(rec => rec.data_quality === 'auto_departure');
    expect(autoDep).toBeTruthy();
    expect(autoDep?.record_type).toBe('departure');
    expect(autoDep?.auto_notes).toMatch(/ระบบสร้างอัตโนมัติ/);
  });

  test('สถานะหลัง auto-heal → in (return ล่าสุดกว่า auto_departure)', async () => {
    if (!ctx.carAutoDepId) return;
    const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoDepId}`);
    expect(r?.data?.status).toBe('in');
  });
});

// ══════════════════════════════════════════════════════════
// 7. บันทึกด้วย driver_name_manual (ไม่ต้องมี driver_id)
//    สำหรับผู้ใช้ทั่วไปที่สแกน QR โดยไม่มีระบบ
// ══════════════════════════════════════════════════════════
test.describe('7. บันทึกด้วย driver_name_manual', () => {
  test('บันทึกออก (departure) ด้วย driver_name_manual สำเร็จ', async () => {
    if (!ctx.carManualId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carManualId,
      record_type: 'departure',
      driver_name_manual: 'นายแมนวล ทดสอบ',
      mileage: 5000,
      datetime: DT.MAN_DEP,
      destination: 'ตลาดเทศบาล',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('บันทึกกลับ (return) ด้วย driver_name_manual สำเร็จ', async () => {
    if (!ctx.carManualId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carManualId,
      record_type: 'return',
      driver_name_manual: 'นายแมนวล ทดสอบ',
      mileage: 5080,
      datetime: DT.MAN_RET,
    });
    expect(r?.success).toBe(true);
  });

  test('ดู record ผ่าน admin → มี driver_name_manual ถูกต้อง', async () => {
    if (!ctx.carManualId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?car_id=${ctx.carManualId}`, ctx.adminToken);
    const rows = r?.data || [];
    const withManual = rows.find(row => row.driver_name_manual === 'นายแมนวล ทดสอบ');
    expect(withManual).toBeTruthy();
    // driver_id ต้องเป็น null (ไม่ได้ระบุ)
    expect(withManual?.driver_id).toBeFalsy();
  });
});

// ══════════════════════════════════════════════════════════
// 8. บันทึกพร้อม queue_id (เชื่อมโยงคิว)
// ══════════════════════════════════════════════════════════
test.describe('8. บันทึกพร้อม queue_id (เชื่อมโยงคิว)', () => {
  test('บันทึกออกพร้อม queue_id → success', async () => {
    if (!ctx.carQueueId || !ctx.driverId || !ctx.queueId) return;
    const r = await apiPost('/api/usage/record', {
      car_id: ctx.carQueueId,
      record_type: 'departure',
      driver_id: ctx.driverId,
      queue_id: ctx.queueId,
      mileage: 8000,
      datetime: DT.QID_DEP,
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('ดู record → queue_id ตรงกันกับที่บันทึก', async () => {
    if (!ctx.carQueueId || !ctx.queueId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?queue_id=${ctx.queueId}`, ctx.adminToken);
    const rows = r?.data || [];
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(row => expect(row.queue_id).toBe(ctx.queueId));
  });
});

// ══════════════════════════════════════════════════════════
// 9. QR Daily Check (/api/check/daily)
// PUBLIC endpoint — ตรวจสภาพรถก่อนออก/หลังกลับ
// ══════════════════════════════════════════════════════════
test.describe('9. QR Daily Check', () => {
  test('ไม่มี car_id → error', async () => {
    const r = await apiPost('/api/check/daily', {
      inspector_name: 'ทดสอบ', overall_status: 'ok',
    });
    expect(r?.success).toBe(false);
  });

  test('บันทึกตรวจสภาพรถสถานะ ok สำเร็จ', async () => {
    if (!ctx.carId) return;
    const today = new Date();
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.carId,
      inspector_name: 'พนักงานตรวจสอบ',
      date: today.toISOString().slice(0, 10),
      time: '08:00',
      overall_status: 'ok',
      tire_condition: 'ok',
      brake_condition: 'ok',
      light_condition: 'ok',
      notes: 'ตรวจสภาพปกติ ไม่พบปัญหา',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    expect(r?.data?.message).toMatch(/เรียบร้อย|สำเร็จ/);
  });

  test('บันทึกตรวจสภาพสถานะ warning (พบปัญหา) → สำเร็จ + สร้าง alert', async () => {
    if (!ctx.carId) return;
    const today = new Date();
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.carId,
      inspector_name: 'ช่างตรวจสอบ',
      date: today.toISOString().slice(0, 10),
      time: '09:00',
      overall_status: 'warning',
      // ไม่ส่ง issues_found: true เพราะ API จะแปลงเป็น critical อัตโนมัติ
      issue_description: 'ยางล้อหน้าแบนเล็กน้อย',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('บันทึกตรวจสภาพสถานะ critical → สำเร็จ', async () => {
    if (!ctx.carId) return;
    const today = new Date();
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.carId,
      inspector_name: 'ช่างใหญ่',
      date: today.toISOString().slice(0, 10),
      time: '10:00',
      overall_status: 'critical',
      issue_description: 'เบรกบกพร่อง ต้องซ่อมก่อนออก',
      issues_found: true,
      checks: { brake: 'fail' },
    });
    expect(r?.success).toBe(true);
  });

  test('ค้นหารถด้วย license_plate → สำเร็จ', async () => {
    // qr-info ใช้ license_plate ค้นหาได้
    const r = await apiPost('/api/check/daily', {
      car_id: 'QR-001',   // license_plate
      inspector_name: 'ทดสอบ license_plate',
      overall_status: 'ok',
    });
    expect(r?.success).toBe(true);
  });

  test('ดู check log ผ่าน admin API', async () => {
    if (!ctx.carId || !ctx.adminToken) return;
    const r = await apiGet(`/api/check/log?car_id=${ctx.carId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    // มี overall_status หลายแบบ
    const statuses = rows.map(x => x.overall_status);
    expect(statuses).toContain('ok');
    expect(statuses).toContain('warning');
  });

  test('ดู inspection alerts ผ่าน admin API', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/check/alerts', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    // ต้องมี alert จาก warning/critical check ที่สร้างไว้
    expect(r?.data?.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════
// 10. QR Survey (/api/survey)
// PUBLIC submit — ประเมินผู้โดยสาร
// ══════════════════════════════════════════════════════════
test.describe('10. QR Survey', () => {
  test('ดึง car-info สำหรับ survey สำเร็จ (PUBLIC)', async () => {
    if (!ctx.carId) return;
    const r = await apiGet(`/api/survey/car-info?car_id=${ctx.carId}`);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.carId);
    expect(r?.data?.license_plate).toBe('QR-001');
  });

  test('ดึง car-info ด้วย license_plate สำเร็จ', async () => {
    const r = await apiGet('/api/survey/car-info?car_id=QR-001');
    expect(r?.success).toBe(true);
    expect(r?.data?.license_plate).toBe('QR-001');
  });

  test('ไม่มี car_id → error', async () => {
    const r = await apiGet('/api/survey/car-info');
    expect(r?.success).toBe(false);
  });

  test('ส่ง survey ครบสมบูรณ์ → success', async () => {
    if (!ctx.carId || !ctx.driverId) return;
    const r = await apiPost('/api/survey/submit', {
      car_id: ctx.carId,
      driver_id: ctx.driverId,
      politeness_score: 5,
      safety_score: 4,
      punctuality_score: 5,
      cleanliness_score: 4,
      appearance_score: 5,
      overall_score: 5,
      comment: 'ขับดีมาก ตรงต่อเวลา',
      respondent_name: 'นักเรียนทดสอบ',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    expect(r?.data?.message).toMatch(/ขอบคุณ|สำเร็จ/);
  });

  test('ส่ง survey เฉพาะ overall_score (optional fields) → success', async () => {
    if (!ctx.carId) return;
    const r = await apiPost('/api/survey/submit', {
      car_id: ctx.carId,
      overall_score: 4,
    });
    expect(r?.success).toBe(true);
  });

  test('ดู survey results ผ่าน admin API', async () => {
    if (!ctx.carId || !ctx.adminToken) return;
    const r = await apiGet(`/api/survey/results?car_id=${ctx.carId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect((r?.data || []).length).toBeGreaterThanOrEqual(2);
  });

  test('ดู survey summary ผ่าน admin API', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/survey/summary', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 11. Usage CRUD (authenticated — admin)
//     POST /api/usage, GET, GET/:id, PUT, DELETE, summary
// ══════════════════════════════════════════════════════════
test.describe('11. Usage CRUD (authenticated)', () => {
  test('POST /api/usage → สร้าง record สำเร็จ (ต้อง auth)', async () => {
    if (!ctx.carId || !ctx.driverId || !ctx.adminToken) return;
    const r = await apiPost('/api/usage', {
      car_id: ctx.carId,
      driver_id: ctx.driverId,
      record_type: 'departure',
      datetime: DT.CRUD_DEP,
      mileage: 15000,
      record_source: 'qr_logged_in',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.usageRecordId = r?.data?.id || '';
  });

  test('GET /api/usage → ดูรายการทั้งหมดมีข้อมูล', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/usage', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    expect(r?.data?.length).toBeGreaterThan(0);
  });

  test('GET /api/usage?car_id=... → filter ด้วย car_id ถูกต้อง', async () => {
    if (!ctx.carId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage?car_id=${ctx.carId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(row => expect(row.car_id).toBe(ctx.carId));
  });

  test('GET /api/usage?record_type=departure → filter ด้วย record_type', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/usage?record_type=departure', ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    rows.forEach(row => expect(row.record_type).toBe('departure'));
  });

  test('GET /api/usage/:id → ดูรายการเดียวถูกต้อง', async () => {
    if (!ctx.usageRecordId || !ctx.adminToken) return;
    const r = await apiGet(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.usageRecordId);
    expect(r?.data?.record_type).toBe('departure');
    expect(r?.data?.mileage).toBe(15000);
    expect(r?.data?.license_plate).toBeTruthy(); // JOIN กับ cars
  });

  test('PUT /api/usage/:id → แก้ไข notes สำเร็จ', async () => {
    if (!ctx.usageRecordId || !ctx.adminToken) return;
    const r = await apiPut(`/api/usage/${ctx.usageRecordId}`, {
      notes: 'แก้ไขจาก E2E test',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    // ตรวจสอบว่าแก้ไขสำเร็จจริง
    const check = await apiGet(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
    expect(check?.data?.notes).toBe('แก้ไขจาก E2E test');
  });

  test('GET /api/usage/summary → สรุปจำนวนบันทึก', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/usage/summary', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.total_records).toBeGreaterThan(0);
    expect(typeof r?.data?.departures).toBe('number');
    expect(typeof r?.data?.returns).toBe('number');
    expect(r?.data?.departures).toBeGreaterThan(0);
    expect(r?.data?.returns).toBeGreaterThan(0);
  });

  test('DELETE /api/usage/:id → ลบสำเร็จ', async () => {
    if (!ctx.usageRecordId || !ctx.adminToken) return;
    const r = await apiDelete(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    // ยืนยันว่าลบแล้วจริง
    const check = await apiGet(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
    expect(check?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 12. Permission Tests
// ══════════════════════════════════════════════════════════
test.describe('12. Permission Tests', () => {
  test('POST /api/usage/record ไม่มี token → success (PUBLIC)', async () => {
    if (!ctx.carId) return;
    const r = await fetch(`${BASE}/api/usage/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: ctx.carId,
        record_type: 'refuel',
        driver_name_manual: 'ผู้ไม่มี token',
        mileage: 11000,
        datetime: DT.PERM_REF,
      }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });

  test('GET /api/usage ไม่มี token → 401', async () => {
    const r = await apiGet('/api/usage');
    expect(r?.success).toBe(false);
  });

  test('GET /api/usage/latest-status ไม่มี token → success (PUBLIC)', async () => {
    if (!ctx.carId) return;
    const r = await fetch(`${BASE}/api/usage/latest-status?car_id=${ctx.carId}`)
      .then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });

  test('GET /api/check/log ไม่มี token → 401', async () => {
    const r = await apiGet('/api/check/log');
    expect(r?.success).toBe(false);
  });

  test('GET /api/survey/results ไม่มี token → 401', async () => {
    const r = await apiGet('/api/survey/results');
    expect(r?.success).toBe(false);
  });

  test('POST /api/check/daily ไม่มี token → success (PUBLIC)', async () => {
    if (!ctx.carId) return;
    const r = await fetch(`${BASE}/api/check/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: ctx.carId,
        inspector_name: 'ไม่มี token',
        overall_status: 'ok',
      }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });

  test('POST /api/survey/submit ไม่มี token → success (PUBLIC)', async () => {
    if (!ctx.carId) return;
    const r = await fetch(`${BASE}/api/survey/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car_id: ctx.carId, overall_score: 3 }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 13. UI Tests
// ══════════════════════════════════════════════════════════
test.describe('13. UI Tests', () => {
  test('qr-usage-record.html โหลดได้', async ({ page }) => {
    if (!ctx.carId) return;
    await page.goto(`/qr-usage-record.html?car_id=${ctx.carId}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/บันทึก|QR|PPK/i);
  });

  test('qr-daily-check.html โหลดได้', async ({ page }) => {
    if (!ctx.carId) return;
    await page.goto(`/qr-daily-check.html?car_id=${ctx.carId}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ตรวจ|Check|QR|PPK/i);
  });

  test('qr-scan.html โหลดได้', async ({ page }) => {
    await page.goto('/qr-scan.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/QR|สแกน|Scan|PPK/i);
  });

  test('qr-survey.html โหลดได้', async ({ page }) => {
    if (!ctx.carId) return;
    await page.goto(`/qr-survey.html?car_id=${ctx.carId}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/ประเมิน|Survey|QR|PPK/i);
  });

  test('qr-usage-record.html แสดงฟอร์มบันทึกการใช้รถ', async ({ page }) => {
    if (!ctx.carId) return;
    await page.goto(`/qr-usage-record.html?car_id=${ctx.carId}`);
    await page.waitForLoadState('networkidle');
    // ฟอร์มหรือข้อมูลรถต้องแสดง
    const form = page.locator('#usageForm, form, .usage-form');
    if (await form.count() > 0) {
      await expect(form.first()).toBeVisible({ timeout: 10000 });
    }
    // ต้องไม่ redirect ไปหน้า login
    expect(page.url()).not.toMatch(/login/);
  });

  test('qr-daily-check.html แสดงฟอร์มตรวจสภาพรถ', async ({ page }) => {
    if (!ctx.carId) return;
    await page.goto(`/qr-daily-check.html?car_id=${ctx.carId}`);
    await page.waitForLoadState('networkidle');
    const form = page.locator('#dailyCheckForm, form');
    if (await form.count() > 0) {
      await expect(form.first()).toBeVisible({ timeout: 10000 });
    }
    expect(page.url()).not.toMatch(/login/);
  });
});
