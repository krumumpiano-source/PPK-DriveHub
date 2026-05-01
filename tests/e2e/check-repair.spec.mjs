// ==============================================================
// PPK DriveHub — Daily Check & Repair E2E Tests
// ทดสอบ: ตรวจรถประจำวัน (Daily Vehicle Check) + ขอซ่อม (Repair)
// ครอบคลุม:
//   - POST /api/check/daily (Public) — บันทึกตรวจสภาพ
//   - GET  /api/check/log (Auth) — ประวัติตรวจสภาพ
//   - GET/PUT /api/check/alerts (Auth) — แจ้งเตือนตรวจสภาพ
//   - POST /api/repair/log (Auth) — แจ้งซ่อม
//   - Full workflow: request → approve → inspect → document → start-repair → complete
//   - Reject workflow: request → reject
//   - Repair update / delete / items_detail
//   - GET /api/repair/scheduled (Auth) — กำหนดการซ่อม
//   - Permissions + UI page load
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';

// ──────────────────────────────────────────────
// Context shared ระหว่าง describe groups
// ──────────────────────────────────────────────
const ctx = {
  adminToken: '',
  checkCarId: '',       // CHECK-001 — daily check + check log + alerts
  repairCar1Id: '',     // REP-001 — full repair workflow
  repairCar2Id: '',     // REP-002 — reject / update / items tests
  alertId: '',          // inspection alert ID (to test resolve)
  repairId: '',         // full workflow repair record ID
  repairRejectId: '',   // reject flow repair record ID
  repairUpdateId: '',   // update/delete repair record ID
  repairItemsId: '',    // items_detail repair record ID
  scheduledRepairId: '',// scheduled repair ID
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

function futureDate(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────
// Bootstrap — ตั้งค่า admin token + สร้างรถทดสอบ
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
  if (!ctx.adminToken) throw new Error('[check-repair.spec] Cannot obtain admin token');

  // 2. สร้างรถทดสอบ — idempotent (ตรวจก่อนสร้าง)
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

  ctx.checkCarId   = await createCar('CHECK-001');
  ctx.repairCar1Id = await createCar('REP-001');
  ctx.repairCar2Id = await createCar('REP-002');

  if (!ctx.checkCarId)   throw new Error('[check-repair.spec] Cannot create CHECK-001');
  if (!ctx.repairCar1Id) throw new Error('[check-repair.spec] Cannot create REP-001');
  if (!ctx.repairCar2Id) throw new Error('[check-repair.spec] Cannot create REP-002');
});

// ══════════════════════════════════════════════════════════
// 1. Daily Check — บันทึกตรวจสภาพประจำวัน (PUBLIC)
//    POST /api/check/daily — ไม่ต้อง token
// ══════════════════════════════════════════════════════════
test.describe('1. Daily Check — บันทึกตรวจสภาพ (Public)', () => {
  test('บันทึกตรวจสภาพแบบ minimal (car_id เท่านั้น) → สำเร็จ', async () => {
    if (!ctx.checkCarId) return;
    const r = await apiPost('/api/check/daily', { car_id: ctx.checkCarId });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('บันทึกตรวจสภาพพร้อมรายละเอียดครบทุก field → สำเร็จ', async () => {
    if (!ctx.checkCarId) return;
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.checkCarId,
      inspector_name: 'นายช่างทดสอบ',
      date: '2020-02-01',
      time: '07:30',
      overall_status: 'ok',
      tire_condition: 'ok',
      brake_condition: 'ok',
      light_condition: 'ok',
      fuel_level: 'full',
      mileage: 12000,
      check_type: 'daily',
      notes: 'ตรวจเรียบร้อย ไม่พบความผิดปกติ',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('บันทึกด้วย license_plate แทน UUID → สำเร็จ', async () => {
    const r = await apiPost('/api/check/daily', {
      car_id: 'CHECK-001',
      inspector_name: 'QR Scanner User',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('ไม่ต้องมี token (PUBLIC endpoint) → สำเร็จ', async () => {
    const r = await fetch(`${BASE}/api/check/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car_id: 'CHECK-001', inspector_name: 'Unauthenticated User' }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });

  test('บันทึก check_type: shift_start → สำเร็จ', async () => {
    if (!ctx.checkCarId) return;
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.checkCarId,
      check_type: 'shift_start',
      inspector_name: 'พนักงานกะเช้า',
      date: '2020-02-01',
      time: '06:00',
    });
    expect(r?.success).toBe(true);
  });

  test('บันทึกสถานะ warning + issue_description → สำเร็จ + สร้าง alert', async () => {
    if (!ctx.checkCarId) return;
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.checkCarId,
      overall_status: 'warning',
      issue_description: 'ยางล้อหน้าเริ่มสึก ควรเปลี่ยน',
      inspector_name: 'ช่างตรวจประจำวัน',
      date: '2020-02-02',
      time: '08:00',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('issues_found: true → override เป็น critical + สร้าง alert', async () => {
    if (!ctx.checkCarId) return;
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.checkCarId,
      // overall_status: 'ok' จะถูก override เป็น 'critical' เพราะ issues_found: true
      overall_status: 'ok',
      issues_found: true,
      issue_description: 'เบรกหลังชำรุด ห้ามใช้รถจนกว่าจะซ่อม',
      inspector_name: 'หัวหน้าช่าง',
      date: '2020-02-02',
      time: '09:00',
    });
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
  });

  test('overall_status ไม่ถูกต้อง → normalize เป็น ok', async () => {
    if (!ctx.checkCarId) return;
    // API normalizes invalid values to 'ok'
    const r = await apiPost('/api/check/daily', {
      car_id: ctx.checkCarId,
      overall_status: 'BAD_VALUE_XYZ',
    });
    expect(r?.success).toBe(true);
  });

  test('ไม่ส่ง car_id → error', async () => {
    const r = await apiPost('/api/check/daily', { inspector_name: 'คนตรวจ', overall_status: 'ok' });
    expect(r?.success).toBe(false);
  });

  test('car_id ไม่มีในระบบ → error', async () => {
    const r = await apiPost('/api/check/daily', { car_id: 'NON-EXISTENT-PLATE-9999X' });
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 2. Check Log — ประวัติการตรวจสภาพ (Auth)
//    GET /api/check/log
// ══════════════════════════════════════════════════════════
test.describe('2. Check Log — ประวัติการตรวจสภาพ', () => {
  test('ดึง check log ทั้งหมด → success + array', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/check/log', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    expect(r?.data?.length).toBeGreaterThanOrEqual(1);
  });

  test('ดึง check log กรอง car_id → เฉพาะรถที่ระบุ', async () => {
    if (!ctx.checkCarId || !ctx.adminToken) return;
    const r = await apiGet(`/api/check/log?car_id=${ctx.checkCarId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach(row => expect(row.car_id).toBe(ctx.checkCarId));
  });

  test('check log มี overall_status หลายแบบจาก test ก่อนหน้า', async () => {
    if (!ctx.checkCarId || !ctx.adminToken) return;
    const r = await apiGet(`/api/check/log?car_id=${ctx.checkCarId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const statuses = (r?.data || []).map(x => x.overall_status);
    // ใน group 1 มีการบันทึก ok, warning, critical
    expect(statuses).toContain('ok');
    expect(statuses).toContain('warning');
    expect(statuses).toContain('critical');
  });

  test('กรอง date_from/date_to → คืนเฉพาะช่วงที่กำหนด', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/check/log?date_from=2020-02-01&date_to=2020-02-02', ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    rows.forEach(row => {
      expect(row.created_at >= '2020-02-01').toBe(true);
    });
  });

  test('ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/check/log`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 3. Inspection Alerts — แจ้งเตือนจากการตรวจสภาพ (Auth)
//    GET /api/check/alerts
//    PUT /api/check/alerts/:id/resolve
// ══════════════════════════════════════════════════════════
test.describe('3. Inspection Alerts — แจ้งเตือนตรวจสภาพ', () => {
  test('ดึง alerts ที่ยังไม่ได้ resolve → array', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/check/alerts', ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
  });

  test('alerts มี entry จากการตรวจสภาพที่พบปัญหา', async () => {
    if (!ctx.checkCarId || !ctx.adminToken) return;
    const r = await apiGet('/api/check/alerts', ctx.adminToken);
    expect(r?.success).toBe(true);
    const alerts = r?.data || [];
    const ourAlerts = alerts.filter(a => a.car_id === ctx.checkCarId);
    // group 1 สร้าง 2 alerts (warning + critical)
    expect(ourAlerts.length).toBeGreaterThanOrEqual(2);
    // เก็บ ID สำหรับทดสอบ resolve
    ctx.alertId = ourAlerts[0].id;
    // ตรวจ risk_level: critical → 'high', warning → 'medium'
    const riskLevels = ourAlerts.map(a => a.risk_level);
    expect(riskLevels).toContain('high');
    expect(riskLevels).toContain('medium');
  });

  test('resolve alert → สำเร็จ', async () => {
    if (!ctx.alertId || !ctx.adminToken) return;
    const r = await apiPut(`/api/check/alerts/${ctx.alertId}/resolve`, {}, ctx.adminToken);
    expect(r?.success).toBe(true);
  });

  test('หลัง resolve แล้ว — alert ไม่อยู่ใน unresolved list', async () => {
    if (!ctx.alertId || !ctx.adminToken) return;
    const r = await apiGet('/api/check/alerts', ctx.adminToken);
    const unresolvedIds = (r?.data || []).map(a => a.id);
    expect(unresolvedIds).not.toContain(ctx.alertId);
  });

  test('ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/check/alerts`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 4. แจ้งซ่อม — สร้าง Repair Request
//    POST /api/repair/log (ต้องมี auth)
// ══════════════════════════════════════════════════════════
test.describe('4. แจ้งซ่อม — สร้าง Repair Request', () => {
  test('สร้าง repair request → status: requested', async () => {
    if (!ctx.repairCar1Id || !ctx.adminToken) return;
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.repairCar1Id,
      issue_description: 'เครื่องยนต์มีเสียงดังผิดปกติ ต้องตรวจสอบ',
      mileage_at_repair: 50000,
      reporter_name: 'ผู้แจ้งซ่อมทดสอบ',
      date_reported: '2020-02-10',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.repairId = r.data.id;
  });

  test('GET /api/repair/log → รายการมี repair ที่เพิ่งสร้าง', async () => {
    if (!ctx.repairId || !ctx.adminToken) return;
    const r = await apiGet('/api/repair/log', ctx.adminToken);
    expect(r?.success).toBe(true);
    const ids = (r?.data || []).map(x => x.id);
    expect(ids).toContain(ctx.repairId);
  });

  test('GET /api/repair/log/:id → details ถูกต้อง', async () => {
    if (!ctx.repairId || !ctx.adminToken) return;
    const r = await apiGet(`/api/repair/log/${ctx.repairId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBe(ctx.repairId);
    expect(r?.data?.status).toBe('requested');
    expect(r?.data?.car_id).toBe(ctx.repairCar1Id);
    expect(r?.data?.issue_description).toBe('เครื่องยนต์มีเสียงดังผิดปกติ ต้องตรวจสอบ');
    expect(r?.data?.mileage_at_repair).toBe(50000);
  });

  test('POST ไม่ส่ง car_id → error', async () => {
    if (!ctx.adminToken) return;
    const r = await apiPost('/api/repair/log', {
      issue_description: 'ซ่อมโดยไม่รู้ว่าเป็นรถอะไร',
    }, ctx.adminToken);
    expect(r?.success).toBe(false);
  });

  test('POST ไม่มี token → 401', async () => {
    if (!ctx.repairCar1Id) return;
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.repairCar1Id,
      issue_description: 'ทดสอบไม่มี token',
    });
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 5. Repair Workflow สมบูรณ์
//    request → approve → inspect → document → start-repair → complete
// ══════════════════════════════════════════════════════════
test.describe('5. Repair Workflow สมบูรณ์', () => {
  test('อนุมัติแจ้งซ่อม (approve) → status: approved', async () => {
    if (!ctx.repairId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairId}/approve`, {}, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('approved');
  });

  test('ลอง approve ซ้ำ (ไม่ใช่ requested) → error', async () => {
    if (!ctx.repairId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairId}/approve`, {}, ctx.adminToken);
    expect(r?.success).toBe(false);
  });

  test('บันทึกตรวจสภาพ+ใบเสนอราคา (inspect) → status: inspected', async () => {
    if (!ctx.repairId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairId}/inspect`, {
      inspection_date: '2020-02-11',
      inspection_notes: 'ตรวจพบปัญหาที่ฝาสูบ ประเมินราคา 15,000 บาท',
      garage_name: 'ศูนย์บริการ Toyota ABC',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('inspected');
    expect(check?.data?.garage_name).toBe('ศูนย์บริการ Toyota ABC');
  });

  test('ทำบันทึกข้อความ (document) → status: documented', async () => {
    if (!ctx.repairId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairId}/document`, {
      memo_notes: 'อนุมัติดำเนินการซ่อมตามใบเสนอราคา 15,000 บาท',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('documented');
  });

  test('เริ่มซ่อม (start-repair) → status: repairing + รถ under_repair', async () => {
    if (!ctx.repairId || !ctx.repairCar1Id || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairId}/start-repair`, {
      date_started: '2020-02-12',
      garage_name: 'ศูนย์บริการ Toyota ABC',
      cost: 15000,
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('repairing');
    // รถต้องถูกเปลี่ยนสถานะเป็น under_repair
    const carInfo = await apiGet(`/api/vehicles/${ctx.repairCar1Id}`, ctx.adminToken);
    expect(carInfo?.data?.status).toBe('under_repair');
  });

  test('บันทึกซ่อมเสร็จ (complete) → status: completed + รถกลับ active', async () => {
    if (!ctx.repairId || !ctx.repairCar1Id || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairId}/complete`, {
      date_completed: '2020-02-13',
      cost: 14500,
      mileage_out: 50200,
      mechanic_name: 'ช่างสมชาย',
      notes: 'ซ่อมเสร็จเรียบร้อย เปลี่ยนฝาสูบใหม่แล้ว',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('completed');
    expect(check?.data?.cost).toBe(14500);
    expect(check?.data?.mechanic_name).toBe('ช่างสมชาย');
    // รถต้องกลับเป็น active
    const carInfo = await apiGet(`/api/vehicles/${ctx.repairCar1Id}`, ctx.adminToken);
    expect(carInfo?.data?.status).toBe('active');
  });
});

// ══════════════════════════════════════════════════════════
// 6. Repair Reject Flow
//    request → reject
// ══════════════════════════════════════════════════════════
test.describe('6. Repair Reject Flow', () => {
  test('สร้าง repair request สำหรับทดสอบ reject', async () => {
    if (!ctx.repairCar2Id || !ctx.adminToken) return;
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.repairCar2Id,
      issue_description: 'ทดสอบการปฏิเสธแจ้งซ่อม',
      mileage_at_repair: 30000,
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.repairRejectId = r.data.id;
  });

  test('ปฏิเสธแจ้งซ่อม (reject) พร้อม reason → status: rejected', async () => {
    if (!ctx.repairRejectId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairRejectId}/reject`, {
      reason: 'ยังไม่ถึงกำหนดซ่อม ให้ใช้งานต่อไปก่อน 10,000 กม.',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairRejectId}`, ctx.adminToken);
    expect(check?.data?.status).toBe('rejected');
    expect(check?.data?.rejection_reason).toBe('ยังไม่ถึงกำหนดซ่อม ให้ใช้งานต่อไปก่อน 10,000 กม.');
  });

  test('ลอง approve หลัง reject แล้ว → error (ไม่ใช่ requested)', async () => {
    if (!ctx.repairRejectId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairRejectId}/approve`, {}, ctx.adminToken);
    expect(r?.success).toBe(false);
  });

  test('reject โดยไม่ส่ง reason → สำเร็จ (reason เป็น optional)', async () => {
    if (!ctx.repairCar2Id || !ctx.adminToken) return;
    const newReq = await apiPost('/api/repair/log', {
      car_id: ctx.repairCar2Id,
      issue_description: 'ทดสอบ reject ไม่มี reason',
    }, ctx.adminToken);
    if (!newReq?.data?.id) return;
    const r = await apiPut(`/api/repair/log/${newReq.data.id}/reject`, {}, ctx.adminToken);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 7. Repair Update & Delete
//    PUT /api/repair/log/:id
//    DELETE /api/repair/log/:id
// ══════════════════════════════════════════════════════════
test.describe('7. Repair Update & Delete', () => {
  test('สร้าง repair request สำหรับ update/delete', async () => {
    if (!ctx.repairCar2Id || !ctx.adminToken) return;
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.repairCar2Id,
      issue_description: 'ทดสอบ update และ delete',
      mileage_at_repair: 20000,
      garage_name: 'อู่เก่า',
      notes: 'หมายเหตุเดิม',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.repairUpdateId = r.data.id;
  });

  test('PUT อัปเดต garage_name และ notes → สำเร็จ + ข้อมูลเปลี่ยน', async () => {
    if (!ctx.repairUpdateId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairUpdateId}`, {
      garage_name: 'อู่ใหม่กว่า',
      notes: 'เพิ่มหมายเหตุใหม่',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairUpdateId}`, ctx.adminToken);
    expect(check?.data?.garage_name).toBe('อู่ใหม่กว่า');
    expect(check?.data?.notes).toBe('เพิ่มหมายเหตุใหม่');
  });

  test('DELETE repair → สำเร็จ + record หายไป', async () => {
    if (!ctx.repairUpdateId || !ctx.adminToken) return;
    const r = await apiDelete(`/api/repair/log/${ctx.repairUpdateId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    // ตรวจว่าหายไปแล้ว
    const check = await apiGet(`/api/repair/log/${ctx.repairUpdateId}`, ctx.adminToken);
    expect(check?.success).toBe(false);
  });

  test('DELETE ไม่มี token → 401', async () => {
    const r = await apiDelete('/api/repair/log/some-fake-id-xyz');
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 8. Repair พร้อม items_detail (รายการอะไหล่)
//    POST /api/repair/log + GET items
// ══════════════════════════════════════════════════════════
test.describe('8. Repair พร้อม items_detail (รายการอะไหล่)', () => {
  test('สร้าง repair พร้อม items_detail → สำเร็จ', async () => {
    if (!ctx.repairCar2Id || !ctx.adminToken) return;
    const r = await apiPost('/api/repair/log', {
      car_id: ctx.repairCar2Id,
      issue_description: 'เปลี่ยนชิ้นส่วนตามรายการ',
      items_detail: [
        {
          description: 'น้ำมันเครื่อง 10W-30',
          part_code: '08880-01806',
          quantity: 4,
          unit_price: 250,
          net_amount: 1000,
          item_type: 'part',
        },
        {
          description: 'ไส้กรองน้ำมันเครื่อง',
          part_code: '90915-YZZD2',
          quantity: 1,
          unit_price: 180,
          net_amount: 180,
          item_type: 'part',
        },
      ],
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.repairItemsId = r.data.id;
  });

  test('GET /api/repair/log/:id → มี items_detail ใน response', async () => {
    if (!ctx.repairItemsId || !ctx.adminToken) return;
    const r = await apiGet(`/api/repair/log/${ctx.repairItemsId}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data?.items_detail)).toBe(true);
    expect(r?.data?.items_detail?.length).toBe(2);
    const descs = r.data.items_detail.map(it => it.description);
    expect(descs).toContain('น้ำมันเครื่อง 10W-30');
    expect(descs).toContain('ไส้กรองน้ำมันเครื่อง');
  });

  test('GET /api/repair/log/:id/items → รายการอะไหล่ถูกต้อง', async () => {
    if (!ctx.repairItemsId || !ctx.adminToken) return;
    const r = await apiGet(`/api/repair/log/${ctx.repairItemsId}/items`, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(Array.isArray(r?.data)).toBe(true);
    expect(r?.data?.length).toBe(2);
    expect(r?.data?.[0]?.description).toBe('น้ำมันเครื่อง 10W-30');
    expect(r?.data?.[0]?.part_code).toBe('08880-01806');
    expect(r?.data?.[0]?.quantity).toBe(4);
  });

  test('PUT อัปเดต items_detail → รายการเก่าถูกแทนที่', async () => {
    if (!ctx.repairItemsId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/log/${ctx.repairItemsId}`, {
      items_detail: [
        {
          description: 'หัวเทียน Iridium',
          part_code: 'SPARK-IRD-001',
          quantity: 4,
          unit_price: 350,
          net_amount: 1400,
        },
      ],
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    const check = await apiGet(`/api/repair/log/${ctx.repairItemsId}`, ctx.adminToken);
    // รายการเดิม (2 items) ถูกแทนที่ด้วยรายการใหม่ (1 item)
    expect(check?.data?.items_detail?.length).toBe(1);
    expect(check?.data?.items_detail?.[0]?.description).toBe('หัวเทียน Iridium');
  });
});

// ══════════════════════════════════════════════════════════
// 9. Repair — กรองรายการ
//    GET /api/repair/log?car_id=&status=
// ══════════════════════════════════════════════════════════
test.describe('9. Repair — กรองรายการ', () => {
  test('GET ?car_id= → เฉพาะรถที่ระบุ', async () => {
    if (!ctx.repairCar1Id || !ctx.adminToken) return;
    const r = await apiGet(`/api/repair/log?car_id=${ctx.repairCar1Id}`, ctx.adminToken);
    expect(r?.success).toBe(true);
    const rows = r?.data || [];
    rows.forEach(row => expect(row.car_id).toBe(ctx.repairCar1Id));
    // REP-001 ผ่าน full workflow → มี 1 record ที่ completed
    const statuses = rows.map(x => x.status);
    expect(statuses).toContain('completed');
  });

  test('GET ?status=completed → เฉพาะที่ completed', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/repair/log?status=completed', ctx.adminToken);
    expect(r?.success).toBe(true);
    (r?.data || []).forEach(row => expect(row.status).toBe('completed'));
  });

  test('GET ?status=requested → เฉพาะที่ requested', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/repair/log?status=requested', ctx.adminToken);
    expect(r?.success).toBe(true);
    (r?.data || []).forEach(row => expect(row.status).toBe('requested'));
  });
});

// ══════════════════════════════════════════════════════════
// 10. Scheduled Repairs — กำหนดการซ่อม
//     GET/POST /api/repair/scheduled
//     PUT /api/repair/scheduled/:id
// ══════════════════════════════════════════════════════════
test.describe('10. Scheduled Repairs — กำหนดการซ่อม', () => {
  test('สร้าง scheduled repair → สำเร็จ', async () => {
    if (!ctx.repairCar1Id || !ctx.adminToken) return;
    const r = await apiPost('/api/repair/scheduled', {
      car_id: ctx.repairCar1Id,
      repair_type: 'เช็คระยะ 60,000 กม.',
      scheduled_date: futureDate(30),
      notes: 'ตรวจเช็คตามระยะและเปลี่ยนน้ำมันเครื่อง',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
    expect(r?.data?.id).toBeTruthy();
    ctx.scheduledRepairId = r.data.id;
  });

  test('GET /api/repair/scheduled → รายการมี entry ที่สร้าง', async () => {
    if (!ctx.scheduledRepairId || !ctx.adminToken) return;
    const r = await apiGet('/api/repair/scheduled', ctx.adminToken);
    expect(r?.success).toBe(true);
    const ids = (r?.data || []).map(x => x.id);
    expect(ids).toContain(ctx.scheduledRepairId);
  });

  test('GET ?status=pending → เฉพาะ pending', async () => {
    if (!ctx.adminToken) return;
    const r = await apiGet('/api/repair/scheduled?status=pending', ctx.adminToken);
    expect(r?.success).toBe(true);
    (r?.data || []).forEach(row => expect(row.status).toBe('pending'));
  });

  test('PUT อัปเดต status → สำเร็จ', async () => {
    if (!ctx.scheduledRepairId || !ctx.adminToken) return;
    const r = await apiPut(`/api/repair/scheduled/${ctx.scheduledRepairId}`, {
      notes: 'เลื่อนกำหนดซ่อม',
    }, ctx.adminToken);
    expect(r?.success).toBe(true);
  });

  test('POST ไม่มี car_id → error', async () => {
    if (!ctx.adminToken) return;
    const r = await apiPost('/api/repair/scheduled', {
      repair_type: 'ไม่มีรถ',
      scheduled_date: futureDate(7),
    }, ctx.adminToken);
    expect(r?.success).toBe(false);
  });

  test('ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/repair/scheduled`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// 11. Repair Permissions
// ══════════════════════════════════════════════════════════
test.describe('11. Repair & Check Permissions', () => {
  test('POST /api/repair/log ไม่มี token → 401', async () => {
    if (!ctx.repairCar1Id) return;
    const r = await fetch(`${BASE}/api/repair/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car_id: ctx.repairCar1Id, issue_description: 'ทดสอบ' }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('GET /api/repair/log ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/repair/log`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('GET /api/check/log ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/check/log`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('GET /api/check/alerts ไม่มี token → 401', async () => {
    const r = await fetch(`${BASE}/api/check/alerts`).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(false);
  });

  test('POST /api/check/daily ไม่มี token → สำเร็จ (PUBLIC endpoint)', async () => {
    const r = await fetch(`${BASE}/api/check/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car_id: 'CHECK-001' }),
    }).then(x => x.json()).catch(() => null);
    expect(r?.success).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// 12. UI Tests — โหลดหน้าเว็บ
// ══════════════════════════════════════════════════════════
test.describe('12. UI Tests — โหลดหน้าเว็บ', () => {
  test('repair.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
    const r = await page.goto(`${BASE}/repair.html`);
    expect(r?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/.+/);
  });

  test('qr-daily-check.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
    const r = await page.goto(`${BASE}/qr-daily-check.html`);
    expect(r?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/.+/);
  });

  test('qr-daily-check.html มีเนื้อหาหน้า (body ไม่ว่าง)', async ({ page }) => {
    await page.goto(`${BASE}/qr-daily-check.html`);
    const body = await page.evaluate(() => document.body.innerHTML);
    expect(body.length).toBeGreaterThan(100);
  });

  test('repair.html มีเนื้อหาหน้า (body ไม่ว่าง)', async ({ page }) => {
    await page.goto(`${BASE}/repair.html`);
    const body = await page.evaluate(() => document.body.innerHTML);
    expect(body.length).toBeGreaterThan(100);
  });
});
