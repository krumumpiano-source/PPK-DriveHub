# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\queue.spec.mjs >> 1. Authentication — เข้าสู่ระบบ >> login ด้วย email+password ได้ token
- Location: tests\e2e\queue.spec.mjs:275:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "vehicle"
Received: "viewer"
```

# Test source

```ts
  182 |     ctx.carId = nc?.data?.id || '';
  183 |     clearRateLimits();
  184 |   }
  185 | 
  186 |   // 4. รถที่อยู่ระหว่างซ่อม
  187 |   const repairCar = carList.find(c => c.status === 'under_repair' && c.id !== ctx.carId);
  188 |   if (repairCar) {
  189 |     ctx.carUnderRepairId = repairCar.id;
  190 |   } else {
  191 |     const rc = await apiPost('/api/vehicles', {
  192 |       license_plate: 'ทด-Q002',
  193 |       brand: 'Toyota', model: 'Commuter',
  194 |       fuel_type: 'diesel', status: 'under_repair',
  195 |     }, ctx.adminToken);
  196 |     ctx.carUnderRepairId = rc?.data?.id || '';
  197 |     clearRateLimits();
  198 |   }
  199 | 
  200 |   // 5. เตรียมพนักงานขับรถ — active + ใบขับขี่ยังไม่หมด
  201 |   const drivers = await apiGet('/api/drivers', ctx.adminToken);
  202 |   const driverList = Array.isArray(drivers?.data) ? drivers.data
  203 |     : (Array.isArray(drivers?.data?.drivers) ? drivers.data.drivers : []);
  204 |   const activeDriver = driverList.find(d =>
  205 |     d.status === 'active' &&
  206 |     (!d.license_expiry || d.license_expiry > futureDate(30))
  207 |   );
  208 |   if (activeDriver) {
  209 |     ctx.driverId = activeDriver.id;
  210 |   } else {
  211 |     const nd = await apiPost('/api/drivers', {
  212 |       first_name: 'ขับรถ', last_name: 'ทดสอบ',
  213 |       license_number: 'Q-DRV-001',
  214 |       license_expiry: futureDate(365),
  215 |       phone: '0811111111', status: 'active',
  216 |     }, ctx.adminToken);
  217 |     ctx.driverId = nd?.data?.id || '';
  218 |     clearRateLimits();
  219 |   }
  220 | 
  221 |   // พนักงานสำรอง (ต่างจาก driver หลัก)
  222 |   const backupDriver = driverList.find(d =>
  223 |     d.status === 'active' &&
  224 |     d.id !== ctx.driverId &&
  225 |     (!d.license_expiry || d.license_expiry > futureDate(30))
  226 |   );
  227 |   if (backupDriver) {
  228 |     ctx.backupDriverId = backupDriver.id;
  229 |   } else {
  230 |     const bd = await apiPost('/api/drivers', {
  231 |       first_name: 'สำรอง', last_name: 'ทดสอบ',
  232 |       license_number: 'Q-DRV-002',
  233 |       license_expiry: futureDate(365),
  234 |       phone: '0822222222', status: 'active',
  235 |     }, ctx.adminToken);
  236 |     ctx.backupDriverId = bd?.data?.id || '';
  237 |     clearRateLimits();
  238 |   }
  239 | 
  240 |   // พนักงานขับรถใบขับขี่หมดอายุ
  241 |   const expiredDriver = driverList.find(d => d.license_expiry && d.license_expiry < new Date().toISOString().slice(0, 10));
  242 |   if (expiredDriver) {
  243 |     ctx.expiredDriverId = expiredDriver.id;
  244 |   } else {
  245 |     const ed = await apiPost('/api/drivers', {
  246 |       first_name: 'หมดอายุ', last_name: 'ทดสอบ',
  247 |       license_number: 'Q-DRV-EXP',
  248 |       license_expiry: '2020-01-01',
  249 |       phone: '0833333333', status: 'active',
  250 |     }, ctx.adminToken);
  251 |     ctx.expiredDriverId = ed?.data?.id || '';
  252 |     clearRateLimits();
  253 |   }
  254 | 
  255 |   // พนักงานขับรถ inactive
  256 |   const inactiveDriver = driverList.find(d => d.status === 'inactive');
  257 |   if (inactiveDriver) {
  258 |     ctx.inactiveDriverId = inactiveDriver.id;
  259 |   } else {
  260 |     const id = await apiPost('/api/drivers', {
  261 |       first_name: 'ปิด', last_name: 'ทดสอบ',
  262 |       license_number: 'Q-DRV-INA',
  263 |       license_expiry: futureDate(365),
  264 |       phone: '0844444444', status: 'inactive',
  265 |     }, ctx.adminToken);
  266 |     ctx.inactiveDriverId = id?.data?.id || '';
  267 |     clearRateLimits();
  268 |   }
  269 | });
  270 | 
  271 | // ══════════════════════════════════════════════════════════════
  272 | // 1. AUTHENTICATION — เข้าสู่ระบบและตรวจสอบ token
  273 | // ══════════════════════════════════════════════════════════════
  274 | test.describe('1. Authentication — เข้าสู่ระบบ', () => {
  275 |   test('login ด้วย email+password ได้ token', async () => {
  276 |     clearRateLimits();
  277 |     const r = await apiPost('/api/auth/login', {
  278 |       username: QUEUE_USER.email, password: QUEUE_USER.password,
  279 |     });
  280 |     expect(r?.success).toBe(true);
  281 |     expect(r?.data?.token).toBeTruthy();
> 282 |     expect(r?.data?.role).toBe('vehicle');
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  283 |   });
  284 | 
  285 |   test('GET /api/auth/me — ดูข้อมูลตัวเองได้', async () => {
  286 |     const r = await apiGet('/api/auth/me', ctx.queueToken);
  287 |     expect(r?.success).toBe(true);
  288 |     expect(r?.data?.email).toBe(QUEUE_USER.email);
  289 |     expect(r?.data?.role).toBe('vehicle');
  290 |   });
  291 | 
  292 |   test('login รหัสผ่านผิด → 401 / success: false', async () => {
  293 |     clearRateLimits();
  294 |     const r = await apiPost('/api/auth/login', {
  295 |       username: QUEUE_USER.email, password: 'WrongPass!999',
  296 |     });
  297 |     expect(r?.success).toBe(false);
  298 |     clearRateLimits();
  299 |   });
  300 | 
  301 |   test('ไม่มี token → GET /api/queue ต้อง 401', async () => {
  302 |     const r = await apiGet('/api/queue', '');
  303 |     expect([401, 403]).toContain(r?.status ?? (r?.success === false ? 401 : 200));
  304 |   });
  305 | });
  306 | 
  307 | // ══════════════════════════════════════════════════════════════
  308 | // 2. GET QUEUE — ดูรายการคิว
  309 | // ══════════════════════════════════════════════════════════════
  310 | test.describe('2. GET Queue — ดูรายการคิว', () => {
  311 |   test('GET /api/queue — ดูรายการคิวทั้งหมดได้', async () => {
  312 |     const r = await apiGet('/api/queue', ctx.queueToken);
  313 |     expect(r?.success).toBe(true);
  314 |     expect(Array.isArray(r?.data)).toBe(true);
  315 |   });
  316 | 
  317 |   test('GET /api/queue?status=scheduled — กรองตามสถานะได้', async () => {
  318 |     const r = await apiGet('/api/queue?status=scheduled', ctx.queueToken);
  319 |     expect(r?.success).toBe(true);
  320 |     expect(Array.isArray(r?.data)).toBe(true);
  321 |     r.data.forEach(q => expect(q.status).toBe('scheduled'));
  322 |   });
  323 | 
  324 |   test('GET /api/queue?date=YYYY-MM-DD — กรองตามวันที่ได้', async () => {
  325 |     const today = new Date().toISOString().slice(0, 10);
  326 |     const r = await apiGet(`/api/queue?date=${today}`, ctx.queueToken);
  327 |     expect(r?.success).toBe(true);
  328 |     expect(Array.isArray(r?.data)).toBe(true);
  329 |   });
  330 | 
  331 |   test('GET /api/queue?date_from&date_to — กรองช่วงวันที่ได้', async () => {
  332 |     const from = new Date().toISOString().slice(0, 10);
  333 |     const to = futureDate(30);
  334 |     const r = await apiGet(`/api/queue?date_from=${from}&date_to=${to}`, ctx.queueToken);
  335 |     expect(r?.success).toBe(true);
  336 |     expect(Array.isArray(r?.data)).toBe(true);
  337 |   });
  338 | 
  339 |   test('GET /api/queue?car_id=... — กรองตามรถได้', async () => {
  340 |     if (!ctx.carId) return;
  341 |     const r = await apiGet(`/api/queue?car_id=${ctx.carId}`, ctx.queueToken);
  342 |     expect(r?.success).toBe(true);
  343 |     expect(Array.isArray(r?.data)).toBe(true);
  344 |     r.data.forEach(q => expect(q.car_id).toBe(ctx.carId));
  345 |   });
  346 | 
  347 |   test('GET /api/queue/rules — ดูกฎคิวได้', async () => {
  348 |     const r = await apiGet('/api/queue/rules', ctx.queueToken);
  349 |     expect(r?.success).toBe(true);
  350 |     expect(r?.data).toBeDefined();
  351 |   });
  352 | });
  353 | 
  354 | // ══════════════════════════════════════════════════════════════
  355 | // 3. CREATE QUEUE — สร้างคิวใหม่
  356 | // ══════════════════════════════════════════════════════════════
  357 | test.describe('3. POST /api/queue — สร้างคิว', () => {
  358 |   test('สร้างคิวพื้นฐาน (minimal required fields) สำเร็จ', async () => {
  359 |     // หมายเหตุ: driver_id เป็น NOT NULL ใน schema → ต้องระบุเสมอ
  360 |     if (!ctx.carId || !ctx.driverId) return;
  361 |     const r = await apiPost('/api/queue', {
  362 |       car_id: ctx.carId,
  363 |       date: futureDate(5),
  364 |       time_start: '08:00',
  365 |       time_end: '12:00',
  366 |       driver_id: ctx.driverId,
  367 |       mission: 'ทดสอบสร้างคิวพื้นฐาน',
  368 |       destination: 'สำนักงาน',
  369 |     }, ctx.queueToken);
  370 |     expect(r?.success).toBe(true);
  371 |     expect(r?.data?.id).toBeTruthy();
  372 |     ctx.queueId = r.data.id;
  373 |   });
  374 | 
  375 |   test('สร้างคิวครบฟิลด์ (full fields) สำเร็จ', async () => {
  376 |     if (!ctx.carId || !ctx.driverId) return;
  377 |     const r = await apiPost('/api/queue', {
  378 |       car_id: ctx.carId,
  379 |       date: futureDate(6),
  380 |       time_start: '09:00',
  381 |       time_end: '17:00',
  382 |       driver_id: ctx.driverId,
```