# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\qr-scan.spec.mjs >> 2. Public QR — สถานะล่าสุดของรถ (latest-status) >> รถใหม่ที่ยังไม่มีบันทึก → status: unknown
- Location: tests\e2e\qr-scan.spec.mjs:232:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  135 |     // ตรวจว่ามีอยู่แล้วหรือไม่ (qr-info ค้นหาด้วย license_plate ได้)
  136 |     const existing = await apiGet(`/api/vehicles/qr-info?car_id=${encodeURIComponent(plate)}`);
  137 |     if (existing?.success && existing?.data?.id) return existing.data.id;
  138 |     const r = await apiPost('/api/vehicles', {
  139 |       license_plate: plate, brand: 'Toyota', model: 'Commuter',
  140 |       fuel_type: 'diesel', status: 'active',
  141 |     }, ctx.adminToken);
  142 |     clearRateLimits();
  143 |     return r?.data?.id || r?.id || '';
  144 |   }
  145 | 
  146 |   ctx.carId        = await createCar('QR-001');
  147 |   ctx.carAutoHealId = await createCar('QR-002');
  148 |   ctx.carAutoDepId  = await createCar('QR-003');
  149 |   ctx.carManualId   = await createCar('QR-004');
  150 |   ctx.carQueueId    = await createCar('QR-005');
  151 | 
  152 |   if (!ctx.carId) throw new Error('[qr-scan.spec] Cannot create main test car');
  153 | 
  154 |   // 3. สร้างพนักงานขับรถ 2 คน — idempotent
  155 |   async function createDriver(firstName, licNum) {
  156 |     // ตรวจว่ามีอยู่แล้วหรือไม่
  157 |     const existing = await apiGet(`/api/drivers?search=${encodeURIComponent(licNum)}`, ctx.adminToken);
  158 |     const found = (existing?.data?.drivers || []).find(d => d.license_number === licNum);
  159 |     if (found) return found.id;
  160 |     const r = await apiPost('/api/drivers', {
  161 |       first_name: firstName, last_name: 'ทดสอบQR',
  162 |       license_number: licNum,
  163 |       license_expiry: futureDate(365),
  164 |       phone: '0811111111', status: 'active',
  165 |     }, ctx.adminToken);
  166 |     clearRateLimits();
  167 |     return r?.data?.id || r?.id || '';
  168 |   }
  169 | 
  170 |   ctx.driverId         = await createDriver('หลัก', 'QR-DRV-001');
  171 |   ctx.driverAutoHealId = await createDriver('ออโต้', 'QR-DRV-002');
  172 | 
  173 |   if (!ctx.driverId) throw new Error('[qr-scan.spec] Cannot create test driver');
  174 | 
  175 |   // 4. สร้างคิวสำหรับ queue-linked test
  176 |   const qr = await apiPost('/api/queue', {
  177 |     car_id: ctx.carQueueId,
  178 |     driver_id: ctx.driverId,
  179 |     date: futureDate(7),
  180 |     time_start: '08:00', time_end: '12:00',
  181 |     mission: 'ทดสอบ QR linked', destination: 'สำนักงาน',
  182 |   }, ctx.adminToken);
  183 |   clearRateLimits();
  184 |   ctx.queueId = qr?.data?.id || '';
  185 | });
  186 | 
  187 | // ══════════════════════════════════════════════════════════
  188 | // 1. Public QR — ข้อมูลรถ (/api/vehicles/qr-info)
  189 | // PUBLIC endpoint — ไม่ต้องมี token
  190 | // ══════════════════════════════════════════════════════════
  191 | test.describe('1. Public QR — ข้อมูลรถ (qr-info)', () => {
  192 |   test('ดึงข้อมูลรถด้วย car_id สำเร็จ', async () => {
  193 |     if (!ctx.carId) return;
  194 |     const r = await apiGet(`/api/vehicles/qr-info?car_id=${ctx.carId}`);
  195 |     expect(r?.success).toBe(true);
  196 |     expect(r?.data?.id).toBe(ctx.carId);
  197 |     expect(r?.data?.license_plate).toBe('QR-001');
  198 |     expect(r?.data?.fuel_type).toBe('diesel');
  199 |     expect(r?.data?.brand).toBe('Toyota');
  200 |   });
  201 | 
  202 |   test('ดึงข้อมูลรถด้วย license_plate สำเร็จ', async () => {
  203 |     const r = await apiGet('/api/vehicles/qr-info?car_id=QR-001');
  204 |     expect(r?.success).toBe(true);
  205 |     expect(r?.data?.license_plate).toBe('QR-001');
  206 |   });
  207 | 
  208 |   test('car_id ไม่ถูกต้อง → ไม่พบ', async () => {
  209 |     const r = await apiGet('/api/vehicles/qr-info?car_id=NON-EXISTENT-CAR-XYZ');
  210 |     expect(r?.success).toBe(false);
  211 |   });
  212 | 
  213 |   test('ไม่ส่ง car_id → error', async () => {
  214 |     const r = await apiGet('/api/vehicles/qr-info');
  215 |     expect(r?.success).toBe(false);
  216 |   });
  217 | 
  218 |   test('ไม่ต้องมี token (PUBLIC endpoint)', async () => {
  219 |     if (!ctx.carId) return;
  220 |     // เรียกโดยไม่มี Authorization header
  221 |     const r = await fetch(`${BASE}/api/vehicles/qr-info?car_id=${ctx.carId}`)
  222 |       .then(x => x.json()).catch(() => null);
  223 |     expect(r?.success).toBe(true);
  224 |   });
  225 | });
  226 | 
  227 | // ══════════════════════════════════════════════════════════
  228 | // 2. Public QR — สถานะล่าสุดของรถ (/api/usage/latest-status)
  229 | // PUBLIC endpoint — ไม่ต้องมี token
  230 | // ══════════════════════════════════════════════════════════
  231 | test.describe('2. Public QR — สถานะล่าสุดของรถ (latest-status)', () => {
  232 |   test('รถใหม่ที่ยังไม่มีบันทึก → status: unknown', async () => {
  233 |     if (!ctx.carId) return;
  234 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
> 235 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  236 |     expect(r?.data?.status).toBe('unknown');
  237 |     expect(r?.data?.mileage).toBeNull();
  238 |     expect(r?.data?.datetime).toBeNull();
  239 |   });
  240 | 
  241 |   test('ไม่ส่ง car_id → error', async () => {
  242 |     const r = await apiGet('/api/usage/latest-status');
  243 |     expect(r?.success).toBe(false);
  244 |   });
  245 | 
  246 |   test('ไม่ต้องมี token (PUBLIC endpoint)', async () => {
  247 |     if (!ctx.carId) return;
  248 |     const r = await fetch(`${BASE}/api/usage/latest-status?car_id=${ctx.carId}`)
  249 |       .then(x => x.json()).catch(() => null);
  250 |     expect(r?.success).toBe(true);
  251 |   });
  252 | });
  253 | 
  254 | // ══════════════════════════════════════════════════════════
  255 | // 3. Validation — POST /api/usage/record
  256 | // ══════════════════════════════════════════════════════════
  257 | test.describe('3. Validation — POST /api/usage/record', () => {
  258 |   test('ไม่มี car_id → error', async () => {
  259 |     const r = await apiPost('/api/usage/record', {
  260 |       record_type: 'departure',
  261 |       driver_id: ctx.driverId || 'x',
  262 |     });
  263 |     expect(r?.success).toBe(false);
  264 |     expect(r?.message || r?.error).toBeTruthy();
  265 |   });
  266 | 
  267 |   test('ไม่มี record_type → error', async () => {
  268 |     if (!ctx.carId) return;
  269 |     const r = await apiPost('/api/usage/record', {
  270 |       car_id: ctx.carId,
  271 |       driver_id: ctx.driverId || 'x',
  272 |     });
  273 |     expect(r?.success).toBe(false);
  274 |   });
  275 | 
  276 |   test('ไม่มี driver_id และ driver_name_manual → error', async () => {
  277 |     if (!ctx.carId) return;
  278 |     const r = await apiPost('/api/usage/record', {
  279 |       car_id: ctx.carId,
  280 |       record_type: 'departure',
  281 |       // ไม่มี driver_id และ driver_name_manual
  282 |     });
  283 |     expect(r?.success).toBe(false);
  284 |   });
  285 | 
  286 |   test('record_type ไม่ถูกต้อง → error', async () => {
  287 |     if (!ctx.carId) return;
  288 |     const r = await apiPost('/api/usage/record', {
  289 |       car_id: ctx.carId,
  290 |       record_type: 'invalid_type_xyz',
  291 |       driver_id: ctx.driverId || 'x',
  292 |     });
  293 |     expect(r?.success).toBe(false);
  294 |   });
  295 | 
  296 |   test('เลขไมล์ติดลบ → error', async () => {
  297 |     if (!ctx.carId) return;
  298 |     const r = await apiPost('/api/usage/record', {
  299 |       car_id: ctx.carId,
  300 |       record_type: 'departure',
  301 |       driver_id: ctx.driverId || 'x',
  302 |       mileage: -500,
  303 |     });
  304 |     expect(r?.success).toBe(false);
  305 |   });
  306 | });
  307 | 
  308 | // ══════════════════════════════════════════════════════════
  309 | // 4. Flow สมบูรณ์ — บันทึกออก (departure) → บันทึกกลับ (return)
  310 | // ใช้รถ ctx.carId + ctx.driverId
  311 | // ══════════════════════════════════════════════════════════
  312 | test.describe('4. Flow สมบูรณ์ — บันทึกออกและกลับ', () => {
  313 |   test('สถานะเริ่มต้นของรถ → unknown', async () => {
  314 |     if (!ctx.carId) return;
  315 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
  316 |     expect(r?.success).toBe(true);
  317 |     expect(r?.data?.status).toBe('unknown');
  318 |   });
  319 | 
  320 |   test('บันทึกออก (departure) สมบูรณ์ — สำเร็จ ไม่มี auto_heal', async () => {
  321 |     if (!ctx.carId || !ctx.driverId) return;
  322 |     const r = await apiPost('/api/usage/record', {
  323 |       car_id: ctx.carId,
  324 |       record_type: 'departure',
  325 |       driver_id: ctx.driverId,
  326 |       datetime: DT.DEP,
  327 |       mileage: 10000,
  328 |       destination: 'สำนักงานใหญ่',
  329 |       purpose: 'ราชการ',
  330 |       requester_name: 'ผู้บันทึกทดสอบ',
  331 |     });
  332 |     expect(r?.success).toBe(true);
  333 |     expect(r?.data?.id).toBeTruthy();
  334 |     // ออกครั้งแรก — ไม่ควรมี auto_heal
  335 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
```