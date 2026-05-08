# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-pwa.spec.mjs >> D3: App Shell & Meta Tags >> login: <meta name="viewport"> มีใน head
- Location: tests\e2e\ui-pwa.spec.mjs:157:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
Call log:
  - navigating to "http://localhost:8788/login.html", waiting until "load"

```

# Test source

```ts
  58  |   test('manifest มี display: standalone', async ({ page }) => {
  59  |     const r = await page.request.get('/manifest.json');
  60  |     const body = await r.json().catch(() => ({}));
  61  |     expect(body.display).toBe('standalone');
  62  |   });
  63  | 
  64  |   test('manifest มี icons array ไม่ว่าง', async ({ page }) => {
  65  |     const r = await page.request.get('/manifest.json');
  66  |     const body = await r.json().catch(() => ({}));
  67  |     expect(Array.isArray(body.icons)).toBe(true);
  68  |     expect(body.icons.length).toBeGreaterThan(0);
  69  |   });
  70  | 
  71  |   test('manifest มี start_url', async ({ page }) => {
  72  |     const r = await page.request.get('/manifest.json');
  73  |     const body = await r.json().catch(() => ({}));
  74  |     expect(typeof body.start_url).toBe('string');
  75  |     expect(body.start_url.length).toBeGreaterThan(0);
  76  |   });
  77  | 
  78  |   test('dashboard.html มี <link rel="manifest">', async ({ page }) => {
  79  |     await loginAsAdmin(page);
  80  |     await page.goto('/dashboard.html');
  81  |     await page.waitForLoadState('networkidle');
  82  |     const manifestLink = await page.evaluate(() => {
  83  |       const el = document.querySelector('link[rel="manifest"]');
  84  |       return el ? el.getAttribute('href') : null;
  85  |     });
  86  |     expect(manifestLink).not.toBeNull();
  87  |   });
  88  | 
  89  |   test('dashboard.html มี <meta name="theme-color">', async ({ page }) => {
  90  |     await loginAsAdmin(page);
  91  |     await page.goto('/dashboard.html');
  92  |     await page.waitForLoadState('networkidle');
  93  |     const themeColor = await page.evaluate(() => {
  94  |       const el = document.querySelector('meta[name="theme-color"]');
  95  |       return el ? el.getAttribute('content') : null;
  96  |     });
  97  |     // theme-color ต้องมี (อาจ inject โดย common.js)
  98  |     expect(themeColor).not.toBeNull();
  99  |   });
  100 | });
  101 | 
  102 | // ════════════════════════════════════════════
  103 | // D2: Service Worker
  104 | // ════════════════════════════════════════════
  105 | test.describe('D2: Service Worker', () => {
  106 |   test('GET /sw.js → 200', async ({ page }) => {
  107 |     const r = await page.request.get('/sw.js');
  108 |     expect(r.status()).toBe(200);
  109 |   });
  110 | 
  111 |   test('sw.js มีเนื้อหา (ไม่ว่าง)', async ({ page }) => {
  112 |     const r = await page.request.get('/sw.js');
  113 |     const text = await r.text();
  114 |     expect(text.trim().length).toBeGreaterThan(10);
  115 |   });
  116 | 
  117 |   test('dashboard: serviceWorker API มีใน browser', async ({ page }) => {
  118 |     await loginAsAdmin(page);
  119 |     await page.goto('/dashboard.html');
  120 |     await page.waitForLoadState('networkidle');
  121 |     const hasServiceWorker = await page.evaluate(() => 'serviceWorker' in navigator);
  122 |     expect(hasServiceWorker).toBe(true);
  123 |   });
  124 | 
  125 |   test('service worker register ได้ (ไม่ throw error)', async ({ page }) => {
  126 |     await loginAsAdmin(page);
  127 |     // Track SW registration errors
  128 |     const swErrors = [];
  129 |     page.on('pageerror', err => {
  130 |       if (err.message.toLowerCase().includes('serviceworker')) {
  131 |         swErrors.push(err.message);
  132 |       }
  133 |     });
  134 |     await page.goto('/dashboard.html');
  135 |     await page.waitForLoadState('networkidle');
  136 |     await page.waitForTimeout(1000); // รอ SW register
  137 |     expect(swErrors.length).toBe(0);
  138 |   });
  139 | });
  140 | 
  141 | // ════════════════════════════════════════════
  142 | // D3: App Shell & Meta Tags
  143 | // ════════════════════════════════════════════
  144 | test.describe('D3: App Shell & Meta Tags', () => {
  145 |   test('dashboard: <meta name="viewport"> มีใน head', async ({ page }) => {
  146 |     await loginAsAdmin(page);
  147 |     await page.goto('/dashboard.html');
  148 |     await page.waitForLoadState('networkidle');
  149 |     const viewport = await page.evaluate(() => {
  150 |       const el = document.querySelector('meta[name="viewport"]');
  151 |       return el ? el.getAttribute('content') : null;
  152 |     });
  153 |     expect(viewport).not.toBeNull();
  154 |     expect(viewport).toContain('width=device-width');
  155 |   });
  156 | 
  157 |   test('login: <meta name="viewport"> มีใน head', async ({ page }) => {
> 158 |     await page.goto('/login.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8788/login.html
  159 |     await page.waitForLoadState('networkidle');
  160 |     const viewport = await page.evaluate(() => {
  161 |       const el = document.querySelector('meta[name="viewport"]');
  162 |       return el ? el.getAttribute('content') : null;
  163 |     });
  164 |     expect(viewport).not.toBeNull();
  165 |     expect(viewport).toContain('width=device-width');
  166 |   });
  167 | 
  168 |   test('qr-scan: viewport มี viewport-fit=cover', async ({ page }) => {
  169 |     await page.goto('/qr-scan.html');
  170 |     await page.waitForLoadState('networkidle');
  171 |     const viewport = await page.evaluate(() => {
  172 |       const el = document.querySelector('meta[name="viewport"]');
  173 |       return el ? el.getAttribute('content') : null;
  174 |     });
  175 |     if (viewport) {
  176 |       expect(viewport).toContain('width=device-width');
  177 |     }
  178 |   });
  179 | 
  180 |   test('ทุกหน้ามี <meta charset="utf-8">', async ({ page }) => {
  181 |     for (const path of ['/login.html', '/dashboard.html', '/vehicles.html']) {
  182 |       if (path === '/dashboard.html') await loginAsAdmin(page);
  183 |       await page.goto(path);
  184 |       await page.waitForLoadState('networkidle');
  185 |       const charset = await page.evaluate(() => document.characterSet);
  186 |       expect(charset.toLowerCase()).toBe('utf-8');
  187 |     }
  188 |   });
  189 | });
  190 | 
```