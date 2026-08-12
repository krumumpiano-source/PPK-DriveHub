# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 18. Incidents >> POST /api/incidents — สร้างบันทึกอุบัติเหตุ
- Location: tests\api-integration.test.mjs:1014:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 500
```

# Test source

```ts
  925  | 
  926  |   test('DELETE /api/fuel/log/:id — ลบบันทึกน้ำมัน', async () => {
  927  |     if (!createdFuelId) { test.skip(); return; }
  928  |     const r = await del(`/api/fuel/log/${createdFuelId}`, adminToken);
  929  |     expect(r.status).toBe(200);
  930  |     expect(r.data.success).toBe(true);
  931  |   });
  932  | 
  933  |   test('DELETE /api/repair/log/:id — ลบรายการซ่อม', async () => {
  934  |     if (!createdRepairId) { test.skip(); return; }
  935  |     const r = await del(`/api/repair/log/${createdRepairId}`, adminToken);
  936  |     expect(r.status).toBe(200);
  937  |     expect(r.data.success).toBe(true);
  938  |   });
  939  | 
  940  |   test('DELETE /api/tax-insurance/tax/:id — ลบภาษี', async () => {
  941  |     if (!createdTaxId) { test.skip(); return; }
  942  |     const r = await del(`/api/tax-insurance/tax/${createdTaxId}`, adminToken);
  943  |     expect(r.status).toBe(200);
  944  |     expect(r.data.success).toBe(true);
  945  |   });
  946  | 
  947  |   test('DELETE /api/tax-insurance/insurance/:id — ลบประกัน', async () => {
  948  |     if (!createdInsuranceId) { test.skip(); return; }
  949  |     const r = await del(`/api/tax-insurance/insurance/${createdInsuranceId}`, adminToken);
  950  |     expect(r.status).toBe(200);
  951  |     expect(r.data.success).toBe(true);
  952  |   });
  953  | 
  954  |   test('DELETE /api/queue/:id — ลบคิว', async () => {
  955  |     if (!createdQueueId) { test.skip(); return; }
  956  |     const r = await del(`/api/queue/${createdQueueId}`, adminToken);
  957  |     expect(r.status).toBe(200);
  958  |     expect(r.data.success).toBe(true);
  959  |   });
  960  | 
  961  |   test('DELETE /api/drivers/:id — ลบคนขับ', async () => {
  962  |     if (!createdDriverId) { test.skip(); return; }
  963  |     const r = await del(`/api/drivers/${createdDriverId}`, adminToken);
  964  |     expect(r.status).toBe(200);
  965  |     expect(r.data.success).toBe(true);
  966  |   });
  967  | 
  968  |   test('POST /api/auth/logout — ออกจากระบบ', async () => {
  969  |     const r = await post('/api/auth/logout', {}, adminToken);
  970  |     expect(r.status).toBe(200);
  971  |     expect(r.data.success).toBe(true);
  972  |   });
  973  | });
  974  | 
  975  | // ════════════════════════════════════════════
  976  | // 18. INCIDENTS (อุบัติเหตุ/เหตุการณ์)
  977  | // ════════════════════════════════════════════
  978  | let incidentVehicleId = '';
  979  | let incidentDriverId = '';
  980  | let createdIncidentId = '';
  981  | 
  982  | test.describe.serial('18. Incidents', () => {
  983  |   test('Setup — สร้างรถและคนขับสำหรับ Incident test', async () => {
  984  |     // Re-login (token expired after logout)
  985  |     try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { timeout: 10000, stdio: 'pipe' }); } catch {}
  986  |     for (const pw of [ADMIN_PASS, ADMIN_PASS_ALT]) {
  987  |       const r = await post('/api/auth/login', { username: 'testadmin', password: pw });
  988  |       if (r.status === 200 && r.data?.data?.token) {
  989  |         adminToken = r.data.data.token;
  990  |         break;
  991  |       }
  992  |     }
  993  |     expect(adminToken).toBeTruthy();
  994  | 
  995  |     // สร้างรถ
  996  |     const v = await post('/api/vehicles', {
  997  |       license_plate: `INC-${Date.now().toString().slice(-4)}`,
  998  |       brand: 'Toyota', model: 'Hiace', year: 2024,
  999  |       fuel_type: 'diesel', seat_count: 12, status: 'available',
  1000 |     }, adminToken);
  1001 |     incidentVehicleId = v.data?.id || v.data?.data?.id;
  1002 |     expect(incidentVehicleId).toBeTruthy();
  1003 | 
  1004 |     // สร้างคนขับ
  1005 |     const d = await post('/api/drivers', {
  1006 |       name: 'คนขับ Incident Test',
  1007 |       license_number: `LIC-INC-${Date.now().toString().slice(-4)}`,
  1008 |       phone: '0844444444', status: 'active',
  1009 |     }, adminToken);
  1010 |     incidentDriverId = d.data?.id || d.data?.data?.id;
  1011 |     expect(incidentDriverId).toBeTruthy();
  1012 |   });
  1013 | 
  1014 |   test('POST /api/incidents — สร้างบันทึกอุบัติเหตุ', async () => {
  1015 |     const r = await post('/api/incidents', {
  1016 |       car_id: incidentVehicleId,
  1017 |       driver_id: incidentDriverId,
  1018 |       incident_date: '2026-05-01',
  1019 |       incident_type: 'accident',
  1020 |       description: 'ชนท้ายรถอื่น',
  1021 |       location: 'ถนนพหลโยธิน',
  1022 |       damage_cost: 15000,
  1023 |       police_report_number: 'POL-12345',
  1024 |     }, adminToken);
> 1025 |     expect(r.status).toBe(201);
       |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  1026 |     expect(r.data.success).toBe(true);
  1027 |     createdIncidentId = r.data.id || r.data.data?.id;
  1028 |     expect(createdIncidentId).toBeTruthy();
  1029 |   });
  1030 | 
  1031 |   test('GET /api/incidents — ดูรายการอุบัติเหตุ', async () => {
  1032 |     const r = await get('/api/incidents', adminToken);
  1033 |     expect(r.status).toBe(200);
  1034 |     expect(r.data.success).toBe(true);
  1035 |   });
  1036 | 
  1037 |   test('GET /api/incidents/:id — ดูรายละเอียด', async () => {
  1038 |     if (!createdIncidentId) { test.skip(); return; }
  1039 |     const r = await get(`/api/incidents/${createdIncidentId}`, adminToken);
  1040 |     expect(r.status).toBe(200);
  1041 |     expect(r.data.success).toBe(true);
  1042 |     const inc = r.data.data || r.data;
  1043 |     expect(inc).toHaveProperty('incident_type');
  1044 |   });
  1045 | 
  1046 |   test('PUT /api/incidents/:id — อัปเดตสถานะ', async () => {
  1047 |     if (!createdIncidentId) { test.skip(); return; }
  1048 |     const r = await put(`/api/incidents/${createdIncidentId}`, {
  1049 |       status: 'investigating',
  1050 |       damage_cost: 18000,
  1051 |     }, adminToken);
  1052 |     expect(r.status).toBe(200);
  1053 |     expect(r.data.success).toBe(true);
  1054 |   });
  1055 | 
  1056 |   test('PUT /api/incidents/:id/resolve — ปิดเคส', async () => {
  1057 |     if (!createdIncidentId) { test.skip(); return; }
  1058 |     const r = await put(`/api/incidents/${createdIncidentId}/resolve`, {
  1059 |       resolution_notes: 'ซ่อมเสร็จแล้ว จ่ายประกัน',
  1060 |     }, adminToken);
  1061 |     expect([200, 201]).toContain(r.status);
  1062 |     expect(r.data.success).toBe(true);
  1063 |   });
  1064 | 
  1065 |   test('GET /api/incidents?car_id= — กรองตามรถ', async () => {
  1066 |     const r = await get(`/api/incidents?car_id=${incidentVehicleId}`, adminToken);
  1067 |     expect(r.status).toBe(200);
  1068 |     expect(r.data.success).toBe(true);
  1069 |     const items = r.data.data || r.data;
  1070 |     expect(Array.isArray(items)).toBe(true);
  1071 |     expect(items.length).toBeGreaterThan(0);
  1072 |   });
  1073 | 
  1074 |   test('Cleanup — ลบรถและคนขับ Incident test', async () => {
  1075 |     if (incidentVehicleId) await del(`/api/vehicles/${incidentVehicleId}`, adminToken);
  1076 |     if (incidentDriverId) await del(`/api/drivers/${incidentDriverId}`, adminToken);
  1077 |   });
  1078 | });
  1079 | 
  1080 | // ════════════════════════════════════════════
  1081 | // 19. VEHICLE REQUESTS (ขอใช้รถออนไลน์)
  1082 | // ════════════════════════════════════════════
  1083 | let vreqVehicleId = '';
  1084 | let vreqDriverId = '';
  1085 | let createdVreqId = '';
  1086 | 
  1087 | test.describe.serial('19. Vehicle Requests', () => {
  1088 |   test('Setup — สร้างรถและคนขับสำหรับ Vehicle Request test', async () => {
  1089 |     const v = await post('/api/vehicles', {
  1090 |       license_plate: `VREQ-${Date.now().toString().slice(-4)}`,
  1091 |       brand: 'Honda', model: 'CRV', year: 2023,
  1092 |       fuel_type: 'gasoline', seat_count: 5, status: 'available',
  1093 |     }, adminToken);
  1094 |     vreqVehicleId = v.data?.id || v.data?.data?.id;
  1095 |     expect(vreqVehicleId).toBeTruthy();
  1096 | 
  1097 |     const d = await post('/api/drivers', {
  1098 |       name: 'คนขับ VREQ Test',
  1099 |       license_number: `LIC-VREQ-${Date.now().toString().slice(-4)}`,
  1100 |       phone: '0855555555', status: 'active',
  1101 |     }, adminToken);
  1102 |     vreqDriverId = d.data?.id || d.data?.data?.id;
  1103 |     expect(vreqDriverId).toBeTruthy();
  1104 |   });
  1105 | 
  1106 |   test('POST /api/vehicle-requests — ยื่นคำขอใช้รถ', async () => {
  1107 |     const r = await post('/api/vehicle-requests', {
  1108 |       date: '2026-05-10',
  1109 |       time_start: '09:00', time_end: '12:00',
  1110 |       destination: 'เชียงใหม่',
  1111 |       purpose: 'ประชุมวิชาการ',
  1112 |       passengers: 3,
  1113 |       requester_department: 'แผนกบริหาร',
  1114 |     }, adminToken);
  1115 |     expect(r.status).toBe(201);
  1116 |     expect(r.data.success).toBe(true);
  1117 |     createdVreqId = r.data.id || r.data.data?.id;
  1118 |     expect(createdVreqId).toBeTruthy();
  1119 |   });
  1120 | 
  1121 |   test('GET /api/vehicle-requests — ดูรายการคำขอ', async () => {
  1122 |     const r = await get('/api/vehicle-requests', adminToken);
  1123 |     expect(r.status).toBe(200);
  1124 |     expect(r.data.success).toBe(true);
  1125 |     const items = r.data.data || r.data;
```