# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-mobile-flows.spec.mjs >> C2: QR Pages — Mobile Access >> qr-survey.html โหลดได้
- Location: tests\e2e\ui-mobile-flows.spec.mjs:134:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/qr-survey.html
Call log:
  - navigating to "http://localhost:8788/qr-survey.html", waiting until "load"

```

# Test source

```ts
  35  |         _authCache = { token: body.data.token, user: { id: body.data.user_id, username: body.data.username, display_name: body.data.display_name, role: body.data.role, permissions: body.data.permissions } };
  36  |         break;
  37  |       }
  38  |       clearRateLimits();
  39  |     }
  40  |   }
  41  |   if (!_authCache) throw new Error('Cannot obtain admin token');
  42  |   await page.addInitScript(({ token, user }) => {
  43  |     localStorage.setItem('ppk_token', token);
  44  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  45  |   }, _authCache);
  46  | }
  47  | 
  48  | // ════════════════════════════════════════════
  49  | // C1: Login Flow บน Mobile
  50  | // ════════════════════════════════════════════
  51  | test.describe('C1: Login Flow — Mobile', () => {
  52  |   test('login page โหลด — form อยู่ตรงกลาง', async ({ page }) => {
  53  |     await page.goto('/login.html');
  54  |     await page.waitForLoadState('networkidle');
  55  |     const form = page.locator('form, .login-card, .auth-card, .card').first();
  56  |     await expect(form).toBeVisible();
  57  |     // ตรวจว่า form ไม่ overflow จาก viewport
  58  |     const vpWidth = page.viewportSize()?.width || 390;
  59  |     const box = await form.boundingBox();
  60  |     if (box) {
  61  |       expect(box.x).toBeGreaterThanOrEqual(0);
  62  |       expect(box.x + box.width).toBeLessThanOrEqual(vpWidth + 5);
  63  |     }
  64  |   });
  65  | 
  66  |   test('email input มี type=email (mobile keyboard ขึ้นถูก)', async ({ page }) => {
  67  |     await page.goto('/login.html');
  68  |     await page.waitForLoadState('networkidle');
  69  |     const emailInput = page.locator('input[type="email"], input[name="username"], #username').first();
  70  |     if (await emailInput.count() > 0) {
  71  |       const type = await emailInput.getAttribute('type');
  72  |       // email หรือ text ก็ยอมรับ (บาง app ใช้ username แทน email)
  73  |       expect(['email', 'text', null]).toContain(type);
  74  |     }
  75  |   });
  76  | 
  77  |   test('password input มี type=password (ปกปิดรหัส)', async ({ page }) => {
  78  |     await page.goto('/login.html');
  79  |     await page.waitForLoadState('networkidle');
  80  |     const pwInput = page.locator('input[type="password"], #password').first();
  81  |     await expect(pwInput).toBeVisible();
  82  |     expect(await pwInput.getAttribute('type')).toBe('password');
  83  |   });
  84  | 
  85  |   test('กรอก username+password → submit ได้ (API response)', async ({ page }) => {
  86  |     clearRateLimits();
  87  |     await page.goto('/login.html');
  88  |     await page.waitForLoadState('networkidle');
  89  |     const usernameInput = page.locator('#username, input[name="username"]').first();
  90  |     const passwordInput = page.locator('#password, input[type="password"]').first();
  91  |     await usernameInput.fill(ADMIN_USER);
  92  |     await passwordInput.fill(ADMIN_PASS || 'dummy');
  93  |     const [response] = await Promise.all([
  94  |       page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }),
  95  |       page.locator('#loginBtn, button[type="submit"]').first().click(),
  96  |     ]);
  97  |     expect(response.status()).toBeLessThan(500);
  98  |   });
  99  | });
  100 | 
  101 | // ════════════════════════════════════════════
  102 | // C2: QR Pages บน Mobile
  103 | // ════════════════════════════════════════════
  104 | test.describe('C2: QR Pages — Mobile Access', () => {
  105 |   test('qr-scan.html โหลดได้โดยไม่ต้อง login', async ({ page }) => {
  106 |     await page.goto('/qr-scan.html');
  107 |     await page.waitForLoadState('networkidle');
  108 |     expect(page.url()).not.toMatch(/login/);
  109 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  110 |     expect(body.length).toBeGreaterThan(100);
  111 |   });
  112 | 
  113 |   test('qr-daily-check.html โหลดได้', async ({ page }) => {
  114 |     await page.goto('/qr-daily-check.html');
  115 |     await page.waitForLoadState('networkidle');
  116 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  117 |     expect(body.length).toBeGreaterThan(100);
  118 |   });
  119 | 
  120 |   test('qr-fuel-record.html โหลดได้', async ({ page }) => {
  121 |     await page.goto('/qr-fuel-record.html');
  122 |     await page.waitForLoadState('networkidle');
  123 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  124 |     expect(body.length).toBeGreaterThan(100);
  125 |   });
  126 | 
  127 |   test('qr-usage-record.html โหลดได้', async ({ page }) => {
  128 |     await page.goto('/qr-usage-record.html');
  129 |     await page.waitForLoadState('networkidle');
  130 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  131 |     expect(body.length).toBeGreaterThan(100);
  132 |   });
  133 | 
  134 |   test('qr-survey.html โหลดได้', async ({ page }) => {
> 135 |     await page.goto('/qr-survey.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/qr-survey.html
  136 |     await page.waitForLoadState('networkidle');
  137 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  138 |     expect(body.length).toBeGreaterThan(100);
  139 |   });
  140 | });
  141 | 
  142 | // ════════════════════════════════════════════
  143 | // C3: Queue Manage — Mobile UI
  144 | // ════════════════════════════════════════════
  145 | test.describe('C3: Queue Manage — Mobile UI', () => {
  146 |   test('queue-manage.html โหลดได้บน mobile', async ({ page }) => {
  147 |     await loginAsAdmin(page);
  148 |     await page.goto('/queue-manage.html');
  149 |     await page.waitForLoadState('networkidle');
  150 |     const vpWidth = page.viewportSize()?.width || 390;
  151 |     expect(vpWidth).toBeGreaterThan(0);
  152 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  153 |     expect(overflow).toBe(false);
  154 |   });
  155 | 
  156 |   test('queue-manage: ปุ่ม "เพิ่มคิว/จองคิว" มองเห็นบน mobile', async ({ page }) => {
  157 |     await loginAsAdmin(page);
  158 |     await page.goto('/queue-manage.html');
  159 |     await page.waitForLoadState('networkidle');
  160 |     // หาปุ่มเพิ่มคิว
  161 |     const addBtn = page.locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว"), [data-action="add-queue"]').first();
  162 |     if (await addBtn.count() > 0) {
  163 |       await expect(addBtn).toBeVisible();
  164 |       // ตรวจ touch target ≥ 40px
  165 |       const height = await addBtn.evaluate(el => el.getBoundingClientRect().height);
  166 |       expect(height).toBeGreaterThanOrEqual(40);
  167 |     }
  168 |   });
  169 | 
  170 |   test('queue-manage: modal เปิดได้บน mobile', async ({ page }) => {
  171 |     await loginAsAdmin(page);
  172 |     await page.goto('/queue-manage.html');
  173 |     await page.waitForLoadState('networkidle');
  174 |     const addBtn = page.locator('button:has-text("จอง"), button:has-text("เพิ่มคิว"), button:has-text("จองคิว")').first();
  175 |     if (await addBtn.count() > 0) {
  176 |       await addBtn.click();
  177 |       await page.waitForTimeout(500);
  178 |       // Modal หรือ form โผล่
  179 |       const modal = page.locator('.modal, [role="dialog"], .form-card, form').first();
  180 |       if (await modal.count() > 0) {
  181 |         await expect(modal).toBeVisible();
  182 |       }
  183 |     }
  184 |   });
  185 | });
  186 | 
  187 | // ════════════════════════════════════════════
  188 | // C4: Notifications บน Mobile
  189 | // ════════════════════════════════════════════
  190 | test.describe('C4: Notifications — Mobile', () => {
  191 |   test('notifications.html โหลดได้บน mobile', async ({ page }) => {
  192 |     await loginAsAdmin(page);
  193 |     await page.goto('/notifications.html');
  194 |     await page.waitForLoadState('networkidle');
  195 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  196 |     expect(overflow).toBe(false);
  197 |   });
  198 | 
  199 |   test('notifications: list แสดงเป็น column', async ({ page }) => {
  200 |     await loginAsAdmin(page);
  201 |     await page.goto('/notifications.html');
  202 |     await page.waitForLoadState('networkidle');
  203 |     // รอ load
  204 |     await page.waitForTimeout(500);
  205 |     // page มีเนื้อหา
  206 |     const bodyText = await page.evaluate(() => document.body.innerText.trim());
  207 |     expect(bodyText.length).toBeGreaterThan(0);
  208 |   });
  209 | });
  210 | 
  211 | // ════════════════════════════════════════════
  212 | // C5: Reports บน Mobile
  213 | // ════════════════════════════════════════════
  214 | test.describe('C5: Reports — Mobile View', () => {
  215 |   test('reports.html โหลดได้บน mobile', async ({ page }) => {
  216 |     await loginAsAdmin(page);
  217 |     await page.goto('/reports.html');
  218 |     await page.waitForLoadState('networkidle');
  219 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  220 |     expect(overflow).toBe(false);
  221 |   });
  222 | 
  223 |   test('executive-dashboard.html โหลดได้บน mobile', async ({ page }) => {
  224 |     await loginAsAdmin(page);
  225 |     await page.goto('/executive-dashboard.html');
  226 |     await page.waitForLoadState('networkidle');
  227 |     // ตรวจว่า page โหลดได้และมี content
  228 |     const body = await page.evaluate(() => document.body.innerHTML.trim());
  229 |     expect(body.length).toBeGreaterThan(100);
  230 |   });
  231 | });
  232 | 
  233 | // ════════════════════════════════════════════
  234 | // C6: Dashboard + Sidebar บน Mobile
  235 | // ════════════════════════════════════════════
```