# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\roles.spec.mjs >> Public Pages — เข้าได้โดยไม่ login >> /about.html — โหลดได้โดยไม่ login
- Location: tests\e2e\roles.spec.mjs:358:5

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /\/login/
Received string: "http://localhost:8788/login"
Timeout: 5000ms

Call log:
  - Expect "not toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:8788/login"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e5]
      - heading "PPK DriveHub" [level=1] [ref=e9]
      - paragraph [ref=e10]:
        - text: ระบบจัดการยานพาหนะ
        - text: โรงเรียนพะเยาพิทยาคม 2569
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: ชื่อผู้ใช้ / รหัสประจำตัว
          - textbox "ชื่อผู้ใช้ / รหัสประจำตัว" [active] [ref=e15]:
            - /placeholder: กรอกชื่อผู้ใช้หรืออีเมล
          - generic [ref=e16]: "💡 ผู้สมัครใหม่: ใช้ email ที่สมัครไว้ เป็นชื่อผู้ใช้"
        - generic [ref=e17]:
          - generic [ref=e18]: รหัสผ่าน
          - generic [ref=e19]:
            - textbox "รหัสผ่าน" [ref=e20]:
              - /placeholder: กรอกรหัสผ่าน
            - button "👁️" [ref=e21] [cursor=pointer]
        - link "ลืมรหัสผ่าน?" [ref=e23] [cursor=pointer]:
          - /url: forgot-password.html
        - button "➡️ เข้าสู่ระบบ" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: ➡️
          - generic [ref=e26]: เข้าสู่ระบบ
      - generic [ref=e28]: หรือ
      - button "✍️ สมัครเข้าใช้งานครั้งแรก" [ref=e29] [cursor=pointer]:
        - generic [ref=e30]: ✍️
        - generic [ref=e31]: สมัครเข้าใช้งานครั้งแรก
  - contentinfo [ref=e32]:
    - paragraph [ref=e33]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
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
  284 |       localStorage.setItem('ppk_user', JSON.stringify({
  285 |         id: 'repair-id', username: 'role_repair', display_name: 'Repair User',
  286 |         role: 'repair', permissions: { repair: { view: true, create: true, edit: true } },
  287 |       }));
  288 |     }, { token: tokens.repair });
  289 |     await page.goto('/repair.html');
  290 |     await page.waitForLoadState('networkidle');
  291 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  292 |   });
  293 | 
  294 |   test('Repair — GET /api/repair/log สำเร็จ', async () => {
  295 |     if (!tokens.repair) return;
  296 |     const r = await apiGet('/api/repair/log', tokens.repair);
  297 |     expect(r?.success).toBe(true);
  298 |   });
  299 | });
  300 | 
  301 | // ==============================================================
  302 | // 5. VEHICLE ROLE — สิทธิ์จัดคิว/ยานพาหนะ
  303 | // ==============================================================
  304 | test.describe('Vehicle Role — สิทธิ์จัดคิว', () => {
  305 |   test('Vehicle เข้า queue-manage ได้', async ({ page }) => {
  306 |     if (!tokens.vehicle) return test.skip();
  307 |     await page.addInitScript(({ token }) => {
  308 |       localStorage.setItem('ppk_token', token);
  309 |       localStorage.setItem('ppk_user', JSON.stringify({
  310 |         id: 'vehicle-id', username: 'role_vehicle', display_name: 'Vehicle User',
  311 |         role: 'vehicle', permissions: { queue: { view: true, create: true, edit: true } },
  312 |       }));
  313 |     }, { token: tokens.vehicle });
  314 |     await page.goto('/queue-manage.html');
  315 |     await page.waitForLoadState('networkidle');
  316 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  317 |   });
  318 | 
  319 |   test('Vehicle — GET /api/queue สำเร็จ', async () => {
  320 |     if (!tokens.vehicle) return;
  321 |     const r = await apiGet('/api/queue', tokens.vehicle);
  322 |     expect(r?.success).toBe(true);
  323 |   });
  324 | });
  325 | 
  326 | // ==============================================================
  327 | // 6. ป้องกัน Unauthenticated access ทุกหน้า protected
  328 | // ==============================================================
  329 | test.describe('Auth Guard — ทุกหน้าต้อง redirect ถ้าไม่มี token', () => {
  330 |   const protectedPages = [
  331 |     '/dashboard.html', '/queue-manage.html', '/vehicles.html', '/drivers.html',
  332 |     '/fuel-record.html', '/repair.html', '/reports.html', '/user-management.html',
  333 |     '/audit-log.html', '/backup-recovery.html', '/profile.html', '/notifications.html',
  334 |     '/admin-settings.html', '/incident.html', '/vehicle-request.html',
  335 |   ];
  336 | 
  337 |   for (const p of protectedPages) {
  338 |     test(`${p} — redirect ไป login ถ้าไม่ login`, async ({ page }) => {
  339 |       await page.goto(p, { waitUntil: 'commit' });
  340 |       await page.waitForURL(/\/login/, { timeout: 10000 });
  341 |       expect(page.url()).toMatch(/login/);
  342 |     });
  343 |   }
  344 | });
  345 | 
  346 | // ==============================================================
  347 | // 7. Public pages — ทุกคนเข้าได้โดยไม่ login
  348 | // ==============================================================
  349 | test.describe('Public Pages — เข้าได้โดยไม่ login', () => {
  350 |   const publicPages = [
  351 |     '/register.html', '/forgot-password.html',
  352 |     '/qr-usage-record.html', '/qr-fuel-record.html', '/qr-daily-check.html',
  353 |     '/qr-survey.html', '/user-guide.html', '/pdpa-policy.html',
  354 |     '/about.html', '/glossary.html',
  355 |   ];
  356 | 
  357 |   for (const p of publicPages) {
  358 |     test(`${p} — โหลดได้โดยไม่ login`, async ({ page }) => {
  359 |       await page.goto(p);
  360 |       await page.waitForLoadState('networkidle');
> 361 |       await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
      |                              ^ Error: expect(page).not.toHaveURL(expected) failed
  362 |     });
  363 |   }
  364 | });
  365 | 
```