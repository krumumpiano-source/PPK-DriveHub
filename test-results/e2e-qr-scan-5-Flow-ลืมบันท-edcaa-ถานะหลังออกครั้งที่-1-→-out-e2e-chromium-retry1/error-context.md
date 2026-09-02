# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\qr-scan.spec.mjs >> 5. Flow ลืมบันทึกกลับ — Auto-Heal Return >> สถานะหลังออกครั้งที่ 1 → out
- Location: tests\e2e\qr-scan.spec.mjs:438:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "out"
Received: undefined
```

# Test source

```ts
  341 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
  342 |     expect(r?.success).toBe(true);
  343 |     expect(r?.data?.status).toBe('out');
  344 |     expect(r?.data?.last_record_type).toBe('departure');
  345 |     expect(r?.data?.mileage).toBe(10000);
  346 |   });
  347 | 
  348 |   test('บันทึกกลับ (return) สมบูรณ์ — สำเร็จ ไม่มี auto_heal', async () => {
  349 |     if (!ctx.carId || !ctx.driverId) return;
  350 |     const r = await apiPost('/api/usage/record', {
  351 |       car_id: ctx.carId,
  352 |       record_type: 'return',
  353 |       driver_id: ctx.driverId,
  354 |       datetime: DT.RET,  // 14:00 > 08:00 — ชัดเจน
  355 |       mileage: 10120,
  356 |       notes: 'กลับเรียบร้อย',
  357 |     });
  358 |     expect(r?.success).toBe(true);
  359 |     expect(r?.data?.id).toBeTruthy();
  360 |     // กลับหลัง departure → ไม่มี auto_heal
  361 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
  362 |     expect(r?.data?.auto_healed?.length).toBe(0);
  363 |   });
  364 | 
  365 |   test('สถานะหลังบันทึกกลับ → in', async () => {
  366 |     if (!ctx.carId) return;
  367 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
  368 |     expect(r?.success).toBe(true);
  369 |     expect(r?.data?.status).toBe('in');
  370 |     expect(r?.data?.last_record_type).toBe('return');
  371 |     expect(r?.data?.mileage).toBe(10120);
  372 |   });
  373 | 
  374 |   test('ดู usage records ผ่าน admin → มีทั้ง departure และ return', async () => {
  375 |     if (!ctx.carId || !ctx.adminToken) return;
  376 |     const r = await apiGet(`/api/usage?car_id=${ctx.carId}`, ctx.adminToken);
  377 |     expect(r?.success).toBe(true);
  378 |     const rows = r?.data || [];
  379 |     const depRows = rows.filter(x => x.record_type === 'departure');
  380 |     const retRows = rows.filter(x => x.record_type === 'return');
  381 |     expect(depRows.length).toBeGreaterThanOrEqual(1);
  382 |     expect(retRows.length).toBeGreaterThanOrEqual(1);
  383 |     // ตรวจสอบ driver_id ตรงกัน
  384 |     const dep = depRows[0];
  385 |     expect(dep.driver_id).toBe(ctx.driverId);
  386 |     expect(dep.destination).toBe('สำนักงานใหญ่');
  387 |     expect(dep.purpose).toBe('ราชการ');
  388 |   });
  389 | 
  390 |   test('บันทึก record_type: refuel สำเร็จ', async () => {
  391 |     if (!ctx.carId || !ctx.driverId) return;
  392 |     const r = await apiPost('/api/usage/record', {
  393 |       car_id: ctx.carId,
  394 |       record_type: 'refuel',
  395 |       driver_id: ctx.driverId,
  396 |       datetime: DT.REFUEL,
  397 |       mileage: 10150,
  398 |       notes: 'เติมน้ำมัน 40 ลิตร',
  399 |     });
  400 |     expect(r?.success).toBe(true);
  401 |     expect(r?.data?.id).toBeTruthy();
  402 |   });
  403 | 
  404 |   test('บันทึก record_type: inspection สำเร็จ', async () => {
  405 |     if (!ctx.carId || !ctx.driverId) return;
  406 |     const r = await apiPost('/api/usage/record', {
  407 |       car_id: ctx.carId,
  408 |       record_type: 'inspection',
  409 |       driver_id: ctx.driverId,
  410 |       datetime: DT.INSPECTION,
  411 |       notes: 'ตรวจสภาพรถประจำเดือน',
  412 |     });
  413 |     expect(r?.success).toBe(true);
  414 |   });
  415 | });
  416 | 
  417 | // ══════════════════════════════════════════════════════════
  418 | // 5. Flow ลืมบันทึกกลับ — Auto-Heal Return
  419 | //    departure → departure → auto-heal สร้าง return อัตโนมัติ
  420 | //    (ลด discipline_score ของพนักงาน)
  421 | // ══════════════════════════════════════════════════════════
  422 | test.describe('5. Flow ลืมบันทึกกลับ — Auto-Heal Return', () => {
  423 |   test('บันทึกออกครั้งที่ 1 สำเร็จ — ไม่มี auto_heal', async () => {
  424 |     if (!ctx.carAutoHealId || !ctx.driverAutoHealId) return;
  425 |     const r = await apiPost('/api/usage/record', {
  426 |       car_id: ctx.carAutoHealId,
  427 |       record_type: 'departure',
  428 |       driver_id: ctx.driverAutoHealId,
  429 |       datetime: DT.AH_DEP1,
  430 |       mileage: 20000,
  431 |       destination: 'ตลาด',
  432 |     });
  433 |     expect(r?.success).toBe(true);
  434 |     // บันทึกแรก ไม่มี auto_heal
  435 |     expect(r?.data?.auto_healed?.length).toBe(0);
  436 |   });
  437 | 
  438 |   test('สถานะหลังออกครั้งที่ 1 → out', async () => {
  439 |     if (!ctx.carAutoHealId) return;
  440 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoHealId}`);
> 441 |     expect(r?.data?.status).toBe('out');
      |                             ^ Error: expect(received).toBe(expected) // Object.is equality
  442 |   });
  443 | 
  444 |   test('บันทึกออกครั้งที่ 2 (ลืมบันทึกกลับ) → auto-heal สร้าง return อัตโนมัติ', async () => {
  445 |     if (!ctx.carAutoHealId || !ctx.driverAutoHealId) return;
  446 |     const r = await apiPost('/api/usage/record', {
  447 |       car_id: ctx.carAutoHealId,
  448 |       record_type: 'departure',
  449 |       driver_id: ctx.driverAutoHealId,
  450 |       datetime: DT.AH_DEP2,  // 16:00 > 08:00 ชัดเจน
  451 |       mileage: 20200,
  452 |       destination: 'โรงเรียน',
  453 |     });
  454 |     expect(r?.success).toBe(true);
  455 |     // ต้องมี auto_heal!
  456 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
  457 |     expect(r?.data?.auto_healed?.length).toBeGreaterThan(0);
  458 |     const healTypes = (r?.data?.auto_healed || []).map(h => h.type);
  459 |     expect(healTypes).toContain('auto_return');
  460 |   });
  461 | 
  462 |   test('auto_return record ถูกสร้างใน DB', async () => {
  463 |     if (!ctx.carAutoHealId || !ctx.adminToken) return;
  464 |     const r = await apiGet(`/api/usage?car_id=${ctx.carAutoHealId}`, ctx.adminToken);
  465 |     expect(r?.success).toBe(true);
  466 |     const records = r?.data || [];
  467 |     const autoReturn = records.find(rec => rec.data_quality === 'auto_return');
  468 |     expect(autoReturn).toBeTruthy();
  469 |     expect(autoReturn?.record_type).toBe('return');
  470 |     expect(autoReturn?.auto_notes).toMatch(/ระบบสร้างอัตโนมัติ/);
  471 |   });
  472 | 
  473 |   test('มี record ทั้งหมด 3 รายการ (dep1, auto_return, dep2)', async () => {
  474 |     if (!ctx.carAutoHealId || !ctx.adminToken) return;
  475 |     const r = await apiGet(`/api/usage?car_id=${ctx.carAutoHealId}`, ctx.adminToken);
  476 |     const records = r?.data || [];
  477 |     // departure: 2, return: 1 (auto_return)
  478 |     const deps = records.filter(x => x.record_type === 'departure');
  479 |     const rets = records.filter(x => x.record_type === 'return');
  480 |     expect(deps.length).toBeGreaterThanOrEqual(2);
  481 |     expect(rets.length).toBeGreaterThanOrEqual(1);
  482 |   });
  483 | 
  484 |   test('discipline_score ของพนักงานถูกหักหลัง auto-heal', async () => {
  485 |     if (!ctx.driverAutoHealId || !ctx.adminToken) return;
  486 |     const r = await apiGet(`/api/drivers/${ctx.driverAutoHealId}`, ctx.adminToken);
  487 |     expect(r?.success).toBe(true);
  488 |     // ค่าเดิม = 100 (default), หลัง auto_return ต้องน้อยกว่า 100
  489 |     const score = r?.data?.discipline_score;
  490 |     expect(typeof score).toBe('number');
  491 |     expect(score).toBeLessThan(100);
  492 |   });
  493 | });
  494 | 
  495 | // ══════════════════════════════════════════════════════════
  496 | // 6. Flow ลืมบันทึกออก — Auto-Heal Departure
  497 | //    return → return → auto-heal สร้าง departure อัตโนมัติ
  498 | // ══════════════════════════════════════════════════════════
  499 | test.describe('6. Flow ลืมบันทึกออก — Auto-Heal Departure', () => {
  500 |   test('บันทึกกลับครั้งที่ 1 (ไม่มี departure ก่อน) สำเร็จ — ไม่มี auto_heal', async () => {
  501 |     if (!ctx.carAutoDepId || !ctx.driverAutoHealId) return;
  502 |     const r = await apiPost('/api/usage/record', {
  503 |       car_id: ctx.carAutoDepId,
  504 |       record_type: 'return',
  505 |       driver_id: ctx.driverAutoHealId,
  506 |       datetime: DT.AD_RET1,
  507 |       mileage: 30100,
  508 |     });
  509 |     expect(r?.success).toBe(true);
  510 |     // บันทึกแรก (ไม่มี previous return) → ไม่มี auto_heal
  511 |     expect(r?.data?.auto_healed?.length).toBe(0);
  512 |   });
  513 | 
  514 |   test('สถานะหลังกลับครั้งที่ 1 → in', async () => {
  515 |     if (!ctx.carAutoDepId) return;
  516 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoDepId}`);
  517 |     expect(r?.data?.status).toBe('in');
  518 |   });
  519 | 
  520 |   test('บันทึกกลับครั้งที่ 2 (ลืมบันทึกออก) → auto-heal สร้าง departure อัตโนมัติ', async () => {
  521 |     if (!ctx.carAutoDepId || !ctx.driverAutoHealId) return;
  522 |     const r = await apiPost('/api/usage/record', {
  523 |       car_id: ctx.carAutoDepId,
  524 |       record_type: 'return',
  525 |       driver_id: ctx.driverAutoHealId,
  526 |       datetime: DT.AD_RET2,  // 16:00 > 08:00 ชัดเจน
  527 |       mileage: 30300,
  528 |     });
  529 |     expect(r?.success).toBe(true);
  530 |     // ต้องมี auto_heal!
  531 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
  532 |     expect(r?.data?.auto_healed?.length).toBeGreaterThan(0);
  533 |     const healTypes = (r?.data?.auto_healed || []).map(h => h.type);
  534 |     expect(healTypes).toContain('auto_departure');
  535 |   });
  536 | 
  537 |   test('auto_departure record ถูกสร้างใน DB', async () => {
  538 |     if (!ctx.carAutoDepId || !ctx.adminToken) return;
  539 |     const r = await apiGet(`/api/usage?car_id=${ctx.carAutoDepId}`, ctx.adminToken);
  540 |     expect(r?.success).toBe(true);
  541 |     const records = r?.data || [];
```