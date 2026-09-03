# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 19. Vehicle Requests >> POST /api/vehicle-requests — ยื่นคำขอใช้รถ
- Location: tests\api-integration.test.mjs:1106:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 500
```

# Test source

```ts
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
  1025 |     expect(r.status).toBe(201);
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
> 1115 |     expect(r.status).toBe(201);
       |                      ^ Error: expect(received).toBe(expected) // Object.is equality
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
  1126 |     expect(Array.isArray(items)).toBe(true);
  1127 |   });
  1128 | 
  1129 |   test('GET /api/vehicle-requests/:id — ดูรายละเอียดคำขอ', async () => {
  1130 |     if (!createdVreqId) { test.skip(); return; }
  1131 |     const r = await get(`/api/vehicle-requests/${createdVreqId}`, adminToken);
  1132 |     expect(r.status).toBe(200);
  1133 |     expect(r.data.success).toBe(true);
  1134 |     const item = r.data.data || r.data;
  1135 |     expect(item).toHaveProperty('destination');
  1136 |   });
  1137 | 
  1138 |   test('PUT /api/vehicle-requests/:id/approve — ออนุมัติคำขอ', async () => {
  1139 |     if (!createdVreqId || !vreqVehicleId || !vreqDriverId) { test.skip(); return; }
  1140 |     const r = await put(`/api/vehicle-requests/${createdVreqId}/approve`, {
  1141 |       assigned_car_id: vreqVehicleId,
  1142 |       assigned_driver_id: vreqDriverId,
  1143 |       notes: 'อนุมัติแล้ว',
  1144 |     }, adminToken);
  1145 |     expect(r.status).toBe(200);
  1146 |     expect(r.data.success).toBe(true);
  1147 |   });
  1148 | 
  1149 |   test('GET /api/vehicle-requests?status=approved — กรองตาม status', async () => {
  1150 |     const r = await get('/api/vehicle-requests?status=approved', adminToken);
  1151 |     expect(r.status).toBe(200);
  1152 |     expect(r.data.success).toBe(true);
  1153 |   });
  1154 | 
  1155 |   test('Cleanup — ลบรถและคนขับ Vehicle Request test', async () => {
  1156 |     if (vreqVehicleId) await del(`/api/vehicles/${vreqVehicleId}`, adminToken);
  1157 |     if (vreqDriverId) await del(`/api/drivers/${vreqDriverId}`, adminToken);
  1158 |   });
  1159 | });
  1160 | 
  1161 | // ════════════════════════════════════════════
  1162 | // 20. SURVEY (แบบประเมิน)
  1163 | // ════════════════════════════════════════════
  1164 | let surveyVehicleId = '';
  1165 | 
  1166 | test.describe.serial('20. Survey', () => {
  1167 |   test('Setup — สร้างรถสำหรับ Survey test', async () => {
  1168 |     const v = await post('/api/vehicles', {
  1169 |       license_plate: `SURV-${Date.now().toString().slice(-4)}`,
  1170 |       brand: 'Isuzu', model: 'D-Max', year: 2022,
  1171 |       fuel_type: 'diesel', seat_count: 5, status: 'available',
  1172 |     }, adminToken);
  1173 |     surveyVehicleId = v.data?.id || v.data?.data?.id;
  1174 |     expect(surveyVehicleId).toBeTruthy();
  1175 |   });
  1176 | 
  1177 |   test('POST /api/survey/submit — ส่งแบบประเมิน (Public QR)', async () => {
  1178 |     const r = await post('/api/survey/submit', {
  1179 |       car_id: surveyVehicleId,
  1180 |       respondent_name: 'ผู้ประเมินทดสอบ',
  1181 |       overall_score: 4,
  1182 |       cleanliness_score: 5,
  1183 |       punctuality_score: 4,
  1184 |       politeness_score: 5,
  1185 |       safety_score: 4,
  1186 |       appearance_score: 5,
  1187 |       comment: 'บริการดีมาก',
  1188 |     });
  1189 |     expect([200, 201]).toContain(r.status);
  1190 |     expect(r.data.success).toBe(true);
  1191 |   });
  1192 | 
  1193 |   test('GET /api/survey/results — ดูผลประเมิน (Admin)', async () => {
  1194 |     const r = await get('/api/survey/results', adminToken);
  1195 |     expect(r.status).toBe(200);
  1196 |     expect(r.data.success).toBe(true);
  1197 |   });
  1198 | 
  1199 |   test('GET /api/survey/results?car_id= — กรองตามรถ', async () => {
  1200 |     const r = await get(`/api/survey/results?car_id=${surveyVehicleId}`, adminToken);
  1201 |     expect(r.status).toBe(200);
  1202 |     expect(r.data.success).toBe(true);
  1203 |   });
  1204 | 
  1205 |   test('Cleanup — ลบรถ Survey test', async () => {
  1206 |     if (surveyVehicleId) await del(`/api/vehicles/${surveyVehicleId}`, adminToken);
  1207 |   });
  1208 | });
  1209 | 
  1210 | // ════════════════════════════════════════════
  1211 | // 21. RATE LIMITING
  1212 | // ════════════════════════════════════════════
  1213 | test.describe.serial('21. Rate Limiting', () => {
  1214 |   test('POST /api/auth/login — ถูก rate-limit หลังพยายามหลายครั้ง', async () => {
  1215 |     // ลองส่ง login ผิดหลายครั้ง → คาดว่าจะโดน rate-limit
```