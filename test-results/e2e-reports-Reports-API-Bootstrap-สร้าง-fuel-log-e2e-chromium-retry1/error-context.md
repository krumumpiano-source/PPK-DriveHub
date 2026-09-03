# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\reports.spec.mjs >> Reports API >> Bootstrap: สร้าง fuel log
- Location: tests\e2e\reports.spec.mjs:86:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [200, 201]
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — Reports API Tests
  3   | // ทดสอบ: Dashboard, Basic Reports, Fuel, Usage, Data Quality,
  4   | //         Vehicle Timeline, Vehicle Cost, Driver Performance
  5   | // ==============================================================
  6   | import { test, expect } from '@playwright/test';
  7   | import { execSync } from 'child_process';
  8   | 
  9   | const BASE = 'http://localhost:8788';
  10  | const ADMIN_USER = 'testadmin';
  11  | const ADMIN_PASS = process.env.TEST_ADMIN_PASS;
  12  | 
  13  | function clearRateLimits() {
  14  |   try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
  15  | }
  16  | 
  17  | async function apiPost(path, body, token = '') {
  18  |   const r = await fetch(`${BASE}${path}`, {
  19  |     method: 'POST',
  20  |     headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  21  |     body: JSON.stringify(body),
  22  |   });
  23  |   return { status: r.status, data: await r.json() };
  24  | }
  25  | async function apiGet(path, token = '') {
  26  |   const r = await fetch(`${BASE}${path}`, {
  27  |     headers: token ? { Authorization: `Bearer ${token}` } : {},
  28  |   });
  29  |   return { status: r.status, data: await r.json() };
  30  | }
  31  | 
  32  | const TODAY = new Date().toISOString().slice(0, 10);
  33  | const MONTH = TODAY.slice(0, 7); // YYYY-MM
  34  | const YEAR_START = `${TODAY.slice(0, 4)}-01-01`;
  35  | 
  36  | const ctx = {
  37  |   adminToken: '',
  38  |   carId: '',
  39  |   driverId: '',
  40  |   queueId: '',
  41  | };
  42  | 
  43  | test.describe.serial('Reports API', () => {
  44  |   // ──────────────────────────────────────────
  45  |   // Bootstrap: login + สร้าง test data
  46  |   // ──────────────────────────────────────────
  47  |   test('Bootstrap: login', async () => {
  48  |     clearRateLimits();
  49  |     const setupCheck = await apiGet('/api/setup');
  50  |     if (setupCheck.data?.data?.needs_setup) {
  51  |       await apiPost('/api/setup', { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' });
  52  |     }
  53  |     clearRateLimits();
  54  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  55  |       const r = await apiPost('/api/auth/login', { username: ADMIN_USER, password: pw });
  56  |       if (r.data?.data?.token) { ctx.adminToken = r.data.data.token; break; }
  57  |       clearRateLimits();
  58  |     }
  59  |     expect(ctx.adminToken).toBeTruthy();
  60  |   });
  61  | 
  62  |   test('Bootstrap: สร้าง test vehicle', async () => {
  63  |     const r = await apiPost('/api/vehicles', {
  64  |       license_plate: `RPT-${Date.now().toString().slice(-6)}`,
  65  |       brand: 'Mitsubishi', model: 'Triton', year: 2021,
  66  |       fuel_type: 'diesel', vehicle_type: 'pickup',
  67  |       status: 'active',
  68  |     }, ctx.adminToken);
  69  |     expect([200, 201]).toContain(r.status);
  70  |     ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
  71  |     expect(ctx.carId).toBeTruthy();
  72  |   });
  73  | 
  74  |   test('Bootstrap: สร้าง test driver', async () => {
  75  |     const r = await apiPost('/api/drivers', {
  76  |       first_name: 'Report', last_name: 'TestDriver',
  77  |       license_number: `RPT${Date.now().toString().slice(-8)}`,
  78  |       license_expiry: '2030-12-31',
  79  |       status: 'active',
  80  |     }, ctx.adminToken);
  81  |     expect([200, 201]).toContain(r.status);
  82  |     ctx.driverId = r.data?.data?.id || r.data?.data?.driver_id;
  83  |     expect(ctx.driverId).toBeTruthy();
  84  |   });
  85  | 
  86  |   test('Bootstrap: สร้าง fuel log', async () => {
  87  |     const r = await apiPost('/api/fuel/record', {
  88  |       car_id: ctx.carId,
  89  |       driver_id: ctx.driverId,
  90  |       liters: 50,
  91  |       price_per_liter: 35.5,
  92  |       total_cost: 1775,
  93  |       mileage_after: 50000,
  94  |       mileage_before: 49500,
  95  |       station: 'ปั๊มทดสอบ',
  96  |       fuel_date: TODAY,
  97  |       purpose: 'official',
  98  |       receipt_image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  99  |     }, ctx.adminToken);
> 100 |     expect([200, 201]).toContain(r.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  101 |   });
  102 | 
  103 |   test('Bootstrap: สร้าง queue + usage records', async () => {
  104 |     // สร้าง queue
  105 |     const queueR = await apiPost('/api/queue', {
  106 |       car_id: ctx.carId,
  107 |       driver_id: ctx.driverId,
  108 |       destination: 'ทดสอบ Report',
  109 |       date: TODAY,
  110 |       purpose: 'ทดสอบรายงาน',
  111 |     }, ctx.adminToken);
  112 |     expect([200, 201]).toContain(queueR.status);
  113 |     ctx.queueId = queueR.data?.data?.id || queueR.data?.data?.queue_id;
  114 |     if (ctx.queueId) {
  115 |       // departure record
  116 |       await apiPost('/api/usage', {
  117 |         queue_id: ctx.queueId,
  118 |         car_id: ctx.carId,
  119 |         driver_id: ctx.driverId,
  120 |         record_type: 'departure',
  121 |         mileage: 50100,
  122 |         record_date: TODAY,
  123 |       }, ctx.adminToken);
  124 |       // return record
  125 |       await apiPost('/api/usage', {
  126 |         queue_id: ctx.queueId,
  127 |         car_id: ctx.carId,
  128 |         driver_id: ctx.driverId,
  129 |         record_type: 'return',
  130 |         mileage: 50200,
  131 |         record_date: TODAY,
  132 |       }, ctx.adminToken);
  133 |     }
  134 |   });
  135 | 
  136 |   // ──────────────────────────────────────────
  137 |   // Dashboard Report
  138 |   // ──────────────────────────────────────────
  139 |   test('GET /api/reports/dashboard → 200', async () => {
  140 |     const r = await apiGet('/api/reports/dashboard', ctx.adminToken);
  141 |     expect(r.status).toBe(200);
  142 |     expect(r.data?.data).toBeTruthy();
  143 |   });
  144 | 
  145 |   test('GET /api/reports/dashboard → มี summary stats', async () => {
  146 |     const r = await apiGet('/api/reports/dashboard', ctx.adminToken);
  147 |     expect(r.status).toBe(200);
  148 |     const d = r.data?.data;
  149 |     expect(d).toBeTruthy();
  150 |     // ควรมี field เช่น total_cars, active_cars เป็นต้น
  151 |     expect(typeof d).toBe('object');
  152 |   });
  153 | 
  154 |   test('GET /api/reports/dashboard ไม่มี token → 401', async () => {
  155 |     const r = await apiGet('/api/reports/dashboard');
  156 |     expect([401, 403]).toContain(r.status);
  157 |   });
  158 | 
  159 |   // ──────────────────────────────────────────
  160 |   // Basic Reports
  161 |   // ──────────────────────────────────────────
  162 |   test('GET /api/reports/vehicles → 200', async () => {
  163 |     const r = await apiGet('/api/reports/vehicles', ctx.adminToken);
  164 |     expect(r.status).toBe(200);
  165 |     expect(r.data?.data !== undefined).toBe(true);
  166 |   });
  167 | 
  168 |   test('GET /api/reports/drivers → 200', async () => {
  169 |     const r = await apiGet('/api/reports/drivers', ctx.adminToken);
  170 |     expect([200, 404]).toContain(r.status);
  171 |   });
  172 | 
  173 |   test('GET /api/reports/repairs → 200', async () => {
  174 |     const r = await apiGet('/api/reports/repairs', ctx.adminToken);
  175 |     expect([200, 404]).toContain(r.status);
  176 |   });
  177 | 
  178 |   test('GET /api/reports/maintenance → 200', async () => {
  179 |     const r = await apiGet('/api/reports/maintenance', ctx.adminToken);
  180 |     expect([200, 404]).toContain(r.status);
  181 |   });
  182 | 
  183 |   test('GET /api/reports/expiry → 200', async () => {
  184 |     const r = await apiGet('/api/reports/expiry', ctx.adminToken);
  185 |     expect([200, 404]).toContain(r.status);
  186 |   });
  187 | 
  188 |   test('Reports endpoints ทุกตัวต้อง auth', async () => {
  189 |     for (const endpoint of ['/api/reports/vehicles', '/api/reports/drivers', '/api/reports/repairs']) {
  190 |       const r = await apiGet(endpoint);
  191 |       expect([401, 403]).toContain(r.status);
  192 |     }
  193 |   });
  194 | 
  195 |   // ──────────────────────────────────────────
  196 |   // Fuel Report
  197 |   // ──────────────────────────────────────────
  198 |   test('GET /api/reports/fuel → 200', async () => {
  199 |     const r = await apiGet('/api/reports/fuel', ctx.adminToken);
  200 |     expect([200, 404]).toContain(r.status);
```