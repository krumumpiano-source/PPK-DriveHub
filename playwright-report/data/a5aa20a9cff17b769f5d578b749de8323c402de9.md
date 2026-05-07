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

Expected value: 400
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
  89  |       liters: 50,
  90  |       price_per_liter: 35.5,
  91  |       total_cost: 1775,
  92  |       mileage: 50000,
  93  |       station: 'ปั๊มทดสอบ',
  94  |       fuel_date: TODAY,
  95  |     }, ctx.adminToken);
> 96  |     expect([200, 201]).toContain(r.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  97  |   });
  98  | 
  99  |   test('Bootstrap: สร้าง queue + usage records', async () => {
  100 |     // สร้าง queue
  101 |     const queueR = await apiPost('/api/queue', {
  102 |       car_id: ctx.carId,
  103 |       driver_id: ctx.driverId,
  104 |       destination: 'ทดสอบ Report',
  105 |       date: TODAY,
  106 |       purpose: 'ทดสอบรายงาน',
  107 |     }, ctx.adminToken);
  108 |     expect([200, 201]).toContain(queueR.status);
  109 |     ctx.queueId = queueR.data?.data?.id || queueR.data?.data?.queue_id;
  110 |     if (ctx.queueId) {
  111 |       // departure record
  112 |       await apiPost('/api/usage', {
  113 |         queue_id: ctx.queueId,
  114 |         car_id: ctx.carId,
  115 |         driver_id: ctx.driverId,
  116 |         record_type: 'departure',
  117 |         mileage: 50100,
  118 |         record_date: TODAY,
  119 |       }, ctx.adminToken);
  120 |       // return record
  121 |       await apiPost('/api/usage', {
  122 |         queue_id: ctx.queueId,
  123 |         car_id: ctx.carId,
  124 |         driver_id: ctx.driverId,
  125 |         record_type: 'return',
  126 |         mileage: 50200,
  127 |         record_date: TODAY,
  128 |       }, ctx.adminToken);
  129 |     }
  130 |   });
  131 | 
  132 |   // ──────────────────────────────────────────
  133 |   // Dashboard Report
  134 |   // ──────────────────────────────────────────
  135 |   test('GET /api/reports/dashboard → 200', async () => {
  136 |     const r = await apiGet('/api/reports/dashboard', ctx.adminToken);
  137 |     expect(r.status).toBe(200);
  138 |     expect(r.data?.data).toBeTruthy();
  139 |   });
  140 | 
  141 |   test('GET /api/reports/dashboard → มี summary stats', async () => {
  142 |     const r = await apiGet('/api/reports/dashboard', ctx.adminToken);
  143 |     expect(r.status).toBe(200);
  144 |     const d = r.data?.data;
  145 |     expect(d).toBeTruthy();
  146 |     // ควรมี field เช่น total_cars, active_cars เป็นต้น
  147 |     expect(typeof d).toBe('object');
  148 |   });
  149 | 
  150 |   test('GET /api/reports/dashboard ไม่มี token → 401', async () => {
  151 |     const r = await apiGet('/api/reports/dashboard');
  152 |     expect([401, 403]).toContain(r.status);
  153 |   });
  154 | 
  155 |   // ──────────────────────────────────────────
  156 |   // Basic Reports
  157 |   // ──────────────────────────────────────────
  158 |   test('GET /api/reports/vehicles → 200', async () => {
  159 |     const r = await apiGet('/api/reports/vehicles', ctx.adminToken);
  160 |     expect(r.status).toBe(200);
  161 |     expect(r.data?.data !== undefined).toBe(true);
  162 |   });
  163 | 
  164 |   test('GET /api/reports/drivers → 200', async () => {
  165 |     const r = await apiGet('/api/reports/drivers', ctx.adminToken);
  166 |     expect([200, 404]).toContain(r.status);
  167 |   });
  168 | 
  169 |   test('GET /api/reports/repairs → 200', async () => {
  170 |     const r = await apiGet('/api/reports/repairs', ctx.adminToken);
  171 |     expect([200, 404]).toContain(r.status);
  172 |   });
  173 | 
  174 |   test('GET /api/reports/maintenance → 200', async () => {
  175 |     const r = await apiGet('/api/reports/maintenance', ctx.adminToken);
  176 |     expect([200, 404]).toContain(r.status);
  177 |   });
  178 | 
  179 |   test('GET /api/reports/expiry → 200', async () => {
  180 |     const r = await apiGet('/api/reports/expiry', ctx.adminToken);
  181 |     expect([200, 404]).toContain(r.status);
  182 |   });
  183 | 
  184 |   test('Reports endpoints ทุกตัวต้อง auth', async () => {
  185 |     for (const endpoint of ['/api/reports/vehicles', '/api/reports/drivers', '/api/reports/repairs']) {
  186 |       const r = await apiGet(endpoint);
  187 |       expect([401, 403]).toContain(r.status);
  188 |     }
  189 |   });
  190 | 
  191 |   // ──────────────────────────────────────────
  192 |   // Fuel Report
  193 |   // ──────────────────────────────────────────
  194 |   test('GET /api/reports/fuel → 200', async () => {
  195 |     const r = await apiGet('/api/reports/fuel', ctx.adminToken);
  196 |     expect([200, 404]).toContain(r.status);
```