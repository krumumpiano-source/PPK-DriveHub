# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\qr-scan.spec.mjs >> 11. Usage CRUD (authenticated) >> GET /api/usage/summary → สรุปจำนวนบันทึก
- Location: tests\e2e\qr-scan.spec.mjs:852:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  756 |     });
  757 |     expect(r?.success).toBe(true);
  758 |     expect(r?.data?.id).toBeTruthy();
  759 |     expect(r?.data?.message).toMatch(/ขอบคุณ|สำเร็จ/);
  760 |   });
  761 | 
  762 |   test('ส่ง survey เฉพาะ overall_score (optional fields) → success', async () => {
  763 |     if (!ctx.carId) return;
  764 |     const r = await apiPost('/api/survey/submit', {
  765 |       car_id: ctx.carId,
  766 |       overall_score: 4,
  767 |     });
  768 |     expect(r?.success).toBe(true);
  769 |   });
  770 | 
  771 |   test('ดู survey results ผ่าน admin API', async () => {
  772 |     if (!ctx.carId || !ctx.adminToken) return;
  773 |     const r = await apiGet(`/api/survey/results?car_id=${ctx.carId}`, ctx.adminToken);
  774 |     expect(r?.success).toBe(true);
  775 |     expect((r?.data || []).length).toBeGreaterThanOrEqual(2);
  776 |   });
  777 | 
  778 |   test('ดู survey summary ผ่าน admin API', async () => {
  779 |     if (!ctx.adminToken) return;
  780 |     const r = await apiGet('/api/survey/summary', ctx.adminToken);
  781 |     expect(r?.success).toBe(true);
  782 |     expect(Array.isArray(r?.data)).toBe(true);
  783 |   });
  784 | });
  785 | 
  786 | // ══════════════════════════════════════════════════════════
  787 | // 11. Usage CRUD (authenticated — admin)
  788 | //     POST /api/usage, GET, GET/:id, PUT, DELETE, summary
  789 | // ══════════════════════════════════════════════════════════
  790 | test.describe('11. Usage CRUD (authenticated)', () => {
  791 |   test('POST /api/usage → สร้าง record สำเร็จ (ต้อง auth)', async () => {
  792 |     if (!ctx.carId || !ctx.driverId || !ctx.adminToken) return;
  793 |     const r = await apiPost('/api/usage', {
  794 |       car_id: ctx.carId,
  795 |       driver_id: ctx.driverId,
  796 |       record_type: 'departure',
  797 |       datetime: DT.CRUD_DEP,
  798 |       mileage: 15000,
  799 |       record_source: 'qr_logged_in',
  800 |     }, ctx.adminToken);
  801 |     expect(r?.success).toBe(true);
  802 |     expect(r?.data?.id).toBeTruthy();
  803 |     ctx.usageRecordId = r?.data?.id || '';
  804 |   });
  805 | 
  806 |   test('GET /api/usage → ดูรายการทั้งหมดมีข้อมูล', async () => {
  807 |     if (!ctx.adminToken) return;
  808 |     const r = await apiGet('/api/usage', ctx.adminToken);
  809 |     expect(r?.success).toBe(true);
  810 |     expect(Array.isArray(r?.data)).toBe(true);
  811 |     expect(r?.data?.length).toBeGreaterThan(0);
  812 |   });
  813 | 
  814 |   test('GET /api/usage?car_id=... → filter ด้วย car_id ถูกต้อง', async () => {
  815 |     if (!ctx.carId || !ctx.adminToken) return;
  816 |     const r = await apiGet(`/api/usage?car_id=${ctx.carId}`, ctx.adminToken);
  817 |     expect(r?.success).toBe(true);
  818 |     const rows = r?.data || [];
  819 |     expect(rows.length).toBeGreaterThan(0);
  820 |     rows.forEach(row => expect(row.car_id).toBe(ctx.carId));
  821 |   });
  822 | 
  823 |   test('GET /api/usage?record_type=departure → filter ด้วย record_type', async () => {
  824 |     if (!ctx.adminToken) return;
  825 |     const r = await apiGet('/api/usage?record_type=departure', ctx.adminToken);
  826 |     expect(r?.success).toBe(true);
  827 |     const rows = r?.data || [];
  828 |     rows.forEach(row => expect(row.record_type).toBe('departure'));
  829 |   });
  830 | 
  831 |   test('GET /api/usage/:id → ดูรายการเดียวถูกต้อง', async () => {
  832 |     if (!ctx.usageRecordId || !ctx.adminToken) return;
  833 |     const r = await apiGet(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
  834 |     expect(r?.success).toBe(true);
  835 |     expect(r?.data?.id).toBe(ctx.usageRecordId);
  836 |     expect(r?.data?.record_type).toBe('departure');
  837 |     expect(r?.data?.mileage).toBe(15000);
  838 |     expect(r?.data?.license_plate).toBeTruthy(); // JOIN กับ cars
  839 |   });
  840 | 
  841 |   test('PUT /api/usage/:id → แก้ไข notes สำเร็จ', async () => {
  842 |     if (!ctx.usageRecordId || !ctx.adminToken) return;
  843 |     const r = await apiPut(`/api/usage/${ctx.usageRecordId}`, {
  844 |       notes: 'แก้ไขจาก E2E test',
  845 |     }, ctx.adminToken);
  846 |     expect(r?.success).toBe(true);
  847 |     // ตรวจสอบว่าแก้ไขสำเร็จจริง
  848 |     const check = await apiGet(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
  849 |     expect(check?.data?.notes).toBe('แก้ไขจาก E2E test');
  850 |   });
  851 | 
  852 |   test('GET /api/usage/summary → สรุปจำนวนบันทึก', async () => {
  853 |     if (!ctx.adminToken) return;
  854 |     const r = await apiGet('/api/usage/summary', ctx.adminToken);
  855 |     expect(r?.success).toBe(true);
> 856 |     expect(r?.data?.total_records).toBeGreaterThan(0);
      |                                    ^ Error: expect(received).toBeGreaterThan(expected)
  857 |     expect(typeof r?.data?.departures).toBe('number');
  858 |     expect(typeof r?.data?.returns).toBe('number');
  859 |     expect(r?.data?.departures).toBeGreaterThan(0);
  860 |     expect(r?.data?.returns).toBeGreaterThan(0);
  861 |   });
  862 | 
  863 |   test('DELETE /api/usage/:id → ลบสำเร็จ', async () => {
  864 |     if (!ctx.usageRecordId || !ctx.adminToken) return;
  865 |     const r = await apiDelete(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
  866 |     expect(r?.success).toBe(true);
  867 |     // ยืนยันว่าลบแล้วจริง
  868 |     const check = await apiGet(`/api/usage/${ctx.usageRecordId}`, ctx.adminToken);
  869 |     expect(check?.success).toBe(false);
  870 |   });
  871 | });
  872 | 
  873 | // ══════════════════════════════════════════════════════════
  874 | // 12. Permission Tests
  875 | // ══════════════════════════════════════════════════════════
  876 | test.describe('12. Permission Tests', () => {
  877 |   test('POST /api/usage/record ไม่มี token → success (PUBLIC)', async () => {
  878 |     if (!ctx.carId) return;
  879 |     const r = await fetch(`${BASE}/api/usage/record`, {
  880 |       method: 'POST',
  881 |       headers: { 'Content-Type': 'application/json' },
  882 |       body: JSON.stringify({
  883 |         car_id: ctx.carId,
  884 |         record_type: 'refuel',
  885 |         driver_name_manual: 'ผู้ไม่มี token',
  886 |         mileage: 11000,
  887 |         datetime: DT.PERM_REF,
  888 |       }),
  889 |     }).then(x => x.json()).catch(() => null);
  890 |     expect(r?.success).toBe(true);
  891 |   });
  892 | 
  893 |   test('GET /api/usage ไม่มี token → 401', async () => {
  894 |     const r = await apiGet('/api/usage');
  895 |     expect(r?.success).toBe(false);
  896 |   });
  897 | 
  898 |   test('GET /api/usage/latest-status ไม่มี token → success (PUBLIC)', async () => {
  899 |     if (!ctx.carId) return;
  900 |     const r = await fetch(`${BASE}/api/usage/latest-status?car_id=${ctx.carId}`)
  901 |       .then(x => x.json()).catch(() => null);
  902 |     expect(r?.success).toBe(true);
  903 |   });
  904 | 
  905 |   test('GET /api/check/log ไม่มี token → 401', async () => {
  906 |     const r = await apiGet('/api/check/log');
  907 |     expect(r?.success).toBe(false);
  908 |   });
  909 | 
  910 |   test('GET /api/survey/results ไม่มี token → 401', async () => {
  911 |     const r = await apiGet('/api/survey/results');
  912 |     expect(r?.success).toBe(false);
  913 |   });
  914 | 
  915 |   test('POST /api/check/daily ไม่มี token → success (PUBLIC)', async () => {
  916 |     if (!ctx.carId) return;
  917 |     const r = await fetch(`${BASE}/api/check/daily`, {
  918 |       method: 'POST',
  919 |       headers: { 'Content-Type': 'application/json' },
  920 |       body: JSON.stringify({
  921 |         car_id: ctx.carId,
  922 |         inspector_name: 'ไม่มี token',
  923 |         overall_status: 'ok',
  924 |       }),
  925 |     }).then(x => x.json()).catch(() => null);
  926 |     expect(r?.success).toBe(true);
  927 |   });
  928 | 
  929 |   test('POST /api/survey/submit ไม่มี token → success (PUBLIC)', async () => {
  930 |     if (!ctx.carId) return;
  931 |     const r = await fetch(`${BASE}/api/survey/submit`, {
  932 |       method: 'POST',
  933 |       headers: { 'Content-Type': 'application/json' },
  934 |       body: JSON.stringify({ car_id: ctx.carId, overall_score: 3 }),
  935 |     }).then(x => x.json()).catch(() => null);
  936 |     expect(r?.success).toBe(true);
  937 |   });
  938 | });
  939 | 
  940 | // ══════════════════════════════════════════════════════════
  941 | // 13. UI Tests
  942 | // ══════════════════════════════════════════════════════════
  943 | test.describe('13. UI Tests', () => {
  944 |   test('qr-usage-record.html โหลดได้', async ({ page }) => {
  945 |     if (!ctx.carId) return;
  946 |     await page.goto(`/qr-usage-record.html?car_id=${ctx.carId}`);
  947 |     await page.waitForLoadState('networkidle');
  948 |     await expect(page).toHaveTitle(/บันทึก|QR|PPK/i);
  949 |   });
  950 | 
  951 |   test('qr-daily-check.html โหลดได้', async ({ page }) => {
  952 |     if (!ctx.carId) return;
  953 |     await page.goto(`/qr-daily-check.html?car_id=${ctx.carId}`);
  954 |     await page.waitForLoadState('networkidle');
  955 |     await expect(page).toHaveTitle(/ตรวจ|Check|QR|PPK/i);
  956 |   });
```