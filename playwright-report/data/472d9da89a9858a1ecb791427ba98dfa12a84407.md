# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\maintenance.spec.mjs >> Maintenance API >> Bootstrap: login ได้รับ admin token
- Location: tests\e2e\maintenance.spec.mjs:58:3

# Error details

```
TypeError: fetch failed
```

# Test source

```ts
  1   | ﻿// ==============================================================
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
  96  |       item_key: 'test_oil_change_' + Date.now(),
  97  |       item_name: 'เปลี่ยนน้ำมันเครื่อง',
  98  |       interval_km: 10000,
  99  |       interval_months: 6,
  100 |       priority: 'high',
  101 |     }, ctx.adminToken);
  102 |     expect([200, 201]).toContain(r.status);
  103 |     ctx.settingId = r.data?.data?.id || r.data?.data?.setting_id;
  104 |     expect(ctx.settingId).toBeTruthy();
  105 |   });
  106 | 
  107 |   test('GET /api/maintenance/settings — มี setting ที่สร้าง', async () => {
  108 |     const r = await apiGet('/api/maintenance/settings', ctx.adminToken);
  109 |     const items = r.data?.data || [];
  110 |     const found = items.find((s) => s.id === ctx.settingId || s.id === Number(ctx.settingId));
  111 |     expect(found).toBeTruthy();
  112 |     expect(found.item_name).toBe('เปลี่ยนน้ำมันเครื่อง');
  113 |   });
  114 | 
  115 |   test('PUT /api/maintenance/settings/:id → แก้ไข', async () => {
  116 |     const r = await apiPut(`/api/maintenance/settings/${ctx.settingId}`, {
  117 |       item_name: 'เปลี่ยนน้ำมันเครื่อง (แก้ไข)',
  118 |       interval_km: 15000,
  119 |       interval_months: 12,
  120 |       priority: 'high',
  121 |     }, ctx.adminToken);
  122 |     expect(r.status).toBe(200);
  123 |   });
  124 | 
  125 |   test('PUT bulk settings → update หลาย setting พร้อมกัน', async () => {
```