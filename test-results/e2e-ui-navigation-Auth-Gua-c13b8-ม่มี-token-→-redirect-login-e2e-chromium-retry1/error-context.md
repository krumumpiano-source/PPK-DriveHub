# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-navigation.spec.mjs >> Auth Guard >> /dashboard.html ไม่มี token → redirect login
- Location: tests\e2e\ui-navigation.spec.mjs:253:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/dashboard.html
Call log:
  - navigating to "http://localhost:8788/dashboard.html", waiting until "load"

```

# Test source

```ts
  156 |     expect(title.trim().length).toBeGreaterThan(0);
  157 |   });
  158 | 
  159 |   test('topbar/header มองเห็น', async ({ page }) => {
  160 |     await loginAsAdmin(page);
  161 |     await page.goto('/dashboard.html');
  162 |     await page.waitForLoadState('networkidle');
  163 |     const topbar = page.locator('.topbar, #topbar, header');
  164 |     if (await topbar.count() > 0) {
  165 |       await expect(topbar.first()).toBeVisible();
  166 |     }
  167 |   });
  168 | 
  169 |   test('logout button ทำงาน → redirect ไป login', async ({ page }) => {
  170 |     await loginAsAdmin(page);
  171 |     await page.goto('/dashboard.html');
  172 |     await page.waitForLoadState('networkidle');
  173 |     const logoutBtn = page.locator('[data-logout], #logoutBtn, .logout-btn, button:has-text("ออกจาก")').first();
  174 |     if (await logoutBtn.count() > 0) {
  175 |       await logoutBtn.click();
  176 |       await page.waitForURL(/login/, { timeout: 8000 });
  177 |       expect(page.url()).toMatch(/login/);
  178 |     }
  179 |   });
  180 | });
  181 | 
  182 | // ════════════════════════════════════════════
  183 | // A3: Navigation Active State
  184 | // ════════════════════════════════════════════
  185 | test.describe('Navigation Active State', () => {
  186 |   test('เข้า /dashboard.html → sidebar มี active item', async ({ page }) => {
  187 |     await loginAsAdmin(page);
  188 |     await page.goto('/dashboard.html');
  189 |     await page.waitForLoadState('networkidle');
  190 |     // active class ต้องมีใน sidebar
  191 |     const activeItem = page.locator('.sidebar .active, .sidebar [class*="active"], .nav-item.active');
  192 |     await expect(activeItem.first()).toBeVisible();
  193 |   });
  194 | 
  195 |   test('เข้า /vehicles.html → sidebar มี active item', async ({ page }) => {
  196 |     await loginAsAdmin(page);
  197 |     await page.goto('/vehicles.html');
  198 |     await page.waitForLoadState('networkidle');
  199 |     const activeItem = page.locator('.sidebar .active, .sidebar [class*="active"]');
  200 |     expect(await activeItem.count()).toBeGreaterThan(0);
  201 |   });
  202 | 
  203 |   test('เข้า /queue-manage.html → sidebar มี active item', async ({ page }) => {
  204 |     await loginAsAdmin(page);
  205 |     await page.goto('/queue-manage.html');
  206 |     await page.waitForLoadState('networkidle');
  207 |     const activeItem = page.locator('.sidebar .active, .sidebar [class*="active"]');
  208 |     expect(await activeItem.count()).toBeGreaterThan(0);
  209 |   });
  210 | });
  211 | 
  212 | // ════════════════════════════════════════════
  213 | // A4: Keyboard & Accessibility
  214 | // ════════════════════════════════════════════
  215 | test.describe('Keyboard & Accessibility', () => {
  216 |   test('sidebar links focus visible ด้วย Tab key', async ({ page }) => {
  217 |     await loginAsAdmin(page);
  218 |     await page.goto('/dashboard.html');
  219 |     await page.waitForLoadState('networkidle');
  220 |     await page.setViewportSize({ width: 1280, height: 800 });
  221 |     // กด Tab หลายครั้ง แล้วตรวจว่ามี focus ที่ไหนสักที่
  222 |     await page.keyboard.press('Tab');
  223 |     await page.keyboard.press('Tab');
  224 |     const focused = await page.evaluate(() => document.activeElement?.tagName);
  225 |     expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'DETAILS']).toContain(focused);
  226 |   });
  227 | 
  228 |   test('hamburger มี aria หรือ accessible label', async ({ page }) => {
  229 |     await page.setViewportSize({ width: 390, height: 844 });
  230 |     await loginAsAdmin(page);
  231 |     await page.goto('/dashboard.html');
  232 |     await page.waitForLoadState('networkidle');
  233 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  234 |     if (await hamburger.count() > 0) {
  235 |       const tag = await hamburger.evaluate(el => el.tagName.toLowerCase());
  236 |       // ต้องเป็น button หรือมี role=button
  237 |       const role = await hamburger.getAttribute('role');
  238 |       expect(['button', 'img'].includes(tag) || role === 'button' || tag === 'button').toBeTruthy();
  239 |     }
  240 |   });
  241 | 
  242 |   test('ทุกหน้า public มี charset UTF-8 (Thai text)', async ({ page }) => {
  243 |     await page.goto('/login.html');
  244 |     const charset = await page.evaluate(() => document.characterSet);
  245 |     expect(charset.toLowerCase()).toBe('utf-8');
  246 |   });
  247 | });
  248 | 
  249 | // ════════════════════════════════════════════
  250 | // A5: Protected Routes (Auth Guard)
  251 | // ════════════════════════════════════════════
  252 | test.describe('Auth Guard', () => {
  253 |   test('/dashboard.html ไม่มี token → redirect login', async ({ page }) => {
  254 |     // clear localStorage ก่อน
  255 |     await page.addInitScript(() => localStorage.clear());
> 256 |     await page.goto('/dashboard.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/dashboard.html
  257 |     await page.waitForURL(/login/, { timeout: 8000 });
  258 |     expect(page.url()).toMatch(/login/);
  259 |   });
  260 | 
  261 |   test('/vehicles.html ไม่มี token → redirect login', async ({ page }) => {
  262 |     await page.addInitScript(() => localStorage.clear());
  263 |     await page.goto('/vehicles.html');
  264 |     await page.waitForURL(/login/, { timeout: 8000 });
  265 |     expect(page.url()).toMatch(/login/);
  266 |   });
  267 | });
  268 | 
```