# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\roles.spec.mjs >> Auth Guard — ทุกหน้าต้อง redirect ถ้าไม่มี token >> /dashboard.html — redirect ไป login ถ้าไม่ login
- Location: tests\e2e\roles.spec.mjs:338:5

# Error details

```
TypeError: fetch failed
```

# Test source

```ts
  1   | ﻿// ==============================================================
  2   | // PPK DriveHub — Role-Based Access E2E Tests
  3   | // ทดสอบสิทธิ์การเข้าถึงทุกบทบาท: admin, viewer, fuel, repair, vehicle
  4   | // ==============================================================
  5   | import { test, expect } from '@playwright/test';
  6   | import { execSync } from 'child_process';
  7   | 
  8   | const BASE = 'http://localhost:8788';
  9   | 
  10  | // Role users (สร้างผ่าน register → approve flow)
  11  | const USERS = {
  12  |   admin:   { email: 'role_admin@test.com',   password: 'Role@Admin1',   role: 'super_admin' },
  13  |   viewer:  { email: 'role_viewer@test.com',  password: 'Role@Viewer1',  role: 'viewer'      },
  14  |   fuel:    { email: 'role_fuel@test.com',    password: 'Role@Fuel1',    role: 'fuel'        },
  15  |   repair:  { email: 'role_repair@test.com',  password: 'Role@Repair1',  role: 'repair'      },
  16  |   vehicle: { email: 'role_vehicle@test.com', password: 'Role@Vehicle1', role: 'vehicle'     },
  17  | };
  18  | 
  19  | const tokens = {};
  20  | 
  21  | // Default permissions per role
  22  | const DEFAULT_PERMISSIONS = {
  23  |   viewer:  { reports: 'view', vehicles: 'view', drivers: 'view', fuel: 'view', repair: 'view', queue: 'view', usage: 'view' },
  24  |   fuel:    { fuel: 'delete', reports: 'view', vehicles: 'view' },
  25  |   repair:  { repair: 'delete', vehicles: 'view', reports: 'view' },
  26  |   vehicle: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
  27  | };
  28  | 
  29  | function clearRateLimits() {
  30  |   try {
  31  |     execSync(
  32  |       'npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"',
  33  |       { stdio: 'pipe', timeout: 10000 }
  34  |     );
  35  |   } catch {}
  36  | }
  37  | 
  38  | async function apiPost(path, body, token = '') {
  39  |   const headers = { 'Content-Type': 'application/json' };
  40  |   if (token) headers['Authorization'] = `Bearer ${token}`;
  41  |   const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  42  |   return r.json().catch(() => null);
  43  | }
  44  | async function apiGet(path, token = '') {
  45  |   const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
> 46  |   const r = await fetch(`${BASE}${path}`, { headers });
      |             ^ TypeError: fetch failed
  47  |   return r.json().catch(() => null);
  48  | }
  49  | async function apiPut(path, body, token = '') {
  50  |   const headers = { 'Content-Type': 'application/json' };
  51  |   if (token) headers['Authorization'] = `Bearer ${token}`;
  52  |   const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  53  |   return r.json().catch(() => null);
  54  | }
  55  | 
  56  | // ──────────────────────────────────────────
  57  | // Bootstrap: ตั้งค่า admin + สร้าง users ทุก role
  58  | // ──────────────────────────────────────────
  59  | test.beforeAll(async () => {
  60  |   clearRateLimits();
  61  | 
  62  |   // Setup super admin ถ้าจำเป็น
  63  |   const check = await apiGet('/api/setup');
  64  |   if (check?.data?.needs_setup) {
  65  |     await apiPost('/api/setup', {
  66  |       username: 'role_admin',
  67  |       password: USERS.admin.password,
  68  |       first_name: 'Role', last_name: 'Admin', email: USERS.admin.email,
  69  |     });
  70  |   }
  71  | 
  72  |   // Login admin (ลอง testadmin ก่อน, ถ้าไม่ได้ลอง role_admin)
  73  |   clearRateLimits();
  74  |   for (const cred of [
  75  |     { username: 'testadmin', password: 'Admin@5678' },
  76  |     { username: 'testadmin', password: 'Admin@1234' },
  77  |     { username: USERS.admin.email, password: USERS.admin.password },
  78  |   ]) {
  79  |     const r = await apiPost('/api/auth/login', { username: cred.username, password: cred.password });
  80  |     if (r?.data?.token) { tokens.admin = r.data.token; break; }
  81  |     clearRateLimits();
  82  |   }
  83  |   if (!tokens.admin) throw new Error('[roles.spec] Cannot obtain admin token');
  84  | 
  85  |   // สร้าง role users ผ่าน register → approve flow
  86  |   const roleList = ['viewer', 'fuel', 'repair', 'vehicle'];
  87  |   for (const roleName of roleList) {
  88  |     const u = USERS[roleName];
  89  |     // Try login first — user might already exist from a previous run
  90  |     const existing = await apiPost('/api/auth/login', { username: u.email, password: u.password });
  91  |     clearRateLimits();
  92  |     if (existing?.data?.token) {
  93  |       tokens[roleName] = existing.data.token;
  94  |       continue; // Already exists and active, skip register/approve
  95  |     }
  96  |     // Register (สร้าง request)
  97  |     await apiPost('/api/auth/register', {
  98  |       email: u.email,
  99  |       first_name: roleName,
  100 |       last_name: 'Tester',
  101 |       password: u.password,
  102 |     });
  103 |     clearRateLimits();
  104 |   }
  105 | 
  106 |   // Approve pending requests for users that still need tokens
  107 |   const requests = await apiGet('/api/admin/requests?status=pending', tokens.admin);
  108 |   const pendingReqs = requests?.data || [];
  109 |   for (const roleName of roleList) {
  110 |     if (tokens[roleName]) continue; // Already logged in above
  111 |     const u = USERS[roleName];
  112 |     const req = pendingReqs.find(r => r.email === u.email);
  113 |     if (req) {
  114 |       await apiPut(`/api/admin/requests/${req.id}/approve`, {
  115 |         role: u.role,
  116 |         permissions: DEFAULT_PERMISSIONS[roleName] || {},
  117 |       }, tokens.admin);
  118 |     }
  119 |     clearRateLimits();
  120 |   }
  121 | 
  122 |   // Login แต่ละ role (สำหรับที่ยังไม่มี token)
  123 |   for (const roleName of roleList) {
  124 |     if (tokens[roleName]) continue;
  125 |     const u = USERS[roleName];
  126 |     const login = await apiPost('/api/auth/login', { username: u.email, password: u.password });
  127 |     if (login?.data?.token) tokens[roleName] = login.data.token;
  128 |     clearRateLimits();
  129 |   }
  130 | 
  131 |   // Ensure correct permissions for all role users via admin API
  132 |   const userList = await apiGet('/api/admin/users', tokens.admin);
  133 |   const allUsers = Array.isArray(userList?.data) ? userList.data : [];
  134 |   for (const roleName of roleList) {
  135 |     const u = USERS[roleName];
  136 |     const userData = allUsers.find(x => x.email === u.email);
  137 |     if (userData && DEFAULT_PERMISSIONS[roleName]) {
  138 |       await apiPut(`/api/admin/users/${userData.id}`, {
  139 |         permissions: DEFAULT_PERMISSIONS[roleName],
  140 |       }, tokens.admin);
  141 |     }
  142 |   }
  143 | });
  144 | 
  145 | // ══════════════════════════════════════════════
  146 | // Helper: login user ใน browser (sets localStorage)
```