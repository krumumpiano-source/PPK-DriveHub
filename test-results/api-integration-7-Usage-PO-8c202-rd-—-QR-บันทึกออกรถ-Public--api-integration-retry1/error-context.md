# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 7. Usage >> POST /api/usage/record — QR บันทึกออกรถ (Public)
- Location: tests\api-integration.test.mjs:536:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 500
```

# Test source

```ts
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
> 544 |     expect(r.status).toBe(201);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  576 | 
  577 | // ════════════════════════════════════════════
  578 | // 8. CHECK (Daily Inspection)
  579 | // ════════════════════════════════════════════
  580 | test.describe.serial('8. Check', () => {
  581 |   test('POST /api/check/daily — ตรวจสภาพรถ (QR Public)', async () => {
  582 |     const r = await post('/api/check/daily', {
  583 |       car_id: createdVehicleId,
  584 |       checker_name: 'ผู้ตรวจทดสอบ',
  585 |       check_type: 'pre_trip',
  586 |       overall_status: 'ok',
  587 |       mileage: 15100,
  588 |       tire_condition: 'ok',
  589 |       brake_condition: 'ok',
  590 |       light_condition: 'ok',
  591 |     });
  592 |     expect([200, 201]).toContain(r.status);
  593 |     expect(r.data.success).toBe(true);
  594 |     createdCheckId = r.data.id || r.data.data?.id;
  595 |   });
  596 | 
  597 |   test('GET /api/check/log — ดูบันทึกตรวจเช็ค', async () => {
  598 |     const r = await get('/api/check/log', adminToken);
  599 |     expect(r.status).toBe(200);
  600 |     expect(r.data.success).toBe(true);
  601 |   });
  602 | 
  603 |   test('GET /api/check/alerts — ดูการแจ้งเตือนจากการตรวจเช็ค', async () => {
  604 |     const r = await get('/api/check/alerts', adminToken);
  605 |     expect(r.status).toBe(200);
  606 |     expect(r.data.success).toBe(true);
  607 |   });
  608 | });
  609 | 
  610 | // ════════════════════════════════════════════
  611 | // 9. REPAIR
  612 | // ════════════════════════════════════════════
  613 | test.describe.serial('9. Repair', () => {
  614 |   test('POST /api/repair/log — สร้างรายการซ่อม', async () => {
  615 |     const r = await post('/api/repair/log', {
  616 |       car_id: createdVehicleId,
  617 |       date_reported: '2026-04-03',
  618 |       status: 'requested',
  619 |       issue_description: 'เบรคมีเสียง',
  620 |       reporter_name: 'ผู้แจ้งทดสอบ',
  621 |     }, adminToken);
  622 |     expect(r.status).toBe(201);
  623 |     expect(r.data.success).toBe(true);
  624 |     createdRepairId = r.data.id || r.data.data?.id;
  625 |     expect(createdRepairId).toBeTruthy();
  626 |   });
  627 | 
  628 |   test('GET /api/repair/log — ดูรายการซ่อม', async () => {
  629 |     const r = await get('/api/repair/log', adminToken);
  630 |     expect(r.status).toBe(200);
  631 |     expect(r.data.success).toBe(true);
  632 |   });
  633 | 
  634 |   test('GET /api/repair/log/:id — ดูรายละเอียดซ่อม', async () => {
  635 |     const r = await get(`/api/repair/log/${createdRepairId}`, adminToken);
  636 |     expect(r.status).toBe(200);
  637 |     expect(r.data.success).toBe(true);
  638 |   });
  639 | 
  640 |   test('PUT /api/repair/log/:id — อัปเดตรายการซ่อม', async () => {
  641 |     const r = await put(`/api/repair/log/${createdRepairId}`, {
  642 |       status: 'repairing',
  643 |       garage_name: 'อู่ทดสอบ',
  644 |     }, adminToken);
```