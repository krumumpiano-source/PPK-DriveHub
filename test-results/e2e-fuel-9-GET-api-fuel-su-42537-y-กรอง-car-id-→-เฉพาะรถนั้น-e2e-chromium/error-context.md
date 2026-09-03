# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\fuel.spec.mjs >> 9. GET /api/fuel/summary — สรุปการใช้น้ำมัน >> summary กรอง car_id → เฉพาะรถนั้น
- Location: tests\e2e\fuel.spec.mjs:639:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  543 |     const rows = r?.data || [];
  544 |     expect(rows.length).toBeGreaterThanOrEqual(1);
  545 |     rows.forEach(row => expect(row.car_id).toBe(ctx.fuelCar1Id));
  546 |   });
  547 | 
  548 |   test('กรอง date_from/date_to → เฉพาะช่วงวันที่', async () => {
  549 |     if (!ctx.adminToken) return;
  550 |     const r = await apiGet('/api/fuel/log?date_from=2020-03-01&date_to=2020-03-31', ctx.adminToken);
  551 |     expect(r?.success).toBe(true);
  552 |     const rows = r?.data || [];
  553 |     rows.forEach(row => {
  554 |       expect(row.date >= '2020-03-01').toBe(true);
  555 |       expect(row.date <= '2020-03-31').toBe(true);
  556 |     });
  557 |   });
  558 | 
  559 |   test('GET /api/fuel/log/:id → details ถูกต้อง', async () => {
  560 |     if (!ctx.fuelLogId || !ctx.adminToken) return;
  561 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId}`, ctx.adminToken);
  562 |     expect(r?.success).toBe(true);
  563 |     expect(r?.data?.id).toBe(ctx.fuelLogId);
  564 |     expect(r?.data?.car_id).toBe(ctx.fuelCar1Id);
  565 |     expect(r?.data?.driver_id).toBe(ctx.driverId);
  566 |     expect(r?.data?.liters).toBe(40);
  567 |     expect(r?.data?.document_number).toBe(ctx.docNumber);
  568 |   });
  569 | 
  570 |   test('ไม่มี token → 401', async () => {
  571 |     const r = await fetch(`${BASE}/api/fuel/log`).then(x => x.json()).catch(() => null);
  572 |     expect(r?.success).toBe(false);
  573 |   });
  574 | });
  575 | 
  576 | // ══════════════════════════════════════════════════════════
  577 | // 7. PUT /api/fuel/log/:id — แก้ไขบันทึกน้ำมัน (Auth)
  578 | // ══════════════════════════════════════════════════════════
  579 | test.describe('7. PUT /api/fuel/log/:id — แก้ไขบันทึก', () => {
  580 |   test('อัปเดต gas_station_name และ notes → สำเร็จ', async () => {
  581 |     if (!ctx.fuelLogId2 || !ctx.adminToken) return;
  582 |     const r = await apiPut(`/api/fuel/log/${ctx.fuelLogId2}`, {
  583 |       gas_station_name: 'ปั๊ม ESSO สาขาอัปเดต',
  584 |       notes: 'แก้ไขชื่อปั๊มแล้ว',
  585 |     }, ctx.adminToken);
  586 |     expect(r?.success).toBe(true);
  587 |   });
  588 | 
  589 |   test('ตรวจ GET หลัง PUT → ข้อมูลเปลี่ยนแล้ว', async () => {
  590 |     if (!ctx.fuelLogId2 || !ctx.adminToken) return;
  591 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
  592 |     expect(r?.data?.gas_station_name).toBe('ปั๊ม ESSO สาขาอัปเดต');
  593 |     expect(r?.data?.notes).toBe('แก้ไขชื่อปั๊มแล้ว');
  594 |   });
  595 | 
  596 |   test('PUT ไม่มี token → 401', async () => {
  597 |     if (!ctx.fuelLogId2) return;
  598 |     const r = await apiPut(`/api/fuel/log/${ctx.fuelLogId2}`, { notes: 'แก้ไขโดยไม่มีสิทธิ์' });
  599 |     expect(r?.success).toBe(false);
  600 |   });
  601 | });
  602 | 
  603 | // ══════════════════════════════════════════════════════════
  604 | // 8. DELETE /api/fuel/log/:id — Soft Delete (Auth)
  605 | // ══════════════════════════════════════════════════════════
  606 | test.describe('8. DELETE /api/fuel/log/:id — Soft Delete', () => {
  607 |   test('ลบรายการน้ำมัน (Soft Delete) → สำเร็จ', async () => {
  608 |     if (!ctx.fuelDeleteId || !ctx.adminToken) return;
  609 |     const r = await apiDelete(`/api/fuel/log/${ctx.fuelDeleteId}`, ctx.adminToken);
  610 |     expect(r?.success).toBe(true);
  611 |     expect(r?.data?.message).toMatch(/Soft Delete/);
  612 |   });
  613 | 
  614 |   test('หลัง delete — GET /:id → ไม่พบ (soft deleted)', async () => {
  615 |     if (!ctx.fuelDeleteId || !ctx.adminToken) return;
  616 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelDeleteId}`, ctx.adminToken);
  617 |     expect(r?.success).toBe(false);
  618 |   });
  619 | 
  620 |   test('DELETE ไม่มี token → 401', async () => {
  621 |     const r = await apiDelete('/api/fuel/log/some-fake-id-xyz');
  622 |     expect(r?.success).toBe(false);
  623 |   });
  624 | });
  625 | 
  626 | // ══════════════════════════════════════════════════════════
  627 | // 9. GET /api/fuel/summary — สรุปการใช้น้ำมัน (Auth)
  628 | // ══════════════════════════════════════════════════════════
  629 | test.describe('9. GET /api/fuel/summary — สรุปการใช้น้ำมัน', () => {
  630 |   test('ดึง summary ทั้งหมด → count > 0', async () => {
  631 |     if (!ctx.adminToken) return;
  632 |     const r = await apiGet('/api/fuel/summary', ctx.adminToken);
  633 |     expect(r?.success).toBe(true);
  634 |     expect(r?.data?.count).toBeGreaterThan(0);
  635 |     expect(r?.data?.total_liters).toBeGreaterThan(0);
  636 |     expect(r?.data?.total_amount).toBeGreaterThanOrEqual(0);
  637 |   });
  638 | 
  639 |   test('summary กรอง car_id → เฉพาะรถนั้น', async () => {
  640 |     if (!ctx.fuelCar1Id || !ctx.adminToken) return;
  641 |     const r = await apiGet(`/api/fuel/summary?car_id=${ctx.fuelCar1Id}`, ctx.adminToken);
  642 |     expect(r?.success).toBe(true);
> 643 |     expect(r?.data?.count).toBeGreaterThan(0);
      |                            ^ Error: expect(received).toBeGreaterThan(expected)
  644 |   });
  645 | 
  646 |   test('summary กรอง month → เฉพาะเดือนนั้น', async () => {
  647 |     if (!ctx.adminToken) return;
  648 |     const r = await apiGet('/api/fuel/summary?month=2020-03', ctx.adminToken);
  649 |     expect(r?.success).toBe(true);
  650 |     expect(r?.data).toBeDefined();
  651 |   });
  652 | });
  653 | 
  654 | // ══════════════════════════════════════════════════════════
  655 | // 10. Fuel Requests — คำขอเบิกน้ำมัน (Auth)
  656 | //     POST/GET /api/fuel/requests
  657 | //     PUT /api/fuel/requests/:id/approve
  658 | //     PUT /api/fuel/requests/:id/reject
  659 | // ══════════════════════════════════════════════════════════
  660 | test.describe('10. Fuel Requests — คำขอเบิกน้ำมัน', () => {
  661 |   test('สร้างคำขอเบิกน้ำมัน → สำเร็จ + status: pending', async () => {
  662 |     if (!ctx.fuelCar1Id || !ctx.adminToken) return;
  663 |     const r = await apiPost('/api/fuel/requests', {
  664 |       car_id: ctx.fuelCar1Id,
  665 |       requested_amount: 1500,
  666 |       requested_liters: 50,
  667 |       reason: 'เติมน้ำมันสำหรับภารกิจออกต่างจังหวัด',
  668 |     }, ctx.adminToken);
  669 |     expect(r?.success).toBe(true);
  670 |     expect(r?.data?.id).toBeTruthy();
  671 |     ctx.requestId = r.data.id;
  672 |   });
  673 | 
  674 |   test('GET /api/fuel/requests → มีรายการที่เพิ่งสร้าง', async () => {
  675 |     if (!ctx.requestId || !ctx.adminToken) return;
  676 |     const r = await apiGet('/api/fuel/requests', ctx.adminToken);
  677 |     expect(r?.success).toBe(true);
  678 |     const ids = (r?.data || []).map(x => x.id);
  679 |     expect(ids).toContain(ctx.requestId);
  680 |   });
  681 | 
  682 |   test('GET ?status=pending → เฉพาะ pending', async () => {
  683 |     if (!ctx.adminToken) return;
  684 |     const r = await apiGet('/api/fuel/requests?status=pending', ctx.adminToken);
  685 |     expect(r?.success).toBe(true);
  686 |     (r?.data || []).forEach(req => expect(req.status).toBe('pending'));
  687 |   });
  688 | 
  689 |   test('อนุมัติคำขอ (approve) → สำเร็จ', async () => {
  690 |     if (!ctx.requestId || !ctx.adminToken) return;
  691 |     const r = await apiPut(`/api/fuel/requests/${ctx.requestId}/approve`, {}, ctx.adminToken);
  692 |     expect(r?.success).toBe(true);
  693 |   });
  694 | 
  695 |   test('สร้างคำขอใหม่แล้ว reject → สำเร็จ', async () => {
  696 |     if (!ctx.fuelCar2Id || !ctx.adminToken) return;
  697 |     const newReq = await apiPost('/api/fuel/requests', {
  698 |       car_id: ctx.fuelCar2Id,
  699 |       requested_amount: 500,
  700 |       reason: 'ทดสอบการ reject',
  701 |     }, ctx.adminToken);
  702 |     expect(newReq?.data?.id).toBeTruthy();
  703 |     const r = await apiPut(`/api/fuel/requests/${newReq.data.id}/reject`, {}, ctx.adminToken);
  704 |     expect(r?.success).toBe(true);
  705 |   });
  706 | 
  707 |   test('POST ไม่ส่ง car_id → error', async () => {
  708 |     if (!ctx.adminToken) return;
  709 |     const r = await apiPost('/api/fuel/requests', {
  710 |       requested_amount: 1000,
  711 |       reason: 'ไม่มีรถ',
  712 |     }, ctx.adminToken);
  713 |     expect(r?.success).toBe(false);
  714 |   });
  715 | });
  716 | 
  717 | // ══════════════════════════════════════════════════════════
  718 | // 11. Fuel Invoices — ใบเบิกจากปั๊ม + Reconcile (Auth)
  719 | //     POST/GET /api/fuel/invoices
  720 | //     GET /api/fuel/invoices/:id/reconcile
  721 | //     PUT /api/fuel/invoices/:id/resolve
  722 | // ══════════════════════════════════════════════════════════
  723 | test.describe('11. Fuel Invoices — ใบเบิกจากปั๊ม + Reconcile', () => {
  724 |   test('สร้างใบเบิกจากปั๊ม → สำเร็จ', async () => {
  725 |     if (!ctx.adminToken) return;
  726 |     const r = await apiPost('/api/fuel/invoices', {
  727 |       station_name: 'ปั๊ม PTT สาขาทดสอบ',
  728 |       date_from: '2020-03-01',
  729 |       date_to: '2020-03-31',
  730 |       invoice_date: '2020-04-01',
  731 |       invoice_number: 'INV-2020-03-001',
  732 |       total_amount: 3000,
  733 |       notes: 'ใบแจ้งหนี้ประจำเดือนมีนาคม',
  734 |       items: [
  735 |         { fuel_type: 'fuelSave_diesel_b7', total_liters: 100, total_amount: 3000 },
  736 |       ],
  737 |     }, ctx.adminToken);
  738 |     expect(r?.success).toBe(true);
  739 |     expect(r?.data?.id).toBeTruthy();
  740 |     ctx.invoiceId = r.data.id;
  741 |   });
  742 | 
  743 |   test('GET /api/fuel/invoices → มีใบเบิกที่สร้าง', async () => {
```