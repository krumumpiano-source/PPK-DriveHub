# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\app.spec.mjs >> หน้า Incident >> แสดงรายการอุบัติเหตุ
- Location: tests\e2e\app.spec.mjs:515:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:8788/incident.html", waiting until "load"

```

# Test source

```ts
  416 |   });
  417 | });
  418 | 
  419 | // ════════════════════════════════════════════
  420 | // 16. หน้า Audit Log
  421 | // ════════════════════════════════════════════
  422 | test.describe('หน้า Audit Log', () => {
  423 |   test.beforeEach(async ({ page }) => {
  424 |     await loginAsAdmin(page);
  425 |   });
  426 | 
  427 |   test('โหลดหน้า Audit Log สำเร็จ', async ({ page }) => {
  428 |     await page.goto('/audit-log.html');
  429 |     await page.waitForLoadState('networkidle');
  430 |     await expect(page).toHaveTitle(/Audit|ประวัติ|บันทึก|PPK DriveHub/);
  431 |   });
  432 | });
  433 | 
  434 | // ════════════════════════════════════════════
  435 | // 17. หน้า Backup Recovery
  436 | // ════════════════════════════════════════════
  437 | test.describe('หน้า Backup Recovery', () => {
  438 |   test.beforeEach(async ({ page }) => {
  439 |     await loginAsAdmin(page);
  440 |   });
  441 | 
  442 |   test('โหลดหน้า Backup สำเร็จ', async ({ page }) => {
  443 |     await page.goto('/backup-recovery.html');
  444 |     await page.waitForLoadState('networkidle');
  445 |     await expect(page).toHaveTitle(/Backup|สำรอง|PPK DriveHub/);
  446 |   });
  447 | });
  448 | 
  449 | // ════════════════════════════════════════════
  450 | // 18. หน้า Profile (โปรไฟล์)
  451 | // ════════════════════════════════════════════
  452 | test.describe('หน้า Profile', () => {
  453 |   test.beforeEach(async ({ page }) => {
  454 |     await loginAsAdmin(page);
  455 |   });
  456 | 
  457 |   test('โหลดหน้าโปรไฟล์สำเร็จ', async ({ page }) => {
  458 |     await page.goto('/profile.html');
  459 |     await page.waitForLoadState('networkidle');
  460 |     await expect(page).toHaveTitle(/โปรไฟล์|Profile|PPK DriveHub/);
  461 |   });
  462 | });
  463 | 
  464 | // ════════════════════════════════════════════
  465 | // 18b. หน้า Change Password
  466 | // ════════════════════════════════════════════
  467 | test.describe('หน้า Change Password', () => {
  468 |   test.beforeEach(async ({ page }) => {
  469 |     await loginAsAdmin(page);
  470 |   });
  471 | 
  472 |   test('โหลดหน้าเปลี่ยนรหัสผ่านสำเร็จ', async ({ page }) => {
  473 |     await page.goto('/change-password.html');
  474 |     await page.waitForLoadState('networkidle');
  475 |     await expect(page).toHaveTitle(/รหัสผ่าน|Password|PPK DriveHub/);
  476 |   });
  477 | 
  478 |   test('แสดงฟอร์มเปลี่ยนรหัสผ่าน', async ({ page }) => {
  479 |     await page.goto('/change-password.html');
  480 |     await page.waitForLoadState('networkidle');
  481 |     const form = page.locator('#changePassForm, form, .change-password-form');
  482 |     await expect(form.first()).toBeVisible({ timeout: 10000 });
  483 |   });
  484 | });
  485 | 
  486 | // ════════════════════════════════════════════
  487 | // 18c. หน้า Executive Dashboard
  488 | // ════════════════════════════════════════════
  489 | test.describe('หน้า Executive Dashboard', () => {
  490 |   test.beforeEach(async ({ page }) => {
  491 |     await loginAsAdmin(page);
  492 |   });
  493 | 
  494 |   test('โหลดหน้า Executive Dashboard สำเร็จ', async ({ page }) => {
  495 |     await page.goto('/executive-dashboard.html');
  496 |     await page.waitForLoadState('networkidle');
  497 |     await expect(page).toHaveTitle(/Executive|Dashboard|PPK DriveHub/);
  498 |   });
  499 | });
  500 | 
  501 | // ════════════════════════════════════════════
  502 | // 18d. หน้า Incident (อุบัติเหตุ)
  503 | // ════════════════════════════════════════════
  504 | test.describe('หน้า Incident', () => {
  505 |   test.beforeEach(async ({ page }) => {
  506 |     await loginAsAdmin(page);
  507 |   });
  508 | 
  509 |   test('โหลดหน้าอุบัติเหตุสำเร็จ', async ({ page }) => {
  510 |     await page.goto('/incident.html');
  511 |     await page.waitForLoadState('networkidle');
  512 |     await expect(page).toHaveTitle(/อุบัติ|Incident|PPK DriveHub/);
  513 |   });
  514 | 
  515 |   test('แสดงรายการอุบัติเหตุ', async ({ page }) => {
> 516 |     await page.goto('/incident.html');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  517 |     await page.waitForLoadState('networkidle');
  518 |     const content = page.locator('#incidentList, table, .incident-item, #pageContent');
  519 |     await expect(content.first()).toBeVisible({ timeout: 10000 });
  520 |   });
  521 | });
  522 | 
  523 | // ════════════════════════════════════════════
  524 | // 18e. หน้า Vehicle Request (ขอใช้รถ)
  525 | // ════════════════════════════════════════════
  526 | test.describe('หน้า Vehicle Request', () => {
  527 |   test.beforeEach(async ({ page }) => {
  528 |     await loginAsAdmin(page);
  529 |   });
  530 | 
  531 |   test('โหลดหน้าขอใช้รถสำเร็จ', async ({ page }) => {
  532 |     await page.goto('/vehicle-request.html');
  533 |     await page.waitForLoadState('networkidle');
  534 |     await expect(page).toHaveTitle(/ขอใช้รถ|Vehicle Request|PPK DriveHub/);
  535 |   });
  536 | });
  537 | 
  538 | // ════════════════════════════════════════════
  539 | // 18f. หน้า Vehicle Timeline
  540 | // ════════════════════════════════════════════
  541 | test.describe('หน้า Vehicle Timeline', () => {
  542 |   test.beforeEach(async ({ page }) => {
  543 |     await loginAsAdmin(page);
  544 |   });
  545 | 
  546 |   test('โหลดหน้า Vehicle Timeline สำเร็จ', async ({ page }) => {
  547 |     await page.goto('/vehicle-timeline.html');
  548 |     await page.waitForLoadState('networkidle');
  549 |     await expect(page).toHaveTitle(/Timeline|ไทม์ไลน์|PPK DriveHub/);
  550 |   });
  551 | });
  552 | 
  553 | // ════════════════════════════════════════════
  554 | // 18g. หน้า Driver Performance & History
  555 | // ════════════════════════════════════════════
  556 | test.describe('หน้า Driver Performance & History', () => {
  557 |   test.beforeEach(async ({ page }) => {
  558 |     await loginAsAdmin(page);
  559 |   });
  560 | 
  561 |   test('โหลดหน้า Driver Performance สำเร็จ', async ({ page }) => {
  562 |     await page.goto('/driver-performance.html');
  563 |     await page.waitForLoadState('networkidle');
  564 |     await expect(page).toHaveTitle(/Performance|ประสิทธิภาพ|PPK DriveHub/);
  565 |   });
  566 | 
  567 |   test('โหลดหน้า Driver History สำเร็จ', async ({ page }) => {
  568 |     await page.goto('/driver-history.html');
  569 |     await page.waitForLoadState('networkidle');
  570 |     await expect(page).toHaveTitle(/History|ประวัติ|PPK DriveHub/);
  571 |   });
  572 | });
  573 | 
  574 | // ════════════════════════════════════════════
  575 | // 18h. หน้า Fuel Reconcile & QR Manage
  576 | // ════════════════════════════════════════════
  577 | test.describe('หน้า Fuel Reconcile & QR Manage', () => {
  578 |   test.beforeEach(async ({ page }) => {
  579 |     await loginAsAdmin(page);
  580 |   });
  581 | 
  582 |   test('โหลดหน้า Fuel Reconcile สำเร็จ', async ({ page }) => {
  583 |     await page.goto('/fuel-reconcile.html');
  584 |     await page.waitForLoadState('networkidle');
  585 |     await expect(page).toHaveTitle(/Reconcile|กระทบยอด|PPK DriveHub/);
  586 |   });
  587 | 
  588 |   test('โหลดหน้า QR Manage สำเร็จ', async ({ page }) => {
  589 |     await page.goto('/qr-manage.html');
  590 |     await page.waitForLoadState('networkidle');
  591 |     await expect(page).toHaveTitle(/QR|PP/);
  592 |   });
  593 | });
  594 | 
  595 | // ════════════════════════════════════════════
  596 | // 18i. หน้า Basic Info / Setup
  597 | // ════════════════════════════════════════════
  598 | test.describe('หน้า Basic Info', () => {
  599 |   test.beforeEach(async ({ page }) => {
  600 |     await loginAsAdmin(page);
  601 |   });
  602 | 
  603 |   test('โหลดหน้า Basic Info สำเร็จ', async ({ page }) => {
  604 |     await page.goto('/basic-info.html');
  605 |     await page.waitForLoadState('networkidle');
  606 |     // Could be part of setup wizard or standalone
  607 |     await expect(page).toHaveTitle(/PPK DriveHub/);
  608 |   });
  609 | });
  610 | 
  611 | // ════════════════════════════════════════════
  612 | // 25. UI CRUD Workflow — สร้างรถผ่านหน้าเว็บ
  613 | // ════════════════════════════════════════════
  614 | test.describe('UI CRUD — สร้างรถ (Vehicles)', () => {
  615 |   test.beforeEach(async ({ page }) => {
  616 |     await loginAsAdmin(page);
```