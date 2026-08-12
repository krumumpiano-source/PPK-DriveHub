# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\check-repair.spec.mjs >> 1. Daily Check — บันทึกตรวจสภาพ (Public) >> บันทึก check_type: shift_start → สำเร็จ
- Location: tests\e2e\check-repair.spec.mjs:181:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  90  |   ]) {
  91  |     const r = await apiPost('/api/auth/login', cred);
  92  |     if (r?.data?.token) { ctx.adminToken = r.data.token; break; }
  93  |     clearRateLimits();
  94  |   }
  95  | 
  96  |   if (!ctx.adminToken) {
  97  |     const check = await apiGet('/api/setup');
  98  |     if (check?.data?.needs_setup) {
  99  |       await apiPost('/api/setup', {
  100 |         username: 'testadmin', password: 'Admin@5678',
  101 |         first_name: 'Test', last_name: 'Admin', email: 'testadmin@ppk.test',
  102 |       });
  103 |       clearRateLimits();
  104 |       const r = await apiPost('/api/auth/login', { username: 'testadmin', password: 'Admin@5678' });
  105 |       if (r?.data?.token) ctx.adminToken = r.data.token;
  106 |     }
  107 |   }
  108 |   if (!ctx.adminToken) throw new Error('[check-repair.spec] Cannot obtain admin token');
  109 | 
  110 |   // 2. สร้างรถทดสอบ — idempotent (ตรวจก่อนสร้าง)
  111 |   async function createCar(plate) {
  112 |     const existing = await apiGet(`/api/vehicles/qr-info?car_id=${encodeURIComponent(plate)}`);
  113 |     if (existing?.success && existing?.data?.id) return existing.data.id;
  114 |     const r = await apiPost('/api/vehicles', {
  115 |       license_plate: plate, brand: 'Toyota', model: 'Commuter',
  116 |       fuel_type: 'diesel', status: 'active',
  117 |     }, ctx.adminToken);
  118 |     clearRateLimits();
  119 |     return r?.data?.id || r?.id || '';
  120 |   }
  121 | 
  122 |   ctx.checkCarId   = await createCar('CHECK-001');
  123 |   ctx.repairCar1Id = await createCar('REP-001');
  124 |   ctx.repairCar2Id = await createCar('REP-002');
  125 | 
  126 |   if (!ctx.checkCarId)   throw new Error('[check-repair.spec] Cannot create CHECK-001');
  127 |   if (!ctx.repairCar1Id) throw new Error('[check-repair.spec] Cannot create REP-001');
  128 |   if (!ctx.repairCar2Id) throw new Error('[check-repair.spec] Cannot create REP-002');
  129 | });
  130 | 
  131 | // ══════════════════════════════════════════════════════════
  132 | // 1. Daily Check — บันทึกตรวจสภาพประจำวัน (PUBLIC)
  133 | //    POST /api/check/daily — ไม่ต้อง token
  134 | // ══════════════════════════════════════════════════════════
  135 | test.describe('1. Daily Check — บันทึกตรวจสภาพ (Public)', () => {
  136 |   test('บันทึกตรวจสภาพแบบ minimal (car_id เท่านั้น) → สำเร็จ', async () => {
  137 |     if (!ctx.checkCarId) return;
  138 |     const r = await apiPost('/api/check/daily', { car_id: ctx.checkCarId });
  139 |     expect(r?.success).toBe(true);
  140 |     expect(r?.data?.id).toBeTruthy();
  141 |   });
  142 | 
  143 |   test('บันทึกตรวจสภาพพร้อมรายละเอียดครบทุก field → สำเร็จ', async () => {
  144 |     if (!ctx.checkCarId) return;
  145 |     const r = await apiPost('/api/check/daily', {
  146 |       car_id: ctx.checkCarId,
  147 |       inspector_name: 'นายช่างทดสอบ',
  148 |       date: '2020-02-01',
  149 |       time: '07:30',
  150 |       overall_status: 'ok',
  151 |       tire_condition: 'ok',
  152 |       brake_condition: 'ok',
  153 |       light_condition: 'ok',
  154 |       fuel_level: 'full',
  155 |       mileage: 12000,
  156 |       check_type: 'daily',
  157 |       notes: 'ตรวจเรียบร้อย ไม่พบความผิดปกติ',
  158 |     });
  159 |     expect(r?.success).toBe(true);
  160 |     expect(r?.data?.id).toBeTruthy();
  161 |   });
  162 | 
  163 |   test('บันทึกด้วย license_plate แทน UUID → สำเร็จ', async () => {
  164 |     const r = await apiPost('/api/check/daily', {
  165 |       car_id: 'CHECK-001',
  166 |       inspector_name: 'QR Scanner User',
  167 |     });
  168 |     expect(r?.success).toBe(true);
  169 |     expect(r?.data?.id).toBeTruthy();
  170 |   });
  171 | 
  172 |   test('ไม่ต้องมี token (PUBLIC endpoint) → สำเร็จ', async () => {
  173 |     const r = await fetch(`${BASE}/api/check/daily`, {
  174 |       method: 'POST',
  175 |       headers: { 'Content-Type': 'application/json' },
  176 |       body: JSON.stringify({ car_id: 'CHECK-001', inspector_name: 'Unauthenticated User' }),
  177 |     }).then(x => x.json()).catch(() => null);
  178 |     expect(r?.success).toBe(true);
  179 |   });
  180 | 
  181 |   test('บันทึก check_type: shift_start → สำเร็จ', async () => {
  182 |     if (!ctx.checkCarId) return;
  183 |     const r = await apiPost('/api/check/daily', {
  184 |       car_id: ctx.checkCarId,
  185 |       check_type: 'shift_start',
  186 |       inspector_name: 'พนักงานกะเช้า',
  187 |       date: '2020-02-01',
  188 |       time: '06:00',
  189 |     });
> 190 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  191 |   });
  192 | 
  193 |   test('บันทึกสถานะ warning + issue_description → สำเร็จ + สร้าง alert', async () => {
  194 |     if (!ctx.checkCarId) return;
  195 |     const r = await apiPost('/api/check/daily', {
  196 |       car_id: ctx.checkCarId,
  197 |       overall_status: 'warning',
  198 |       issue_description: 'ยางล้อหน้าเริ่มสึก ควรเปลี่ยน',
  199 |       inspector_name: 'ช่างตรวจประจำวัน',
  200 |       date: '2020-02-02',
  201 |       time: '08:00',
  202 |     });
  203 |     expect(r?.success).toBe(true);
  204 |     expect(r?.data?.id).toBeTruthy();
  205 |   });
  206 | 
  207 |   test('issues_found: true → override เป็น critical + สร้าง alert', async () => {
  208 |     if (!ctx.checkCarId) return;
  209 |     const r = await apiPost('/api/check/daily', {
  210 |       car_id: ctx.checkCarId,
  211 |       // overall_status: 'ok' จะถูก override เป็น 'critical' เพราะ issues_found: true
  212 |       overall_status: 'ok',
  213 |       issues_found: true,
  214 |       issue_description: 'เบรกหลังชำรุด ห้ามใช้รถจนกว่าจะซ่อม',
  215 |       inspector_name: 'หัวหน้าช่าง',
  216 |       date: '2020-02-02',
  217 |       time: '09:00',
  218 |     });
  219 |     expect(r?.success).toBe(true);
  220 |     expect(r?.data?.id).toBeTruthy();
  221 |   });
  222 | 
  223 |   test('overall_status ไม่ถูกต้อง → normalize เป็น ok', async () => {
  224 |     if (!ctx.checkCarId) return;
  225 |     // API normalizes invalid values to 'ok'
  226 |     const r = await apiPost('/api/check/daily', {
  227 |       car_id: ctx.checkCarId,
  228 |       overall_status: 'BAD_VALUE_XYZ',
  229 |     });
  230 |     expect(r?.success).toBe(true);
  231 |   });
  232 | 
  233 |   test('ไม่ส่ง car_id → error', async () => {
  234 |     const r = await apiPost('/api/check/daily', { inspector_name: 'คนตรวจ', overall_status: 'ok' });
  235 |     expect(r?.success).toBe(false);
  236 |   });
  237 | 
  238 |   test('car_id ไม่มีในระบบ → error', async () => {
  239 |     const r = await apiPost('/api/check/daily', { car_id: 'NON-EXISTENT-PLATE-9999X' });
  240 |     expect(r?.success).toBe(false);
  241 |   });
  242 | });
  243 | 
  244 | // ══════════════════════════════════════════════════════════
  245 | // 2. Check Log — ประวัติการตรวจสภาพ (Auth)
  246 | //    GET /api/check/log
  247 | // ══════════════════════════════════════════════════════════
  248 | test.describe('2. Check Log — ประวัติการตรวจสภาพ', () => {
  249 |   test('ดึง check log ทั้งหมด → success + array', async () => {
  250 |     if (!ctx.adminToken) return;
  251 |     const r = await apiGet('/api/check/log', ctx.adminToken);
  252 |     expect(r?.success).toBe(true);
  253 |     expect(Array.isArray(r?.data)).toBe(true);
  254 |     expect(r?.data?.length).toBeGreaterThanOrEqual(1);
  255 |   });
  256 | 
  257 |   test('ดึง check log กรอง car_id → เฉพาะรถที่ระบุ', async () => {
  258 |     if (!ctx.checkCarId || !ctx.adminToken) return;
  259 |     const r = await apiGet(`/api/check/log?car_id=${ctx.checkCarId}`, ctx.adminToken);
  260 |     expect(r?.success).toBe(true);
  261 |     const rows = r?.data || [];
  262 |     expect(rows.length).toBeGreaterThanOrEqual(1);
  263 |     rows.forEach(row => expect(row.car_id).toBe(ctx.checkCarId));
  264 |   });
  265 | 
  266 |   test('check log มี overall_status หลายแบบจาก test ก่อนหน้า', async () => {
  267 |     if (!ctx.checkCarId || !ctx.adminToken) return;
  268 |     const r = await apiGet(`/api/check/log?car_id=${ctx.checkCarId}`, ctx.adminToken);
  269 |     expect(r?.success).toBe(true);
  270 |     const statuses = (r?.data || []).map(x => x.overall_status);
  271 |     // ใน group 1 มีการบันทึก ok, warning, critical
  272 |     expect(statuses).toContain('ok');
  273 |     expect(statuses).toContain('warning');
  274 |     expect(statuses).toContain('critical');
  275 |   });
  276 | 
  277 |   test('กรอง date_from/date_to → คืนเฉพาะช่วงที่กำหนด', async () => {
  278 |     if (!ctx.adminToken) return;
  279 |     const r = await apiGet('/api/check/log?date_from=2020-02-01&date_to=2020-02-02', ctx.adminToken);
  280 |     expect(r?.success).toBe(true);
  281 |     const rows = r?.data || [];
  282 |     rows.forEach(row => {
  283 |       expect(row.created_at >= '2020-02-01').toBe(true);
  284 |     });
  285 |   });
  286 | 
  287 |   test('ไม่มี token → 401', async () => {
  288 |     const r = await fetch(`${BASE}/api/check/log`).then(x => x.json()).catch(() => null);
  289 |     expect(r?.success).toBe(false);
  290 |   });
```