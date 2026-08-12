# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 9. Repair >> POST /api/repair/log — สร้างรายการซ่อม
- Location: tests\api-integration.test.mjs:614:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 400
```

# Test source

```ts
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
> 622 |     expect(r.status).toBe(201);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  645 |     expect(r.status).toBe(200);
  646 |     expect(r.data.success).toBe(true);
  647 |   });
  648 | 
  649 |   test('GET /api/repair/scheduled — ดูรายการซ่อมตามกำหนด', async () => {
  650 |     const r = await get('/api/repair/scheduled', adminToken);
  651 |     expect(r.status).toBe(200);
  652 |     expect(r.data.success).toBe(true);
  653 |   });
  654 | });
  655 | 
  656 | // ════════════════════════════════════════════
  657 | // 10. TAX & INSURANCE
  658 | // ════════════════════════════════════════════
  659 | test.describe.serial('10. Tax & Insurance', () => {
  660 |   test('POST /api/tax-insurance/tax — สร้างข้อมูลภาษี', async () => {
  661 |     const r = await post('/api/tax-insurance/tax', {
  662 |       car_id: createdVehicleId,
  663 |       tax_type: 'annual_tax',
  664 |       amount: 5000,
  665 |       paid_date: '2026-01-15',
  666 |       expiry_date: '2027-01-14',
  667 |     }, adminToken);
  668 |     expect(r.status).toBe(201);
  669 |     expect(r.data.success).toBe(true);
  670 |     createdTaxId = r.data.id || r.data.data?.id;
  671 |     expect(createdTaxId).toBeTruthy();
  672 |   });
  673 | 
  674 |   test('GET /api/tax-insurance/tax — ดูข้อมูลภาษี', async () => {
  675 |     const r = await get('/api/tax-insurance/tax', adminToken);
  676 |     expect(r.status).toBe(200);
  677 |     expect(r.data.success).toBe(true);
  678 |   });
  679 | 
  680 |   test('PUT /api/tax-insurance/tax/:id — อัปเดตภาษี', async () => {
  681 |     const r = await put(`/api/tax-insurance/tax/${createdTaxId}`, {
  682 |       amount: 5500,
  683 |     }, adminToken);
  684 |     expect(r.status).toBe(200);
  685 |     expect(r.data.success).toBe(true);
  686 |   });
  687 | 
  688 |   test('POST /api/tax-insurance/insurance — สร้างข้อมูลประกัน', async () => {
  689 |     const r = await post('/api/tax-insurance/insurance', {
  690 |       car_id: createdVehicleId,
  691 |       insurance_type: 'voluntary',
  692 |       insurance_company: 'บริษัททดสอบ',
  693 |       policy_number: 'POL-TEST-001',
  694 |       amount: 15000,
  695 |       paid_date: '2026-01-01',
  696 |       expiry_date: '2027-01-01',
  697 |     }, adminToken);
  698 |     expect(r.status).toBe(201);
  699 |     expect(r.data.success).toBe(true);
  700 |     createdInsuranceId = r.data.id || r.data.data?.id;
  701 |     expect(createdInsuranceId).toBeTruthy();
  702 |   });
  703 | 
  704 |   test('GET /api/tax-insurance/insurance — ดูข้อมูลประกัน', async () => {
  705 |     const r = await get('/api/tax-insurance/insurance', adminToken);
  706 |     expect(r.status).toBe(200);
  707 |     expect(r.data.success).toBe(true);
  708 |   });
  709 | 
  710 |   test('GET /api/tax-insurance/expiring — ดูรายการใกล้หมดอายุ', async () => {
  711 |     const r = await get('/api/tax-insurance/expiring?days=365', adminToken);
  712 |     expect(r.status).toBe(200);
  713 |     expect(r.data.success).toBe(true);
  714 |   });
  715 | });
  716 | 
  717 | // ════════════════════════════════════════════
  718 | // 11. MAINTENANCE
  719 | // ════════════════════════════════════════════
  720 | test.describe.serial('11. Maintenance', () => {
  721 |   test('GET /api/maintenance/settings — ดูรายการบำรุงรักษา', async () => {
  722 |     const r = await get('/api/maintenance/settings', adminToken);
```