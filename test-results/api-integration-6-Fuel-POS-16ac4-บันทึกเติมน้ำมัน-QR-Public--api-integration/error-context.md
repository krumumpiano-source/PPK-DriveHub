# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 6. Fuel >> POST /api/fuel/record — บันทึกเติมน้ำมัน (QR Public)
- Location: tests\api-integration.test.mjs:461:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 400
```

# Test source

```ts
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
> 475 |     expect(r.status).toBe(201);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  497 |     expect(r.status).toBe(200);
  498 |     expect(r.data.success).toBe(true);
  499 |   });
  500 | 
  501 |   test('GET /api/fuel/summary — ดูสรุปน้ำมัน', async () => {
  502 |     const r = await get('/api/fuel/summary?month=2026-04', adminToken);
  503 |     expect(r.status).toBe(200);
  504 |     expect(r.data.success).toBe(true);
  505 |   });
  506 | 
  507 |   test('GET /api/fuel/ledger — ดูบัญชีน้ำมัน', async () => {
  508 |     const r = await get('/api/fuel/ledger', adminToken);
  509 |     expect(r.status).toBe(200);
  510 |     expect(r.data.success).toBe(true);
  511 |   });
  512 | 
  513 |   test('GET /api/fuel/monthly-summary — ดูสรุปรายเดือน', async () => {
  514 |     const r = await get('/api/fuel/monthly-summary?year_month=2026-04', adminToken);
  515 |     expect(r.status).toBe(200);
  516 |     expect(r.data.success).toBe(true);
  517 |   });
  518 | 
  519 |   test('GET /api/fuel/requests — ดูคำขอเติมน้ำมัน', async () => {
  520 |     const r = await get('/api/fuel/requests', adminToken);
  521 |     expect(r.status).toBe(200);
  522 |     expect(r.data.success).toBe(true);
  523 |   });
  524 | 
  525 |   test('GET /api/fuel/invoices — ดูใบแจ้งหนี้', async () => {
  526 |     const r = await get('/api/fuel/invoices', adminToken);
  527 |     expect(r.status).toBe(200);
  528 |     expect(r.data.success).toBe(true);
  529 |   });
  530 | });
  531 | 
  532 | // ════════════════════════════════════════════
  533 | // 7. USAGE
  534 | // ════════════════════════════════════════════
  535 | test.describe.serial('7. Usage', () => {
  536 |   test('POST /api/usage/record — QR บันทึกออกรถ (Public)', async () => {
  537 |     const r = await post('/api/usage/record', {
  538 |       car_id: createdVehicleId,
  539 |       record_type: 'departure',
  540 |       driver_id: createdDriverId,
  541 |       datetime: '2026-04-03T08:00:00',
  542 |       mileage: 15000,
  543 |     });
  544 |     expect(r.status).toBe(201);
  545 |     expect(r.data.success).toBe(true);
  546 |     createdUsageId = r.data.id || r.data.data?.id;
  547 |     expect(createdUsageId).toBeTruthy();
  548 |   });
  549 | 
  550 |   test('GET /api/usage — ดูบันทึกใช้รถ', async () => {
  551 |     const r = await get('/api/usage', adminToken);
  552 |     expect(r.status).toBe(200);
  553 |     expect(r.data.success).toBe(true);
  554 |   });
  555 | 
  556 |   test('GET /api/usage/:id — ดูรายละเอียดบันทึก', async () => {
  557 |     const r = await get(`/api/usage/${createdUsageId}`, adminToken);
  558 |     expect(r.status).toBe(200);
  559 |     expect(r.data.success).toBe(true);
  560 |   });
  561 | 
  562 |   test('PUT /api/usage/:id — อัปเดตบันทึก', async () => {
  563 |     const r = await put(`/api/usage/${createdUsageId}`, {
  564 |       notes: 'อัปเดตหมายเหตุ',
  565 |     }, adminToken);
  566 |     expect(r.status).toBe(200);
  567 |     expect(r.data.success).toBe(true);
  568 |   });
  569 | 
  570 |   test('GET /api/usage/summary — ดูสรุปการใช้รถ', async () => {
  571 |     const r = await get('/api/usage/summary?month=2026-04', adminToken);
  572 |     expect(r.status).toBe(200);
  573 |     expect(r.data.success).toBe(true);
  574 |   });
  575 | });
```