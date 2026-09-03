# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-integration.test.mjs >> 2. Auth >> POST /api/auth/login — เข้าสู่ระบบสำเร็จ
- Location: tests\api-integration.test.mjs:146:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  51  | let createdVehicleId = '';
  52  | let createdDriverId = '';
  53  | let createdQueueId = '';
  54  | let createdFuelId = '';
  55  | let createdRepairId = '';
  56  | let createdUsageId = '';
  57  | let createdCheckId = '';
  58  | let createdTaxId = '';
  59  | let createdInsuranceId = '';
  60  | let createdNotificationId = '';
  61  | 
  62  | // Recover auth + shared state if worker was restarted (libuv crash on Windows)
  63  | test.beforeEach(async () => {
  64  |   if (adminToken) return; // already authenticated
  65  |   // Clear rate limits so recovery login isn't blocked
  66  |   try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { timeout: 10000, stdio: 'pipe' }); } catch {}
  67  |   // Setup admin if needed
  68  |   const check = await get('/api/setup');
  69  |   if (check.data?.data?.needs_setup) {
  70  |     await post('/api/setup', {
  71  |       username: 'testadmin', password: ADMIN_PASS,
  72  |       first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com',
  73  |     });
  74  |   }
  75  |   // Try login with both possible passwords
  76  |   for (const pw of [ADMIN_PASS, ADMIN_PASS_ALT]) {
  77  |     const r = await post('/api/auth/login', { username: 'testadmin', password: pw });
  78  |     if (r.status === 200 && r.data?.data?.token) {
  79  |       adminToken = r.data.data.token;
  80  |       adminUserId = r.data.data.user_id;
  81  |       break;
  82  |     }
  83  |   }
  84  |   if (!adminToken) return;
  85  |   // Recover shared IDs from existing data
  86  |   if (!createdVehicleId) {
  87  |     const r = await get('/api/vehicles', adminToken);
  88  |     const v = r.data?.data?.vehicles;
  89  |     if (v?.length) createdVehicleId = v[0].id;
  90  |   }
  91  |   if (!createdDriverId) {
  92  |     const r = await get('/api/drivers', adminToken);
  93  |     const d = r.data?.data?.drivers;
  94  |     if (d?.length) createdDriverId = d[0].id;
  95  |   }
  96  | });
  97  | 
  98  | // ════════════════════════════════════════════
  99  | // 1. SETUP
  100 | // ════════════════════════════════════════════
  101 | test.describe.serial('1. Setup', () => {
  102 |   test('GET /api/setup — ตรวจว่าระบบต้องการ setup หรือไม่', async () => {
  103 |     const r = await get('/api/setup');
  104 |     expect(r.status).toBe(200);
  105 |     expect(r.data.success).toBe(true);
  106 |     expect(r.data.data).toHaveProperty('needs_setup');
  107 |     expect(typeof r.data.data.needs_setup).toBe('boolean');
  108 |   });
  109 | 
  110 |   test('POST /api/setup — สร้าง super_admin (ถ้ายังไม่มี)', async () => {
  111 |     const check = await get('/api/setup');
  112 |     if (!check.data.data.needs_setup) {
  113 |       test.skip();
  114 |       return;
  115 |     }
  116 |     const r = await post('/api/setup', {
  117 |       username: 'testadmin',
  118 |       password: ADMIN_PASS,
  119 |       first_name: 'Test',
  120 |       last_name: 'Admin',
  121 |       email: 'testadmin@test.com',
  122 |     });
  123 |     expect([200, 201]).toContain(r.status);
  124 |     expect(r.data.success).toBe(true);
  125 |     expect(r.data.data || r.data).toHaveProperty('user_id');
  126 |   });
  127 | });
  128 | 
  129 | // ════════════════════════════════════════════
  130 | // 2. AUTH
  131 | // ════════════════════════════════════════════
  132 | test.describe.serial('2. Auth', () => {
  133 |   test('Ensure admin exists before login', async () => {
  134 |     const check = await get('/api/setup');
  135 |     if (check.data.data && check.data.data.needs_setup) {
  136 |       await post('/api/setup', {
  137 |         username: 'testadmin',
  138 |         password: ADMIN_PASS,
  139 |         first_name: 'Test',
  140 |         last_name: 'Admin',
  141 |         email: 'testadmin@test.com',
  142 |       });
  143 |     }
  144 |   });
  145 | 
  146 |   test('POST /api/auth/login — เข้าสู่ระบบสำเร็จ', async () => {
  147 |     const r = await post('/api/auth/login', {
  148 |       username: 'testadmin',
  149 |       password: ADMIN_PASS,
  150 |     });
> 151 |     expect(r.status).toBe(200);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  152 |     expect(r.data.success).toBe(true);
  153 |     expect(r.data.data).toHaveProperty('token');
  154 |     expect(r.data.data).toHaveProperty('user_id');
  155 |     expect(r.data.data).toHaveProperty('role');
  156 |     adminToken = r.data.data.token;
  157 |     adminUserId = r.data.data.user_id;
  158 |   });
  159 | 
  160 |   test('POST /api/auth/login — รหัสผิดต้อง fail', async () => {
  161 |     const r = await post('/api/auth/login', {
  162 |       username: 'testadmin',
  163 |       password: 'wrongpassword',
  164 |     });
  165 |     expect([401, 400]).toContain(r.status);
  166 |     expect(r.data.success).toBe(false);
  167 |   });
  168 | 
  169 |   test('GET /api/auth/me — ดูข้อมูลตัวเอง', async () => {
  170 |     const r = await get('/api/auth/me', adminToken);
  171 |     expect(r.status).toBe(200);
  172 |     expect(r.data.success).toBe(true);
  173 |     expect(r.data.data).toHaveProperty('username');
  174 |     expect(r.data.data).toHaveProperty('role');
  175 |     expect(r.data.data).toHaveProperty('email');
  176 |   });
  177 | 
  178 |   test('GET /api/auth/me — ไม่มี token ต้อง 401', async () => {
  179 |     const r = await get('/api/auth/me');
  180 |     expect(r.status).toBe(401);
  181 |   });
  182 | 
  183 |   test('PUT /api/auth/profile — อัปเดตโปรไฟล์', async () => {
  184 |     const r = await put('/api/auth/profile', {
  185 |       first_name: 'TestUpdated',
  186 |       phone: '0891234567',
  187 |     }, adminToken);
  188 |     expect(r.status).toBe(200);
  189 |     expect(r.data.success).toBe(true);
  190 |   });
  191 | 
  192 |   test('POST /api/auth/change-password — เปลี่ยนรหัสผ่าน', async () => {
  193 |     const r = await post('/api/auth/change-password', {
  194 |       old_password: ADMIN_PASS,
  195 |       new_password: ADMIN_PASS_ALT,
  196 |     }, adminToken);
  197 |     expect(r.status).toBe(200);
  198 |     expect(r.data.success).toBe(true);
  199 |     // Re-login with new password to confirm & update token
  200 |     const login = await post('/api/auth/login', {
  201 |       username: 'testadmin',
  202 |       password: ADMIN_PASS_ALT,
  203 |     });
  204 |     expect(login.status).toBe(200);
  205 |     adminToken = login.data.data.token;
  206 |     // Restore password back to original so subsequent test suites work consistently
  207 |     await post('/api/auth/change-password', {
  208 |       old_password: ADMIN_PASS_ALT,
  209 |       new_password: ADMIN_PASS,
  210 |     }, adminToken);
  211 |     const relg = await post('/api/auth/login', { username: 'testadmin', password: ADMIN_PASS });
  212 |     if (relg.data?.data?.token) adminToken = relg.data.data.token;
  213 |   });
  214 | 
  215 |   test('POST /api/auth/accept-pdpa — ยอมรับ PDPA', async () => {
  216 |     const r = await post('/api/auth/accept-pdpa', {}, adminToken);
  217 |     expect(r.status).toBe(200);
  218 |     expect(r.data.success).toBe(true);
  219 |   });
  220 | 
  221 |   test('POST /api/auth/register — สมัครสมาชิกใหม่', async () => {
  222 |     const r = await post('/api/auth/register', {
  223 |       email: `testuser_${Date.now()}@test.com`,
  224 |       first_name: 'New',
  225 |       last_name: 'User',
  226 |       phone: '0899999999',
  227 |       password: 'Password123!',
  228 |     });
  229 |     expect([200, 201]).toContain(r.status);
  230 |     expect(r.data.success).toBe(true);
  231 |   });
  232 | 
  233 |   test('POST /api/auth/forgot-password — ลืมรหัสผ่าน', async () => {
  234 |     const r = await post('/api/auth/forgot-password', {
  235 |       email: 'testadmin@test.com',
  236 |     });
  237 |     // always returns success (no email leak)
  238 |     expect(r.status).toBe(200);
  239 |     expect(r.data.success).toBe(true);
  240 |   });
  241 | });
  242 | 
  243 | // ════════════════════════════════════════════
  244 | // 3. VEHICLES
  245 | // ════════════════════════════════════════════
  246 | test.describe.serial('3. Vehicles', () => {
  247 |   test('POST /api/vehicles — สร้างรถ', async () => {
  248 |     expect(adminToken).toBeTruthy();
  249 |     const r = await post('/api/vehicles', {
  250 |       license_plate: `TEST-${Date.now().toString().slice(-4)}`,
  251 |       brand: 'Toyota',
```