# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\fuel.spec.mjs >> 4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token) >> อัปเดตไมล์รถอัตโนมัติหลังเติมน้ำมัน
- Location: tests\e2e\fuel.spec.mjs:447:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 11500
Received:    0
```

# Test source

```ts
  351 |     expect(r?.data?.id).toBeTruthy();
  352 |   });
  353 | 
  354 |   test('purpose: other + purpose_detail → สำเร็จ', async () => {
  355 |     if (!ctx.fuelCar1Id || !ctx.driverId) return;
  356 |     const r = await apiPost('/api/fuel/record', {
  357 |       car_id: ctx.fuelCar1Id,
  358 |       driver_id: ctx.driverId,
  359 |       mileage_before: 10900,
  360 |       mileage_after: 11200,
  361 |       liters: 30,
  362 |       purpose: 'other',
  363 |       purpose_detail: 'ส่งเอกสารฉุกเฉินนอกพื้นที่',
  364 |       receipt_image: MOCK_RECEIPT,
  365 |       date: '2020-03-04',
  366 |       time: '08:00',
  367 |     });
  368 |     expect(r?.success).toBe(true);
  369 |     expect(r?.data?.id).toBeTruthy();
  370 |   });
  371 | });
  372 | 
  373 | // ══════════════════════════════════════════════════════════
  374 | // 4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token)
  375 | //    เจ้าหน้าที่บันทึกพร้อมรายละเอียดเต็มรูปแบบ
  376 | // ══════════════════════════════════════════════════════════
  377 | test.describe('4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token)', () => {
  378 |   test('บันทึกน้ำมันพร้อมข้อมูลครบทุก field → สำเร็จ', async () => {
  379 |     if (!ctx.fuelCar1Id || !ctx.driverId || !ctx.adminToken) return;
  380 |     const r = await apiPost('/api/fuel/record', {
  381 |       car_id: ctx.fuelCar1Id,
  382 |       driver_id: ctx.driverId,
  383 |       mileage_before: 11200,
  384 |       mileage_after: 11500,
  385 |       liters: 45,
  386 |       price_per_liter: 30.25,
  387 |       amount: 1361.25,
  388 |       fuel_type: 'fuelSave_diesel_b7',
  389 |       gas_station_name: 'ปั๊มน้ำมัน PTT สาขาทดสอบ',
  390 |       gas_station_address: '999 ถ.ทดสอบ กรุงเทพ',
  391 |       gas_station_tax_id: '0105559123456',
  392 |       receipt_number: 'REC-2020-001',
  393 |       pump_meter_number: 'PUMP-01',
  394 |       expense_type: 'procurement',
  395 |       notes: 'เติมน้ำมันก่อนออกปฏิบัติงาน',
  396 |       purpose: 'government_task',
  397 |       receipt_image: MOCK_RECEIPT,
  398 |       date: '2020-03-10',
  399 |       time: '07:30',
  400 |     }, ctx.adminToken);
  401 |     expect(r?.success).toBe(true);
  402 |     expect(r?.data?.id).toBeTruthy();
  403 |     expect(r?.data?.document_number).toMatch(/^FUL-2563-03-/);
  404 |     ctx.fuelLogId2 = r.data.id;
  405 |   });
  406 | 
  407 |   test('GET /api/fuel/log/:id → ข้อมูลครบถ้วน', async () => {
  408 |     if (!ctx.fuelLogId2 || !ctx.adminToken) return;
  409 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
  410 |     expect(r?.success).toBe(true);
  411 |     expect(r?.data?.id).toBe(ctx.fuelLogId2);
  412 |     expect(r?.data?.gas_station_name).toBe('ปั๊มน้ำมัน PTT สาขาทดสอบ');
  413 |     expect(r?.data?.gas_station_tax_id).toBe('0105559123456');
  414 |     expect(r?.data?.receipt_number).toBe('REC-2020-001');
  415 |     expect(r?.data?.liters).toBe(45);
  416 |     expect(r?.data?.expense_type).toBe('procurement');
  417 |   });
  418 | 
  419 |   test('ระบบคำนวณ fuel_consumption_rate อัตโนมัติ', async () => {
  420 |     if (!ctx.fuelLogId2 || !ctx.adminToken) return;
  421 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
  422 |     // (11500 - 11200) / 45 = 300 / 45 ≈ 6.67 km/L
  423 |     expect(r?.data?.fuel_consumption_rate).toBeGreaterThan(0);
  424 |     expect(r?.data?.fuel_consumption_rate).toBeCloseTo(300 / 45, 1);
  425 |   });
  426 | 
  427 |   test('บันทึกน้ำมันด้วย expense_type: private → สำเร็จ', async () => {
  428 |     if (!ctx.fuelCar2Id || !ctx.driverId || !ctx.adminToken) return;
  429 |     const r = await apiPost('/api/fuel/record', {
  430 |       car_id: ctx.fuelCar2Id,
  431 |       driver_id: ctx.driverId,
  432 |       mileage_before: 20000,
  433 |       mileage_after: 20300,
  434 |       liters: 30,
  435 |       amount: 900,
  436 |       expense_type: 'official_travel',
  437 |       purpose: 'business',
  438 |       gas_station_name: 'ปั๊มใกล้บ้าน',
  439 |       receipt_image: MOCK_RECEIPT,
  440 |       date: '2020-03-10',
  441 |     }, ctx.adminToken);
  442 |     expect(r?.success).toBe(true);
  443 |     expect(r?.data?.id).toBeTruthy();
  444 |     ctx.fuelDeleteId = r.data.id;
  445 |   });
  446 | 
  447 |   test('อัปเดตไมล์รถอัตโนมัติหลังเติมน้ำมัน', async () => {
  448 |     if (!ctx.fuelCar1Id || !ctx.adminToken) return;
  449 |     const car = await apiGet(`/api/vehicles/${ctx.fuelCar1Id}`, ctx.adminToken);
  450 |     // หลังจาก POST หลายครั้ง current_mileage ควร = mileage_after ล่าสุด
> 451 |     expect(car?.data?.current_mileage).toBeGreaterThanOrEqual(11500);
      |                                        ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  452 |   });
  453 | });
  454 | 
  455 | // ══════════════════════════════════════════════════════════
  456 | // 5. Anomaly Detection — ตรวจจับความผิดปกติ
  457 | // ══════════════════════════════════════════════════════════
  458 | test.describe('5. Anomaly Detection — ตรวจจับความผิดปกติ', () => {
  459 |   test('อัตราสิ้นเปลืองต่ำผิดปกติ (< 2 กม./ล.) → anomaly_flag = 1', async () => {
  460 |     if (!ctx.fuelCar3Id || !ctx.driverId) return;
  461 |     // mileage เพิ่มขึ้นแค่ 10 กม. แต่เติม 50 ลิตร = 0.2 กม./ล. → ผิดปกติ
  462 |     const r = await apiPost('/api/fuel/record', {
  463 |       car_id: ctx.fuelCar3Id,
  464 |       driver_id: ctx.driverId,
  465 |       mileage_before: 30000,
  466 |       mileage_after: 30010,
  467 |       liters: 50,
  468 |       amount: 1500,
  469 |       purpose: 'business',
  470 |       receipt_image: MOCK_RECEIPT,
  471 |       date: '2020-04-01',
  472 |       time: '09:00',
  473 |     });
  474 |     expect(r?.success).toBe(true);
  475 |     expect(r?.data?.anomaly_flag).toBe(1);
  476 |   });
  477 | 
  478 |   test('เติมน้ำมันปกติ → anomaly_flag = 0', async () => {
  479 |     if (!ctx.fuelCar2Id || !ctx.driverId) return;
  480 |     // (20300 → 20600) = 300 กม. / 35 ล. = 8.57 กม./ล. — ปกติ
  481 |     const r = await apiPost('/api/fuel/record', {
  482 |       car_id: ctx.fuelCar2Id,
  483 |       driver_id: ctx.driverId,
  484 |       mileage_before: 20300,
  485 |       mileage_after: 20600,
  486 |       liters: 35,
  487 |       purpose: 'business',
  488 |       receipt_image: MOCK_RECEIPT,
  489 |       date: '2020-04-02',
  490 |     });
  491 |     expect(r?.success).toBe(true);
  492 |     expect(r?.data?.anomaly_flag).toBe(0);
  493 |   });
  494 | 
  495 |   test('เติมน้ำมัน 3 ครั้งในวันเดียว (รถเดิม) → anomaly_flag = 1 ครั้งสุดท้าย', async () => {
  496 |     if (!ctx.fuelCar3Id || !ctx.driverId) return;
  497 |     // ครั้งที่ 2 (เพื่อให้ถึง 3 ครั้งรวมกับครั้งแรก)
  498 |     const r2 = await apiPost('/api/fuel/record', {
  499 |       car_id: ctx.fuelCar3Id,
  500 |       driver_id: ctx.driverId,
  501 |       mileage_before: 30010,
  502 |       mileage_after: 30020,
  503 |       liters: 5,
  504 |       purpose: 'business',
  505 |       receipt_image: MOCK_RECEIPT,
  506 |       date: '2020-04-01',  // วันเดียวกับครั้งแรก
  507 |       time: '12:00',
  508 |     });
  509 |     // ครั้งที่ 3 — ต้องเป็น anomaly
  510 |     const r3 = await apiPost('/api/fuel/record', {
  511 |       car_id: ctx.fuelCar3Id,
  512 |       driver_id: ctx.driverId,
  513 |       mileage_before: 30020,
  514 |       mileage_after: 30030,
  515 |       liters: 5,
  516 |       purpose: 'business',
  517 |       receipt_image: MOCK_RECEIPT,
  518 |       date: '2020-04-01',  // วันเดียวกัน
  519 |       time: '15:00',
  520 |     });
  521 |     expect(r3?.success).toBe(true);
  522 |     // ครั้งที่ 3 ในวันเดียว (รวมครั้งแรกแล้ว = 3 ครั้ง) → anomaly
  523 |     expect(r3?.data?.anomaly_flag).toBe(1);
  524 |   });
  525 | });
  526 | 
  527 | // ══════════════════════════════════════════════════════════
  528 | // 6. GET /api/fuel/log — ดูประวัติการเติมน้ำมัน (Auth)
  529 | // ══════════════════════════════════════════════════════════
  530 | test.describe('6. GET /api/fuel/log — ประวัติการเติมน้ำมัน', () => {
  531 |   test('ดึงรายการทั้งหมด → success + array', async () => {
  532 |     if (!ctx.adminToken) return;
  533 |     const r = await apiGet('/api/fuel/log', ctx.adminToken);
  534 |     expect(r?.success).toBe(true);
  535 |     expect(Array.isArray(r?.data)).toBe(true);
  536 |     expect(r?.data?.length).toBeGreaterThanOrEqual(1);
  537 |   });
  538 | 
  539 |   test('กรอง car_id → เฉพาะรถที่ระบุ', async () => {
  540 |     if (!ctx.fuelCar1Id || !ctx.adminToken) return;
  541 |     const r = await apiGet(`/api/fuel/log?car_id=${ctx.fuelCar1Id}`, ctx.adminToken);
  542 |     expect(r?.success).toBe(true);
  543 |     const rows = r?.data || [];
  544 |     expect(rows.length).toBeGreaterThanOrEqual(1);
  545 |     rows.forEach(row => expect(row.car_id).toBe(ctx.fuelCar1Id));
  546 |   });
  547 | 
  548 |   test('กรอง date_from/date_to → เฉพาะช่วงวันที่', async () => {
  549 |     if (!ctx.adminToken) return;
  550 |     const r = await apiGet('/api/fuel/log?date_from=2020-03-01&date_to=2020-03-31', ctx.adminToken);
  551 |     expect(r?.success).toBe(true);
```