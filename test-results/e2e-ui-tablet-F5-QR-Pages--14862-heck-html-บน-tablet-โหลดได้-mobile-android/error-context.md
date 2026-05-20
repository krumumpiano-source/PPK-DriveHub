# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-tablet.spec.mjs >> F5: QR Pages บน Tablet >> qr-daily-check.html บน tablet: โหลดได้
- Location: tests\e2e\ui-tablet.spec.mjs:238:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:8788/qr-daily-check.html", waiting until "load"

```

# Test source

```ts
  139 | // F3: Android Tablet 768px (tablet portrait)
  140 | // ════════════════════════════════════════════
  141 | test.describe('F3: Android Tablet Portrait (768×1024)', () => {
  142 |   test.beforeEach(async ({ page }) => {
  143 |     await page.setViewportSize({ width: 768, height: 1024 });
  144 |   });
  145 | 
  146 |   test('dashboard โหลดได้', async ({ page }) => {
  147 |     await loginAsAdmin(page);
  148 |     await page.goto('/dashboard.html');
  149 |     await page.waitForLoadState('networkidle');
  150 |     const overflow = await hasHorizontalScroll(page);
  151 |     expect(overflow).toBe(false);
  152 |   });
  153 | 
  154 |   test('768px: hamburger โผล่ (ใต้ 900px breakpoint)', async ({ page }) => {
  155 |     await loginAsAdmin(page);
  156 |     await page.goto('/dashboard.html');
  157 |     await page.waitForLoadState('networkidle');
  158 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  159 |     if (await hamburger.count() > 0) {
  160 |       await expect(hamburger).toBeVisible();
  161 |     }
  162 |   });
  163 | 
  164 |   test('reports.html ไม่มี overflow', async ({ page }) => {
  165 |     await loginAsAdmin(page);
  166 |     await page.goto('/reports.html');
  167 |     await page.waitForLoadState('networkidle');
  168 |     await page.waitForTimeout(400);
  169 |     const overflow = await hasHorizontalScroll(page);
  170 |     expect(overflow).toBe(false);
  171 |   });
  172 | 
  173 |   test('repair.html ไม่มี overflow', async ({ page }) => {
  174 |     await loginAsAdmin(page);
  175 |     await page.goto('/repair.html');
  176 |     await page.waitForLoadState('networkidle');
  177 |     await page.waitForTimeout(400);
  178 |     const overflow = await hasHorizontalScroll(page);
  179 |     expect(overflow).toBe(false);
  180 |   });
  181 | });
  182 | 
  183 | // ════════════════════════════════════════════
  184 | // F4: Tablet Sidebar Toggle
  185 | // ════════════════════════════════════════════
  186 | test.describe('F4: Tablet Sidebar Toggle', () => {
  187 |   test('tablet 820px: hamburger click → sidebar open', async ({ page }) => {
  188 |     await page.setViewportSize({ width: 820, height: 1180 });
  189 |     await loginAsAdmin(page);
  190 |     await page.goto('/dashboard.html');
  191 |     await page.waitForLoadState('networkidle');
  192 |     const hamburger = page.locator('#topbar-hamburger, .topbar-hamburger, [data-sidebar-toggle]').first();
  193 |     if (await hamburger.count() > 0) {
  194 |       await hamburger.click();
  195 |       await page.waitForTimeout(400);
  196 |       const sidebar = page.locator('.sidebar');
  197 |       await expect(sidebar).toHaveClass(/open/);
  198 |       // ปิดด้วย overlay
  199 |       const overlay = page.locator('.sidebar-overlay');
  200 |       if (await overlay.count() > 0) {
  201 |         // ใช้ JS click เพื่อหลีกเลี่ยง sidebar-brand intercepting pointer events
  202 |         await page.evaluate(() => {
  203 |           const el = document.querySelector('.sidebar-overlay');
  204 |           if (el) el.click();
  205 |         });
  206 |         await page.waitForTimeout(400);
  207 |         const classes = await sidebar.getAttribute('class');
  208 |         expect(classes).not.toContain('open');
  209 |       }
  210 |     }
  211 |   });
  212 | 
  213 |   test('tablet landscape 1180px: sidebar visible ตลอด', async ({ page }) => {
  214 |     await page.setViewportSize({ width: 1180, height: 820 });
  215 |     await loginAsAdmin(page);
  216 |     await page.goto('/dashboard.html');
  217 |     await page.waitForLoadState('networkidle');
  218 |     const sidebar = page.locator('.sidebar');
  219 |     await expect(sidebar).toBeVisible();
  220 |   });
  221 | });
  222 | 
  223 | // ════════════════════════════════════════════
  224 | // F5: QR Pages บน Tablet
  225 | // ════════════════════════════════════════════
  226 | test.describe('F5: QR Pages บน Tablet', () => {
  227 |   test.beforeEach(async ({ page }) => {
  228 |     await page.setViewportSize({ width: 820, height: 1180 });
  229 |   });
  230 | 
  231 |   test('qr-scan.html บน tablet: ไม่ overflow', async ({ page }) => {
  232 |     await page.goto('/qr-scan.html');
  233 |     await page.waitForLoadState('networkidle');
  234 |     const overflow = await hasHorizontalScroll(page);
  235 |     expect(overflow).toBe(false);
  236 |   });
  237 | 
  238 |   test('qr-daily-check.html บน tablet: โหลดได้', async ({ page }) => {
> 239 |     await page.goto('/qr-daily-check.html');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  240 |     await page.waitForLoadState('networkidle');
  241 |     const body = await page.evaluate(() => document.body.innerHTML.trim().length);
  242 |     expect(body).toBeGreaterThan(100);
  243 |   });
  244 | 
  245 |   test('qr-manage.html (auth) บน tablet: โหลดได้', async ({ page }) => {
  246 |     await loginAsAdmin(page);
  247 |     await page.goto('/qr-manage.html');
  248 |     await page.waitForLoadState('networkidle');
  249 |     const overflow = await hasHorizontalScroll(page);
  250 |     expect(overflow).toBe(false);
  251 |   });
  252 | });
  253 | 
```