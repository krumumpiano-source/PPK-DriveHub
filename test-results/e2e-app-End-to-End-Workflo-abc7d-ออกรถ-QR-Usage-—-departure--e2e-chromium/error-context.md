# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> End-to-End Workflow — สร้างข้อมูลครบวงจรผ่าน API >> Step 5: บันทึกออกรถ (QR Usage — departure)
- Location: tests\e2e\app.spec.mjs:830:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  744 |   let driverId = '';
  745 |   let queueId = '';
  746 | 
  747 |   async function adminFetch(method, path, body) {
  748 |     // Login first — try both passwords in case api-integration changed it
  749 |     clearRateLimits();
  750 |     let token = null;
  751 |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  752 |       const login = await fetch(`${BASE}/api/auth/login`, {
  753 |         method: 'POST',
  754 |         headers: { 'Content-Type': 'application/json' },
  755 |         body: JSON.stringify({ username: ADMIN_USER, password: pw }),
  756 |       });
  757 |       const loginData = await login.json();
  758 |       token = loginData?.data?.token || loginData?.data?.data?.token;
  759 |       if (token) break;
  760 |       clearRateLimits();
  761 |     }
  762 | 
  763 |     const opts = {
  764 |       method,
  765 |       headers: {
  766 |         'Content-Type': 'application/json',
  767 |         ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  768 |       },
  769 |     };
  770 |     if (body) opts.body = JSON.stringify(body);
  771 |     const r = await fetch(`${BASE}${path}`, opts);
  772 |     return r.json().catch(() => null);
  773 |   }
  774 | 
  775 |   test('Step 1: สร้างรถ', async () => {
  776 |     const r = await adminFetch('POST', '/api/vehicles', {
  777 |       license_plate: `E2E-${Date.now().toString().slice(-5)}`,
  778 |       brand: 'Toyota', model: 'Commuter', year: 2024,
  779 |       fuel_type: 'diesel', seat_count: 12, status: 'available',
  780 |     });
  781 |     expect(r?.success).toBe(true);
  782 |     vehicleId = r?.id || r?.data?.id;
  783 |     expect(vehicleId).toBeTruthy();
  784 |   });
  785 | 
  786 |   test('Step 2: สร้างคนขับ', async () => {
  787 |     const r = await adminFetch('POST', '/api/drivers', {
  788 |       name: 'คนขับ E2E Test',
  789 |       license_number: `LIC-E2E-${Date.now().toString().slice(-4)}`,
  790 |       phone: '0899999999', status: 'active',
  791 |     });
  792 |     expect(r?.success).toBe(true);
  793 |     driverId = r?.id || r?.data?.id;
  794 |     expect(driverId).toBeTruthy();
  795 |   });
  796 | 
  797 |   test('Step 3: สร้างคิว (ต้องการรถ + คนขับ)', async () => {
  798 |     if (!vehicleId || !driverId) test.skip();
  799 |     const r = await adminFetch('POST', '/api/queue', {
  800 |       car_id: vehicleId,
  801 |       driver_id: driverId,
  802 |       date: '2026-05-01',
  803 |       time_start: '08:00', time_end: '12:00',
  804 |       mission: 'E2E ทดสอบครบวงจร',
  805 |       destination: 'ห้องประชุมใหญ่', passengers: 5,
  806 |     });
  807 |     expect(r?.success).toBe(true);
  808 |     queueId = r?.id || r?.data?.id;
  809 |     expect(queueId).toBeTruthy();
  810 |   });
  811 | 
  812 |   test('Step 4: ตรวจสภาพรถก่อนออก (QR Check)', async () => {
  813 |     if (!vehicleId) test.skip();
  814 |     const r = await fetch(`${BASE}/api/check/daily`, {
  815 |       method: 'POST',
  816 |       headers: { 'Content-Type': 'application/json' },
  817 |       body: JSON.stringify({
  818 |         car_id: vehicleId,
  819 |         checker_name: 'คนขับ E2E',
  820 |         check_type: 'pre_trip',
  821 |         overall_status: 'ok',
  822 |         mileage: 20000,
  823 |         tire_condition: 'ok', brake_condition: 'ok', light_condition: 'ok',
  824 |       }),
  825 |     });
  826 |     const data = await r.json().catch(() => null);
  827 |     expect(data?.success).toBe(true);
  828 |   });
  829 | 
  830 |   test('Step 5: บันทึกออกรถ (QR Usage — departure)', async () => {
  831 |     if (!vehicleId) test.skip();
  832 |     const r = await fetch(`${BASE}/api/usage/record`, {
  833 |       method: 'POST',
  834 |       headers: { 'Content-Type': 'application/json' },
  835 |       body: JSON.stringify({
  836 |         car_id: vehicleId,
  837 |         record_type: 'departure',
  838 |         driver_id: driverId || null,
  839 |         datetime: '2026-05-01T08:05:00',
  840 |         mileage: 20000,
  841 |       }),
  842 |     });
  843 |     const data = await r.json().catch(() => null);
> 844 |     expect(data?.success).toBe(true);
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  845 |   });
  846 | 
  847 |   test('Step 6: บันทึกเติมน้ำมัน (QR Fuel)', async () => {
  848 |     if (!vehicleId) test.skip();
  849 |     const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
  850 |     const r = await fetch(`${BASE}/api/fuel/record`, {
  851 |       method: 'POST',
  852 |       headers: { 'Content-Type': 'application/json' },
  853 |       body: JSON.stringify({
  854 |         car_id: vehicleId,
  855 |         driver_name_manual: 'คนขับ E2E',
  856 |         date: '2026-05-01',
  857 |         mileage_after: 20050,
  858 |         liters: 45, price_per_liter: 32.0, amount: 1440,
  859 |         fuel_type: 'diesel', gas_station_name: 'ปั๊ม E2E Test',
  860 |         purpose: 'งานราชการ',
  861 |         receipt_image: `data:image/png;base64,${TINY_PNG}`,
  862 |       }),
  863 |     });
  864 |     const data = await r.json().catch(() => null);
  865 |     expect(data?.success).toBe(true);
  866 |   });
  867 | 
  868 |   test('Step 7: บันทึกกลับรถ (QR Usage — return)', async () => {
  869 |     if (!vehicleId) test.skip();
  870 |     const r = await fetch(`${BASE}/api/usage/record`, {
  871 |       method: 'POST',
  872 |       headers: { 'Content-Type': 'application/json' },
  873 |       body: JSON.stringify({
  874 |         car_id: vehicleId,
  875 |         record_type: 'return',
  876 |         driver_id: driverId || null,
  877 |         datetime: '2026-05-01T14:00:00',
  878 |         mileage: 20150,
  879 |       }),
  880 |     });
  881 |     const data = await r.json().catch(() => null);
  882 |     expect(data?.success).toBe(true);
  883 |   });
  884 | 
  885 |   test('Step 8: เปลี่ยนสถานะคิวเป็น completed', async () => {
  886 |     if (!queueId) test.skip();
  887 |     const r = await adminFetch('PUT', `/api/queue/${queueId}/complete`, {});
  888 |     expect(r?.success).toBe(true);
  889 |   });
  890 | 
  891 |   test('Step 9: ดึงรายงาน dashboard หลังบันทึกข้อมูลครบ', async () => {
  892 |     clearRateLimits();
  893 |     let token = null;
  894 |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  895 |       const login = await fetch(`${BASE}/api/auth/login`, {
  896 |         method: 'POST',
  897 |         headers: { 'Content-Type': 'application/json' },
  898 |         body: JSON.stringify({ username: ADMIN_USER, password: pw }),
  899 |       });
  900 |       const ld = await login.json();
  901 |       token = ld?.data?.token;
  902 |       if (token) break;
  903 |       clearRateLimits();
  904 |     }
  905 |     const r = await fetch(`${BASE}/api/reports/dashboard`, {
  906 |       headers: { 'Authorization': `Bearer ${token}` },
  907 |     });
  908 |     const data = await r.json().catch(() => null);
  909 |     expect(data?.success).toBe(true);
  910 |     expect(data?.data).toBeTruthy();
  911 |   });
  912 | 
  913 |   test('Step 10: cleanup — ลบรถและคนขับ', async () => {
  914 |     if (vehicleId) {
  915 |       const r = await adminFetch('DELETE', `/api/vehicles/${vehicleId}`, null);
  916 |       // ok or not — don't fail the whole suite
  917 |     }
  918 |     if (driverId) {
  919 |       const r = await adminFetch('DELETE', `/api/drivers/${driverId}`, null);
  920 |     }
  921 |   });
  922 | });
  923 | 
  924 | // ════════════════════════════════════════════
  925 | // 19. QR Pages (Public — ไม่ต้อง login)
  926 | // ════════════════════════════════════════════
  927 | test.describe('QR Pages (Public)', () => {
  928 |   test('QR Usage Record — โหลดสำเร็จ', async ({ page }) => {
  929 |     await page.goto('/qr-usage-record.html');
  930 |     await page.waitForLoadState('networkidle');
  931 |     await expect(page).toHaveTitle(/QR|บันทึก|Usage|PPK DriveHub/);
  932 |   });
  933 | 
  934 |   test('QR Fuel Record — โหลดสำเร็จ', async ({ page }) => {
  935 |     await page.goto('/qr-fuel-record.html');
  936 |     await page.waitForLoadState('networkidle');
  937 |     await expect(page).toHaveTitle(/QR|น้ำมัน|Fuel|PPK DriveHub/);
  938 |   });
  939 | 
  940 |   test('QR Daily Check — โหลดสำเร็จ', async ({ page }) => {
  941 |     await page.goto('/qr-daily-check.html');
  942 |     await page.waitForLoadState('networkidle');
  943 |     await expect(page).toHaveTitle(/QR|ตรวจ|Check|PPK DriveHub/);
  944 |   });
```