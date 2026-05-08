# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-responsive.spec.mjs >> Typography & Text >> body font-size ≥ 13px บน iPhone SE (375px)
- Location: tests\e2e\ui-responsive.spec.mjs:194:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
Call log:
  - navigating to "http://localhost:8788/login.html", waiting until "load"

```

# Test source

```ts
  96  |     { path: '/repair.html', label: 'repair' },
  97  |     { path: '/usage-log.html', label: 'usage-log' },
  98  |   ];
  99  | 
  100 |   for (const p of TABLE_PAGES) {
  101 |     test(`${p.label} — .table-wrap overflow-x: auto บน 390px`, async ({ page }) => {
  102 |       await page.setViewportSize({ width: 390, height: 844 });
  103 |       await loginAsAdmin(page);
  104 |       await page.goto(p.path);
  105 |       await page.waitForLoadState('networkidle');
  106 |       await page.waitForTimeout(500);
  107 |       const tableWrap = page.locator('.table-wrap, .table-container, [class*="table-wrap"]').first();
  108 |       if (await tableWrap.count() > 0) {
  109 |         const overflowX = await tableWrap.evaluate(el => window.getComputedStyle(el).overflowX);
  110 |         expect(['auto', 'scroll']).toContain(overflowX);
  111 |       }
  112 |     });
  113 |   }
  114 | 
  115 |   test('vehicles — page ไม่มี horizontal scroll บน 390px', async ({ page }) => {
  116 |     await page.setViewportSize({ width: 390, height: 844 });
  117 |     await loginAsAdmin(page);
  118 |     await page.goto('/vehicles.html');
  119 |     await page.waitForLoadState('networkidle');
  120 |     await page.waitForTimeout(500);
  121 |     const overflow = await hasHorizontalScroll(page);
  122 |     expect(overflow).toBe(false);
  123 |   });
  124 | });
  125 | 
  126 | // ════════════════════════════════════════════
  127 | // B3: Form Modal บน Mobile
  128 | // ════════════════════════════════════════════
  129 | test.describe('Form & Modal บน Mobile', () => {
  130 |   test('Login form — input มี height ≥ 40px', async ({ page }) => {
  131 |     await page.setViewportSize({ width: 390, height: 844 });
  132 |     await page.goto('/login.html');
  133 |     await page.waitForLoadState('networkidle');
  134 |     const input = page.locator('#username, input[type="text"], input[type="email"]').first();
  135 |     if (await input.count() > 0) {
  136 |       const height = await input.evaluate(el => el.getBoundingClientRect().height);
  137 |       expect(height).toBeGreaterThanOrEqual(40);
  138 |     }
  139 |   });
  140 | 
  141 |   test('Login form — ไม่มี horizontal scroll', async ({ page }) => {
  142 |     await page.setViewportSize({ width: 375, height: 667 });
  143 |     await page.goto('/login.html');
  144 |     await page.waitForLoadState('networkidle');
  145 |     const overflow = await hasHorizontalScroll(page);
  146 |     expect(overflow).toBe(false);
  147 |   });
  148 | 
  149 |   test('Register form — ไม่ overflow บน mobile', async ({ page }) => {
  150 |     await page.setViewportSize({ width: 390, height: 844 });
  151 |     await page.goto('/register.html');
  152 |     await page.waitForLoadState('networkidle');
  153 |     const overflow = await hasHorizontalScroll(page);
  154 |     expect(overflow).toBe(false);
  155 |   });
  156 | 
  157 |   test('forgot-password form — ไม่ overflow', async ({ page }) => {
  158 |     await page.setViewportSize({ width: 375, height: 667 });
  159 |     await page.goto('/forgot-password.html');
  160 |     await page.waitForLoadState('networkidle');
  161 |     const overflow = await hasHorizontalScroll(page);
  162 |     expect(overflow).toBe(false);
  163 |   });
  164 | });
  165 | 
  166 | // ════════════════════════════════════════════
  167 | // B4: QR Pages บน Mobile
  168 | // ════════════════════════════════════════════
  169 | test.describe('QR Pages บน Mobile', () => {
  170 |   const QR_PAGES = [
  171 |     '/qr-scan.html',
  172 |     '/qr-daily-check.html',
  173 |     '/qr-fuel-record.html',
  174 |     '/qr-usage-record.html',
  175 |     '/qr-survey.html',
  176 |   ];
  177 | 
  178 |   for (const path of QR_PAGES) {
  179 |     test(`${path} — โหลดได้, ไม่ overflow`, async ({ page }) => {
  180 |       await page.setViewportSize({ width: 390, height: 844 });
  181 |       await page.goto(path);
  182 |       await page.waitForLoadState('networkidle');
  183 |       await page.waitForTimeout(300);
  184 |       const overflow = await hasHorizontalScroll(page);
  185 |       expect(overflow).toBe(false);
  186 |     });
  187 |   }
  188 | });
  189 | 
  190 | // ════════════════════════════════════════════
  191 | // B5: Typography — Font Scale
  192 | // ════════════════════════════════════════════
  193 | test.describe('Typography & Text', () => {
  194 |   test('body font-size ≥ 13px บน iPhone SE (375px)', async ({ page }) => {
  195 |     await page.setViewportSize({ width: 375, height: 667 });
> 196 |     await page.goto('/login.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
  197 |     await page.waitForLoadState('networkidle');
  198 |     const bodyFontSize = await page.evaluate(() => {
  199 |       const body = document.body;
  200 |       return parseFloat(window.getComputedStyle(body).fontSize);
  201 |     });
  202 |     expect(bodyFontSize).toBeGreaterThanOrEqual(13);
  203 |   });
  204 | 
  205 |   test('login page — ข้อความภาษาไทยแสดงได้ (ไม่เป็น ?)', async ({ page }) => {
  206 |     await page.goto('/login.html');
  207 |     await page.waitForLoadState('networkidle');
  208 |     const bodyText = await page.evaluate(() => document.body.innerText);
  209 |     // ถ้ามีภาษาไทยต้องไม่มีแต่ '????'
  210 |     const garbled = (bodyText.match(/\?{4,}/g) || []).length;
  211 |     expect(garbled).toBe(0);
  212 |   });
  213 | 
  214 |   test('dashboard — card stats readable บน 390px', async ({ page }) => {
  215 |     await page.setViewportSize({ width: 390, height: 844 });
  216 |     await loginAsAdmin(page);
  217 |     await page.goto('/dashboard.html');
  218 |     await page.waitForLoadState('networkidle');
  219 |     // ตรวจว่า body โหลดและมีเนื้อหา
  220 |     const hasContent = await page.evaluate(() => document.body.innerText.trim().length > 0);
  221 |     expect(hasContent).toBe(true);
  222 |   });
  223 | 
  224 |   test('vehicles.html — ข้อความใน card ไม่ truncate ผิดปกติ', async ({ page }) => {
  225 |     await page.setViewportSize({ width: 1280, height: 800 });
  226 |     await loginAsAdmin(page);
  227 |     await page.goto('/vehicles.html');
  228 |     await page.waitForLoadState('networkidle');
  229 |     // page มี content
  230 |     const bodyLen = await page.evaluate(() => document.body.innerText.trim().length);
  231 |     expect(bodyLen).toBeGreaterThan(0);
  232 |   });
  233 | });
  234 | 
  235 | // ════════════════════════════════════════════
  236 | // B6: Public Pages — ไม่ต้อง login
  237 | // ════════════════════════════════════════════
  238 | test.describe('Public Pages — ไม่ต้อง login', () => {
  239 |   const PUBLIC_PAGES = [
  240 |     { path: '/login.html', label: 'login' },
  241 |     { path: '/register.html', label: 'register' },
  242 |     { path: '/forgot-password.html', label: 'forgot-password' },
  243 |     { path: '/about.html', label: 'about' },
  244 |     { path: '/pdpa-policy.html', label: 'pdpa-policy' },
  245 |     { path: '/glossary.html', label: 'glossary' },
  246 |     { path: '/user-guide.html', label: 'user-guide' },
  247 |   ];
  248 | 
  249 |   for (const p of PUBLIC_PAGES) {
  250 |     test(`${p.label} — โหลดได้ ไม่มี redirect`, async ({ page }) => {
  251 |       await page.goto(p.path);
  252 |       await page.waitForLoadState('networkidle');
  253 |       // ต้องไม่ redirect ไป login
  254 |       if (p.path !== '/login.html') {
  255 |         expect(page.url()).not.toMatch(/login\.html$/);
  256 |       }
  257 |       const status = await page.evaluate(() => document.readyState);
  258 |       expect(status).toBe('complete');
  259 |     });
  260 |   }
  261 | });
  262 | 
```