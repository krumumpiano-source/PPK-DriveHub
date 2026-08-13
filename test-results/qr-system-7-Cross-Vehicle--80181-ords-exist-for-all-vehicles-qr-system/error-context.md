# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qr-system.test.mjs >> 7. Cross-Vehicle Data Verification >> Verify usage records exist for all vehicles
- Location: tests\qr-system.test.mjs:902:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  804 |       date: '2026-04-16',
  805 |       time: '09:00',
  806 |       overall_status: 'ok',
  807 |       checks: { engine_oil: 'normal', tire_condition: 'normal', lights: 'normal' },
  808 |     }, adminToken);
  809 |     expect(r.status).toBeLessThan(300);
  810 |     expect(r.data.success).toBe(true);
  811 |   });
  812 | });
  813 | 
  814 | // ══════════════════════════════════════════════════
  815 | // 6. REPAIR — Authenticated only (no public QR endpoint)
  816 | // ══════════════════════════════════════════════════
  817 | test.describe.serial('6. Repair (Auth Required)', () => {
  818 | 
  819 |   test('Unauthenticated repair should FAIL (401)', async () => {
  820 |     if (!vehicles.length) { test.skip(); return; }
  821 |     const v = vehicles[0];
  822 |     const r = await post('/api/repair/log', {
  823 |       car_id: v.id,
  824 |       issue_description: 'ลองแจ้งซ่อมแบบไม่ล็อกอิน',
  825 |     });
  826 |     expect(r.status).toBe(401);
  827 |   });
  828 | 
  829 |   test('Logged-in driver — create repair request', async () => {
  830 |     if (!driverUser.token || !vehicles.length) { test.skip(); return; }
  831 |     const v = vehicles[0];
  832 |     const r = await post('/api/repair/log', {
  833 |       car_id: v.id,
  834 |       issue_description: 'เบรกมีเสียงผิดปกติ ควรตรวจสอบ',
  835 |     }, driverUser.token);
  836 |     expect(r.status).toBeLessThan(300);
  837 |     expect(r.data.success).toBe(true);
  838 |   });
  839 | 
  840 |   test('Logged-in reserve driver — create repair request', async () => {
  841 |     if (!reserveDriverUser.token || vehicles.length < 2) { test.skip(); return; }
  842 |     const v = vehicles[1];
  843 |     const r = await post('/api/repair/log', {
  844 |       car_id: v.id,
  845 |       issue_description: 'แอร์ไม่เย็น',
  846 |     }, reserveDriverUser.token);
  847 |     expect(r.status).toBeLessThan(300);
  848 |     expect(r.data.success).toBe(true);
  849 |   });
  850 | 
  851 |   test('Logged-in adhoc driver — create repair request', async () => {
  852 |     if (!adhocDriverUser.token || vehicles.length < 3) { test.skip(); return; }
  853 |     const v = vehicles[2];
  854 |     const r = await post('/api/repair/log', {
  855 |       car_id: v.id,
  856 |       issue_description: 'ที่ปัดน้ำฝนเสีย',
  857 |     }, adhocDriverUser.token);
  858 |     expect(r.status).toBeLessThan(300);
  859 |     expect(r.data.success).toBe(true);
  860 |   });
  861 | 
  862 |   test('Admin — create repair request', async () => {
  863 |     if (!adminToken || !vehicles.length) { test.skip(); return; }
  864 |     const v = vehicles[0];
  865 |     const r = await post('/api/repair/log', {
  866 |       car_id: v.id,
  867 |       issue_description: 'เปลี่ยนถ่ายน้ำมันเครื่องตามระยะ',
  868 |       service_type: 'scheduled_service',
  869 |     }, adminToken);
  870 |     expect(r.status).toBeLessThan(300);
  871 |     expect(r.data.success).toBe(true);
  872 |   });
  873 | });
  874 | 
  875 | // ══════════════════════════════════════════════════
  876 | // 7. CROSS-VEHICLE VERIFICATION — Check data integrity
  877 | // ══════════════════════════════════════════════════
  878 | test.describe.serial('7. Cross-Vehicle Data Verification', () => {
  879 | 
  880 |   test('Verify fuel log has records for test vehicles', async () => {
  881 |     for (const v of vehicles.slice(0, 2)) { // diesel + gasoline had fuel records
  882 |       const r = await get(`/api/fuel/log?car_id=${v.id}`, adminToken);
  883 |       expect(r.status).toBe(200);
  884 |       expect(r.data.success).toBe(true);
  885 |       const logs = r.data.data?.records || r.data.data || [];
  886 |       expect(Array.isArray(logs) ? logs.length : 0).toBeGreaterThan(0);
  887 |     }
  888 |   });
  889 | 
  890 |   test('Verify check log has records for all vehicles', async () => {
  891 |     if (!adminToken) { test.skip(); return; }
  892 |     // check/log returns flat array, not wrapped: success({rows})
  893 |     const r = await get('/api/check/log', adminToken);
  894 |     expect(r.status).toBe(200);
  895 |     expect(r.data.success).toBe(true);
  896 |     // API returns success(rows) which wraps as { data: [...] }
  897 |     const logs = r.data.data || [];
  898 |     const logArray = Array.isArray(logs) ? logs : [];
  899 |     expect(logArray.length).toBeGreaterThanOrEqual(1);
  900 |   });
  901 | 
  902 |   test('Verify usage records exist for all vehicles', async () => {
  903 |     const r = await get('/api/usage', adminToken);
> 904 |     expect(r.status).toBe(200);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  905 |     expect(r.data.success).toBe(true);
  906 |   });
  907 | 
  908 |   test('Verify repair log has records', async () => {
  909 |     const r = await get('/api/repair/log', adminToken);
  910 |     expect(r.status).toBe(200);
  911 |     expect(r.data.success).toBe(true);
  912 |   });
  913 | });
  914 | 
  915 | // ══════════════════════════════════════════════════
  916 | // 8. EDGE CASES — Invalid inputs, nonexistent vehicles
  917 | // ══════════════════════════════════════════════════
  918 | test.describe.serial('8. Edge Cases', () => {
  919 | 
  920 |   test('Usage record with nonexistent car_id', async () => {
  921 |     const r = await post('/api/usage/record', {
  922 |       car_id: 'fake-car-id-xyz',
  923 |       record_type: 'departure',
  924 |       datetime: '2026-04-16 10:00',
  925 |       mileage: 50000,
  926 |       driver_name_manual: 'ทดสอบรถไม่มีจริง',
  927 |     });
  928 |     // Should fail because car doesn't exist
  929 |     expect(r.data.success).toBe(false);
  930 |   });
  931 | 
  932 |   test('Fuel record without car_id', async () => {
  933 |     const r = await post('/api/fuel/record', {
  934 |       // NO car_id
  935 |       driver_name_manual: 'ไม่มี car_id',
  936 |       date: '2026-04-16',
  937 |       time: '10:00',
  938 |       fuel_type: 'diesel',
  939 |       liters: 10,
  940 |       price_per_liter: 30,
  941 |       amount: 300,
  942 |       mileage_before: 0,
  943 |       mileage_after: 100,
  944 |       receipt_image_base64: TINY_PNG,
  945 |       receipt_image_name: 'receipt.png',
  946 |       receipt_image_mime: 'image/png',
  947 |     });
  948 |     expect(r.data.success).toBe(false);
  949 |   });
  950 | 
  951 |   test('Daily check without car_id', async () => {
  952 |     const r = await post('/api/check/daily', {
  953 |       // NO car_id
  954 |       inspector_name: 'ไม่มี car_id',
  955 |       date: '2026-04-16',
  956 |       time: '10:00',
  957 |       overall_status: 'ok',
  958 |       checks: {},
  959 |     });
  960 |     expect(r.data.success).toBe(false);
  961 |   });
  962 | 
  963 |   test('Usage record without required fields', async () => {
  964 |     const r = await post('/api/usage/record', {
  965 |       car_id: vehicles[0]?.id || 'dummy',
  966 |       // Missing record_type, mileage, driver
  967 |     });
  968 |     expect(r.data.success).toBe(false);
  969 |   });
  970 | });
  971 | 
```