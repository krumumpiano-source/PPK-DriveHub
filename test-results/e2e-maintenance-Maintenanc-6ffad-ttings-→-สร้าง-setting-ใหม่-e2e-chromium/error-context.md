# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\maintenance.spec.mjs >> Maintenance API >> POST /api/maintenance/settings → สร้าง setting ใหม่
- Location: tests\e2e\maintenance.spec.mjs:94:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 400
Received array: [200, 201]
```

# Test source

```ts
  1   | // ==============================================================
  2   | // PPK DriveHub — Maintenance API Tests
  3   | // ทดสอบ: Settings CRUD, Vehicle Overrides, Profiles, Alerts, Priority
  4   | // ==============================================================
  5   | import { test, expect } from '@playwright/test';
  6   | import { execSync } from 'child_process';
  7   | 
  8   | const BASE = 'http://localhost:8788';
  9   | const ADMIN_USER = 'testadmin';
  10  | const ADMIN_PASS = process.env.TEST_ADMIN_PASS;
  11  | 
  12  | function clearRateLimits() {
  13  |   try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
  14  | }
  15  | 
  16  | async function apiPost(path, body, token = '') {
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
  46  | const ctx = {
  47  |   adminToken: '',
  48  |   carId: '',
  49  |   settingId: '',
  50  |   profileId: '',
  51  |   alertId: '',
  52  | };
  53  | 
  54  | test.describe.serial('Maintenance API', () => {
  55  |   // ──────────────────────────────────────────
  56  |   // Bootstrap: login + create vehicle
  57  |   // ──────────────────────────────────────────
  58  |   test('Bootstrap: login ได้รับ admin token', async () => {
  59  |     clearRateLimits();
  60  |     // Try setup first
  61  |     const setupCheck = await apiGet('/api/setup');
  62  |     if (setupCheck.data?.data?.needs_setup) {
  63  |       await apiPost('/api/setup', { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' });
  64  |     }
  65  |     clearRateLimits();
  66  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  67  |       const r = await apiPost('/api/auth/login', { username: ADMIN_USER, password: pw });
  68  |       if (r.data?.data?.token) { ctx.adminToken = r.data.data.token; break; }
  69  |       clearRateLimits();
  70  |     }
  71  |     expect(ctx.adminToken).toBeTruthy();
  72  |   });
  73  | 
  74  |   test('Bootstrap: สร้าง test vehicle', async () => {
  75  |     const r = await apiPost('/api/vehicles', {
  76  |       license_plate: `MNT-${Date.now().toString().slice(-6)}`,
  77  |       brand: 'Toyota', model: 'Hilux', year: 2020,
  78  |       fuel_type: 'diesel', vehicle_type: 'pickup',
  79  |     }, ctx.adminToken);
  80  |     expect([200, 201]).toContain(r.status);
  81  |     ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
  82  |     expect(ctx.carId).toBeTruthy();
  83  |   });
  84  | 
  85  |   // ──────────────────────────────────────────
  86  |   // Settings CRUD
  87  |   // ──────────────────────────────────────────
  88  |   test('GET /api/maintenance/settings → list (อาจว่าง)', async () => {
  89  |     const r = await apiGet('/api/maintenance/settings', ctx.adminToken);
  90  |     expect(r.status).toBe(200);
  91  |     expect(Array.isArray(r.data?.data)).toBe(true);
  92  |   });
  93  | 
  94  |   test('POST /api/maintenance/settings → สร้าง setting ใหม่', async () => {
  95  |     const r = await apiPost('/api/maintenance/settings', {
  96  |       item_name: 'เปลี่ยนน้ำมันเครื่อง',
  97  |       interval_km: 10000,
  98  |       interval_months: 6,
  99  |       priority: 'high',
  100 |     }, ctx.adminToken);
> 101 |     expect([200, 201]).toContain(r.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  102 |     ctx.settingId = r.data?.data?.id || r.data?.data?.setting_id;
  103 |     expect(ctx.settingId).toBeTruthy();
  104 |   });
  105 | 
  106 |   test('GET /api/maintenance/settings — มี setting ที่สร้าง', async () => {
  107 |     const r = await apiGet('/api/maintenance/settings', ctx.adminToken);
  108 |     const items = r.data?.data || [];
  109 |     const found = items.find((s) => s.id === ctx.settingId || s.id === Number(ctx.settingId));
  110 |     expect(found).toBeTruthy();
  111 |     expect(found.item_name).toBe('เปลี่ยนน้ำมันเครื่อง');
  112 |   });
  113 | 
  114 |   test('PUT /api/maintenance/settings/:id → แก้ไข', async () => {
  115 |     const r = await apiPut(`/api/maintenance/settings/${ctx.settingId}`, {
  116 |       item_name: 'เปลี่ยนน้ำมันเครื่อง (แก้ไข)',
  117 |       interval_km: 15000,
  118 |       interval_months: 12,
  119 |       priority: 'high',
  120 |     }, ctx.adminToken);
  121 |     expect(r.status).toBe(200);
  122 |   });
  123 | 
  124 |   test('PUT bulk settings → update หลาย setting พร้อมกัน', async () => {
  125 |     const r = await apiPut('/api/maintenance/settings/bulk', {
  126 |       settings: [{ id: ctx.settingId, interval_km: 12000 }],
  127 |     }, ctx.adminToken);
  128 |     // 200 หรือ 404 ถ้า endpoint ไม่มี bulk
  129 |     expect([200, 404, 405]).toContain(r.status);
  130 |   });
  131 | 
  132 |   // ──────────────────────────────────────────
  133 |   // Vehicle Maintenance Status
  134 |   // ──────────────────────────────────────────
  135 |   test('GET /api/maintenance/status → dashboard status', async () => {
  136 |     const r = await apiGet('/api/maintenance/status', ctx.adminToken);
  137 |     expect(r.status).toBe(200);
  138 |     // คาดว่าได้ object หรือ array
  139 |     expect(r.data).toBeTruthy();
  140 |   });
  141 | 
  142 |   test('GET /api/maintenance/vehicle/:carId → vehicle maintenance status', async () => {
  143 |     const r = await apiGet(`/api/maintenance/vehicle/${ctx.carId}`, ctx.adminToken);
  144 |     expect([200, 404]).toContain(r.status);
  145 |     if (r.status === 200) {
  146 |       expect(r.data?.data).toBeTruthy();
  147 |     }
  148 |   });
  149 | 
  150 |   test('PUT /api/maintenance/vehicle/:carId/bulk → override', async () => {
  151 |     const r = await apiPut(`/api/maintenance/vehicle/${ctx.carId}/bulk`, {
  152 |       overrides: [],
  153 |     }, ctx.adminToken);
  154 |     expect([200, 400, 404]).toContain(r.status);
  155 |   });
  156 | 
  157 |   // ──────────────────────────────────────────
  158 |   // Maintenance Profiles
  159 |   // ──────────────────────────────────────────
  160 |   test('GET /api/maintenance/profiles → list profiles', async () => {
  161 |     const r = await apiGet('/api/maintenance/profiles', ctx.adminToken);
  162 |     expect([200, 404]).toContain(r.status);
  163 |     if (r.status === 200) {
  164 |       // data อาจเป็น array หรือ object
  165 |       expect(r.data).toBeTruthy();
  166 |     }
  167 |   });
  168 | 
  169 |   test('GET /api/maintenance/profiles/brands → brands list', async () => {
  170 |     const r = await apiGet('/api/maintenance/profiles/brands', ctx.adminToken);
  171 |     expect([200, 404]).toContain(r.status);
  172 |   });
  173 | 
  174 |   // ──────────────────────────────────────────
  175 |   // Maintenance Alerts
  176 |   // ──────────────────────────────────────────
  177 |   test('GET /api/maintenance/alerts → alerts list', async () => {
  178 |     const r = await apiGet('/api/maintenance/alerts', ctx.adminToken);
  179 |     expect([200, 404]).toContain(r.status);
  180 |     if (r.status === 200) {
  181 |       expect(r.data?.data !== undefined).toBe(true);
  182 |     }
  183 |   });
  184 | 
  185 |   test('GET /api/maintenance/alerts?status=active → filter active', async () => {
  186 |     const r = await apiGet('/api/maintenance/alerts?status=active', ctx.adminToken);
  187 |     expect([200, 404]).toContain(r.status);
  188 |   });
  189 | 
  190 |   // ──────────────────────────────────────────
  191 |   // Auth & Permissions
  192 |   // ──────────────────────────────────────────
  193 |   test('GET /api/maintenance/settings ไม่มี token → 401', async () => {
  194 |     const r = await apiGet('/api/maintenance/settings');
  195 |     expect([401, 403]).toContain(r.status);
  196 |   });
  197 | 
  198 |   test('POST /api/maintenance/settings ไม่มี token → 401', async () => {
  199 |     const r = await apiPost('/api/maintenance/settings', { item_name: 'test', interval_km: 1000 });
  200 |     expect([401, 403]).toContain(r.status);
  201 |   });
```