# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 5. รายงานความเหนื่อยล้า — Fatigue Reporting >> driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)
- Location: tests\e2e\driver.spec.mjs:441:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

# Test source

```ts
  345 | // ══════════════════════════════════════════════════════════════
  346 | // 3. แจ้งซ่อม — Repair Reporting
  347 | // ══════════════════════════════════════════════════════════════
  348 | test.describe('3. แจ้งซ่อม — Repair Reporting', () => {
  349 |   test('พนักงานขับรถแจ้งซ่อมได้ (POST /api/repair/log)', async () => {
  350 |     if (!ctx.carId) return test.skip();
  351 |     const r = await apiPost('/api/repair/log', {
  352 |       car_id: ctx.carId,
  353 |       date_reported: new Date().toISOString().slice(0, 10),
  354 |       problem_description: 'เบรกเสียงดัง — แจ้งโดย E2E test',
  355 |       service_type: 'repair',
  356 |       status: 'requested',
  357 |       requested_by_driver_id: ctx.driverRecordId || null,
  358 |     }, ctx.driverToken);
  359 |     expect(r?.success).toBe(true);
  360 |     expect(r?.data?.id).toBeTruthy();
  361 |     ctx.repairId = r.data.id;
  362 |   });
  363 | 
  364 |   test('driver GET /api/repair/log → เห็นเฉพาะของตนเอง (200, ไม่ใช่ 403)', async () => {
  365 |     const r = await fetch(`${BASE}/api/repair/log`, {
  366 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  367 |     });
  368 |     // API อนุญาต driver เห็น repair log แต่กรองเฉพาะของตนเอง
  369 |     expect(r.status).toBe(200);
  370 |   });
  371 | 
  372 |   test('driver ไม่สามารถแก้ไขสถานะซ่อมได้ (PUT repair:edit → 403)', async () => {
  373 |     if (!ctx.repairId) return test.skip();
  374 |     const r = await fetch(`${BASE}/api/repair/log/${ctx.repairId}`, {
  375 |       method: 'PUT',
  376 |       headers: {
  377 |         'Authorization': `Bearer ${ctx.driverToken}`,
  378 |         'Content-Type': 'application/json',
  379 |       },
  380 |       body: JSON.stringify({ status: 'completed', total_cost: 5000 }),
  381 |     });
  382 |     expect(r.status).toBe(403);
  383 |   });
  384 | });
  385 | 
  386 | // ══════════════════════════════════════════════════════════════
  387 | // 4. รายงานเหตุการณ์ — Incidents
  388 | // ══════════════════════════════════════════════════════════════
  389 | test.describe('4. รายงานเหตุการณ์ — Incidents', () => {
  390 |   test('สร้างรายงานเหตุการณ์ได้', async () => {
  391 |     if (!ctx.carId) return test.skip();
  392 |     const r = await apiPost('/api/incidents', {
  393 |       car_id: ctx.carId,
  394 |       driver_id: ctx.driverRecordId || null,
  395 |       incident_date: new Date().toISOString().slice(0, 10),
  396 |       incident_type: 'damage',
  397 |       description: 'กระจกแตก — E2E test',
  398 |       location: 'ถนนพหลโยธิน',
  399 |       damage_cost: 2000,
  400 |     }, ctx.driverToken);
  401 |     expect(r?.success).toBe(true);
  402 |     expect(r?.data?.id).toBeTruthy();
  403 |     ctx.incidentId = r.data.id;
  404 |   });
  405 | 
  406 |   test('ดูรายการเหตุการณ์ได้', async () => {
  407 |     const r = await apiGet('/api/incidents', ctx.driverToken);
  408 |     expect(r?.success).toBe(true);
  409 |     expect(Array.isArray(r?.data)).toBe(true);
  410 |   });
  411 | 
  412 |   test('ดูรายละเอียดเหตุการณ์ที่สร้างได้', async () => {
  413 |     if (!ctx.incidentId) return test.skip();
  414 |     const r = await apiGet(`/api/incidents/${ctx.incidentId}`, ctx.driverToken);
  415 |     expect(r?.success).toBe(true);
  416 |     expect(r?.data?.id).toBe(ctx.incidentId);
  417 |   });
  418 | 
  419 |   test('สร้างรายงานโดยไม่มี car_id → error', async () => {
  420 |     const r = await apiPost('/api/incidents', {
  421 |       incident_date: new Date().toISOString().slice(0, 10),
  422 |       incident_type: 'accident',
  423 |     }, ctx.driverToken);
  424 |     expect(r?.success).toBe(false);
  425 |   });
  426 | });
  427 | 
  428 | // ══════════════════════════════════════════════════════════════
  429 | // 5. รายงานความเหนื่อยล้า — Fatigue Reporting
  430 | // ══════════════════════════════════════════════════════════════
  431 | test.describe('5. รายงานความเหนื่อยล้า — Fatigue Reporting', () => {
  432 |   test('พนักงานขับรถรายงานความเหนื่อยล้าได้', async () => {
  433 |     if (!ctx.driverRecordId) return test.skip();
  434 |     const r = await apiPost('/api/drivers/fatigue/report', {
  435 |       driver_id: ctx.driverRecordId,
  436 |       reason: 'นอนไม่หลับ — E2E test',
  437 |     }, ctx.driverToken);
  438 |     expect(r?.success).toBe(true);
  439 |   });
  440 | 
  441 |   test('driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)', async () => {
  442 |     const r = await fetch(`${BASE}/api/drivers/fatigue/list`, {
  443 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  444 |     });
> 445 |     expect(r.status).toBe(403);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  446 |   });
  447 | });
  448 | 
  449 | // ══════════════════════════════════════════════════════════════
  450 | // 6. โปรไฟล์ส่วนตัว — Profile & Account
  451 | // ══════════════════════════════════════════════════════════════
  452 | test.describe('6. โปรไฟล์ส่วนตัว — Profile & Account', () => {
  453 |   test('ดูโปรไฟล์ตัวเองได้ (GET /api/auth/me)', async () => {
  454 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  455 |     expect(r?.success).toBe(true);
  456 |     expect(r?.data?.role).toBe('driver');
  457 |   });
  458 | 
  459 |   test('เปลี่ยนรหัสผ่านได้ (change-password flow)', async () => {
  460 |     clearRateLimits();
  461 |     // เปลี่ยนเป็นรหัสใหม่
  462 |     const r1 = await apiPost('/api/auth/change-password', {
  463 |       old_password: DRIVER_USER.password,
  464 |       new_password: TEST_DRIVER_PASS_NEW,
  465 |     }, ctx.driverToken);
  466 |     expect(r1?.success).toBe(true);
  467 | 
  468 |     // Login ด้วยรหัสใหม่
  469 |     clearRateLimits();
  470 |     const r2 = await apiPost('/api/auth/login', {
  471 |       username: DRIVER_USER.email,
  472 |       password: TEST_DRIVER_PASS_NEW,
  473 |     });
  474 |     expect(r2?.data?.token).toBeTruthy();
  475 | 
  476 |     // เปลี่ยนเป็นรหัสที่ 3 (ห้ามใช้รหัสเดิมเพราะอยู่ใน password_history)
  477 |     clearRateLimits();
  478 |     const r3 = await apiPost('/api/auth/change-password', {
  479 |       old_password: TEST_DRIVER_PASS_NEW,
  480 |       new_password: TEST_DRIVER_PASS_ALT,
  481 |     }, r2.data.token);
  482 |     expect(r3?.success).toBe(true);
  483 |     clearRateLimits();
  484 |   });
  485 | 
  486 |   test('เปลี่ยนรหัสผ่านด้วยรหัสเดิมผิด → error', async () => {
  487 |     clearRateLimits();
  488 |     const r = await apiPost('/api/auth/change-password', {
  489 |       old_password: 'WrongOld@999',
  490 |       new_password: 'NewPass@123',
  491 |     }, ctx.driverToken);
  492 |     expect(r?.success).toBe(false);
  493 |     clearRateLimits();
  494 |   });
  495 | });
  496 | 
  497 | // ══════════════════════════════════════════════════════════════
  498 | // 7. การแจ้งเตือน — Notifications
  499 | // ══════════════════════════════════════════════════════════════
  500 | test.describe('7. การแจ้งเตือน — Notifications', () => {
  501 |   test('ดูการแจ้งเตือนของตัวเองได้', async () => {
  502 |     const r = await apiGet('/api/notifications', ctx.driverToken);
  503 |     expect(r?.success).toBe(true);
  504 |     expect(Array.isArray(r?.data?.notifications)).toBe(true);
  505 |   });
  506 | 
  507 |   test('ดูจำนวนแจ้งเตือนที่ยังไม่อ่านได้', async () => {
  508 |     const r = await apiGet('/api/notifications?unread=true', ctx.driverToken);
  509 |     expect(r?.success).toBe(true);
  510 |   });
  511 | });
  512 | 
  513 | // ══════════════════════════════════════════════════════════════
  514 | // 8. ขอบเขตสิทธิ์ — Permission Boundaries
  515 | // ══════════════════════════════════════════════════════════════
  516 | test.describe('8. ขอบเขตสิทธิ์ — Permission Boundaries (API)', () => {
  517 |   test('ดูรายการรถได้ (vehicles:view → 200, driver เห็นได้)', async () => {
  518 |     const r = await fetch(`${BASE}/api/vehicles`, {
  519 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  520 |     });
  521 |     // API อนุญาต driver ดูรายการรถ
  522 |     expect(r.status).toBe(200);
  523 |   });
  524 | 
  525 |   test('ไม่สามารถสร้างรถได้ (vehicles:create → 403)', async () => {
  526 |     const r = await fetch(`${BASE}/api/vehicles`, {
  527 |       method: 'POST',
  528 |       headers: {
  529 |         'Authorization': `Bearer ${ctx.driverToken}`,
  530 |         'Content-Type': 'application/json',
  531 |       },
  532 |       body: JSON.stringify({ license_plate: 'ผิดกฎ-999', brand: 'Hack' }),
  533 |     });
  534 |     expect(r.status).toBe(403);
  535 |   });
  536 | 
  537 |   test('ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)', async () => {
  538 |     const r = await fetch(`${BASE}/api/drivers`, {
  539 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  540 |     });
  541 |     expect(r.status).toBe(403);
  542 |   });
  543 | 
  544 |   test('ไม่สามารถดูรายการน้ำมันได้ (fuel:view → 403)', async () => {
  545 |     const r = await fetch(`${BASE}/api/fuel/log`, {
```