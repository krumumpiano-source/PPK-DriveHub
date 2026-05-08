# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-cross-browser.spec.mjs >> E5: Font & Icon Loading >> login page render ได้ในทุก browser ไม่มี JS error
- Location: tests\e2e\ui-cross-browser.spec.mjs:284:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
Call log:
  - navigating to "http://localhost:8788/login.html", waiting until "load"

```

# Test source

```ts
  187 |     expect(val).toBe('1');
  188 |   });
  189 | 
  190 |   test('<textarea> resize ได้', async ({ page }) => {
  191 |     await page.goto('/login.html');
  192 |     await page.evaluate(() => {
  193 |       const t = document.createElement('textarea');
  194 |       t.id = '__testTA';
  195 |       document.body.appendChild(t);
  196 |     });
  197 |     const ta = page.locator('#__testTA');
  198 |     await expect(ta).toBeVisible();
  199 |     await ta.fill('test text');
  200 |     const val = await ta.inputValue();
  201 |     expect(val).toBe('test text');
  202 |   });
  203 | 
  204 |   test('range input รองรับ', async ({ page }) => {
  205 |     await page.goto('/login.html');
  206 |     const supported = await page.evaluate(() => {
  207 |       const i = document.createElement('input');
  208 |       i.type = 'range';
  209 |       return i.type === 'range' || i.type === 'number'; // fallback for old browsers
  210 |     });
  211 |     expect(supported).toBe(true);
  212 |   });
  213 | });
  214 | 
  215 | // ════════════════════════════════════════════
  216 | // E4: API Fetch จาก Browser
  217 | // ════════════════════════════════════════════
  218 | test.describe('E4: API Cross-Browser', () => {
  219 |   test('fetch /api/setup ได้ผลลัพธ์ (not CORS block)', async ({ page }) => {
  220 |     await page.goto('/login.html');
  221 |     const result = await page.evaluate(async () => {
  222 |       try {
  223 |         const r = await fetch('/api/setup');
  224 |         return r.status;
  225 |       } catch (e) {
  226 |         return -1;
  227 |       }
  228 |     });
  229 |     expect(result).toBeGreaterThan(0);
  230 |     expect(result).not.toBe(-1);
  231 |   });
  232 | 
  233 |   test('fetch /api/auth/login → JSON response', async ({ page }) => {
  234 |     clearRateLimits();
  235 |     await page.goto('/login.html');
  236 |     const result = await page.evaluate(async () => {
  237 |       try {
  238 |         const r = await fetch('/api/auth/login', {
  239 |           method: 'POST',
  240 |           headers: { 'Content-Type': 'application/json' },
  241 |           body: JSON.stringify({ username: 'wronguser', password: 'wrongpass' }),
  242 |         });
  243 |         const data = await r.json();
  244 |         return { status: r.status, hasMessage: !!data?.message || !!data?.error };
  245 |       } catch {
  246 |         return { status: -1, hasMessage: false };
  247 |       }
  248 |     });
  249 |     expect(result.status).not.toBe(-1);
  250 |     // 400 หรือ 401 = API ทำงาน
  251 |     expect([400, 401, 429]).toContain(result.status);
  252 |   });
  253 | 
  254 |   test('no mixed content errors (HTTPS only)', async ({ page }) => {
  255 |     const errors = [];
  256 |     page.on('pageerror', err => {
  257 |       if (err.message.includes('Mixed Content') || err.message.includes('insecure')) {
  258 |         errors.push(err.message);
  259 |       }
  260 |     });
  261 |     await loginAsAdmin(page);
  262 |     await page.goto('/dashboard.html');
  263 |     await page.waitForLoadState('networkidle');
  264 |     // ใน dev (HTTP) ไม่มี mixed content error
  265 |     // ตรวจแค่ว่าไม่มี JS errors ที่เกี่ยวกับ mixed content
  266 |     expect(errors.length).toBe(0);
  267 |   });
  268 | });
  269 | 
  270 | // ════════════════════════════════════════════
  271 | // E5: Font & Icon Loading
  272 | // ════════════════════════════════════════════
  273 | test.describe('E5: Font & Icon Loading', () => {
  274 |   test('icon font หรือ SVG icons โหลดได้', async ({ page }) => {
  275 |     await loginAsAdmin(page);
  276 |     await page.goto('/dashboard.html');
  277 |     await page.waitForLoadState('networkidle');
  278 |     // ตรวจว่า page ไม่ throw font errors
  279 |     const fontErrors = [];
  280 |     // ไม่มี console error เกี่ยวกับ font
  281 |     expect(fontErrors.length).toBe(0);
  282 |   });
  283 | 
  284 |   test('login page render ได้ในทุก browser ไม่มี JS error', async ({ page }) => {
  285 |     const jsErrors = [];
  286 |     page.on('pageerror', err => jsErrors.push(err.message));
> 287 |     await page.goto('/login.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
  288 |     await page.waitForLoadState('networkidle');
  289 |     // ยอมรับ errors ที่ไม่ใช่ critical
  290 |     const criticalErrors = jsErrors.filter(e =>
  291 |       !e.includes('ResizeObserver') &&
  292 |       !e.includes('Non-Error') &&
  293 |       !e.includes('Script error')
  294 |     );
  295 |     expect(criticalErrors.length).toBe(0);
  296 |   });
  297 | });
  298 | 
```