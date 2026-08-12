# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 5. Queue >> POST /api/queue — สร้างคิว
- Location: tests\api-integration.test.mjs:385:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 400
```

# Test source

```ts
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
  328 |     expect(r.status).toBe(200);
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
> 396 |     expect(r.status).toBe(201);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  429 |     expect(r.data.success).toBe(true);
  430 |   });
  431 | 
  432 |   test('PUT /api/queue/:id/unfreeze — ปลดแช่แข็ง', async () => {
  433 |     const r = await put(`/api/queue/${createdQueueId}/unfreeze`, {}, adminToken);
  434 |     expect(r.status).toBe(200);
  435 |     expect(r.data.success).toBe(true);
  436 |   });
  437 | 
  438 |   test('PUT /api/queue/:id/ongoing — เริ่มใช้รถ', async () => {
  439 |     const r = await put(`/api/queue/${createdQueueId}/ongoing`, {}, adminToken);
  440 |     expect(r.status).toBe(200);
  441 |     expect(r.data.success).toBe(true);
  442 |   });
  443 | 
  444 |   test('PUT /api/queue/:id/complete — คิวเสร็จสิ้น', async () => {
  445 |     const r = await put(`/api/queue/${createdQueueId}/complete`, {}, adminToken);
  446 |     expect(r.status).toBe(200);
  447 |     expect(r.data.success).toBe(true);
  448 |   });
  449 | });
  450 | 
  451 | // ════════════════════════════════════════════
  452 | // 6. FUEL
  453 | // ════════════════════════════════════════════
  454 | test.describe.serial('6. Fuel', () => {
  455 |   test('GET /api/fuel/types — ดูประเภทน้ำมัน', async () => {
  456 |     const r = await get('/api/fuel/types', adminToken);
  457 |     expect(r.status).toBe(200);
  458 |     expect(r.data.success).toBe(true);
  459 |   });
  460 | 
  461 |   test('POST /api/fuel/record — บันทึกเติมน้ำมัน (QR Public)', async () => {
  462 |     const r = await post('/api/fuel/record', {
  463 |       car_id: createdVehicleId,
  464 |       driver_name_manual: 'คนขับทดสอบ',
  465 |       date: '2026-04-03',
  466 |       mileage_after: 15000,
  467 |       liters: 50,
  468 |       price_per_liter: 32.5,
  469 |       amount: 1625,
  470 |       fuel_type: 'diesel',
  471 |       gas_station_name: 'ปั๊มทดสอบ',
  472 |       purpose: 'ราชการ',
  473 |       receipt_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  474 |     });
  475 |     expect(r.status).toBe(201);
  476 |     expect(r.data.success).toBe(true);
  477 |     createdFuelId = r.data.id || r.data.data?.id;
  478 |     expect(createdFuelId).toBeTruthy();
  479 |   });
  480 | 
  481 |   test('GET /api/fuel/log — ดูบันทึกน้ำมัน', async () => {
  482 |     const r = await get('/api/fuel/log', adminToken);
  483 |     expect(r.status).toBe(200);
  484 |     expect(r.data.success).toBe(true);
  485 |   });
  486 | 
  487 |   test('GET /api/fuel/log/:id — ดูรายละเอียดน้ำมัน', async () => {
  488 |     const r = await get(`/api/fuel/log/${createdFuelId}`, adminToken);
  489 |     expect(r.status).toBe(200);
  490 |     expect(r.data.success).toBe(true);
  491 |   });
  492 | 
  493 |   test('PUT /api/fuel/log/:id — อัปเดตบันทึกน้ำมัน', async () => {
  494 |     const r = await put(`/api/fuel/log/${createdFuelId}`, {
  495 |       notes: 'อัปเดตหมายเหตุ',
  496 |     }, adminToken);
```