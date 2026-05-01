// ==============================================================
// PPK DriveHub — Fuel Recording E2E Tests
// ทดสอบบันทึกเติมน้ำมัน ทั้งบริบทพนักงานขับรถและคณะทำงาน
// ครอบคลุม:
//   - GET  /api/fuel/types (Public)
//   - POST /api/fuel/record (Public) — validation, driver context, staff context
//   - Anomaly detection (อัตราสิ้นเปลือง / เติมบ่อยผิดปกติ)
//   - GET/PUT/DELETE /api/fuel/log (Auth)
//   - GET /api/fuel/summary (Auth)
//   - Fuel Requests CRUD + approve/reject (Auth)
//   - Fuel Invoices + Reconcile (Auth)
//   - Permissions + UI
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';

// ──────────────────────────────────────────────
// Context shared ระหว่าง describe groups
// ──────────────────────────────────────────────
const ctx = {
  adminToken: '',
  fuelCar1Id: '',     // FUEL-001 — driver QR + staff tests
  fuelCar2Id: '',     // FUEL-002 — CRUD / log filter tests
  fuelCar3Id: '',     // FUEL-003 — anomaly tests
  driverId: '',       // FUEL-DRV-001
  fuelLogId: '',      // record จาก driver context (สำหรับ GET detail)
  fuelLogId2: '',     // record จาก staff context (สำหรับ PUT)
  fuelDeleteId: '',   // record สำหรับ DELETE test
  docNumber: '',      // document_number จากรายการแรก (ตรวจ format)
  requestId: '',      // fuel request ID
  invoiceId: '',      // fuel invoice ID
};

// ──────────────────────────────────────────────
// Dummy receipt URL (เพื่อผ่าน validation บังคับแนบใบเสร็จ)
// ──────────────────────────────────────────────
const MOCK_RECEIPT = 'https://storage.example.com/receipts/test-receipt.jpg';

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

function futureDate(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────
// Bootstrap — สร้าง admin + รถ + พนักงาน
// ──────────────────────────────────────────────
test.beforeAll(async () => {
  clearRateLimits();

  // 1. รับ admin token
  for (const cred of [
    { username: 'testadmin', password: 'Admin@5678' },
    { username: 'testadmin', password: 'Admin@1234' },
  ]) {
    const r = await apiPost('/api/auth/login', cred);
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
  if (!ctx.adminToken) throw new Error('[fuel.spec] Cannot obtain admin token');

  // 2. สร้างรถทดสอบ — idempotent
  async function createCar(plate) {
    const existing = await apiGet(`/api/vehicles/qr-info?car_id=${encodeURIComponent(plate)}`);
    if (existing?.success && existing?.data?.id) return existing.data.id;
    const r = await apiPost('/api/vehicles', {
      license_plate: plate, brand: 'Toyota', model: 'Commuter',
      fuel_type: 'diesel', status: 'active',
    }, ctx.adminToken);
    clearRateLimits();
    return r?.data?.id || r?.id || '';
  }

  ctx.fuelCar1Id = await createCar('FUEL-001');
  ctx.fuelCar2Id = await createCar('FUEL-002');
  ctx.fuelCar3Id = await createCar('FUEL-003');

  if (!ctx.fuelCar1Id) throw new Error('[fuel.spec] Cannot create FUEL-001');

  // 3. สร้างพนักงานขับรถ — idempotent
  const existingDriver = await apiGet('/api/drivers?search=FUEL-DRV-001', ctx.adminToken);
  const foundDriver = (existingDriver?.data?.drivers || []).find(d => d.license_number === 'FUEL-DRV-001');
  if (foundDriver) {
    ctx.driverId = foundDriver.id;
  } else {
    const dr = await apiPost('/api/drivers', {
      first_name: 'นายทดสอบ', last_name: 'น้ำมัน',
      license_number: 'FUEL-DRV-001',
      license_expiry: futureDate(365),
      phone: '0812345678', status: 'active',
    }, ctx.adminToken);
    clearRateLimits();
    ctx.driverId = dr?.data?.id || dr?.id || '';
  }

  if (!ctx.driverId) throw new Error('[fuel.spec] Cannot create test driver');
});

// ══════════════════════════════════════════════════════════
// 1. GET /api/fuel/types — ประเภทน้ำมัน (PUBLIC)
// ══════════════════════════════════════════════════════════
test.describe('1. Public — ประเภทน้ำมัน (GET /api/fuel/types)', () => {
  test('ดึงรายการประเภทน้ำมัน → สำเร็จ + มีข้อมูล', async () => {
    const r = await apiGet('/api/fuel/types');
    expect(r?.success).toBe(true);
    expect(r?.data?.fuel_types).toBeDefined();
    expect(Array.isArray(r?.data?.fuel_types)).toBe(true);
    expect(r?.data?.fuel_types?.length).toBeGreaterThanOrEqual(1);
  });

  test('แต่ละ fuel type มี id และ name', async () => {
    const r = await apiGet('/api/fuel/types');
    const types = r?.data?.fuel_types || [];
    types.forEach(t => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
    });
  });

  test('ไม่ต้องมี token (PUBLIC endpoint)', async () => {
    const r = await fetch(`${BASE}/api/fuel/types`)
      .then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 2. POST /api/fuel/record — Validation
// ══════════════════════════════════════════════════════════
test.describe('2. Validation — POST /api/fuel/record', () => {
  test('ไม่ส่ง car_id → error', async () => {
    const r = await apiPost('/api/fuel/record', {
      receipt_image: MOCK_RECEIPT,
      mileage_after: 10000,
      purpose: 'business',
      driver_name_manual: 'คนทดสอบ',
    });
    expect(r?.success).toBe(false);
    expect(r?.error).toMatch(/car_id/);
  });

  test('ไม่ส่ง receipt_image → error (บังคับแนบใบเสร็จ)', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      mileage_after: 10000,
      purpose: 'business',
      driver_name_manual: 'คนทดสอบ',
    });
    expect(r?.success).toBe(false);
    expect(r?.error).toMatch(/ใบเสร็จ/);
  });

  test('ไม่ส่ง mileage_after → error (บังคับกรอกไมล์)', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      receipt_image: MOCK_RECEIPT,
      purpose: 'business',
      driver_name_manual: 'คนทดสอบ',
    });
    expect(r?.success).toBe(false);
    expect(r?.error).toMatch(/ไมล์/);
  });

  test('mileage_after = 0 → error', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      receipt_image: MOCK_RECEIPT,
      mileage_after: 0,
      purpose: 'business',
      driver_name_manual: 'คนทดสอบ',
    });
    expect(r?.success).toBe(false);
  });

  test('ไม่ส่ง purpose → error', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      receipt_image: MOCK_RECEIPT,
      mileage_after: 10000,
      driver_name_manual: 'คนทดสอบ',
    });
    expect(r?.success).toBe(false);
    expect(r?.error).toMatch(/วัตถุประสงค์/);
  });

  test('purpose: other แต่ไม่มี purpose_detail → error', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      receipt_image: MOCK_RECEIPT,
      mileage_after: 10000,
      purpose: 'other',
      driver_name_manual: 'คนทดสอบ',
    });
    expect(r?.success).toBe(false);
    expect(r?.error).toMatch(/รายละเอียด/);
  });

  test('ไม่ส่ง driver_id และ driver_name_manual → error', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      receipt_image: MOCK_RECEIPT,
      mileage_after: 10000,
      purpose: 'business',
    });
    expect(r?.success).toBe(false);
    expect(r?.error).toMatch(/ผู้เบิก/);
  });
});

// ══════════════════════════════════════════════════════════
// 3. บันทึกน้ำมัน — บริบทพนักงานขับรถ
//    (QR scan — ไม่มี token, ใช้ driver_id หรือ driver_name_manual)
// ══════════════════════════════════════════════════════════
test.describe('3. บันทึกน้ำมัน — บริบทพนักงานขับรถ (QR, ไม่มี token)', () => {
  test('บันทึกน้ำมัน minimal ด้วย driver_id (QR scan) → สำเร็จ', async () => {
    if (!ctx.fuelCar1Id || !ctx.driverId) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      driver_id: ctx.driverId,
      mileage_after: 10000,
      liters: 40,
      purpose: 'business',
      receipt_image: MOCK_RECEIPT,
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    expect(r?.data?.document_number).toBeTruthy();
    ctx.fuelLogId = r.data.id;
    ctx.docNumber = r.data.document_number;
  });

  test('document_number มีรูปแบบ FUL-{BE}-{MM}-{NNN}', async () => {
    expect(ctx.docNumber).toMatch(/^FUL-\d{4}-\d{2}-\d{3}$/);
  });

  test('บันทึกน้ำมัน ด้วย driver_name_manual (ไม่มีในระบบ) → สำเร็จ', async () => {
    if (!ctx.fuelCar1Id) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      driver_name_manual: 'นายสมชาย ใจดี',
      mileage_before: 10000,
      mileage_after: 10300,
      liters: 35,
      price_per_liter: 29.95,
      amount: 1048,
      purpose: 'government_task',
      fuel_type: 'fuelSave_diesel_b7',
      receipt_image: MOCK_RECEIPT,
      date: '2020-03-01',
      time: '09:30',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    expect(r?.data?.document_number).toMatch(/^FUL-2563-03-/);
  });

  test('ไม่ต้องมี Authorization header (PUBLIC) → สำเร็จ', async () => {
    if (!ctx.fuelCar1Id || !ctx.driverId) return;
    const r = await fetch(`${BASE}/api/fuel/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: ctx.fuelCar1Id,
        driver_id: ctx.driverId,
        mileage_before: 10300,
        mileage_after: 10600,
        liters: 38,
        purpose: 'government_task',
        receipt_image: MOCK_RECEIPT,
        date: '2020-03-02',
        time: '10:00',
      }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });

  test('เติมน้ำมันครั้งที่ 2 ไมล์ > ครั้งแรก → สำเร็จ', async () => {
    if (!ctx.fuelCar1Id || !ctx.driverId) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      driver_id: ctx.driverId,
      mileage_before: 10600,
      mileage_after: 10900,
      liters: 42,
      amount: 1260,
      purpose: 'business',
      receipt_image: MOCK_RECEIPT,
      date: '2020-03-03',
      time: '11:00',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('purpose: other + purpose_detail → สำเร็จ', async () => {
    if (!ctx.fuelCar1Id || !ctx.driverId) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      driver_id: ctx.driverId,
      mileage_before: 10900,
      mileage_after: 11200,
      liters: 30,
      purpose: 'other',
      purpose_detail: 'ส่งเอกสารฉุกเฉินนอกพื้นที่',
      receipt_image: MOCK_RECEIPT,
      date: '2020-03-04',
      time: '08:00',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════
// 4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token)
//    เจ้าหน้าที่บันทึกพร้อมรายละเอียดเต็มรูปแบบ
// ══════════════════════════════════════════════════════════
test.describe('4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token)', () => {
  test('บันทึกน้ำมันพร้อมข้อมูลครบทุก field → สำเร็จ', async () => {
    if (!ctx.fuelCar1Id || !ctx.driverId || !ctx.adminToken) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar1Id,
      driver_id: ctx.driverId,
      mileage_before: 11200,
      mileage_after: 11500,
      liters: 45,
      price_per_liter: 30.25,
      amount: 1361.25,
      fuel_type: 'fuelSave_diesel_b7',
      gas_station_name: 'ปั๊มน้ำมัน PTT สาขาทดสอบ',
      gas_station_address: '999 ถ.ทดสอบ กรุงเทพ',
      gas_station_tax_id: '0105559123456',
      receipt_number: 'REC-2020-001',
      pump_meter_number: 'PUMP-01',
      expense_type: 'procurement',
      notes: 'เติมน้ำมันก่อนออกปฏิบัติงาน',
      purpose: 'government_task',
      receipt_image: MOCK_RECEIPT,
      date: '2020-03-10',
      time: '07:30',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    expect(r?.data?.document_number).toMatch(/^FUL-2563-03-/);
    ctx.fuelLogId2 = r.data.id;
  });

  test('GET /api/fuel/log/:id → ข้อมูลครบถ้วน', async () => {
    if (!ctx.fuelLogId2 || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.fuelLogId2);
    expect(r?.data?.gas_station_name).toBe('ปั๊มน้ำมัน PTT สาขาทดสอบ');
    expect(r?.data?.gas_station_tax_id).toBe('0105559123456');
    expect(r?.data?.receipt_number).toBe('REC-2020-001');
    expect(r?.data?.liters).toBe(45);
    expect(r?.data?.expense_type).toBe('procurement');
  });

  test('ระบบคำนวณ fuel_consumption_rate อัตโนมัติ', async () => {
    if (!ctx.fuelLogId2 || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
    // (11500 - 11200) / 45 = 300 / 45 ≈ 6.67 km/L
    expect(r?.data?.fuel_consumption_rate).toBeGreaterThan(0);
    expect(r?.data?.fuel_consumption_rate).toBeCloseTo(300 / 45, 1);
  });

  test('บันทึกน้ำมันด้วย expense_type: private → สำเร็จ', async () => {
    if (!ctx.fuelCar2Id || !ctx.driverId || !ctx.adminToken) return;
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar2Id,
      driver_id: ctx.driverId,
      mileage_before: 20000,
      mileage_after: 20300,
      liters: 30,
      amount: 900,
      expense_type: 'official_travel',
      purpose: 'business',
      gas_station_name: 'ปั๊มใกล้บ้าน',
      receipt_image: MOCK_RECEIPT,
      date: '2020-03-10',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.fuelDeleteId = r.data.id;
  });

  test('อัปเดตไมล์รถอัตโนมัติหลังเติมน้ำมัน', async () => {
    if (!ctx.fuelCar1Id || !ctx.adminToken) return;
    const car = await apiGet(`/api/vehicles/${ctx.fuelCar1Id}`, ctx.adminToken);
    // หลังจาก POST หลายครั้ง current_mileage ควร = mileage_after ล่าสุด
    expect(car?.data?.current_mileage).toBeGreaterThanOrEqual(11500);
  });
});

// ══════════════════════════════════════════════════════════
// 5. Anomaly Detection — ตรวจจับความผิดปกติ
// ══════════════════════════════════════════════════════════
test.describe('5. Anomaly Detection — ตรวจจับความผิดปกติ', () => {
  test('อัตราสิ้นเปลืองต่ำผิดปกติ (< 2 กม./ล.) → anomaly_flag = 1', async () => {
    if (!ctx.fuelCar3Id || !ctx.driverId) return;
    // mileage เพิ่มขึ้นแค่ 10 กม. แต่เติม 50 ลิตร = 0.2 กม./ล. → ผิดปกติ
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar3Id,
      driver_id: ctx.driverId,
      mileage_before: 30000,
      mileage_after: 30010,
      liters: 50,
      amount: 1500,
      purpose: 'business',
      receipt_image: MOCK_RECEIPT,
      date: '2020-04-01',
      time: '09:00',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.anomaly_flag).toBe(1);
  });

  test('เติมน้ำมันปกติ → anomaly_flag = 0', async () => {
    if (!ctx.fuelCar2Id || !ctx.driverId) return;
    // (20300 → 20600) = 300 กม. / 35 ล. = 8.57 กม./ล. — ปกติ
    const r = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar2Id,
      driver_id: ctx.driverId,
      mileage_before: 20300,
      mileage_after: 20600,
      liters: 35,
      purpose: 'business',
      receipt_image: MOCK_RECEIPT,
      date: '2020-04-02',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.anomaly_flag).toBe(0);
  });

  test('เติมน้ำมัน 3 ครั้งในวันเดียว (รถเดิม) → anomaly_flag = 1 ครั้งสุดท้าย', async () => {
    if (!ctx.fuelCar3Id || !ctx.driverId) return;
    // ครั้งที่ 2 (เพื่อให้ถึง 3 ครั้งรวมกับครั้งแรก)
    const r2 = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar3Id,
      driver_id: ctx.driverId,
      mileage_before: 30010,
      mileage_after: 30020,
      liters: 5,
      purpose: 'business',
      receipt_image: MOCK_RECEIPT,
      date: '2020-04-01',  // วันเดียวกับครั้งแรก
      time: '12:00',
    });
    // ครั้งที่ 3 — ต้องเป็น anomaly
    const r3 = await apiPost('/api/fuel/record', {
      car_id: ctx.fuelCar3Id,
      driver_id: ctx.driverId,
      mileage_before: 30020,
      mileage_after: 30030,
      liters: 5,
      purpose: 'business',
      receipt_image: MOCK_RECEIPT,
      date: '2020-04-01',  // วันเดียวกัน
      time: '15:00',
    });
    expect(r3?.success).toBe(true);
    // ครั้งที่ 3 ในวันเดียว (รวมครั้งแรกแล้ว = 3 ครั้ง) → anomaly
    expect(r3?.data?.anomaly_flag).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════
// 6. GET /api/fuel/log — ดูประวัติการเติมน้ำมัน (Auth)
// ══════════════════════════════════════════════════════════
test.describe('6. GET /api/fuel/log — ประวัติการเติมน้ำมัน', () => {
  test('ดึงรายการทั้งหมด → success + array', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/fuel/log', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    expect(r?.data?.length).toBeGreaterThanOrEqual(1);
  });

  test('กรอง car_id → เฉพาะรถที่ระบุ', async () => {
    if (!ctx.fuelCar1Id || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/log?car_id=${ctx.fuelCar1Id}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach(row => expect(row.car_id).toBe(ctx.fuelCar1Id));
  });

  test('กรอง date_from/date_to → เฉพาะช่วงวันที่', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/fuel/log?date_from=2020-03-01&date_to=2020-03-31', ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    rows.forEach(row => {
      expect(row.date >= '2020-03-01').toBe(true);
      expect(row.date <= '2020-03-31').toBe(true);
    });
  });

  test('GET /api/fuel/log/:id → details ถูกต้อง', async () => {
    if (!ctx.fuelLogId || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.fuelLogId);
    expect(r?.data?.car_id).toBe(ctx.fuelCar1Id);
    expect(r?.data?.driver_id).toBe(ctx.driverId);
    expect(r?.data?.liters).toBe(40);
    expect(r?.data?.document_number).toBe(ctx.docNumber);
  });

  test('ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/fuel/log`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 7. PUT /api/fuel/log/:id — แก้ไขบันทึกน้ำมัน (Auth)
// ══════════════════════════════════════════════════════════
test.describe('7. PUT /api/fuel/log/:id — แก้ไขบันทึก', () => {
  test('อัปเดต gas_station_name และ notes → สำเร็จ', async () => {
    if (!ctx.fuelLogId2 || !ctx.adminToken) return;
    const r = await apiPut(`/api/fuel/log/${ctx.fuelLogId2}`, {
      gas_station_name: 'ปั๊ม ESSO สาขาอัปเดต',
      notes: 'แก้ไขชื่อปั๊มแล้ว',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
  });

  test('ตรวจ GET หลัง PUT → ข้อมูลเปลี่ยนแล้ว', async () => {
    if (!ctx.fuelLogId2 || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
    expect(r?.data?.gas_station_name).toBe('ปั๊ม ESSO สาขาอัปเดต');
    expect(r?.data?.notes).toBe('แก้ไขชื่อปั๊มแล้ว');
  });

  test('PUT ไม่มี token → 401', async () => {
    if (!ctx.fuelLogId2) return;
    const r = await apiPut(`/api/fuel/log/${ctx.fuelLogId2}`, { notes: 'แก้ไขโดยไม่มีสิทธิ์' });
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 8. DELETE /api/fuel/log/:id — Soft Delete (Auth)
// ══════════════════════════════════════════════════════════
test.describe('8. DELETE /api/fuel/log/:id — Soft Delete', () => {
  test('ลบรายการน้ำมัน (Soft Delete) → สำเร็จ', async () => {
    if (!ctx.fuelDeleteId || !ctx.adminToken) return;
    const r = await apiDelete(`/api/fuel/log/${ctx.fuelDeleteId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.message).toMatch(/Soft Delete/);
  });

  test('หลัง delete — GET /:id → ไม่พบ (soft deleted)', async () => {
    if (!ctx.fuelDeleteId || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/log/${ctx.fuelDeleteId}`, ctx.adminToken);
    expect(r?.success).toBe(false);
  });

  test('DELETE ไม่มี token → 401', async () => {
    const r = await apiDelete('/api/fuel/log/some-fake-id-xyz');
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 9. GET /api/fuel/summary — สรุปการใช้น้ำมัน (Auth)
// ══════════════════════════════════════════════════════════
test.describe('9. GET /api/fuel/summary — สรุปการใช้น้ำมัน', () => {
  test('ดึง summary ทั้งหมด → count > 0', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/fuel/summary', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.count).toBeGreaterThan(0);
    expect(r?.data?.total_liters).toBeGreaterThan(0);
    expect(r?.data?.total_amount).toBeGreaterThanOrEqual(0);
  });

  test('summary กรอง car_id → เฉพาะรถนั้น', async () => {
    if (!ctx.fuelCar1Id || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/summary?car_id=${ctx.fuelCar1Id}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.count).toBeGreaterThan(0);
  });

  test('summary กรอง month → เฉพาะเดือนนั้น', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/fuel/summary?month=2020-03', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════
// 10. Fuel Requests — คำขอเบิกน้ำมัน (Auth)
//     POST/GET /api/fuel/requests
//     PUT /api/fuel/requests/:id/approve
//     PUT /api/fuel/requests/:id/reject
// ══════════════════════════════════════════════════════════
test.describe('10. Fuel Requests — คำขอเบิกน้ำมัน', () => {
  test('สร้างคำขอเบิกน้ำมัน → สำเร็จ + status: pending', async () => {
    if (!ctx.fuelCar1Id || !ctx.adminToken) return;
    const r = await apiPost('/api/fuel/requests', {
      car_id: ctx.fuelCar1Id,
      requested_amount: 1500,
      requested_liters: 50,
      reason: 'เติมน้ำมันสำหรับภารกิจออกต่างจังหวัด',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.requestId = r.data.id;
  });

  test('GET /api/fuel/requests → มีรายการที่เพิ่งสร้าง', async () => {
    if (!ctx.requestId || !ctx.adminToken) return;
    const r = await apiGet('/api/fuel/requests', ctx.adminToken);
    expect(r?.success).toBe(true);
    const ids = (r?.data || []).map(x => x.id);
    expect(ids).toContain(ctx.requestId);
  });

  test('GET ?status=pending → เฉพาะ pending', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/fuel/requests?status=pending', ctx.adminToken);
    expect(r?.success).toBe(true);
    (r?.data || []).forEach(req => expect(req.status).toBe('pending'));
  });

  test('อนุมัติคำขอ (approve) → สำเร็จ', async () => {
    if (!ctx.requestId || !ctx.adminToken) return;
    const r = await apiPut(`/api/fuel/requests/${ctx.requestId}/approve`, {}, ctx.adminToken);
    expect(r?.success).toBe(true);
  });

  test('สร้างคำขอใหม่แล้ว reject → สำเร็จ', async () => {
    if (!ctx.fuelCar2Id || !ctx.adminToken) return;
    const newReq = await apiPost('/api/fuel/requests', {
      car_id: ctx.fuelCar2Id,
      requested_amount: 500,
      reason: 'ทดสอบการ reject',
    }, ctx.adminToken);
    expect(newReq?.data?.id).toBeTruthy();
    const r = await apiPut(`/api/fuel/requests/${newReq.data.id}/reject`, {}, ctx.adminToken);
    expect(r?.success).toBe(true);
  });

  test('POST ไม่ส่ง car_id → error', async () => {
    if (!ctx.adminToken) return;
    const r = await apiPost('/api/fuel/requests', {
      requested_amount: 1000,
      reason: 'ไม่มีรถ',
    }, ctx.adminToken);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 11. Fuel Invoices — ใบเบิกจากปั๊ม + Reconcile (Auth)
//     POST/GET /api/fuel/invoices
//     GET /api/fuel/invoices/:id/reconcile
//     PUT /api/fuel/invoices/:id/resolve
// ══════════════════════════════════════════════════════════
test.describe('11. Fuel Invoices — ใบเบิกจากปั๊ม + Reconcile', () => {
  test('สร้างใบเบิกจากปั๊ม → สำเร็จ', async () => {
    if (!ctx.adminToken) return;
    const r = await apiPost('/api/fuel/invoices', {
      station_name: 'ปั๊ม PTT สาขาทดสอบ',
      date_from: '2020-03-01',
      date_to: '2020-03-31',
      invoice_date: '2020-04-01',
      invoice_number: 'INV-2020-03-001',
      total_amount: 3000,
      notes: 'ใบแจ้งหนี้ประจำเดือนมีนาคม',
      items: [
        { fuel_type: 'fuelSave_diesel_b7', total_liters: 100, total_amount: 3000 },
      ],
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.invoiceId = r.data.id;
  });

  test('GET /api/fuel/invoices → มีใบเบิกที่สร้าง', async () => {
    if (!ctx.invoiceId || !ctx.adminToken) return;
    const r = await apiGet('/api/fuel/invoices', ctx.adminToken);
    expect(r?.success).toBe(true);
    const ids = (r?.data || []).map(x => x.id);
    expect(ids).toContain(ctx.invoiceId);
  });

  test('GET /api/fuel/invoices/:id → มี items', async () => {
    if (!ctx.invoiceId || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/invoices/${ctx.invoiceId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.station_name).toBe('ปั๊ม PTT สาขาทดสอบ');
    expect(Array.isArray(r?.data?.items)).toBe(true);
    expect(r?.data?.items?.length).toBe(1);
  });

  test('GET reconcile → มี comparison + status', async () => {
    if (!ctx.invoiceId || !ctx.adminToken) return;
    const r = await apiGet(`/api/fuel/invoices/${ctx.invoiceId}/reconcile`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.invoice).toBeDefined();
    expect(r?.data?.comparison).toBeDefined();
    expect(['matched', 'mismatched']).toContain(r?.data?.status);
  });

  test('PUT resolve → สำเร็จ + status: resolved', async () => {
    if (!ctx.invoiceId || !ctx.adminToken) return;
    const r = await apiPut(`/api/fuel/invoices/${ctx.invoiceId}/resolve`, {
      notes: 'ตรวจสอบแล้ว ยอดตรงกัน',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/fuel/invoices/${ctx.invoiceId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('resolved');
  });
});

// ══════════════════════════════════════════════════════════
// 12. Permissions
// ══════════════════════════════════════════════════════════
test.describe('12. Permissions', () => {
  test('POST /api/fuel/record ไม่มี token → สำเร็จ (PUBLIC)', async () => {
    if (!ctx.fuelCar1Id || !ctx.driverId) return;
    const r = await fetch(`${BASE}/api/fuel/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car_id: ctx.fuelCar1Id,
        driver_id: ctx.driverId,
        mileage_before: 11500,
        mileage_after: 11800,
        liters: 30,
        purpose: 'business',
        receipt_image: MOCK_RECEIPT,
        date: '2020-05-01',
      }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });

  test('GET /api/fuel/log ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/fuel/log`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('PUT /api/fuel/log/:id ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/fuel/log/any-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'ลองแก้ไข' }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('GET /api/fuel/summary ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/fuel/summary`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('GET /api/fuel/invoices ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/fuel/invoices`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 13. UI Tests — โหลดหน้าเว็บ
// ══════════════════════════════════════════════════════════
test.describe('13. UI Tests — โหลดหน้าเว็บ', () => {
  test('qr-fuel-record.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
    const r = await page.goto(`${BASE}/qr-fuel-record.html`);
    expect(r?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/.+/);
  });

  test('fuel-record.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
    const r = await page.goto(`${BASE}/fuel-record.html`);
    expect(r?.status()).toBeLessThan(500);
  });

  test('fuel-ledger.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
    const r = await page.goto(`${BASE}/fuel-ledger.html`);
    expect(r?.status()).toBeLessThan(500);
  });

  test('qr-fuel-record.html มีเนื้อหา (body ไม่ว่าง)', async ({ page }) => {
    await page.goto(`${BASE}/qr-fuel-record.html`);
    const body = await page.evaluate(() => document.body.innerHTML);
    expect(body.length).toBeGreaterThan(100);
  });
});
