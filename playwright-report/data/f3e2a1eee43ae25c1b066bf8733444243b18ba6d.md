# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\qr-scan.spec.mjs >> 7. บันทึกด้วย driver_name_manual >> ดู record ผ่าน admin → มี driver_name_manual ถูกต้อง
- Location: tests\e2e\qr-scan.spec.mjs:586:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
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
  542 |     const autoDep = records.find(rec => rec.data_quality === 'auto_departure');
  543 |     expect(autoDep).toBeTruthy();
  544 |     expect(autoDep?.record_type).toBe('departure');
  545 |     expect(autoDep?.auto_notes).toMatch(/ระบบสร้างอัตโนมัติ/);
  546 |   });
  547 | 
  548 |   test('สถานะหลัง auto-heal → in (return ล่าสุดกว่า auto_departure)', async () => {
  549 |     if (!ctx.carAutoDepId) return;
  550 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoDepId}`);
  551 |     expect(r?.data?.status).toBe('in');
  552 |   });
  553 | });
  554 | 
  555 | // ══════════════════════════════════════════════════════════
  556 | // 7. บันทึกด้วย driver_name_manual (ไม่ต้องมี driver_id)
  557 | //    สำหรับผู้ใช้ทั่วไปที่สแกน QR โดยไม่มีระบบ
  558 | // ══════════════════════════════════════════════════════════
  559 | test.describe('7. บันทึกด้วย driver_name_manual', () => {
  560 |   test('บันทึกออก (departure) ด้วย driver_name_manual สำเร็จ', async () => {
  561 |     if (!ctx.carManualId) return;
  562 |     const r = await apiPost('/api/usage/record', {
  563 |       car_id: ctx.carManualId,
  564 |       record_type: 'departure',
  565 |       driver_name_manual: 'นายแมนวล ทดสอบ',
  566 |       mileage: 5000,
  567 |       datetime: DT.MAN_DEP,
  568 |       destination: 'ตลาดเทศบาล',
  569 |     });
  570 |     expect(r?.success).toBe(true);
  571 |     expect(r?.data?.id).toBeTruthy();
  572 |   });
  573 | 
  574 |   test('บันทึกกลับ (return) ด้วย driver_name_manual สำเร็จ', async () => {
  575 |     if (!ctx.carManualId) return;
  576 |     const r = await apiPost('/api/usage/record', {
  577 |       car_id: ctx.carManualId,
  578 |       record_type: 'return',
  579 |       driver_name_manual: 'นายแมนวล ทดสอบ',
  580 |       mileage: 5080,
  581 |       datetime: DT.MAN_RET,
  582 |     });
  583 |     expect(r?.success).toBe(true);
  584 |   });
  585 | 
  586 |   test('ดู record ผ่าน admin → มี driver_name_manual ถูกต้อง', async () => {
  587 |     if (!ctx.carManualId || !ctx.adminToken) return;
  588 |     const r = await apiGet(`/api/usage?car_id=${ctx.carManualId}`, ctx.adminToken);
  589 |     const rows = r?.data || [];
  590 |     const withManual = rows.find(row => row.driver_name_manual === 'นายแมนวล ทดสอบ');
> 591 |     expect(withManual).toBeTruthy();
      |                        ^ Error: expect(received).toBeTruthy()
  592 |     // driver_id ต้องเป็น null (ไม่ได้ระบุ)
  593 |     expect(withManual?.driver_id).toBeFalsy();
  594 |   });
  595 | });
  596 | 
  597 | // ══════════════════════════════════════════════════════════
  598 | // 8. บันทึกพร้อม queue_id (เชื่อมโยงคิว)
  599 | // ══════════════════════════════════════════════════════════
  600 | test.describe('8. บันทึกพร้อม queue_id (เชื่อมโยงคิว)', () => {
  601 |   test('บันทึกออกพร้อม queue_id → success', async () => {
  602 |     if (!ctx.carQueueId || !ctx.driverId || !ctx.queueId) return;
  603 |     const r = await apiPost('/api/usage/record', {
  604 |       car_id: ctx.carQueueId,
  605 |       record_type: 'departure',
  606 |       driver_id: ctx.driverId,
  607 |       queue_id: ctx.queueId,
  608 |       mileage: 8000,
  609 |       datetime: DT.QID_DEP,
  610 |     });
  611 |     expect(r?.success).toBe(true);
  612 |     expect(r?.data?.id).toBeTruthy();
  613 |   });
  614 | 
  615 |   test('ดู record → queue_id ตรงกันกับที่บันทึก', async () => {
  616 |     if (!ctx.carQueueId || !ctx.queueId || !ctx.adminToken) return;
  617 |     const r = await apiGet(`/api/usage?queue_id=${ctx.queueId}`, ctx.adminToken);
  618 |     const rows = r?.data || [];
  619 |     expect(rows.length).toBeGreaterThan(0);
  620 |     rows.forEach(row => expect(row.queue_id).toBe(ctx.queueId));
  621 |   });
  622 | });
  623 | 
  624 | // ══════════════════════════════════════════════════════════
  625 | // 9. QR Daily Check (/api/check/daily)
  626 | // PUBLIC endpoint — ตรวจสภาพรถก่อนออก/หลังกลับ
  627 | // ══════════════════════════════════════════════════════════
  628 | test.describe('9. QR Daily Check', () => {
  629 |   test('ไม่มี car_id → error', async () => {
  630 |     const r = await apiPost('/api/check/daily', {
  631 |       inspector_name: 'ทดสอบ', overall_status: 'ok',
  632 |     });
  633 |     expect(r?.success).toBe(false);
  634 |   });
  635 | 
  636 |   test('บันทึกตรวจสภาพรถสถานะ ok สำเร็จ', async () => {
  637 |     if (!ctx.carId) return;
  638 |     const today = new Date();
  639 |     const r = await apiPost('/api/check/daily', {
  640 |       car_id: ctx.carId,
  641 |       inspector_name: 'พนักงานตรวจสอบ',
  642 |       date: today.toISOString().slice(0, 10),
  643 |       time: '08:00',
  644 |       overall_status: 'ok',
  645 |       tire_condition: 'ok',
  646 |       brake_condition: 'ok',
  647 |       light_condition: 'ok',
  648 |       notes: 'ตรวจสภาพปกติ ไม่พบปัญหา',
  649 |     });
  650 |     expect(r?.success).toBe(true);
  651 |     expect(r?.data?.id).toBeTruthy();
  652 |     expect(r?.data?.message).toMatch(/เรียบร้อย|สำเร็จ/);
  653 |   });
  654 | 
  655 |   test('บันทึกตรวจสภาพสถานะ warning (พบปัญหา) → สำเร็จ + สร้าง alert', async () => {
  656 |     if (!ctx.carId) return;
  657 |     const today = new Date();
  658 |     const r = await apiPost('/api/check/daily', {
  659 |       car_id: ctx.carId,
  660 |       inspector_name: 'ช่างตรวจสอบ',
  661 |       date: today.toISOString().slice(0, 10),
  662 |       time: '09:00',
  663 |       overall_status: 'warning',
  664 |       // ไม่ส่ง issues_found: true เพราะ API จะแปลงเป็น critical อัตโนมัติ
  665 |       issue_description: 'ยางล้อหน้าแบนเล็กน้อย',
  666 |     });
  667 |     expect(r?.success).toBe(true);
  668 |     expect(r?.data?.id).toBeTruthy();
  669 |   });
  670 | 
  671 |   test('บันทึกตรวจสภาพสถานะ critical → สำเร็จ', async () => {
  672 |     if (!ctx.carId) return;
  673 |     const today = new Date();
  674 |     const r = await apiPost('/api/check/daily', {
  675 |       car_id: ctx.carId,
  676 |       inspector_name: 'ช่างใหญ่',
  677 |       date: today.toISOString().slice(0, 10),
  678 |       time: '10:00',
  679 |       overall_status: 'critical',
  680 |       issue_description: 'เบรกบกพร่อง ต้องซ่อมก่อนออก',
  681 |       issues_found: true,
  682 |       checks: { brake: 'fail' },
  683 |     });
  684 |     expect(r?.success).toBe(true);
  685 |   });
  686 | 
  687 |   test('ค้นหารถด้วย license_plate → สำเร็จ', async () => {
  688 |     // qr-info ใช้ license_plate ค้นหาได้
  689 |     const r = await apiPost('/api/check/daily', {
  690 |       car_id: 'QR-001',   // license_plate
  691 |       inspector_name: 'ทดสอบ license_plate',
```