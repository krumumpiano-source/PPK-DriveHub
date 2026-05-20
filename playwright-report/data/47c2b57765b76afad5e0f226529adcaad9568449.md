# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\roles.spec.mjs >> Admin — ทุกหน้าต้องเข้าถึงได้ >> Admin เข้า /incident.html ได้
- Location: tests\e2e\roles.spec.mjs:174:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:8788/incident.html", waiting until "load"

```

# Test source

```ts
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
  147 | // ══════════════════════════════════════════════
  148 | function setAuthInBrowser(page, roleName) {
  149 |   const token = tokens[roleName];
  150 |   const role = USERS[roleName].role;
  151 |   return page.addInitScript(({ token, role, username }) => {
  152 |     localStorage.setItem('ppk_token', token);
  153 |     localStorage.setItem('ppk_user', JSON.stringify({
  154 |       id: 'test-id', username, display_name: username, role, permissions: {},
  155 |     }));
  156 |   }, { token, role, username: USERS[roleName]?.email || roleName });
  157 | }
  158 | 
  159 | // ==============================================================
  160 | // 1. ADMIN — เข้าถึงได้ทุกหน้า
  161 | // ==============================================================
  162 | test.describe('Admin — ทุกหน้าต้องเข้าถึงได้', () => {
  163 |   const allPages = [
  164 |     '/dashboard.html', '/queue-manage.html', '/vehicles.html', '/drivers.html',
  165 |     '/fuel-record.html', '/fuel-ledger.html', '/repair.html', '/usage-log.html',
  166 |     '/reports.html', '/tax-insurance.html', '/notifications.html',
  167 |     '/user-management.html', '/admin-settings.html', '/audit-log.html',
  168 |     '/backup-recovery.html', '/profile.html',
  169 |     '/incident.html', '/vehicle-request.html',
  170 |     '/executive-dashboard.html', '/driver-performance.html',
  171 |   ];
  172 | 
  173 |   for (const p of allPages) {
  174 |     test(`Admin เข้า ${p} ได้`, async ({ page }) => {
  175 |       await page.addInitScript(({ token }) => {
  176 |         localStorage.setItem('ppk_token', token);
  177 |         localStorage.setItem('ppk_user', JSON.stringify({
  178 |           id: 'admin-id', username: 'role_admin', display_name: 'Admin',
  179 |           role: 'super_admin', permissions: {},
  180 |         }));
  181 |       }, { token: tokens.admin || 'fallback' });
  182 | 
> 183 |       await page.goto(p);
      |                  ^ Error: page.goto: Test timeout of 30000ms exceeded.
  184 |       await page.waitForLoadState('networkidle');
  185 |       // ต้องไม่ redirect ไป login
  186 |       await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  187 |     });
  188 |   }
  189 | });
  190 | 
  191 | // ==============================================================
  192 | // 2. VIEWER — อ่านได้ แต่ไม่สามารถทำ CRUD
  193 | // ==============================================================
  194 | test.describe('Viewer — สิทธิ์อ่านอย่างเดียว', () => {
  195 |   test.beforeEach(async ({ page }) => {
  196 |     if (!tokens.viewer) {
  197 |       test.skip();
  198 |     }
  199 |   });
  200 | 
  201 |   test('Viewer เข้า dashboard ได้', async ({ page }) => {
  202 |     if (!tokens.viewer) return test.skip();
  203 |     await page.addInitScript(({ token }) => {
  204 |       localStorage.setItem('ppk_token', token);
  205 |       localStorage.setItem('ppk_user', JSON.stringify({
  206 |         id: 'viewer-id', username: 'role_viewer', display_name: 'Viewer',
  207 |         role: 'viewer', permissions: {},
  208 |       }));
  209 |     }, { token: tokens.viewer });
  210 |     await page.goto('/dashboard.html');
  211 |     await page.waitForLoadState('networkidle');
  212 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  213 |   });
  214 | 
  215 |   test('Viewer เข้า reports ได้', async ({ page }) => {
  216 |     if (!tokens.viewer) return test.skip();
  217 |     await page.addInitScript(({ token }) => {
  218 |       localStorage.setItem('ppk_token', token);
  219 |       localStorage.setItem('ppk_user', JSON.stringify({
  220 |         id: 'viewer-id', username: 'role_viewer', display_name: 'Viewer',
  221 |         role: 'viewer', permissions: {},
  222 |       }));
  223 |     }, { token: tokens.viewer });
  224 |     await page.goto('/reports.html');
  225 |     await page.waitForLoadState('networkidle');
  226 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  227 |   });
  228 | 
  229 |   test('Viewer — GET /api/reports/dashboard สำเร็จ', async () => {
  230 |     if (!tokens.viewer) return;
  231 |     const r = await apiGet('/api/reports/dashboard', tokens.viewer);
  232 |     expect(r?.success).toBe(true);
  233 |   });
  234 | 
  235 |   test('Viewer — POST /api/vehicles ต้อง 403', async () => {
  236 |     if (!tokens.viewer) return;
  237 |     const r = await apiPost('/api/vehicles', {
  238 |       license_plate: 'VIEWER-TEST', brand: 'Toyota', model: 'Hiace',
  239 |       year: 2024, fuel_type: 'diesel', seat_count: 12,
  240 |     }, tokens.viewer);
  241 |     expect([403, 401]).toContain(r?.status || (r?.success === false ? 403 : 200));
  242 |   });
  243 | });
  244 | 
  245 | // ==============================================================
  246 | // 3. FUEL ROLE — เข้าถึงหน้าน้ำมันได้ แต่ไม่ได้สิทธิ์ admin
  247 | // ==============================================================
  248 | test.describe('Fuel Role — สิทธิ์น้ำมัน', () => {
  249 |   test('Fuel เข้า fuel-record ได้', async ({ page }) => {
  250 |     if (!tokens.fuel) return test.skip();
  251 |     await page.addInitScript(({ token }) => {
  252 |       localStorage.setItem('ppk_token', token);
  253 |       localStorage.setItem('ppk_user', JSON.stringify({
  254 |         id: 'fuel-id', username: 'role_fuel', display_name: 'Fuel User',
  255 |         role: 'fuel', permissions: { fuel: { view: true, create: true } },
  256 |       }));
  257 |     }, { token: tokens.fuel });
  258 |     await page.goto('/fuel-record.html');
  259 |     await page.waitForLoadState('networkidle');
  260 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  261 |   });
  262 | 
  263 |   test('Fuel — GET /api/fuel/log สำเร็จ', async () => {
  264 |     if (!tokens.fuel) return;
  265 |     const r = await apiGet('/api/fuel/log', tokens.fuel);
  266 |     expect(r?.success).toBe(true);
  267 |   });
  268 | 
  269 |   test('Fuel role — GET /api/admin/users ต้อง 403', async () => {
  270 |     if (!tokens.fuel) return;
  271 |     const r = await apiGet('/api/admin/users', tokens.fuel);
  272 |     expect([403, 401]).toContain(r?.status || (r?.success === false ? 403 : 200));
  273 |   });
  274 | });
  275 | 
  276 | // ==============================================================
  277 | // 4. REPAIR ROLE — สิทธิ์ซ่อมบำรุง
  278 | // ==============================================================
  279 | test.describe('Repair Role — สิทธิ์ซ่อม', () => {
  280 |   test('Repair เข้า repair.html ได้', async ({ page }) => {
  281 |     if (!tokens.repair) return test.skip();
  282 |     await page.addInitScript(({ token }) => {
  283 |       localStorage.setItem('ppk_token', token);
```