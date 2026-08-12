# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 4. Drivers >> GET /api/drivers — ดูรายการคนขับ
- Location: tests\api-integration.test.mjs:326:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Test source

```ts
  228 |     });
  229 |     expect([200, 201]).toContain(r.status);
  230 |     expect(r.data.success).toBe(true);
  231 |   });
  232 | 
  233 |   test('POST /api/auth/forgot-password — ลืมรหัสผ่าน', async () => {
  234 |     const r = await post('/api/auth/forgot-password', {
  235 |       email: 'testadmin@test.com',
  236 |     });
  237 |     // always returns success (no email leak)
  238 |     expect(r.status).toBe(200);
  239 |     expect(r.data.success).toBe(true);
  240 |   });
  241 | });
  242 | 
  243 | // ════════════════════════════════════════════
  244 | // 3. VEHICLES
  245 | // ════════════════════════════════════════════
  246 | test.describe.serial('3. Vehicles', () => {
  247 |   test('POST /api/vehicles — สร้างรถ', async () => {
  248 |     expect(adminToken).toBeTruthy();
  249 |     const r = await post('/api/vehicles', {
  250 |       license_plate: `TEST-${Date.now().toString().slice(-4)}`,
  251 |       brand: 'Toyota',
  252 |       model: 'Hiace',
  253 |       year: 2024,
  254 |       fuel_type: 'diesel',
  255 |       seat_count: 12,
  256 |       status: 'available',
  257 |     }, adminToken);
  258 |     expect(r.status).toBe(201);
  259 |     expect(r.data.success).toBe(true);
  260 |     createdVehicleId = r.data.id || r.data.data?.id;
  261 |     expect(createdVehicleId).toBeTruthy();
  262 |   });
  263 | 
  264 |   test('GET /api/vehicles — ดูรายการรถ', async () => {
  265 |     const r = await get('/api/vehicles', adminToken);
  266 |     expect(r.status).toBe(200);
  267 |     expect(r.data.success).toBe(true);
  268 |     const vehicles = r.data.vehicles || r.data.data?.vehicles || r.data.data;
  269 |     expect(Array.isArray(vehicles)).toBe(true);
  270 |     expect(vehicles.length).toBeGreaterThan(0);
  271 |   });
  272 | 
  273 |   test('GET /api/vehicles/:id — ดูรถรายคัน', async () => {
  274 |     const r = await get(`/api/vehicles/${createdVehicleId}`, adminToken);
  275 |     expect(r.status).toBe(200);
  276 |     expect(r.data.success).toBe(true);
  277 |     expect(r.data.data || r.data.vehicle).toBeTruthy();
  278 |   });
  279 | 
  280 |   test('PUT /api/vehicles/:id — อัปเดตข้อมูลรถ', async () => {
  281 |     const r = await put(`/api/vehicles/${createdVehicleId}`, {
  282 |       model: 'Commuter',
  283 |       color: 'White',
  284 |     }, adminToken);
  285 |     expect(r.status).toBe(200);
  286 |     expect(r.data.success).toBe(true);
  287 |   });
  288 | 
  289 |   test('GET /api/vehicles/qr-info?car_id= — ดูข้อมูลรถจาก QR (Public)', async () => {
  290 |     const r = await get(`/api/vehicles/qr-info?car_id=${createdVehicleId}`);
  291 |     expect(r.status).toBe(200);
  292 |     expect(r.data.success).toBe(true);
  293 |     expect(r.data.data).toHaveProperty('license_plate');
  294 |   });
  295 | 
  296 |   test('GET /api/vehicles/:id/maintenance — ดูประวัติบำรุงรักษา', async () => {
  297 |     const r = await get(`/api/vehicles/${createdVehicleId}/maintenance`, adminToken);
  298 |     expect(r.status).toBe(200);
  299 |     expect(r.data.success).toBe(true);
  300 |   });
  301 | 
  302 |   test('GET /api/vehicles/inactive — ดูรายการรถที่ปิดใช้งาน', async () => {
  303 |     const r = await get('/api/vehicles/inactive', adminToken);
  304 |     // May return 200 or 404 depending on route setup
  305 |     expect([200, 404]).toContain(r.status);
  306 |   });
  307 | });
  308 | 
  309 | // ════════════════════════════════════════════
  310 | // 4. DRIVERS
  311 | // ════════════════════════════════════════════
  312 | test.describe.serial('4. Drivers', () => {
  313 |   test('POST /api/drivers — สร้างคนขับ', async () => {
  314 |     const r = await post('/api/drivers', {
  315 |       name: 'คนขับทดสอบ',
  316 |       license_number: 'DL-TEST-001',
  317 |       phone: '0811111111',
  318 |       status: 'active',
  319 |     }, adminToken);
  320 |     expect(r.status).toBe(201);
  321 |     expect(r.data.success).toBe(true);
  322 |     createdDriverId = r.data.id || r.data.data?.id;
  323 |     expect(createdDriverId).toBeTruthy();
  324 |   });
  325 | 
  326 |   test('GET /api/drivers — ดูรายการคนขับ', async () => {
  327 |     const r = await get('/api/drivers', adminToken);
> 328 |     expect(r.status).toBe(200);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  329 |     expect(r.data.success).toBe(true);
  330 |     const drivers = r.data.drivers || r.data.data?.drivers || r.data.data;
  331 |     expect(Array.isArray(drivers)).toBe(true);
  332 |   });
  333 | 
  334 |   test('GET /api/drivers/:id — ดูข้อมูลคนขับ', async () => {
  335 |     const r = await get(`/api/drivers/${createdDriverId}`, adminToken);
  336 |     expect(r.status).toBe(200);
  337 |     expect(r.data.success).toBe(true);
  338 |   });
  339 | 
  340 |   test('PUT /api/drivers/:id — อัปเดตข้อมูลคนขับ', async () => {
  341 |     const r = await put(`/api/drivers/${createdDriverId}`, {
  342 |       phone: '0822222222',
  343 |     }, adminToken);
  344 |     expect(r.status).toBe(200);
  345 |     expect(r.data.success).toBe(true);
  346 |   });
  347 | 
  348 |   test('POST /api/drivers/fatigue/report — รายงานคนขับเหนื่อย', async () => {
  349 |     const r = await post('/api/drivers/fatigue/report', {
  350 |       driver_id: createdDriverId,
  351 |       reason: 'ง่วงนอน',
  352 |     }, adminToken);
  353 |     expect([200, 201]).toContain(r.status);
  354 |     expect(r.data.success).toBe(true);
  355 |   });
  356 | 
  357 |   test('GET /api/drivers/fatigue/list — ดูรายการรายงานเหนื่อย', async () => {
  358 |     const r = await get('/api/drivers/fatigue/list', adminToken);
  359 |     expect(r.status).toBe(200);
  360 |     expect(r.data.success).toBe(true);
  361 |   });
  362 | 
  363 |   test('POST /api/drivers/:id/leaves — สร้างใบลา', async () => {
  364 |     const r = await post(`/api/drivers/${createdDriverId}/leaves`, {
  365 |       start_date: '2026-04-10',
  366 |       end_date: '2026-04-11',
  367 |       leave_type: 'sick',
  368 |       reason: 'ป่วย',
  369 |     }, adminToken);
  370 |     expect([200, 201]).toContain(r.status);
  371 |     expect(r.data.success).toBe(true);
  372 |   });
  373 | 
  374 |   test('GET /api/drivers/:id/leaves — ดูใบลา', async () => {
  375 |     const r = await get(`/api/drivers/${createdDriverId}/leaves`, adminToken);
  376 |     expect(r.status).toBe(200);
  377 |     expect(r.data.success).toBe(true);
  378 |   });
  379 | });
  380 | 
  381 | // ════════════════════════════════════════════
  382 | // 5. QUEUE
  383 | // ════════════════════════════════════════════
  384 | test.describe.serial('5. Queue', () => {
  385 |   test('POST /api/queue — สร้างคิว', async () => {
  386 |     const r = await post('/api/queue', {
  387 |       car_id: createdVehicleId,
  388 |       date: '2026-04-15',
  389 |       time_start: '08:00',
  390 |       time_end: '12:00',
  391 |       driver_id: createdDriverId,
  392 |       mission: 'ทดสอบระบบ',
  393 |       destination: 'ห้องประชุม',
  394 |       passengers: 5,
  395 |     }, adminToken);
  396 |     expect(r.status).toBe(201);
  397 |     expect(r.data.success).toBe(true);
  398 |     createdQueueId = r.data.id || r.data.data?.id;
  399 |     expect(createdQueueId).toBeTruthy();
  400 |   });
  401 | 
  402 |   test('GET /api/queue — ดูรายการคิว', async () => {
  403 |     const r = await get('/api/queue', adminToken);
  404 |     expect(r.status).toBe(200);
  405 |     expect(r.data.success).toBe(true);
  406 |     expect(Array.isArray(r.data.data || r.data)).toBe(true);
  407 |   });
  408 | 
  409 |   test('GET /api/queue/:id — ดูคิวรายตัว', async () => {
  410 |     const r = await get(`/api/queue/${createdQueueId}`, adminToken);
  411 |     expect(r.status).toBe(200);
  412 |     expect(r.data.success).toBe(true);
  413 |   });
  414 | 
  415 |   test('PUT /api/queue/:id — อัปเดตคิว', async () => {
  416 |     const r = await put(`/api/queue/${createdQueueId}`, {
  417 |       passengers: 8,
  418 |       notes: 'อัปเดตจำนวนผู้โดยสาร',
  419 |     }, adminToken);
  420 |     expect(r.status).toBe(200);
  421 |     expect(r.data.success).toBe(true);
  422 |   });
  423 | 
  424 |   test('PUT /api/queue/:id/freeze — แช่แข็งคิว', async () => {
  425 |     const r = await put(`/api/queue/${createdQueueId}/freeze`, {
  426 |       reason: 'รอผู้อนุมัติ',
  427 |     }, adminToken);
  428 |     expect(r.status).toBe(200);
```