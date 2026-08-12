# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 20. Survey >> POST /api/survey/submit — ส่งแบบประเมิน (Public QR)
- Location: tests\api-integration.test.mjs:1177:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [200, 201]
```

# Test source

```ts
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
> 1189 |     expect([200, 201]).toContain(r.status);
       |                        ^ Error: expect(received).toContain(expected) // indexOf
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
  1216 |     let lastStatus = 0;
  1217 |     for (let i = 0; i < 10; i++) {
  1218 |       const r = await post('/api/auth/login', {
  1219 |         username: `rl_user_${Date.now()}`, password: 'wrongpass',
  1220 |       });
  1221 |       lastStatus = r.status;
  1222 |       if (lastStatus === 429) break;
  1223 |     }
  1224 |     // ถ้าระบบมี rate-limit → ต้องเจอ 429 ในที่สุด
  1225 |     // ถ้ายังไม่มี → ยอมรับ (แค่ตรวจว่าไม่ crash)
  1226 |     expect([401, 400, 429]).toContain(lastStatus);
  1227 |   });
  1228 | });
  1229 | 
  1230 | // ════════════════════════════════════════════
  1231 | // 22. ADMIN — User Management Full Workflow
  1232 | // ════════════════════════════════════════════
  1233 | let managedUserId = '';
  1234 | 
  1235 | test.describe.serial('22. Admin User Management', () => {
  1236 |   // หมายเหตุ: ระบบสร้าง user ผ่าน approve request ไม่ใช่ POST /api/admin/users
  1237 |   // ทดสอบ flow: สร้าง request → approve → update → deactivate
  1238 |   let managedRequestId = '';
  1239 | 
  1240 |   test('POST /api/auth/register — ยื่นคำขอสมัคร', async () => {
  1241 |     const r = await post('/api/auth/register', {
  1242 |       email: `admin_${Date.now()}@test.com`,
  1243 |       first_name: 'Admin',
  1244 |       last_name: 'User',
  1245 |       phone: '0877777777',
  1246 |       password: 'Password123!',
  1247 |     });
  1248 |     expect([200, 201]).toContain(r.status);
  1249 |     expect(r.data.success).toBe(true);
  1250 |   });
  1251 | 
  1252 |   test('GET /api/admin/requests — ดูรายการคำขอ pending', async () => {
  1253 |     const r = await get('/api/admin/requests?status=pending', adminToken);
  1254 |     expect(r.status).toBe(200);
  1255 |     expect(r.data.success).toBe(true);
  1256 |     const reqs = r.data.data || r.data;
  1257 |     if (Array.isArray(reqs) && reqs.length > 0) {
  1258 |       managedRequestId = reqs[0].id;
  1259 |     }
  1260 |   });
  1261 | 
  1262 |   test('PUT /api/admin/requests/:id/approve — อนุมัติคำขอ', async () => {
  1263 |     if (!managedRequestId) { test.skip(); return; }
  1264 |     const r = await put(`/api/admin/requests/${managedRequestId}/approve`, {
  1265 |       role: 'viewer',
  1266 |     }, adminToken);
  1267 |     expect(r.status).toBe(200);
  1268 |     expect(r.data.success).toBe(true);
  1269 |     managedUserId = r.data.data?.user_id || r.data.user_id;
  1270 |   });
  1271 | 
  1272 |   test('PUT /api/admin/users/:id — อัปเดต role ผู้ใช้', async () => {
  1273 |     if (!managedUserId) { test.skip(); return; }
  1274 |     const r = await put(`/api/admin/users/${managedUserId}`, {
  1275 |       role: 'fuel',
  1276 |     }, adminToken);
  1277 |     expect(r.status).toBe(200);
  1278 |     expect(r.data.success).toBe(true);
  1279 |   });
  1280 | 
  1281 |   test('PUT /api/admin/users/:id/reset-password — reset password', async () => {
  1282 |     if (!managedUserId) { test.skip(); return; }
  1283 |     const r = await put(`/api/admin/users/${managedUserId}/reset-password`, {
  1284 |       new_password: 'Reset@99999',
  1285 |     }, adminToken);
  1286 |     expect(r.status).toBe(200);
  1287 |     expect(r.data.success).toBe(true);
  1288 |   });
  1289 | 
```