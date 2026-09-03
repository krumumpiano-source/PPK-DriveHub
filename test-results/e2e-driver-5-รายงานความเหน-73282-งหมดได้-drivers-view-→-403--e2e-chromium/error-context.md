# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 5. รายงานความเหนื่อยล้า — Fatigue Reporting >> driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)
- Location: tests\e2e\driver.spec.mjs:450:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

# Test source

```ts
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
  393 | });
  394 | 
  395 | // ══════════════════════════════════════════════════════════════
  396 | // 4. รายงานเหตุการณ์ — Incidents
  397 | // ══════════════════════════════════════════════════════════════
  398 | test.describe('4. รายงานเหตุการณ์ — Incidents', () => {
  399 |   test('สร้างรายงานเหตุการณ์ได้', async () => {
  400 |     if (!ctx.carId) return test.skip();
  401 |     const r = await apiPost('/api/incidents', {
  402 |       car_id: ctx.carId,
  403 |       driver_id: ctx.driverRecordId || null,
  404 |       incident_date: new Date().toISOString().slice(0, 10),
  405 |       incident_type: 'damage',
  406 |       description: 'กระจกแตก — E2E test',
  407 |       location: 'ถนนพหลโยธิน',
  408 |       damage_cost: 2000,
  409 |     }, ctx.driverToken);
  410 |     expect(r?.success).toBe(true);
  411 |     expect(r?.data?.id).toBeTruthy();
  412 |     ctx.incidentId = r.data.id;
  413 |   });
  414 | 
  415 |   test('ดูรายการเหตุการณ์ได้', async () => {
  416 |     const r = await apiGet('/api/incidents', ctx.driverToken);
  417 |     expect(r?.success).toBe(true);
  418 |     expect(Array.isArray(r?.data)).toBe(true);
  419 |   });
  420 | 
  421 |   test('ดูรายละเอียดเหตุการณ์ที่สร้างได้', async () => {
  422 |     if (!ctx.incidentId) return test.skip();
  423 |     const r = await apiGet(`/api/incidents/${ctx.incidentId}`, ctx.driverToken);
  424 |     expect(r?.success).toBe(true);
  425 |     expect(r?.data?.id).toBe(ctx.incidentId);
  426 |   });
  427 | 
  428 |   test('สร้างรายงานโดยไม่มี car_id → error', async () => {
  429 |     const r = await apiPost('/api/incidents', {
  430 |       incident_date: new Date().toISOString().slice(0, 10),
  431 |       incident_type: 'accident',
  432 |     }, ctx.driverToken);
  433 |     expect(r?.success).toBe(false);
  434 |   });
  435 | });
  436 | 
  437 | // ══════════════════════════════════════════════════════════════
  438 | // 5. รายงานความเหนื่อยล้า — Fatigue Reporting
  439 | // ══════════════════════════════════════════════════════════════
  440 | test.describe('5. รายงานความเหนื่อยล้า — Fatigue Reporting', () => {
  441 |   test('พนักงานขับรถรายงานความเหนื่อยล้าได้', async () => {
  442 |     if (!ctx.driverRecordId) return test.skip();
  443 |     const r = await apiPost('/api/drivers/fatigue/report', {
  444 |       driver_id: ctx.driverRecordId,
  445 |       reason: 'นอนไม่หลับ — E2E test',
  446 |     }, ctx.driverToken);
  447 |     expect(r?.success).toBe(true);
  448 |   });
  449 | 
  450 |   test('driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)', async () => {
  451 |     const r = await fetch(`${BASE}/api/drivers/fatigue/list`, {
  452 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  453 |     });
> 454 |     expect(r.status).toBe(403);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  455 |   });
  456 | });
  457 | 
  458 | // ══════════════════════════════════════════════════════════════
  459 | // 6. โปรไฟล์ส่วนตัว — Profile & Account
  460 | // ══════════════════════════════════════════════════════════════
  461 | test.describe('6. โปรไฟล์ส่วนตัว — Profile & Account', () => {
  462 |   test('ดูโปรไฟล์ตัวเองได้ (GET /api/auth/me)', async () => {
  463 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  464 |     expect(r?.success).toBe(true);
  465 |     expect(r?.data?.role).toBe('driver');
  466 |   });
  467 | 
  468 |   test('เปลี่ยนรหัสผ่านได้ (change-password flow)', async () => {
  469 |     clearRateLimits();
  470 |     // เปลี่ยนเป็นรหัสใหม่
  471 |     const r1 = await apiPost('/api/auth/change-password', {
  472 |       old_password: DRIVER_USER.password,
  473 |       new_password: TEST_DRIVER_PASS_NEW,
  474 |     }, ctx.driverToken);
  475 |     expect(r1?.success).toBe(true);
  476 | 
  477 |     // Login ด้วยรหัสใหม่
  478 |     clearRateLimits();
  479 |     const r2 = await apiPost('/api/auth/login', {
  480 |       username: DRIVER_USER.email,
  481 |       password: TEST_DRIVER_PASS_NEW,
  482 |     });
  483 |     expect(r2?.data?.token).toBeTruthy();
  484 | 
  485 |     // เปลี่ยนเป็นรหัสที่ 3 (ห้ามใช้รหัสเดิมเพราะอยู่ใน password_history)
  486 |     clearRateLimits();
  487 |     const r3 = await apiPost('/api/auth/change-password', {
  488 |       old_password: TEST_DRIVER_PASS_NEW,
  489 |       new_password: TEST_DRIVER_PASS_ALT,
  490 |     }, r2.data.token);
  491 |     expect(r3?.success).toBe(true);
  492 |     clearRateLimits();
  493 |   });
  494 | 
  495 |   test('เปลี่ยนรหัสผ่านด้วยรหัสเดิมผิด → error', async () => {
  496 |     clearRateLimits();
  497 |     const r = await apiPost('/api/auth/change-password', {
  498 |       old_password: 'WrongOld@999',
  499 |       new_password: 'NewPass@123',
  500 |     }, ctx.driverToken);
  501 |     expect(r?.success).toBe(false);
  502 |     clearRateLimits();
  503 |   });
  504 | });
  505 | 
  506 | // ══════════════════════════════════════════════════════════════
  507 | // 7. การแจ้งเตือน — Notifications
  508 | // ══════════════════════════════════════════════════════════════
  509 | test.describe('7. การแจ้งเตือน — Notifications', () => {
  510 |   test('ดูการแจ้งเตือนของตัวเองได้', async () => {
  511 |     const r = await apiGet('/api/notifications', ctx.driverToken);
  512 |     expect(r?.success).toBe(true);
  513 |     expect(Array.isArray(r?.data?.notifications)).toBe(true);
  514 |   });
  515 | 
  516 |   test('ดูจำนวนแจ้งเตือนที่ยังไม่อ่านได้', async () => {
  517 |     const r = await apiGet('/api/notifications?unread=true', ctx.driverToken);
  518 |     expect(r?.success).toBe(true);
  519 |   });
  520 | });
  521 | 
  522 | // ══════════════════════════════════════════════════════════════
  523 | // 8. ขอบเขตสิทธิ์ — Permission Boundaries
  524 | // ══════════════════════════════════════════════════════════════
  525 | test.describe('8. ขอบเขตสิทธิ์ — Permission Boundaries (API)', () => {
  526 |   test('ดูรายการรถได้ (vehicles:view → 200, driver เห็นได้)', async () => {
  527 |     const r = await fetch(`${BASE}/api/vehicles`, {
  528 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  529 |     });
  530 |     // API อนุญาต driver ดูรายการรถ
  531 |     expect(r.status).toBe(200);
  532 |   });
  533 | 
  534 |   test('ไม่สามารถสร้างรถได้ (vehicles:create → 403)', async () => {
  535 |     const r = await fetch(`${BASE}/api/vehicles`, {
  536 |       method: 'POST',
  537 |       headers: {
  538 |         'Authorization': `Bearer ${ctx.driverToken}`,
  539 |         'Content-Type': 'application/json',
  540 |       },
  541 |       body: JSON.stringify({ license_plate: 'ผิดกฎ-999', brand: 'Hack' }),
  542 |     });
  543 |     expect(r.status).toBe(403);
  544 |   });
  545 | 
  546 |   test('ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)', async () => {
  547 |     const r = await fetch(`${BASE}/api/drivers`, {
  548 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  549 |     });
  550 |     expect(r.status).toBe(403);
  551 |   });
  552 | 
  553 |   test('ไม่สามารถดูรายการน้ำมันได้ (fuel:view → 403)', async () => {
  554 |     const r = await fetch(`${BASE}/api/fuel/log`, {
```