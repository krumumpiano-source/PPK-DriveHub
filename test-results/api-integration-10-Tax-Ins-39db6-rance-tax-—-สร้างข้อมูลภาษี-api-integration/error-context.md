# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 10. Tax & Insurance >> POST /api/tax-insurance/tax — สร้างข้อมูลภาษี
- Location: tests\api-integration.test.mjs:660:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 400
```

# Test source

```ts
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
> 668 |     expect(r.status).toBe(201);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  723 |     expect(r.status).toBe(200);
  724 |     expect(r.data.success).toBe(true);
  725 |   });
  726 | 
  727 |   test('GET /api/maintenance/status — ดูสถานะบำรุงรักษาทุกคัน', async () => {
  728 |     const r = await get('/api/maintenance/status', adminToken);
  729 |     expect(r.status).toBe(200);
  730 |     expect(r.data.success).toBe(true);
  731 |   });
  732 | 
  733 |   test('GET /api/maintenance/alerts — ดูการแจ้งเตือนบำรุงรักษา', async () => {
  734 |     const r = await get('/api/maintenance/alerts', adminToken);
  735 |     expect(r.status).toBe(200);
  736 |     expect(r.data.success).toBe(true);
  737 |   });
  738 | 
  739 |   test('POST /api/maintenance/vehicle — บันทึกบำรุงรักษา', async () => {
  740 |     const r = await post('/api/maintenance/vehicle', {
  741 |       car_id: createdVehicleId,
  742 |       item_key: 'engine_oil',
  743 |       last_km: 15000,
  744 |       last_date: '2026-04-03',
  745 |       next_km: 20000,
  746 |       next_date: '2026-07-03',
  747 |     }, adminToken);
  748 |     expect([200, 201]).toContain(r.status);
  749 |     expect(r.data.success).toBe(true);
  750 |   });
  751 | 
  752 |   test('GET /api/maintenance/vehicle/:carId — ดูบำรุงรักษาตามรถ', async () => {
  753 |     const r = await get(`/api/maintenance/vehicle/${createdVehicleId}`, adminToken);
  754 |     expect(r.status).toBe(200);
  755 |     expect(r.data.success).toBe(true);
  756 |   });
  757 | });
  758 | 
  759 | // ════════════════════════════════════════════
  760 | // 12. REPORTS
  761 | // ════════════════════════════════════════════
  762 | test.describe.serial('12. Reports', () => {
  763 |   test('GET /api/reports/dashboard — สรุปภาพรวม', async () => {
  764 |     const r = await get('/api/reports/dashboard', adminToken);
  765 |     expect(r.status).toBe(200);
  766 |     expect(r.data.success).toBe(true);
  767 |     expect(r.data.data).toHaveProperty('vehicles');
  768 |     expect(r.data.data).toHaveProperty('drivers');
```