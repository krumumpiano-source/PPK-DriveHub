# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\roles.spec.mjs >> Repair Role — สิทธิ์ซ่อม >> Repair — GET /api/repair/log สำเร็จ
- Location: tests\e2e\roles.spec.mjs:296:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  199 |       test.skip();
  200 |     }
  201 |   });
  202 | 
  203 |   test('Viewer เข้า dashboard ได้', async ({ page }) => {
  204 |     if (!tokens.viewer) return test.skip();
  205 |     await page.addInitScript(({ token }) => {
  206 |       localStorage.setItem('ppk_token', token);
  207 |       localStorage.setItem('ppk_user', JSON.stringify({
  208 |         id: 'viewer-id', username: 'role_viewer', display_name: 'Viewer',
  209 |         role: 'viewer', permissions: {},
  210 |       }));
  211 |     }, { token: tokens.viewer });
  212 |     await page.goto('/dashboard.html');
  213 |     await page.waitForLoadState('networkidle');
  214 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  215 |   });
  216 | 
  217 |   test('Viewer เข้า reports ได้', async ({ page }) => {
  218 |     if (!tokens.viewer) return test.skip();
  219 |     await page.addInitScript(({ token }) => {
  220 |       localStorage.setItem('ppk_token', token);
  221 |       localStorage.setItem('ppk_user', JSON.stringify({
  222 |         id: 'viewer-id', username: 'role_viewer', display_name: 'Viewer',
  223 |         role: 'viewer', permissions: {},
  224 |       }));
  225 |     }, { token: tokens.viewer });
  226 |     await page.goto('/reports.html');
  227 |     await page.waitForLoadState('networkidle');
  228 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  229 |   });
  230 | 
  231 |   test('Viewer — GET /api/reports/dashboard สำเร็จ', async () => {
  232 |     if (!tokens.viewer) return;
  233 |     const r = await apiGet('/api/reports/dashboard', tokens.viewer);
  234 |     expect(r?.success).toBe(true);
  235 |   });
  236 | 
  237 |   test('Viewer — POST /api/vehicles ต้อง 403', async () => {
  238 |     if (!tokens.viewer) return;
  239 |     const r = await apiPost('/api/vehicles', {
  240 |       license_plate: 'VIEWER-TEST', brand: 'Toyota', model: 'Hiace',
  241 |       year: 2024, fuel_type: 'diesel', seat_count: 12,
  242 |     }, tokens.viewer);
  243 |     expect([403, 401]).toContain(r?.status || (r?.success === false ? 403 : 200));
  244 |   });
  245 | });
  246 | 
  247 | // ==============================================================
  248 | // 3. FUEL ROLE — เข้าถึงหน้าน้ำมันได้ แต่ไม่ได้สิทธิ์ admin
  249 | // ==============================================================
  250 | test.describe('Fuel Role — สิทธิ์น้ำมัน', () => {
  251 |   test('Fuel เข้า fuel-record ได้', async ({ page }) => {
  252 |     if (!tokens.fuel) return test.skip();
  253 |     await page.addInitScript(({ token }) => {
  254 |       localStorage.setItem('ppk_token', token);
  255 |       localStorage.setItem('ppk_user', JSON.stringify({
  256 |         id: 'fuel-id', username: 'role_fuel', display_name: 'Fuel User',
  257 |         role: 'fuel', permissions: { fuel: { view: true, create: true } },
  258 |       }));
  259 |     }, { token: tokens.fuel });
  260 |     await page.goto('/fuel-record.html');
  261 |     await page.waitForLoadState('networkidle');
  262 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  263 |   });
  264 | 
  265 |   test('Fuel — GET /api/fuel/log สำเร็จ', async () => {
  266 |     if (!tokens.fuel) return;
  267 |     const r = await apiGet('/api/fuel/log', tokens.fuel);
  268 |     expect(r?.success).toBe(true);
  269 |   });
  270 | 
  271 |   test('Fuel role — GET /api/admin/users ต้อง 403', async () => {
  272 |     if (!tokens.fuel) return;
  273 |     const r = await apiGet('/api/admin/users', tokens.fuel);
  274 |     expect([403, 401]).toContain(r?.status || (r?.success === false ? 403 : 200));
  275 |   });
  276 | });
  277 | 
  278 | // ==============================================================
  279 | // 4. REPAIR ROLE — สิทธิ์ซ่อมบำรุง
  280 | // ==============================================================
  281 | test.describe('Repair Role — สิทธิ์ซ่อม', () => {
  282 |   test('Repair เข้า repair.html ได้', async ({ page }) => {
  283 |     if (!tokens.repair) return test.skip();
  284 |     await page.addInitScript(({ token }) => {
  285 |       localStorage.setItem('ppk_token', token);
  286 |       localStorage.setItem('ppk_user', JSON.stringify({
  287 |         id: 'repair-id', username: 'role_repair', display_name: 'Repair User',
  288 |         role: 'repair', permissions: { repair: { view: true, create: true, edit: true } },
  289 |       }));
  290 |     }, { token: tokens.repair });
  291 |     await page.goto('/repair.html');
  292 |     await page.waitForLoadState('networkidle');
  293 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  294 |   });
  295 | 
  296 |   test('Repair — GET /api/repair/log สำเร็จ', async () => {
  297 |     if (!tokens.repair) return;
  298 |     const r = await apiGet('/api/repair/log', tokens.repair);
> 299 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  300 |   });
  301 | });
  302 | 
  303 | // ==============================================================
  304 | // 5. VEHICLE ROLE — สิทธิ์จัดคิว/ยานพาหนะ
  305 | // ==============================================================
  306 | test.describe('Vehicle Role — สิทธิ์จัดคิว', () => {
  307 |   test('Vehicle เข้า queue-manage ได้', async ({ page }) => {
  308 |     if (!tokens.vehicle) return test.skip();
  309 |     await page.addInitScript(({ token }) => {
  310 |       localStorage.setItem('ppk_token', token);
  311 |       localStorage.setItem('ppk_user', JSON.stringify({
  312 |         id: 'vehicle-id', username: 'role_vehicle', display_name: 'Vehicle User',
  313 |         role: 'vehicle', permissions: { queue: { view: true, create: true, edit: true } },
  314 |       }));
  315 |     }, { token: tokens.vehicle });
  316 |     await page.goto('/queue-manage.html');
  317 |     await page.waitForLoadState('networkidle');
  318 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  319 |   });
  320 | 
  321 |   test('Vehicle — GET /api/queue สำเร็จ', async () => {
  322 |     if (!tokens.vehicle) return;
  323 |     const r = await apiGet('/api/queue', tokens.vehicle);
  324 |     expect(r?.success).toBe(true);
  325 |   });
  326 | });
  327 | 
  328 | // ==============================================================
  329 | // 6. ป้องกัน Unauthenticated access ทุกหน้า protected
  330 | // ==============================================================
  331 | test.describe('Auth Guard — ทุกหน้าต้อง redirect ถ้าไม่มี token', () => {
  332 |   const protectedPages = [
  333 |     '/dashboard.html', '/queue-manage.html', '/vehicles.html', '/drivers.html',
  334 |     '/fuel-record.html', '/repair.html', '/reports.html', '/user-management.html',
  335 |     '/audit-log.html', '/backup-recovery.html', '/profile.html', '/notifications.html',
  336 |     '/admin-settings.html', '/incident.html', '/vehicle-request.html',
  337 |   ];
  338 | 
  339 |   for (const p of protectedPages) {
  340 |     test(`${p} — redirect ไป login ถ้าไม่ login`, async ({ page }) => {
  341 |       await page.goto(p, { waitUntil: 'commit' });
  342 |       await page.waitForURL(/\/login/, { timeout: 10000 });
  343 |       expect(page.url()).toMatch(/login/);
  344 |     });
  345 |   }
  346 | });
  347 | 
  348 | // ==============================================================
  349 | // 7. Public pages — ทุกคนเข้าได้โดยไม่ login
  350 | // ==============================================================
  351 | test.describe('Public Pages — เข้าได้โดยไม่ login', () => {
  352 |   const publicPages = [
  353 |     '/register.html', '/forgot-password.html',
  354 |     '/qr-usage-record.html', '/qr-fuel-record.html', '/qr-daily-check.html',
  355 |     '/qr-survey.html', '/user-guide.html', '/pdpa-policy.html',
  356 |     '/about.html', '/glossary.html',
  357 |   ];
  358 | 
  359 |   for (const p of publicPages) {
  360 |     test(`${p} — โหลดได้โดยไม่ login`, async ({ page }) => {
  361 |       await page.goto(p);
  362 |       await page.waitForLoadState('networkidle');
  363 |       await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  364 |     });
  365 |   }
  366 | });
  367 | 
```