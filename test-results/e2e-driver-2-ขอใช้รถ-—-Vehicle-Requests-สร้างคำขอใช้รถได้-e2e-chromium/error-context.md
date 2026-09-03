# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 2. ขอใช้รถ — Vehicle Requests >> สร้างคำขอใช้รถได้
- Location: tests\e2e\driver.spec.mjs:281:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  192 |   } else {
  193 |     ctx.driverRecordId = meCheck.data.driver_id;
  194 |   }
  195 | 
  196 |   // อัปเดต role และ reset permissions ให้ถูกต้องเสมอ (/api/auth/register สร้าง user เป็น viewer โดย default)
  197 |   if (ctx.driverUserId) {
  198 |     await apiPut(`/api/admin/users/${ctx.driverUserId}`, {
  199 |       role: DRIVER_USER.role,
  200 |       permissions: {}, // reset ให้ไม่มี extra permissions ค้าง
  201 |     }, ctx.adminToken);
  202 |     clearRateLimits();
  203 |   }
  204 | 
  205 |   // 4. หา car_id สำหรับใช้ใน test
  206 |   const cars = await apiGet('/api/vehicles', ctx.adminToken);
  207 |   const carList = Array.isArray(cars?.data) ? cars.data : (Array.isArray(cars?.data?.vehicles) ? cars.data.vehicles : []);
  208 |   if (carList.length > 0) ctx.carId = carList[0].id;
  209 | 
  210 |   // ถ้าไม่มีรถเลย → สร้างรถทดสอบ
  211 |   if (!ctx.carId) {
  212 |     const newCar = await apiPost('/api/vehicles', {
  213 |       license_plate: 'ทด-0001',
  214 |       brand: 'Toyota',
  215 |       model: 'Commuter',
  216 |       fuel_type: 'diesel',
  217 |       status: 'active',
  218 |     }, ctx.adminToken);
  219 |     ctx.carId = newCar?.data?.id || '';
  220 |     clearRateLimits();
  221 |   }
  222 | });
  223 | 
  224 | // ══════════════════════════════════════════════════════════════
  225 | // 1. AUTHENTICATION — เข้าสู่ระบบ / ออกจากระบบ
  226 | // ══════════════════════════════════════════════════════════════
  227 | test.describe('1. Authentication — เข้าสู่ระบบและตรวจสอบตัวตน', () => {
  228 |   test('login ด้วย email+password ได้ token', async () => {
  229 |     clearRateLimits();
  230 |     const r = await apiPost('/api/auth/login', {
  231 |       username: DRIVER_USER.email,
  232 |       password: DRIVER_USER.password,
  233 |     });
  234 |     expect(r?.success).toBe(true);
  235 |     expect(r?.data?.token).toBeTruthy();
  236 |     expect(r?.data?.role).toBe('driver');
  237 |   });
  238 | 
  239 |   test('GET /api/auth/me — ดูข้อมูลตัวเองได้', async () => {
  240 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  241 |     expect(r?.success).toBe(true);
  242 |     expect(r?.data?.email).toBe(DRIVER_USER.email);
  243 |     expect(r?.data?.role).toBe('driver');
  244 |   });
  245 | 
  246 |   test('driver_id ถูก link กับ user record', async () => {
  247 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  248 |     expect(r?.data?.driver_id).toBeTruthy();
  249 |   });
  250 | 
  251 |   test('logout ได้ปกติ', async () => {
  252 |     clearRateLimits();
  253 |     // ใช้ token ชั่วคราวเพื่อไม่ให้กระทบ ctx.driverToken
  254 |     const loginTmp = await apiPost('/api/auth/login', {
  255 |       username: DRIVER_USER.email,
  256 |       password: DRIVER_USER.password,
  257 |     });
  258 |     clearRateLimits();
  259 |     const tmpToken = loginTmp?.data?.token;
  260 |     if (tmpToken) {
  261 |       const r = await apiPost('/api/auth/logout', {}, tmpToken);
  262 |       expect(r?.success).toBe(true);
  263 |     }
  264 |   });
  265 | 
  266 |   test('login ด้วยรหัสผ่านผิด → 401', async () => {
  267 |     clearRateLimits();
  268 |     const r = await apiPost('/api/auth/login', {
  269 |       username: DRIVER_USER.email,
  270 |       password: 'WrongPass!999',
  271 |     });
  272 |     expect(r?.success).toBe(false);
  273 |     clearRateLimits();
  274 |   });
  275 | });
  276 | 
  277 | // ══════════════════════════════════════════════════════════════
  278 | // 2. ขอใช้รถ (VEHICLE REQUESTS)
  279 | // ══════════════════════════════════════════════════════════════
  280 | test.describe('2. ขอใช้รถ — Vehicle Requests', () => {
  281 |   test('สร้างคำขอใช้รถได้', async () => {
  282 |     const today = new Date().toISOString().slice(0, 10);
  283 |     const r = await apiPost('/api/vehicle-requests', {
  284 |       date: today,
  285 |       destination: 'โรงเรียนพะเยาพิทยาคม',
  286 |       purpose: 'ทดสอบระบบ E2E',
  287 |       time_start: '08:00',
  288 |       time_end: '12:00',
  289 |       passengers: 3,
  290 |       priority: 'general',
  291 |     }, ctx.driverToken);
> 292 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  293 |     expect(r?.data?.id).toBeTruthy();
  294 |     ctx.vehicleRequestId = r.data.id;
  295 |   });
  296 | 
  297 |   test('ดูรายการคำขอใช้รถได้', async () => {
  298 |     const r = await apiGet('/api/vehicle-requests', ctx.driverToken);
  299 |     expect(r?.success).toBe(true);
  300 |     expect(Array.isArray(r?.data)).toBe(true);
  301 |   });
  302 | 
  303 |   test('ดูคำขอของตัวเองตาม requester_id ได้', async () => {
  304 |     const r = await apiGet(`/api/vehicle-requests?requester_id=${ctx.driverUserId}`, ctx.driverToken);
  305 |     expect(r?.success).toBe(true);
  306 |     expect(Array.isArray(r?.data)).toBe(true);
  307 |     // ควรมีคำขอที่เพิ่งสร้าง
  308 |     if (ctx.vehicleRequestId) {
  309 |       const found = r.data.some(x => x.id === ctx.vehicleRequestId);
  310 |       expect(found).toBe(true);
  311 |     }
  312 |   });
  313 | 
  314 |   test('ดูรายละเอียดคำขอเดี่ยวได้', async () => {
  315 |     if (!ctx.vehicleRequestId) return test.skip();
  316 |     const r = await apiGet(`/api/vehicle-requests/${ctx.vehicleRequestId}`, ctx.driverToken);
  317 |     expect(r?.success).toBe(true);
  318 |     expect(r?.data?.id).toBe(ctx.vehicleRequestId);
  319 |     expect(r?.data?.destination).toBe('โรงเรียนพะเยาพิทยาคม');
  320 |   });
  321 | 
  322 |   test('แก้ไขคำขอ pending ของตัวเองได้', async () => {
  323 |     if (!ctx.vehicleRequestId) return test.skip();
  324 |     const r = await apiPut(`/api/vehicle-requests/${ctx.vehicleRequestId}`, {
  325 |       destination: 'โรงเรียนพะเยาพิทยาคม (แก้ไขแล้ว)',
  326 |       notes: 'แก้ไขโดย E2E test',
  327 |     }, ctx.driverToken);
  328 |     expect(r?.success).toBe(true);
  329 |   });
  330 | 
  331 |   test('ยกเลิกคำขอของตัวเองได้', async () => {
  332 |     // สร้างคำขอใหม่เพื่อยกเลิก (ไม่ใช้ vehicleRequestId หลัก)
  333 |     const today = new Date().toISOString().slice(0, 10);
  334 |     const createRes = await apiPost('/api/vehicle-requests', {
  335 |       date: today,
  336 |       destination: 'ทดสอบยกเลิก',
  337 |       purpose: 'E2E cancel test',
  338 |     }, ctx.driverToken);
  339 |     const cancelId = createRes?.data?.id;
  340 |     if (!cancelId) return test.skip();
  341 | 
  342 |     const r = await apiDelete(`/api/vehicle-requests/${cancelId}`, ctx.driverToken);
  343 |     expect(r?.success).toBe(true);
  344 |   });
  345 | 
  346 |   test('สร้างคำขอโดยไม่ระบุ destination → error', async () => {
  347 |     const r = await apiPost('/api/vehicle-requests', {
  348 |       date: new Date().toISOString().slice(0, 10),
  349 |     }, ctx.driverToken);
  350 |     expect(r?.success).toBe(false);
  351 |   });
  352 | });
  353 | 
  354 | // ══════════════════════════════════════════════════════════════
  355 | // 3. แจ้งซ่อม — Repair Reporting
  356 | // ══════════════════════════════════════════════════════════════
  357 | test.describe('3. แจ้งซ่อม — Repair Reporting', () => {
  358 |   test('พนักงานขับรถแจ้งซ่อมได้ (POST /api/repair/log)', async () => {
  359 |     if (!ctx.carId) return test.skip();
  360 |     const r = await apiPost('/api/repair/log', {
  361 |       car_id: ctx.carId,
  362 |       date_reported: new Date().toISOString().slice(0, 10),
  363 |       problem_description: 'เบรกเสียงดัง — แจ้งโดย E2E test',
  364 |       service_type: 'repair',
  365 |       status: 'requested',
  366 |       requested_by_driver_id: ctx.driverRecordId || null,
  367 |     }, ctx.driverToken);
  368 |     expect(r?.success).toBe(true);
  369 |     expect(r?.data?.id).toBeTruthy();
  370 |     ctx.repairId = r.data.id;
  371 |   });
  372 | 
  373 |   test('driver GET /api/repair/log → เห็นเฉพาะของตนเอง (200, ไม่ใช่ 403)', async () => {
  374 |     const r = await fetch(`${BASE}/api/repair/log`, {
  375 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  376 |     });
  377 |     // API อนุญาต driver เห็น repair log แต่กรองเฉพาะของตนเอง
  378 |     expect(r.status).toBe(200);
  379 |   });
  380 | 
  381 |   test('driver ไม่สามารถแก้ไขสถานะซ่อมได้ (PUT repair:edit → 403)', async () => {
  382 |     if (!ctx.repairId) return test.skip();
  383 |     const r = await fetch(`${BASE}/api/repair/log/${ctx.repairId}`, {
  384 |       method: 'PUT',
  385 |       headers: {
  386 |         'Authorization': `Bearer ${ctx.driverToken}`,
  387 |         'Content-Type': 'application/json',
  388 |       },
  389 |       body: JSON.stringify({ status: 'completed', total_cost: 5000 }),
  390 |     });
  391 |     expect(r.status).toBe(403);
  392 |   });
```