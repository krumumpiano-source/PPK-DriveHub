# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 1. Authentication — เข้าสู่ระบบและตรวจสอบตัวตน >> login ด้วย email+password ได้ token
- Location: tests\e2e\driver.spec.mjs:228:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  196 |   // อัปเดต role และ reset permissions ให้ถูกต้องเสมอ (/api/auth/register สร้าง user เป็น viewer โดย default)
  197 |   if (ctx.driverUserId) {
  198 |     await apiPut(`/api/admin/users/${ctx.driverUserId}`, {
  199 |       role: DRIVER_USER.role,
  200 |       permissions: {}, // reset ให้ไม่มี extra permissions ค้าง
  201 |     }, ctx.adminToken);
  202 |     clearRateLimits();
  203 |   }
  204 | 
  205 |   // 4. หา car_id สำหรับใช้ใน test
  206 |   const cars = await apiGet('/api/vehicles', ctx.adminToken);
  207 |   const carList = Array.isArray(cars?.data) ? cars.data : (Array.isArray(cars?.data?.vehicles) ? cars.data.vehicles : []);
  208 |   if (carList.length > 0) ctx.carId = carList[0].id;
  209 | 
  210 |   // ถ้าไม่มีรถเลย → สร้างรถทดสอบ
  211 |   if (!ctx.carId) {
  212 |     const newCar = await apiPost('/api/vehicles', {
  213 |       license_plate: 'ทด-0001',
  214 |       brand: 'Toyota',
  215 |       model: 'Commuter',
  216 |       fuel_type: 'diesel',
  217 |       status: 'active',
  218 |     }, ctx.adminToken);
  219 |     ctx.carId = newCar?.data?.id || '';
  220 |     clearRateLimits();
  221 |   }
  222 | });
  223 | 
  224 | // ══════════════════════════════════════════════════════════════
  225 | // 1. AUTHENTICATION — เข้าสู่ระบบ / ออกจากระบบ
  226 | // ══════════════════════════════════════════════════════════════
  227 | test.describe('1. Authentication — เข้าสู่ระบบและตรวจสอบตัวตน', () => {
  228 |   test('login ด้วย email+password ได้ token', async () => {
  229 |     clearRateLimits();
  230 |     const r = await apiPost('/api/auth/login', {
  231 |       username: DRIVER_USER.email,
  232 |       password: DRIVER_USER.password,
  233 |     });
> 234 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  235 |     expect(r?.data?.token).toBeTruthy();
  236 |     expect(r?.data?.role).toBe('driver');
  237 |   });
  238 | 
  239 |   test('GET /api/auth/me — ดูข้อมูลตัวเองได้', async () => {
  240 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  241 |     expect(r?.success).toBe(true);
  242 |     expect(r?.data?.email).toBe(DRIVER_USER.email);
  243 |     expect(r?.data?.role).toBe('driver');
  244 |   });
  245 | 
  246 |   test('driver_id ถูก link กับ user record', async () => {
  247 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  248 |     expect(r?.data?.driver_id).toBeTruthy();
  249 |   });
  250 | 
  251 |   test('logout ได้ปกติ', async () => {
  252 |     clearRateLimits();
  253 |     // ใช้ token ชั่วคราวเพื่อไม่ให้กระทบ ctx.driverToken
  254 |     const loginTmp = await apiPost('/api/auth/login', {
  255 |       username: DRIVER_USER.email,
  256 |       password: DRIVER_USER.password,
  257 |     });
  258 |     clearRateLimits();
  259 |     const tmpToken = loginTmp?.data?.token;
  260 |     if (tmpToken) {
  261 |       const r = await apiPost('/api/auth/logout', {}, tmpToken);
  262 |       expect(r?.success).toBe(true);
  263 |     }
  264 |   });
  265 | 
  266 |   test('login ด้วยรหัสผ่านผิด → 401', async () => {
  267 |     clearRateLimits();
  268 |     const r = await apiPost('/api/auth/login', {
  269 |       username: DRIVER_USER.email,
  270 |       password: 'WrongPass!999',
  271 |     });
  272 |     expect(r?.success).toBe(false);
  273 |     clearRateLimits();
  274 |   });
  275 | });
  276 | 
  277 | // ══════════════════════════════════════════════════════════════
  278 | // 2. ขอใช้รถ (VEHICLE REQUESTS)
  279 | // ══════════════════════════════════════════════════════════════
  280 | test.describe('2. ขอใช้รถ — Vehicle Requests', () => {
  281 |   test('สร้างคำขอใช้รถได้', async () => {
  282 |     const today = new Date().toISOString().slice(0, 10);
  283 |     const r = await apiPost('/api/vehicle-requests', {
  284 |       date: today,
  285 |       destination: 'โรงเรียนพะเยาพิทยาคม',
  286 |       purpose: 'ทดสอบระบบ E2E',
  287 |       time_start: '08:00',
  288 |       time_end: '12:00',
  289 |       passengers: 3,
  290 |       priority: 'general',
  291 |     }, ctx.driverToken);
  292 |     expect(r?.success).toBe(true);
  293 |     expect(r?.data?.id).toBeTruthy();
  294 |     ctx.vehicleRequestId = r.data.id;
  295 |   });
  296 | 
  297 |   test('ดูรายการคำขอใช้รถได้', async () => {
  298 |     const r = await apiGet('/api/vehicle-requests', ctx.driverToken);
  299 |     expect(r?.success).toBe(true);
  300 |     expect(Array.isArray(r?.data)).toBe(true);
  301 |   });
  302 | 
  303 |   test('ดูคำขอของตัวเองตาม requester_id ได้', async () => {
  304 |     const r = await apiGet(`/api/vehicle-requests?requester_id=${ctx.driverUserId}`, ctx.driverToken);
  305 |     expect(r?.success).toBe(true);
  306 |     expect(Array.isArray(r?.data)).toBe(true);
  307 |     // ควรมีคำขอที่เพิ่งสร้าง
  308 |     if (ctx.vehicleRequestId) {
  309 |       const found = r.data.some(x => x.id === ctx.vehicleRequestId);
  310 |       expect(found).toBe(true);
  311 |     }
  312 |   });
  313 | 
  314 |   test('ดูรายละเอียดคำขอเดี่ยวได้', async () => {
  315 |     if (!ctx.vehicleRequestId) return test.skip();
  316 |     const r = await apiGet(`/api/vehicle-requests/${ctx.vehicleRequestId}`, ctx.driverToken);
  317 |     expect(r?.success).toBe(true);
  318 |     expect(r?.data?.id).toBe(ctx.vehicleRequestId);
  319 |     expect(r?.data?.destination).toBe('โรงเรียนพะเยาพิทยาคม');
  320 |   });
  321 | 
  322 |   test('แก้ไขคำขอ pending ของตัวเองได้', async () => {
  323 |     if (!ctx.vehicleRequestId) return test.skip();
  324 |     const r = await apiPut(`/api/vehicle-requests/${ctx.vehicleRequestId}`, {
  325 |       destination: 'โรงเรียนพะเยาพิทยาคม (แก้ไขแล้ว)',
  326 |       notes: 'แก้ไขโดย E2E test',
  327 |     }, ctx.driverToken);
  328 |     expect(r?.success).toBe(true);
  329 |   });
  330 | 
  331 |   test('ยกเลิกคำขอของตัวเองได้', async () => {
  332 |     // สร้างคำขอใหม่เพื่อยกเลิก (ไม่ใช้ vehicleRequestId หลัก)
  333 |     const today = new Date().toISOString().slice(0, 10);
  334 |     const createRes = await apiPost('/api/vehicle-requests', {
```