# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\vehicle-requests.spec.mjs >> Vehicle Requests API >> POST /api/vehicle-requests → สร้าง request
- Location: tests\e2e\vehicle-requests.spec.mjs:110:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [200, 201]
```

# Test source

```ts
  17  |   const r = await fetch(`${BASE}${path}`, {
  18  |     method: 'POST',
  19  |     headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  20  |     body: JSON.stringify(body),
  21  |   });
  22  |   return { status: r.status, data: await r.json() };
  23  | }
  24  | async function apiGet(path, token = '') {
  25  |   const r = await fetch(`${BASE}${path}`, {
  26  |     headers: token ? { Authorization: `Bearer ${token}` } : {},
  27  |   });
  28  |   return { status: r.status, data: await r.json() };
  29  | }
  30  | async function apiPut(path, body, token = '') {
  31  |   const r = await fetch(`${BASE}${path}`, {
  32  |     method: 'PUT',
  33  |     headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  34  |     body: JSON.stringify(body),
  35  |   });
  36  |   return { status: r.status, data: await r.json() };
  37  | }
  38  | async function apiDelete(path, token = '') {
  39  |   const r = await fetch(`${BASE}${path}`, {
  40  |     method: 'DELETE',
  41  |     headers: token ? { Authorization: `Bearer ${token}` } : {},
  42  |   });
  43  |   return { status: r.status, data: await r.json() };
  44  | }
  45  | 
  46  | const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  47  | const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  48  | 
  49  | const ctx = {
  50  |   adminToken: '',
  51  |   carId: '',
  52  |   driverId: '',
  53  |   requestId: '',
  54  |   requestId2: '',
  55  |   queueIdFromApprove: '',
  56  | };
  57  | 
  58  | test.describe.serial('Vehicle Requests API', () => {
  59  |   // ──────────────────────────────────────────
  60  |   // Bootstrap
  61  |   // ──────────────────────────────────────────
  62  |   test('Bootstrap: login', async () => {
  63  |     clearRateLimits();
  64  |     const setupCheck = await apiGet('/api/setup');
  65  |     if (setupCheck.data?.data?.needs_setup) {
  66  |       await apiPost('/api/setup', { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' });
  67  |     }
  68  |     clearRateLimits();
  69  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  70  |       const r = await apiPost('/api/auth/login', { username: ADMIN_USER, password: pw });
  71  |       if (r.data?.data?.token) { ctx.adminToken = r.data.data.token; break; }
  72  |       clearRateLimits();
  73  |     }
  74  |     expect(ctx.adminToken).toBeTruthy();
  75  |   });
  76  | 
  77  |   test('Bootstrap: สร้าง test vehicle (active)', async () => {
  78  |     const r = await apiPost('/api/vehicles', {
  79  |       license_plate: `VRQ-${Date.now().toString().slice(-6)}`,
  80  |       brand: 'Ford', model: 'Ranger', year: 2023,
  81  |       fuel_type: 'diesel', vehicle_type: 'pickup',
  82  |       status: 'active',
  83  |     }, ctx.adminToken);
  84  |     expect([200, 201]).toContain(r.status);
  85  |     ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
  86  |     expect(ctx.carId).toBeTruthy();
  87  |   });
  88  | 
  89  |   test('Bootstrap: สร้าง test driver (active)', async () => {
  90  |     const r = await apiPost('/api/drivers', {
  91  |       first_name: 'VRQ', last_name: 'TestDriver',
  92  |       license_number: `VRQ${Date.now().toString().slice(-8)}`,
  93  |       license_expiry: '2030-12-31',
  94  |       status: 'active',
  95  |     }, ctx.adminToken);
  96  |     expect([200, 201]).toContain(r.status);
  97  |     ctx.driverId = r.data?.data?.id || r.data?.data?.driver_id;
  98  |     expect(ctx.driverId).toBeTruthy();
  99  |   });
  100 | 
  101 |   // ──────────────────────────────────────────
  102 |   // Create & Read
  103 |   // ──────────────────────────────────────────
  104 |   test('GET /api/vehicle-requests → list (อาจว่าง)', async () => {
  105 |     const r = await apiGet('/api/vehicle-requests', ctx.adminToken);
  106 |     expect(r.status).toBe(200);
  107 |     expect(Array.isArray(r.data?.data)).toBe(true);
  108 |   });
  109 | 
  110 |   test('POST /api/vehicle-requests → สร้าง request', async () => {
  111 |     const r = await apiPost('/api/vehicle-requests', {
  112 |       date: TOMORROW,
  113 |       destination: 'กรุงเทพมหานคร',
  114 |       purpose: 'ประชุม',
  115 |       passengers: 3,
  116 |     }, ctx.adminToken);
> 117 |     expect([200, 201]).toContain(r.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  118 |     ctx.requestId = r.data?.data?.id || r.data?.data?.request_id;
  119 |     expect(ctx.requestId).toBeTruthy();
  120 |   });
  121 | 
  122 |   test('GET /api/vehicle-requests → มี request ที่สร้าง', async () => {
  123 |     const r = await apiGet('/api/vehicle-requests', ctx.adminToken);
  124 |     const items = r.data?.data || [];
  125 |     const found = items.find((req) => req.id === ctx.requestId || req.id === Number(ctx.requestId));
  126 |     expect(found).toBeTruthy();
  127 |     expect(found.status).toBe('pending');
  128 |     expect(found.destination).toBe('กรุงเทพมหานคร');
  129 |   });
  130 | 
  131 |   test('GET /api/vehicle-requests/:id → ดู request ได้', async () => {
  132 |     const r = await apiGet(`/api/vehicle-requests/${ctx.requestId}`, ctx.adminToken);
  133 |     expect(r.status).toBe(200);
  134 |     expect(r.data?.data?.id === ctx.requestId || r.data?.data?.id === Number(ctx.requestId)).toBe(true);
  135 |   });
  136 | 
  137 |   test('POST /api/vehicle-requests ไม่มี date → 400', async () => {
  138 |     const r = await apiPost('/api/vehicle-requests', {
  139 |       destination: 'เชียงใหม่',
  140 |     }, ctx.adminToken);
  141 |     expect([400, 422]).toContain(r.status);
  142 |   });
  143 | 
  144 |   test('POST /api/vehicle-requests ไม่มี destination → 400', async () => {
  145 |     const r = await apiPost('/api/vehicle-requests', {
  146 |       date: TOMORROW,
  147 |     }, ctx.adminToken);
  148 |     expect([400, 422]).toContain(r.status);
  149 |   });
  150 | 
  151 |   // ──────────────────────────────────────────
  152 |   // Edit & Cancel
  153 |   // ──────────────────────────────────────────
  154 |   test('PUT /api/vehicle-requests/:id → แก้ไข destination', async () => {
  155 |     const r = await apiPut(`/api/vehicle-requests/${ctx.requestId}`, {
  156 |       date: TOMORROW,
  157 |       destination: 'เชียงใหม่ (แก้ไข)',
  158 |       purpose: 'ประชุม',
  159 |       passengers: 2,
  160 |     }, ctx.adminToken);
  161 |     expect(r.status).toBe(200);
  162 |   });
  163 | 
  164 |   test('สร้าง request ที่ 2 สำหรับทดสอบ cancel', async () => {
  165 |     const r = await apiPost('/api/vehicle-requests', {
  166 |       date: NEXT_WEEK,
  167 |       destination: 'ขอนแก่น',
  168 |       purpose: 'ส่งเอกสาร',
  169 |       passengers: 1,
  170 |     }, ctx.adminToken);
  171 |     expect([200, 201]).toContain(r.status);
  172 |     ctx.requestId2 = r.data?.data?.id || r.data?.data?.request_id;
  173 |     expect(ctx.requestId2).toBeTruthy();
  174 |   });
  175 | 
  176 |   test('DELETE /api/vehicle-requests/:id → cancel request', async () => {
  177 |     const r = await apiDelete(`/api/vehicle-requests/${ctx.requestId2}`, ctx.adminToken);
  178 |     expect([200, 204]).toContain(r.status);
  179 |   });
  180 | 
  181 |   test('GET cancelled request → ไม่ found หรือ status=cancelled', async () => {
  182 |     const r = await apiGet(`/api/vehicle-requests/${ctx.requestId2}`, ctx.adminToken);
  183 |     if (r.status === 200) {
  184 |       expect(['cancelled', 'deleted']).toContain(r.data?.data?.status);
  185 |     } else {
  186 |       expect([404]).toContain(r.status);
  187 |     }
  188 |   });
  189 | 
  190 |   // ──────────────────────────────────────────
  191 |   // Approve → Auto Queue
  192 |   // ──────────────────────────────────────────
  193 |   test('PUT /api/vehicle-requests/:id/approve → อนุมัติ + สร้าง queue', async () => {
  194 |     const r = await apiPut(`/api/vehicle-requests/${ctx.requestId}/approve`, {
  195 |       assigned_car_id: ctx.carId,
  196 |       assigned_driver_id: ctx.driverId,
  197 |     }, ctx.adminToken);
  198 |     // 200 = approved, 400/404 = ขึ้นกับ business rules
  199 |     expect([200, 400, 404]).toContain(r.status);
  200 |     if (r.status === 200) {
  201 |       // ควร auto-create queue
  202 |       const queueList = await apiGet('/api/queue', ctx.adminToken);
  203 |       if (queueList.status === 200 && Array.isArray(queueList.data?.data)) {
  204 |         // ตรวจว่ามี queue ที่เกี่ยวกับ request นี้
  205 |         const found = queueList.data.data.find((q) =>
  206 |           q.request_id === ctx.requestId || q.request_id === Number(ctx.requestId) ||
  207 |           q.destination === 'เชียงใหม่ (แก้ไข)'
  208 |         );
  209 |         if (found) ctx.queueIdFromApprove = found.id;
  210 |       }
  211 |     }
  212 |   });
  213 | 
  214 |   test('Approved request → status เปลี่ยนเป็น approved', async () => {
  215 |     const r = await apiGet(`/api/vehicle-requests/${ctx.requestId}`, ctx.adminToken);
  216 |     if (r.status === 200) {
  217 |       const status = r.data?.data?.status;
```