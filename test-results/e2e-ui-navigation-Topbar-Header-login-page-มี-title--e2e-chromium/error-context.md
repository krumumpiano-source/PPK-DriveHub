# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-navigation.spec.mjs >> Topbar & Header >> login page มี <title>
- Location: tests\e2e\ui-navigation.spec.mjs:152:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
Call log:
  - navigating to "http://localhost:8788/login.html", waiting until "load"

```

# Test source

```ts
  53  | // ════════════════════════════════════════════
  54  | test.describe('Sidebar — Desktop (>900px)', () => {
  55  |   test('desktop: sidebar มองเห็น, hamburger ซ่อน', async ({ page }) => {
  56  |     await page.setViewportSize({ width: 1280, height: 800 });
  57  |     await loginAsAdmin(page);
  58  |     await page.goto('/dashboard.html');
  59  |     await page.waitForLoadState('networkidle');
  60  |     const sidebar = page.locator('.sidebar');
  61  |     await expect(sidebar).toBeVisible();
  62  |     // hamburger ต้องซ่อนอยู่หรือไม่มีบน desktop
  63  |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger');
  64  |     if (await hamburger.count() > 0) {
  65  |       await expect(hamburger).toHaveCSS('display', /none|inline/);
  66  |     }
  67  |   });
  68  | 
  69  |   test('desktop 1024px: sidebar ยังมองเห็น', async ({ page }) => {
  70  |     await page.setViewportSize({ width: 1024, height: 768 });
  71  |     await loginAsAdmin(page);
  72  |     await page.goto('/dashboard.html');
  73  |     await page.waitForLoadState('networkidle');
  74  |     await expect(page.locator('.sidebar')).toBeVisible();
  75  |   });
  76  | });
  77  | 
  78  | test.describe('Sidebar — Mobile (<900px)', () => {
  79  |   test('mobile 390px: sidebar ซ่อน, hamburger โผล่', async ({ page }) => {
  80  |     await page.setViewportSize({ width: 390, height: 844 });
  81  |     await loginAsAdmin(page);
  82  |     await page.goto('/dashboard.html');
  83  |     await page.waitForLoadState('networkidle');
  84  |     // sidebar ต้องซ่อน (transform translateX หรือ display none)
  85  |     const sidebar = page.locator('.sidebar');
  86  |     const isVisible = await sidebar.evaluate(el => {
  87  |       const style = window.getComputedStyle(el);
  88  |       const transform = style.transform;
  89  |       return !transform.includes('matrix') || !transform.match(/-\d/) ? true : false;
  90  |     }).catch(() => true);
  91  |     // hamburger ต้องโผล่
  92  |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  93  |     await expect(hamburger).toBeVisible();
  94  |   });
  95  | 
  96  |   test('mobile: คลิก hamburger → sidebar เปิด', async ({ page }) => {
  97  |     await page.setViewportSize({ width: 390, height: 844 });
  98  |     await loginAsAdmin(page);
  99  |     await page.goto('/dashboard.html');
  100 |     await page.waitForLoadState('networkidle');
  101 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  102 |     await hamburger.click();
  103 |     await page.waitForTimeout(400); // รอ animation
  104 |     const sidebar = page.locator('.sidebar');
  105 |     await expect(sidebar).toHaveClass(/open/);
  106 |   });
  107 | 
  108 |   test('mobile: คลิก overlay → sidebar ปิด', async ({ page }) => {
  109 |     await page.setViewportSize({ width: 390, height: 844 });
  110 |     await loginAsAdmin(page);
  111 |     await page.goto('/dashboard.html');
  112 |     await page.waitForLoadState('networkidle');
  113 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  114 |     await hamburger.click();
  115 |     await page.waitForTimeout(400);
  116 |     const overlay = page.locator('.sidebar-overlay');
  117 |     if (await overlay.count() > 0) {
  118 |       // ใช้ JS click เพื่อหลีกเลี่ยง sidebar-brand intercepting pointer events
  119 |       await page.evaluate(() => {
  120 |         const el = document.querySelector('.sidebar-overlay');
  121 |         if (el) el.click();
  122 |       });
  123 |       await page.waitForTimeout(400);
  124 |       const sidebar = page.locator('.sidebar');
  125 |       const classes = await sidebar.getAttribute('class');
  126 |       expect(classes).not.toContain('open');
  127 |     }
  128 |   });
  129 | 
  130 |   test('mobile 375px (iPhone SE): sidebar ซ่อน, hamburger โผล่', async ({ page }) => {
  131 |     await page.setViewportSize({ width: 375, height: 667 });
  132 |     await loginAsAdmin(page);
  133 |     await page.goto('/dashboard.html');
  134 |     await page.waitForLoadState('networkidle');
  135 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  136 |     await expect(hamburger).toBeVisible();
  137 |   });
  138 | });
  139 | 
  140 | // ════════════════════════════════════════════
  141 | // A2: Top Bar & Header
  142 | // ════════════════════════════════════════════
  143 | test.describe('Topbar & Header', () => {
  144 |   test('dashboard มี <title> ที่ไม่ว่าง', async ({ page }) => {
  145 |     await loginAsAdmin(page);
  146 |     await page.goto('/dashboard.html');
  147 |     await page.waitForLoadState('networkidle');
  148 |     const title = await page.title();
  149 |     expect(title.trim().length).toBeGreaterThan(0);
  150 |   });
  151 | 
  152 |   test('login page มี <title>', async ({ page }) => {
> 153 |     await page.goto('/login.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
  154 |     await page.waitForLoadState('networkidle');
  155 |     const title = await page.title();
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
```