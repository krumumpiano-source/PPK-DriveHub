# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-cross-browser.spec.mjs >> E2: JavaScript APIs >> Intl.DateTimeFormat th-TH รองรับ
- Location: tests\e2e\ui-cross-browser.spec.mjs:127:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
Call log:
  - navigating to "http://localhost:8788/login.html", waiting until "load"

```

# Test source

```ts
  28  |     clearRateLimits();
  29  |     for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
  30  |       const r = await page.request.post('/api/auth/login', { data: { username: ADMIN_USER, password: pw } });
  31  |       const body = await r.json().catch(() => ({}));
  32  |       if (body?.data?.token) {
  33  |         _authCache = { token: body.data.token, user: { id: body.data.user_id, username: body.data.username, display_name: body.data.display_name, role: body.data.role, permissions: body.data.permissions } };
  34  |         break;
  35  |       }
  36  |       clearRateLimits();
  37  |     }
  38  |   }
  39  |   if (!_authCache) throw new Error('Cannot obtain admin token');
  40  |   await page.addInitScript(({ token, user }) => {
  41  |     localStorage.setItem('ppk_token', token);
  42  |     localStorage.setItem('ppk_user', JSON.stringify(user));
  43  |   }, _authCache);
  44  | }
  45  | 
  46  | // ════════════════════════════════════════════
  47  | // E1: CSS Custom Properties (Variables)
  48  | // ════════════════════════════════════════════
  49  | test.describe('E1: CSS Custom Properties', () => {
  50  |   test('--primary-color CSS variable resolve ได้', async ({ page }) => {
  51  |     await loginAsAdmin(page);
  52  |     await page.goto('/dashboard.html');
  53  |     await page.waitForLoadState('networkidle');
  54  |     const primaryColor = await page.evaluate(() => {
  55  |       return window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() ||
  56  |              window.getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() ||
  57  |              window.getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  58  |     });
  59  |     // ถ้ามี variable ต้องไม่ว่าง, ถ้าไม่มี variable ก็ผ่านได้
  60  |     expect(typeof primaryColor).toBe('string');
  61  |   });
  62  | 
  63  |   test('common.css โหลดได้ (status 200)', async ({ page }) => {
  64  |     const r = await page.request.get('/common.css');
  65  |     expect(r.status()).toBe(200);
  66  |     const contentType = r.headers()['content-type'] || '';
  67  |     expect(contentType).toContain('css');
  68  |   });
  69  | 
  70  |   test('login.html CSS render — background ≠ transparent', async ({ page }) => {
  71  |     await page.goto('/login.html');
  72  |     await page.waitForLoadState('networkidle');
  73  |     const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  74  |     // ต้องไม่เป็น undefined หรือ empty
  75  |     expect(bg).toBeTruthy();
  76  |   });
  77  | 
  78  |   test('CSS Grid ทำงานบน dashboard', async ({ page }) => {
  79  |     await loginAsAdmin(page);
  80  |     await page.goto('/dashboard.html');
  81  |     await page.waitForLoadState('networkidle');
  82  |     const gridSupport = await page.evaluate(() => CSS.supports('display', 'grid'));
  83  |     expect(gridSupport).toBe(true);
  84  |   });
  85  | 
  86  |   test('CSS clamp() รองรับได้', async ({ page }) => {
  87  |     await page.goto('/login.html');
  88  |     await page.waitForLoadState('networkidle');
  89  |     const clampSupport = await page.evaluate(() => CSS.supports('font-size', 'clamp(1rem, 2vw, 1.5rem)'));
  90  |     expect(clampSupport).toBe(true);
  91  |   });
  92  | });
  93  | 
  94  | // ════════════════════════════════════════════
  95  | // E2: JavaScript APIs
  96  | // ════════════════════════════════════════════
  97  | test.describe('E2: JavaScript APIs', () => {
  98  |   test('fetch API มีในทุก browser', async ({ page }) => {
  99  |     await page.goto('/login.html');
  100 |     const hasFetch = await page.evaluate(() => typeof window.fetch === 'function');
  101 |     expect(hasFetch).toBe(true);
  102 |   });
  103 | 
  104 |   test('localStorage API มีใน browser', async ({ page }) => {
  105 |     await page.goto('/login.html');
  106 |     const hasLS = await page.evaluate(() => {
  107 |       try {
  108 |         localStorage.setItem('_test', '1');
  109 |         localStorage.removeItem('_test');
  110 |         return true;
  111 |       } catch { return false; }
  112 |     });
  113 |     expect(hasLS).toBe(true);
  114 |   });
  115 | 
  116 |   test('URL API รองรับ URLSearchParams', async ({ page }) => {
  117 |     await page.goto('/login.html');
  118 |     const hasURL = await page.evaluate(() => {
  119 |       try {
  120 |         const u = new URL('http://example.com/path?a=1');
  121 |         return u.searchParams.get('a') === '1';
  122 |       } catch { return false; }
  123 |     });
  124 |     expect(hasURL).toBe(true);
  125 |   });
  126 | 
  127 |   test('Intl.DateTimeFormat th-TH รองรับ', async ({ page }) => {
> 128 |     await page.goto('/login.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
  129 |     const formatted = await page.evaluate(() => {
  130 |       try {
  131 |         return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long' }).format(new Date('2025-06-15'));
  132 |       } catch { return null; }
  133 |     });
  134 |     expect(formatted).not.toBeNull();
  135 |     expect(typeof formatted).toBe('string');
  136 |   });
  137 | 
  138 |   test('Promise API รองรับ', async ({ page }) => {
  139 |     await page.goto('/login.html');
  140 |     const hasPromise = await page.evaluate(() => typeof Promise === 'function');
  141 |     expect(hasPromise).toBe(true);
  142 |   });
  143 | 
  144 |   test('async/await ทำงานได้', async ({ page }) => {
  145 |     await page.goto('/login.html');
  146 |     const result = await page.evaluate(async () => {
  147 |       const val = await Promise.resolve(42);
  148 |       return val;
  149 |     });
  150 |     expect(result).toBe(42);
  151 |   });
  152 | });
  153 | 
  154 | // ════════════════════════════════════════════
  155 | // E3: Form Input Types
  156 | // ════════════════════════════════════════════
  157 | test.describe('E3: Form Input Types', () => {
  158 |   test('<input type="date"> render ได้', async ({ page }) => {
  159 |     await page.goto('/login.html');
  160 |     await page.evaluate(() => {
  161 |       const i = document.createElement('input');
  162 |       i.type = 'date';
  163 |       i.id = '__testDate';
  164 |       document.body.appendChild(i);
  165 |     });
  166 |     const input = page.locator('#__testDate');
  167 |     await expect(input).toBeVisible();
  168 |     const type = await input.evaluate(el => el.type);
  169 |     expect(['date', 'text']).toContain(type); // Safari fallback เป็น text ได้
  170 |   });
  171 | 
  172 |   test('<select> render ได้', async ({ page }) => {
  173 |     await page.goto('/login.html');
  174 |     await page.evaluate(() => {
  175 |       const s = document.createElement('select');
  176 |       s.id = '__testSelect';
  177 |       const o = document.createElement('option');
  178 |       o.value = '1';
  179 |       o.text = 'Option 1';
  180 |       s.appendChild(o);
  181 |       document.body.appendChild(s);
  182 |     });
  183 |     const select = page.locator('#__testSelect');
  184 |     await expect(select).toBeVisible();
  185 |     await select.selectOption('1');
  186 |     const val = await select.evaluate((el) => el.value);
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
```