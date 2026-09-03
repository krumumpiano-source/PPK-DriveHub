# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> หน้า Login >> ลิงก์ไปหน้า forgot-password
- Location: tests\e2e\app.spec.mjs:144:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[href*="forgot"]')
    - locator resolved to <a href="forgot-password.html">ลืมรหัสผ่าน?</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

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
        - text: โรงเรียนพะเยาพิทยาคม
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: ใส่อีเมลโรงเรียน หรือ ชื่อผู้ใช้งาน
          - textbox "ใส่อีเมลโรงเรียน หรือ ชื่อผู้ใช้งาน" [active] [ref=e16]:
            - /placeholder: เช่น somchai@ppk.ac.th หรือ admin
          - generic [ref=e17]: "💡 ครูและบุคลากร: ใส่อีเมล @ppk.ac.th เพื่อเข้าใช้งานหรือเปิดบัญชีใหม่ได้ทันที"
        - button "ถัดไป ➔" [ref=e18] [cursor=pointer]:
          - generic [ref=e19]: ถัดไป
          - generic [ref=e20]: ➔
      - generic [ref=e22]: หรือเข้าใช้งานด้วยช่องทางอื่น
      - button "💬 เข้าสู่ระบบด้วย LINE" [ref=e23] [cursor=pointer]:
        - generic [ref=e24]: 💬
        - generic [ref=e25]: เข้าสู่ระบบด้วย LINE
  - contentinfo [ref=e26]:
    - paragraph [ref=e27]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
  49  |     if (!body?.success) {
  50  |       throw new Error(`Login failed: ${body?.error}`);
  51  |     }
  52  | 
  53  |     _authCache = {
  54  |       token: body.data.token,
  55  |       user: {
  56  |         id: body.data.user_id,
  57  |         username: body.data.username,
  58  |         display_name: body.data.display_name,
  59  |         role: body.data.role,
  60  |         permissions: body.data.permissions,
  61  |       },
  62  |     };
  63  |   }
  64  | 
  65  |   // Set auth in localStorage before navigating
  66  |   await page.addInitScript(({ token, user }) => {
  67  |     localStorage.setItem('ppk_token', token);
  68  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  69  |   }, _authCache);
  70  | 
  71  |   return _authCache;
  72  | }
  73  | 
  74  | // ════════════════════════════════════════════
  75  | // 1. หน้า Login
  76  | // ════════════════════════════════════════════
  77  | test.describe('หน้า Login', () => {
  78  |   test('แสดงฟอร์ม login ถูกต้อง', async ({ page }) => {
  79  |     await page.goto('/login.html');
  80  |     await page.waitForLoadState('networkidle');
  81  |     await expect(page.locator('#username')).toBeVisible();
  82  |     await expect(page.locator('#password')).toBeVisible();
  83  |     await expect(page.locator('#loginBtn')).toBeVisible();
  84  |     await expect(page).toHaveTitle(/เข้าสู่ระบบ|PPK DriveHub/);
  85  |   });
  86  | 
  87  |   test('login สำเร็จ → ไปหน้า dashboard', async ({ page }) => {
  88  |     clearRateLimits();
  89  |     // Determine actual admin password (api-integration may have changed it)
  90  |     let actualPass = ADMIN_PASS;
  91  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  92  |       const r = await fetch(`${BASE}/api/auth/login`, {
  93  |         method: 'POST',
  94  |         headers: { 'Content-Type': 'application/json' },
  95  |         body: JSON.stringify({ username: ADMIN_USER, password: pw }),
  96  |       });
  97  |       const d = await r.json();
  98  |       if (d?.success || d?.data?.token) { actualPass = pw; break; }
  99  |       clearRateLimits();
  100 |     }
  101 |     await page.goto('/login.html');
  102 |     await page.waitForLoadState('networkidle');
  103 |     await page.fill('#username', ADMIN_USER);
  104 |     await page.fill('#password', actualPass);
  105 |     await page.click('#loginBtn');
  106 | 
  107 |     // Should navigate to dashboard (wrangler strips .html)
  108 |     await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  109 |     await expect(page).toHaveURL(/\/dashboard/);
  110 |   });
  111 | 
  112 |   test('login ล้มเหลว → ไม่ redirect', async ({ page }) => {
  113 |     clearRateLimits();
  114 |     await page.goto('/login.html');
  115 |     await page.waitForLoadState('networkidle');
  116 |     await page.fill('#username', 'wrong');
  117 |     await page.fill('#password', 'wrong');
  118 | 
  119 |     // Intercept login API response
  120 |     const [response] = await Promise.all([
  121 |       page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
  122 |       page.click('#loginBtn'),
  123 |     ]);
  124 |     const body = await response.json();
  125 |     expect(body.success).toBeFalsy();
  126 | 
  127 |     // Should still be on login page
  128 |     await page.waitForTimeout(1000);
  129 |     expect(page.url()).toMatch(/login/);
  130 |   });
  131 | 
  132 |   test('ลิงก์ไปหน้า register', async ({ page }) => {
  133 |     await page.goto('/login.html');
  134 |     await page.waitForLoadState('networkidle');
  135 |     // Register is a <button>, not <a>
  136 |     const registerBtn = page.locator('button.btn-register, a[href*="register"]');
  137 |     if (await registerBtn.count() > 0) {
  138 |       await registerBtn.first().click();
  139 |       await page.waitForURL(/\/register/, { timeout: 5000 });
  140 |       await expect(page).toHaveURL(/\/register/);
  141 |     }
  142 |   });
  143 | 
  144 |   test('ลิงก์ไปหน้า forgot-password', async ({ page }) => {
  145 |     await page.goto('/login.html');
  146 |     await page.waitForLoadState('networkidle');
  147 |     const forgotLink = page.locator('a[href*="forgot"]');
  148 |     if (await forgotLink.count() > 0) {
> 149 |       await forgotLink.click();
      |                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  150 |       await expect(page).toHaveURL(/forgot-password/);
  151 |     }
  152 |   });
  153 | });
  154 | 
  155 | // ════════════════════════════════════════════
  156 | // 2. หน้า Register
  157 | // ════════════════════════════════════════════
  158 | test.describe('หน้า Register', () => {
  159 |   test('แสดงฟอร์มสมัครสมาชิก', async ({ page }) => {
  160 |     await page.goto('/register.html');
  161 |     // Should have email and name fields
  162 |     await expect(page.locator('input[type="email"], #email')).toBeVisible();
  163 |     await expect(page.locator('button[type="submit"], .btn-register, #registerBtn')).toBeVisible();
  164 |   });
  165 | });
  166 | 
  167 | // ════════════════════════════════════════════
  168 | // 3. หน้า Dashboard
  169 | // ════════════════════════════════════════════
  170 | test.describe('หน้า Dashboard', () => {
  171 |   test.beforeEach(async ({ page }) => {
  172 |     await loginAsAdmin(page);
  173 |   });
  174 | 
  175 |   test('โหลดหน้า Dashboard สำเร็จ', async ({ page }) => {
  176 |     await page.goto('/dashboard.html');
  177 |     await page.waitForLoadState('networkidle');
  178 | 
  179 |     // Dashboard content should appear
  180 |     await expect(page.locator('#dashboardContent')).toBeVisible({ timeout: 10000 });
  181 |     await expect(page).toHaveTitle(/Dashboard|PPK DriveHub/);
  182 |   });
  183 | 
  184 |   test('Sidebar navigation แสดงเมนู', async ({ page }) => {
  185 |     await page.goto('/dashboard.html');
  186 |     await page.waitForLoadState('networkidle');
  187 | 
  188 |     // Wait for sidebar to render
  189 |     const sidebar = page.locator('#sidebar, .sidebar');
  190 |     await expect(sidebar).toBeVisible({ timeout: 10000 });
  191 | 
  192 |     // Should have menu items
  193 |     const menuItems = sidebar.locator('.sidebar-item, [data-page]');
  194 |     expect(await menuItems.count()).toBeGreaterThan(3);
  195 |   });
  196 | 
  197 |   test('แสดงปฏิทิน', async ({ page }) => {
  198 |     await page.goto('/dashboard.html');
  199 |     await page.waitForLoadState('networkidle');
  200 | 
  201 |     const calendar = page.locator('#calendarGrid, .calendar-grid');
  202 |     await expect(calendar).toBeVisible({ timeout: 10000 });
  203 |   });
  204 | });
  205 | 
  206 | // ════════════════════════════════════════════
  207 | // 4. หน้า Queue (จัดคิว)
  208 | // ════════════════════════════════════════════
  209 | test.describe('หน้า Queue', () => {
  210 |   test.beforeEach(async ({ page }) => {
  211 |     await loginAsAdmin(page);
  212 |   });
  213 | 
  214 |   test('โหลดหน้าจัดคิวสำเร็จ', async ({ page }) => {
  215 |     await page.goto('/queue-manage.html');
  216 |     await page.waitForLoadState('networkidle');
  217 |     await expect(page).toHaveTitle(/คิว|Queue|PPK DriveHub/);
  218 |   });
  219 | 
  220 |   test('แสดงตารางหรือรายการคิว', async ({ page }) => {
  221 |     await page.goto('/queue-manage.html');
  222 |     await page.waitForLoadState('networkidle');
  223 | 
  224 |     // Queue uses calendar view — look for calendar grid or queue items
  225 |     const content = page.locator('#calendarGrid, #calendarContainer, .queue-item');
  226 |     await expect(content.first()).toBeVisible({ timeout: 10000 });
  227 |   });
  228 | });
  229 | 
  230 | // ════════════════════════════════════════════
  231 | // 5. หน้า Vehicles (รถ)
  232 | // ════════════════════════════════════════════
  233 | test.describe('หน้า Vehicles', () => {
  234 |   test.beforeEach(async ({ page }) => {
  235 |     await loginAsAdmin(page);
  236 |   });
  237 | 
  238 |   test('โหลดหน้ารถสำเร็จ', async ({ page }) => {
  239 |     await page.goto('/vehicles.html');
  240 |     await page.waitForLoadState('networkidle');
  241 |     await expect(page).toHaveTitle(/รถ|Vehicles|PPK DriveHub/);
  242 |   });
  243 | 
  244 |   test('แสดงรายการรถ', async ({ page }) => {
  245 |     await page.goto('/vehicles.html');
  246 |     await page.waitForLoadState('networkidle');
  247 | 
  248 |     const content = page.locator('#vehiclesGrid, .vehicle-card, #vehiclesContainer');
  249 |     await expect(content.first()).toBeVisible({ timeout: 10000 });
```