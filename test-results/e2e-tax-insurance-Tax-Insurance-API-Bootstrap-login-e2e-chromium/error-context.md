# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tax-insurance.spec.mjs >> Tax & Insurance API >> Bootstrap: login
- Location: tests\e2e\tax-insurance.spec.mjs:63:3

# Error details

```
TypeError: fetch failed
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — Tax & Insurance API Tests
  3   | // ทดสอบ: Tax CRUD, Insurance CRUD, Inspections/ตรอ., Expiry Filter
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
> 25  |   const r = await fetch(`${BASE}${path}`, {
      |             ^ TypeError: fetch failed
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
  46  | // วันที่ทดสอบ
  47  | const FAR_FUTURE = '2035-12-31';
  48  | const NEAR_FUTURE = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 15 วัน
  49  | const PAST_DATE = '2020-01-01';
  50  | 
  51  | const ctx = {
  52  |   adminToken: '',
  53  |   carId: '',
  54  |   taxId: '',
  55  |   insuranceId: '',
  56  |   inspectionId: '',
  57  | };
  58  | 
  59  | test.describe.serial('Tax & Insurance API', () => {
  60  |   // ──────────────────────────────────────────
  61  |   // Bootstrap
  62  |   // ──────────────────────────────────────────
  63  |   test('Bootstrap: login', async () => {
  64  |     clearRateLimits();
  65  |     const setupCheck = await apiGet('/api/setup');
  66  |     if (setupCheck.data?.data?.needs_setup) {
  67  |       await apiPost('/api/setup', { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' });
  68  |     }
  69  |     clearRateLimits();
  70  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  71  |       const r = await apiPost('/api/auth/login', { username: ADMIN_USER, password: pw });
  72  |       if (r.data?.data?.token) { ctx.adminToken = r.data.data.token; break; }
  73  |       clearRateLimits();
  74  |     }
  75  |     expect(ctx.adminToken).toBeTruthy();
  76  |   });
  77  | 
  78  |   test('Bootstrap: สร้าง test vehicle', async () => {
  79  |     const r = await apiPost('/api/vehicles', {
  80  |       license_plate: `TAX-${Date.now().toString().slice(-6)}`,
  81  |       brand: 'Isuzu', model: 'D-MAX', year: 2022,
  82  |       fuel_type: 'diesel', vehicle_type: 'pickup',
  83  |     }, ctx.adminToken);
  84  |     expect([200, 201]).toContain(r.status);
  85  |     ctx.carId = r.data?.data?.id || r.data?.data?.car_id;
  86  |     expect(ctx.carId).toBeTruthy();
  87  |   });
  88  | 
  89  |   // ──────────────────────────────────────────
  90  |   // Tax (ภาษีรถ) CRUD
  91  |   // ──────────────────────────────────────────
  92  |   test('GET /api/tax-insurance/tax → list (อาจว่าง)', async () => {
  93  |     const r = await apiGet('/api/tax-insurance/tax', ctx.adminToken);
  94  |     expect(r.status).toBe(200);
  95  |     expect(Array.isArray(r.data?.data)).toBe(true);
  96  |   });
  97  | 
  98  |   test('POST /api/tax-insurance/tax → สร้าง tax record', async () => {
  99  |     const r = await apiPost('/api/tax-insurance/tax', {
  100 |       car_id: ctx.carId,
  101 |       amount: 1500,
  102 |       expiry_date: FAR_FUTURE,
  103 |       tax_year: 2025,
  104 |     }, ctx.adminToken);
  105 |     expect([200, 201]).toContain(r.status);
  106 |     ctx.taxId = r.data?.data?.id || r.data?.data?.tax_id;
  107 |     expect(ctx.taxId).toBeTruthy();
  108 |   });
  109 | 
  110 |   test('GET /api/tax-insurance/tax — มี tax record ที่สร้าง', async () => {
  111 |     const r = await apiGet('/api/tax-insurance/tax', ctx.adminToken);
  112 |     const items = r.data?.data || [];
  113 |     const found = items.find((t) => t.id === ctx.taxId || t.id === Number(ctx.taxId));
  114 |     expect(found).toBeTruthy();
  115 |     expect(found.amount).toBe(1500);
  116 |   });
  117 | 
  118 |   test('PUT /api/tax-insurance/tax/:id → แก้ไข amount', async () => {
  119 |     const r = await apiPut(`/api/tax-insurance/tax/${ctx.taxId}`, {
  120 |       car_id: ctx.carId,
  121 |       amount: 2000,
  122 |       expiry_date: FAR_FUTURE,
  123 |       tax_year: 2025,
  124 |     }, ctx.adminToken);
  125 |     expect(r.status).toBe(200);
```