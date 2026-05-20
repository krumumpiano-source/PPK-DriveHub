# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 1. Authentication — เข้าสู่ระบบและตรวจสอบตัวตน >> login ด้วย email+password ได้ token
- Location: tests\e2e\driver.spec.mjs:219:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "driver"
Received: "viewer"
```

# Test source

```ts
  127 |     ctx.driverToken = existing.data.token;
  128 |     ctx.driverUserId = existing.data.user_id || '';
  129 |   } else {
  130 |     // Register
  131 |     await apiPost('/api/auth/register', {
  132 |       email: DRIVER_USER.email,
  133 |       first_name: DRIVER_USER.first_name,
  134 |       last_name: DRIVER_USER.last_name,
  135 |       password: DRIVER_USER.password,
  136 |     });
  137 |     clearRateLimits();
  138 | 
  139 |     // Approve
  140 |     const reqs = await apiGet('/api/admin/requests?status=pending', ctx.adminToken);
  141 |     const req = reqs?.data?.find(r => r.email === DRIVER_USER.email);
  142 |     if (req) {
  143 |       await apiPut(`/api/admin/requests/${req.id}/approve`, {
  144 |         role: DRIVER_USER.role,
  145 |         permissions: {},
  146 |       }, ctx.adminToken);
  147 |       clearRateLimits();
  148 |     }
  149 | 
  150 |     // Login
  151 |     const loginRes = await apiPost('/api/auth/login', {
  152 |       username: DRIVER_USER.email,
  153 |       password: DRIVER_USER.password,
  154 |     });
  155 |     if (loginRes?.data?.token) {
  156 |       ctx.driverToken = loginRes.data.token;
  157 |       ctx.driverUserId = loginRes.data.user_id || '';
  158 |     }
  159 |     clearRateLimits();
  160 |   }
  161 | 
  162 |   if (!ctx.driverToken) throw new Error('[driver.spec] Cannot obtain driver token');
  163 | 
  164 |   // ดึง user id ถ้ายังไม่มี
  165 |   if (!ctx.driverUserId) {
  166 |     const me = await apiGet('/api/auth/me', ctx.driverToken);
  167 |     ctx.driverUserId = me?.data?.id || '';
  168 |   }
  169 | 
  170 |   // 3. สร้าง driver record (ถ้ายังไม่มี) แล้ว link กับ user
  171 |   // ตรวจว่า user มี driver_id แล้วหรือยัง
  172 |   const meCheck = await apiGet('/api/auth/me', ctx.driverToken);
  173 |   if (!meCheck?.data?.driver_id) {
  174 |     // สร้าง driver record ผ่าน admin
  175 |     const driverCreate = await apiPost('/api/drivers', {
  176 |       first_name: DRIVER_USER.first_name,
  177 |       last_name: DRIVER_USER.last_name,
  178 |       license_number: 'ทดสอบ-001',
  179 |       phone: '0812345678',
  180 |       status: 'active',
  181 |     }, ctx.adminToken);
  182 |     if (driverCreate?.data?.id) {
  183 |       ctx.driverRecordId = driverCreate.data.id;
  184 |       // Link user → driver record
  185 |       if (ctx.driverUserId) {
  186 |         await apiPut(`/api/admin/users/${ctx.driverUserId}`, {
  187 |           driver_id: ctx.driverRecordId,
  188 |         }, ctx.adminToken);
  189 |       }
  190 |     }
  191 |     clearRateLimits();
  192 |   } else {
  193 |     ctx.driverRecordId = meCheck.data.driver_id;
  194 |   }
  195 | 
  196 |   // 4. หา car_id สำหรับใช้ใน test
  197 |   const cars = await apiGet('/api/vehicles', ctx.adminToken);
  198 |   const carList = Array.isArray(cars?.data) ? cars.data : (Array.isArray(cars?.data?.vehicles) ? cars.data.vehicles : []);
  199 |   if (carList.length > 0) ctx.carId = carList[0].id;
  200 | 
  201 |   // ถ้าไม่มีรถเลย → สร้างรถทดสอบ
  202 |   if (!ctx.carId) {
  203 |     const newCar = await apiPost('/api/vehicles', {
  204 |       license_plate: 'ทด-0001',
  205 |       brand: 'Toyota',
  206 |       model: 'Commuter',
  207 |       fuel_type: 'diesel',
  208 |       status: 'active',
  209 |     }, ctx.adminToken);
  210 |     ctx.carId = newCar?.data?.id || '';
  211 |     clearRateLimits();
  212 |   }
  213 | });
  214 | 
  215 | // ══════════════════════════════════════════════════════════════
  216 | // 1. AUTHENTICATION — เข้าสู่ระบบ / ออกจากระบบ
  217 | // ══════════════════════════════════════════════════════════════
  218 | test.describe('1. Authentication — เข้าสู่ระบบและตรวจสอบตัวตน', () => {
  219 |   test('login ด้วย email+password ได้ token', async () => {
  220 |     clearRateLimits();
  221 |     const r = await apiPost('/api/auth/login', {
  222 |       username: DRIVER_USER.email,
  223 |       password: DRIVER_USER.password,
  224 |     });
  225 |     expect(r?.success).toBe(true);
  226 |     expect(r?.data?.token).toBeTruthy();
> 227 |     expect(r?.data?.role).toBe('driver');
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  228 |   });
  229 | 
  230 |   test('GET /api/auth/me — ดูข้อมูลตัวเองได้', async () => {
  231 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  232 |     expect(r?.success).toBe(true);
  233 |     expect(r?.data?.email).toBe(DRIVER_USER.email);
  234 |     expect(r?.data?.role).toBe('driver');
  235 |   });
  236 | 
  237 |   test('driver_id ถูก link กับ user record', async () => {
  238 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  239 |     expect(r?.data?.driver_id).toBeTruthy();
  240 |   });
  241 | 
  242 |   test('logout ได้ปกติ', async () => {
  243 |     clearRateLimits();
  244 |     // ใช้ token ชั่วคราวเพื่อไม่ให้กระทบ ctx.driverToken
  245 |     const loginTmp = await apiPost('/api/auth/login', {
  246 |       username: DRIVER_USER.email,
  247 |       password: DRIVER_USER.password,
  248 |     });
  249 |     clearRateLimits();
  250 |     const tmpToken = loginTmp?.data?.token;
  251 |     if (tmpToken) {
  252 |       const r = await apiPost('/api/auth/logout', {}, tmpToken);
  253 |       expect(r?.success).toBe(true);
  254 |     }
  255 |   });
  256 | 
  257 |   test('login ด้วยรหัสผ่านผิด → 401', async () => {
  258 |     clearRateLimits();
  259 |     const r = await apiPost('/api/auth/login', {
  260 |       username: DRIVER_USER.email,
  261 |       password: 'WrongPass!999',
  262 |     });
  263 |     expect(r?.success).toBe(false);
  264 |     clearRateLimits();
  265 |   });
  266 | });
  267 | 
  268 | // ══════════════════════════════════════════════════════════════
  269 | // 2. ขอใช้รถ (VEHICLE REQUESTS)
  270 | // ══════════════════════════════════════════════════════════════
  271 | test.describe('2. ขอใช้รถ — Vehicle Requests', () => {
  272 |   test('สร้างคำขอใช้รถได้', async () => {
  273 |     const today = new Date().toISOString().slice(0, 10);
  274 |     const r = await apiPost('/api/vehicle-requests', {
  275 |       date: today,
  276 |       destination: 'โรงเรียนพะเยาพิทยาคม',
  277 |       purpose: 'ทดสอบระบบ E2E',
  278 |       time_start: '08:00',
  279 |       time_end: '12:00',
  280 |       passengers: 3,
  281 |       priority: 'general',
  282 |     }, ctx.driverToken);
  283 |     expect(r?.success).toBe(true);
  284 |     expect(r?.data?.id).toBeTruthy();
  285 |     ctx.vehicleRequestId = r.data.id;
  286 |   });
  287 | 
  288 |   test('ดูรายการคำขอใช้รถได้', async () => {
  289 |     const r = await apiGet('/api/vehicle-requests', ctx.driverToken);
  290 |     expect(r?.success).toBe(true);
  291 |     expect(Array.isArray(r?.data)).toBe(true);
  292 |   });
  293 | 
  294 |   test('ดูคำขอของตัวเองตาม requester_id ได้', async () => {
  295 |     const r = await apiGet(`/api/vehicle-requests?requester_id=${ctx.driverUserId}`, ctx.driverToken);
  296 |     expect(r?.success).toBe(true);
  297 |     expect(Array.isArray(r?.data)).toBe(true);
  298 |     // ควรมีคำขอที่เพิ่งสร้าง
  299 |     if (ctx.vehicleRequestId) {
  300 |       const found = r.data.some(x => x.id === ctx.vehicleRequestId);
  301 |       expect(found).toBe(true);
  302 |     }
  303 |   });
  304 | 
  305 |   test('ดูรายละเอียดคำขอเดี่ยวได้', async () => {
  306 |     if (!ctx.vehicleRequestId) return test.skip();
  307 |     const r = await apiGet(`/api/vehicle-requests/${ctx.vehicleRequestId}`, ctx.driverToken);
  308 |     expect(r?.success).toBe(true);
  309 |     expect(r?.data?.id).toBe(ctx.vehicleRequestId);
  310 |     expect(r?.data?.destination).toBe('โรงเรียนพะเยาพิทยาคม');
  311 |   });
  312 | 
  313 |   test('แก้ไขคำขอ pending ของตัวเองได้', async () => {
  314 |     if (!ctx.vehicleRequestId) return test.skip();
  315 |     const r = await apiPut(`/api/vehicle-requests/${ctx.vehicleRequestId}`, {
  316 |       destination: 'โรงเรียนพะเยาพิทยาคม (แก้ไขแล้ว)',
  317 |       notes: 'แก้ไขโดย E2E test',
  318 |     }, ctx.driverToken);
  319 |     expect(r?.success).toBe(true);
  320 |   });
  321 | 
  322 |   test('ยกเลิกคำขอของตัวเองได้', async () => {
  323 |     // สร้างคำขอใหม่เพื่อยกเลิก (ไม่ใช้ vehicleRequestId หลัก)
  324 |     const today = new Date().toISOString().slice(0, 10);
  325 |     const createRes = await apiPost('/api/vehicle-requests', {
  326 |       date: today,
  327 |       destination: 'ทดสอบยกเลิก',
```