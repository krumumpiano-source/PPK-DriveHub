# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\fuel.spec.mjs >> 12. Permissions >> POST /api/fuel/record ไม่มี token → สำเร็จ (PUBLIC)
- Location: tests\e2e\fuel.spec.mjs:784:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  744 |     if (!ctx.invoiceId || !ctx.adminToken) return;
  745 |     const r = await apiGet('/api/fuel/invoices', ctx.adminToken);
  746 |     expect(r?.success).toBe(true);
  747 |     const ids = (r?.data || []).map(x => x.id);
  748 |     expect(ids).toContain(ctx.invoiceId);
  749 |   });
  750 | 
  751 |   test('GET /api/fuel/invoices/:id → มี items', async () => {
  752 |     if (!ctx.invoiceId || !ctx.adminToken) return;
  753 |     const r = await apiGet(`/api/fuel/invoices/${ctx.invoiceId}`, ctx.adminToken);
  754 |     expect(r?.success).toBe(true);
  755 |     expect(r?.data?.station_name).toBe('ปั๊ม PTT สาขาทดสอบ');
  756 |     expect(Array.isArray(r?.data?.items)).toBe(true);
  757 |     expect(r?.data?.items?.length).toBe(1);
  758 |   });
  759 | 
  760 |   test('GET reconcile → มี comparison + status', async () => {
  761 |     if (!ctx.invoiceId || !ctx.adminToken) return;
  762 |     const r = await apiGet(`/api/fuel/invoices/${ctx.invoiceId}/reconcile`, ctx.adminToken);
  763 |     expect(r?.success).toBe(true);
  764 |     expect(r?.data?.invoice).toBeDefined();
  765 |     expect(r?.data?.comparison).toBeDefined();
  766 |     expect(['matched', 'mismatched']).toContain(r?.data?.status);
  767 |   });
  768 | 
  769 |   test('PUT resolve → สำเร็จ + status: resolved', async () => {
  770 |     if (!ctx.invoiceId || !ctx.adminToken) return;
  771 |     const r = await apiPut(`/api/fuel/invoices/${ctx.invoiceId}/resolve`, {
  772 |       notes: 'ตรวจสอบแล้ว ยอดตรงกัน',
  773 |     }, ctx.adminToken);
  774 |     expect(r?.success).toBe(true);
  775 |     const check = await apiGet(`/api/fuel/invoices/${ctx.invoiceId}`, ctx.adminToken);
  776 |     expect(check?.data?.status).toBe('resolved');
  777 |   });
  778 | });
  779 | 
  780 | // ══════════════════════════════════════════════════════════
  781 | // 12. Permissions
  782 | // ══════════════════════════════════════════════════════════
  783 | test.describe('12. Permissions', () => {
  784 |   test('POST /api/fuel/record ไม่มี token → สำเร็จ (PUBLIC)', async () => {
  785 |     if (!ctx.fuelCar1Id || !ctx.driverId) return;
  786 |     const r = await fetch(`${BASE}/api/fuel/record`, {
  787 |       method: 'POST',
  788 |       headers: { 'Content-Type': 'application/json' },
  789 |       body: JSON.stringify({
  790 |         car_id: ctx.fuelCar1Id,
  791 |         driver_id: ctx.driverId,
  792 |         mileage_before: 11500,
  793 |         mileage_after: 11800,
  794 |         liters: 30,
  795 |         purpose: 'business',
  796 |         receipt_image: MOCK_RECEIPT,
  797 |         date: '2020-05-01',
  798 |       }),
  799 |     }).then(x => x.json()).catch(() => null);
> 800 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  801 |   });
  802 | 
  803 |   test('GET /api/fuel/log ไม่มี token → 401', async () => {
  804 |     const r = await fetch(`${BASE}/api/fuel/log`).then(x => x.json()).catch(() => null);
  805 |     expect(r?.success).toBe(false);
  806 |   });
  807 | 
  808 |   test('PUT /api/fuel/log/:id ไม่มี token → 401', async () => {
  809 |     const r = await fetch(`${BASE}/api/fuel/log/any-id`, {
  810 |       method: 'PUT',
  811 |       headers: { 'Content-Type': 'application/json' },
  812 |       body: JSON.stringify({ notes: 'ลองแก้ไข' }),
  813 |     }).then(x => x.json()).catch(() => null);
  814 |     expect(r?.success).toBe(false);
  815 |   });
  816 | 
  817 |   test('GET /api/fuel/summary ไม่มี token → 401', async () => {
  818 |     const r = await fetch(`${BASE}/api/fuel/summary`).then(x => x.json()).catch(() => null);
  819 |     expect(r?.success).toBe(false);
  820 |   });
  821 | 
  822 |   test('GET /api/fuel/invoices ไม่มี token → 401', async () => {
  823 |     const r = await fetch(`${BASE}/api/fuel/invoices`).then(x => x.json()).catch(() => null);
  824 |     expect(r?.success).toBe(false);
  825 |   });
  826 | });
  827 | 
  828 | // ══════════════════════════════════════════════════════════
  829 | // 13. UI Tests — โหลดหน้าเว็บ
  830 | // ══════════════════════════════════════════════════════════
  831 | test.describe('13. UI Tests — โหลดหน้าเว็บ', () => {
  832 |   test('qr-fuel-record.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
  833 |     const r = await page.goto(`${BASE}/qr-fuel-record.html`);
  834 |     expect(r?.status()).toBeLessThan(500);
  835 |     await expect(page).toHaveTitle(/.+/);
  836 |   });
  837 | 
  838 |   test('fuel-record.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
  839 |     const r = await page.goto(`${BASE}/fuel-record.html`);
  840 |     expect(r?.status()).toBeLessThan(500);
  841 |   });
  842 | 
  843 |   test('fuel-ledger.html โหลดสำเร็จ ไม่ 5xx', async ({ page }) => {
  844 |     const r = await page.goto(`${BASE}/fuel-ledger.html`);
  845 |     expect(r?.status()).toBeLessThan(500);
  846 |   });
  847 | 
  848 |   test('qr-fuel-record.html มีเนื้อหา (body ไม่ว่าง)', async ({ page }) => {
  849 |     await page.goto(`${BASE}/qr-fuel-record.html`);
  850 |     const body = await page.evaluate(() => document.body.innerHTML);
  851 |     expect(body.length).toBeGreaterThan(100);
  852 |   });
  853 | });
  854 | 
```