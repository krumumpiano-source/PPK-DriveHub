# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 12. Reports >> GET /api/reports/data-quality — รายงานคุณภาพข้อมูล
- Location: tests\api-integration.test.mjs:813:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Test source

```ts
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
  769 |   });
  770 | 
  771 |   test('GET /api/reports/vehicles — รายงานรถ', async () => {
  772 |     const r = await get('/api/reports/vehicles', adminToken);
  773 |     expect(r.status).toBe(200);
  774 |     expect(r.data.success).toBe(true);
  775 |   });
  776 | 
  777 |   test('GET /api/reports/fuel — รายงานน้ำมัน', async () => {
  778 |     const r = await get('/api/reports/fuel', adminToken);
  779 |     expect(r.status).toBe(200);
  780 |     expect(r.data.success).toBe(true);
  781 |   });
  782 | 
  783 |   test('GET /api/reports/usage — รายงานการใช้รถ', async () => {
  784 |     const r = await get('/api/reports/usage', adminToken);
  785 |     expect(r.status).toBe(200);
  786 |     expect(r.data.success).toBe(true);
  787 |   });
  788 | 
  789 |   test('GET /api/reports/drivers — รายงานคนขับ', async () => {
  790 |     const r = await get('/api/reports/drivers', adminToken);
  791 |     expect(r.status).toBe(200);
  792 |     expect(r.data.success).toBe(true);
  793 |   });
  794 | 
  795 |   test('GET /api/reports/repairs — รายงานซ่อม', async () => {
  796 |     const r = await get('/api/reports/repairs', adminToken);
  797 |     expect(r.status).toBe(200);
  798 |     expect(r.data.success).toBe(true);
  799 |   });
  800 | 
  801 |   test('GET /api/reports/maintenance — รายงานบำรุงรักษา', async () => {
  802 |     const r = await get('/api/reports/maintenance', adminToken);
  803 |     expect(r.status).toBe(200);
  804 |     expect(r.data.success).toBe(true);
  805 |   });
  806 | 
  807 |   test('GET /api/reports/expiry — รายงานใกล้หมดอายุ', async () => {
  808 |     const r = await get('/api/reports/expiry', adminToken);
  809 |     expect(r.status).toBe(200);
  810 |     expect(r.data.success).toBe(true);
  811 |   });
  812 | 
  813 |   test('GET /api/reports/data-quality — รายงานคุณภาพข้อมูล', async () => {
  814 |     const r = await get('/api/reports/data-quality', adminToken);
> 815 |     expect(r.status).toBe(200);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  816 |     expect(r.data.success).toBe(true);
  817 |   });
  818 | });
  819 | 
  820 | // ════════════════════════════════════════════
  821 | // 13. NOTIFICATIONS
  822 | // ════════════════════════════════════════════
  823 | test.describe.serial('13. Notifications', () => {
  824 |   test('GET /api/notifications — ดูการแจ้งเตือน', async () => {
  825 |     const r = await get('/api/notifications', adminToken);
  826 |     expect(r.status).toBe(200);
  827 |     expect(r.data.success).toBe(true);
  828 |   });
  829 | 
  830 |   test('PUT /api/notifications/read-all — อ่านทั้งหมด', async () => {
  831 |     const r = await put('/api/notifications/read-all', {}, adminToken);
  832 |     expect(r.status).toBe(200);
  833 |     expect(r.data.success).toBe(true);
  834 |   });
  835 | });
  836 | 
  837 | // ════════════════════════════════════════════
  838 | // 14. ADMIN
  839 | // ════════════════════════════════════════════
  840 | test.describe.serial('14. Admin', () => {
  841 |   test('GET /api/admin/users — ดูรายชื่อผู้ใช้', async () => {
  842 |     const r = await get('/api/admin/users', adminToken);
  843 |     expect(r.status).toBe(200);
  844 |     expect(r.data.success).toBe(true);
  845 |   });
  846 | 
  847 |   test('GET /api/admin/requests — ดูคำขอสมัครสมาชิก', async () => {
  848 |     const r = await get('/api/admin/requests', adminToken);
  849 |     expect(r.status).toBe(200);
  850 |     expect(r.data.success).toBe(true);
  851 |   });
  852 | 
  853 |   test('GET /api/admin/settings — ดูการตั้งค่าระบบ', async () => {
  854 |     const r = await get('/api/admin/settings', adminToken);
  855 |     expect(r.status).toBe(200);
  856 |     expect(r.data.success).toBe(true);
  857 |   });
  858 | 
  859 |   test('PUT /api/admin/settings — อัปเดตการตั้งค่า', async () => {
  860 |     const r = await put('/api/admin/settings', {
  861 |       test_setting: 'test_value',
  862 |     }, adminToken);
  863 |     expect(r.status).toBe(200);
  864 |     expect(r.data.success).toBe(true);
  865 |   });
  866 | 
  867 |   test('GET /api/admin/audit-log — ดู Audit Log', async () => {
  868 |     const r = await get('/api/admin/audit-log', adminToken);
  869 |     expect(r.status).toBe(200);
  870 |     expect(r.data.success).toBe(true);
  871 |   });
  872 | });
  873 | 
  874 | // ════════════════════════════════════════════
  875 | // 15. BACKUP
  876 | // ════════════════════════════════════════════
  877 | test.describe.serial('15. Backup', () => {
  878 |   test('GET /api/backup — ดูรายการ Backup', async () => {
  879 |     const r = await get('/api/backup', adminToken);
  880 |     expect(r.status).toBe(200);
  881 |     expect(r.data.success).toBe(true);
  882 |   });
  883 | 
  884 |   test('POST /api/backup — สร้าง Backup', async () => {
  885 |     const r = await post('/api/backup', {}, adminToken);
  886 |     // อาจ return json download ถ้าไม่มี R2
  887 |     expect([200, 201]).toContain(r.status);
  888 |   });
  889 | });
  890 | 
  891 | // ════════════════════════════════════════════
  892 | // 16. SECURITY / CORS / HEADERS
  893 | // ════════════════════════════════════════════
  894 | test.describe.serial('16. Security Headers', () => {
  895 |   test('OPTIONS /api/auth/login — CORS preflight', async () => {
  896 |     const res = await fetch(`${BASE}/api/auth/login`, {
  897 |       method: 'OPTIONS',
  898 |       headers: { 'Origin': 'http://localhost:8788' },
  899 |     });
  900 |     expect(res.status).toBe(204);
  901 |     expect(res.headers.get('access-control-allow-methods')).toBeTruthy();
  902 |   });
  903 | 
  904 |   test('Security headers present', async () => {
  905 |     const res = await fetch(`${BASE}/api/setup`);
  906 |     expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  907 |   });
  908 | 
  909 |   test('Invalid token returns 401', async () => {
  910 |     const r = await get('/api/auth/me', 'invalid-token-12345');
  911 |     expect(r.status).toBe(401);
  912 |   });
  913 | });
  914 | 
  915 | // ════════════════════════════════════════════
```