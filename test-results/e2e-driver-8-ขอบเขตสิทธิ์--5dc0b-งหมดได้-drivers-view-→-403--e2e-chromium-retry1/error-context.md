# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 8. ขอบเขตสิทธิ์ — Permission Boundaries (API) >> ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)
- Location: tests\e2e\driver.spec.mjs:537:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

# Test source

```ts
  441 |   test('driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)', async () => {
  442 |     const r = await fetch(`${BASE}/api/drivers/fatigue/list`, {
  443 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  444 |     });
  445 |     expect(r.status).toBe(403);
  446 |   });
  447 | });
  448 | 
  449 | // ══════════════════════════════════════════════════════════════
  450 | // 6. โปรไฟล์ส่วนตัว — Profile & Account
  451 | // ══════════════════════════════════════════════════════════════
  452 | test.describe('6. โปรไฟล์ส่วนตัว — Profile & Account', () => {
  453 |   test('ดูโปรไฟล์ตัวเองได้ (GET /api/auth/me)', async () => {
  454 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  455 |     expect(r?.success).toBe(true);
  456 |     expect(r?.data?.role).toBe('driver');
  457 |   });
  458 | 
  459 |   test('เปลี่ยนรหัสผ่านได้ (change-password flow)', async () => {
  460 |     clearRateLimits();
  461 |     // เปลี่ยนเป็นรหัสใหม่
  462 |     const r1 = await apiPost('/api/auth/change-password', {
  463 |       old_password: DRIVER_USER.password,
  464 |       new_password: TEST_DRIVER_PASS_NEW,
  465 |     }, ctx.driverToken);
  466 |     expect(r1?.success).toBe(true);
  467 | 
  468 |     // Login ด้วยรหัสใหม่
  469 |     clearRateLimits();
  470 |     const r2 = await apiPost('/api/auth/login', {
  471 |       username: DRIVER_USER.email,
  472 |       password: TEST_DRIVER_PASS_NEW,
  473 |     });
  474 |     expect(r2?.data?.token).toBeTruthy();
  475 | 
  476 |     // เปลี่ยนเป็นรหัสที่ 3 (ห้ามใช้รหัสเดิมเพราะอยู่ใน password_history)
  477 |     clearRateLimits();
  478 |     const r3 = await apiPost('/api/auth/change-password', {
  479 |       old_password: TEST_DRIVER_PASS_NEW,
  480 |       new_password: TEST_DRIVER_PASS_ALT,
  481 |     }, r2.data.token);
  482 |     expect(r3?.success).toBe(true);
  483 |     clearRateLimits();
  484 |   });
  485 | 
  486 |   test('เปลี่ยนรหัสผ่านด้วยรหัสเดิมผิด → error', async () => {
  487 |     clearRateLimits();
  488 |     const r = await apiPost('/api/auth/change-password', {
  489 |       old_password: 'WrongOld@999',
  490 |       new_password: 'NewPass@123',
  491 |     }, ctx.driverToken);
  492 |     expect(r?.success).toBe(false);
  493 |     clearRateLimits();
  494 |   });
  495 | });
  496 | 
  497 | // ══════════════════════════════════════════════════════════════
  498 | // 7. การแจ้งเตือน — Notifications
  499 | // ══════════════════════════════════════════════════════════════
  500 | test.describe('7. การแจ้งเตือน — Notifications', () => {
  501 |   test('ดูการแจ้งเตือนของตัวเองได้', async () => {
  502 |     const r = await apiGet('/api/notifications', ctx.driverToken);
  503 |     expect(r?.success).toBe(true);
  504 |     expect(Array.isArray(r?.data?.notifications)).toBe(true);
  505 |   });
  506 | 
  507 |   test('ดูจำนวนแจ้งเตือนที่ยังไม่อ่านได้', async () => {
  508 |     const r = await apiGet('/api/notifications?unread=true', ctx.driverToken);
  509 |     expect(r?.success).toBe(true);
  510 |   });
  511 | });
  512 | 
  513 | // ══════════════════════════════════════════════════════════════
  514 | // 8. ขอบเขตสิทธิ์ — Permission Boundaries
  515 | // ══════════════════════════════════════════════════════════════
  516 | test.describe('8. ขอบเขตสิทธิ์ — Permission Boundaries (API)', () => {
  517 |   test('ดูรายการรถได้ (vehicles:view → 200, driver เห็นได้)', async () => {
  518 |     const r = await fetch(`${BASE}/api/vehicles`, {
  519 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  520 |     });
  521 |     // API อนุญาต driver ดูรายการรถ
  522 |     expect(r.status).toBe(200);
  523 |   });
  524 | 
  525 |   test('ไม่สามารถสร้างรถได้ (vehicles:create → 403)', async () => {
  526 |     const r = await fetch(`${BASE}/api/vehicles`, {
  527 |       method: 'POST',
  528 |       headers: {
  529 |         'Authorization': `Bearer ${ctx.driverToken}`,
  530 |         'Content-Type': 'application/json',
  531 |       },
  532 |       body: JSON.stringify({ license_plate: 'ผิดกฎ-999', brand: 'Hack' }),
  533 |     });
  534 |     expect(r.status).toBe(403);
  535 |   });
  536 | 
  537 |   test('ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)', async () => {
  538 |     const r = await fetch(`${BASE}/api/drivers`, {
  539 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  540 |     });
> 541 |     expect(r.status).toBe(403);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  542 |   });
  543 | 
  544 |   test('ไม่สามารถดูรายการน้ำมันได้ (fuel:view → 403)', async () => {
  545 |     const r = await fetch(`${BASE}/api/fuel/log`, {
  546 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  547 |     });
  548 |     expect(r.status).toBe(403);
  549 |   });
  550 | 
  551 |   test('ไม่สามารถดูรายการผู้ใช้ระบบได้ (admin only → 403)', async () => {
  552 |     const r = await fetch(`${BASE}/api/admin/users`, {
  553 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  554 |     });
  555 |     expect(r.status).toBe(403);
  556 |   });
  557 | 
  558 |   test('ไม่สามารถอนุมัติคำขอสมาชิกได้ (admin only → 403)', async () => {
  559 |     const r = await fetch(`${BASE}/api/admin/requests`, {
  560 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  561 |     });
  562 |     expect(r.status).toBe(403);
  563 |   });
  564 | 
  565 |   test('ไม่สามารถดู audit log ได้ (admin only → 403)', async () => {
  566 |     const r = await fetch(`${BASE}/api/admin/audit-log`, {
  567 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  568 |     });
  569 |     expect(r.status).toBe(403);
  570 |   });
  571 | 
  572 |   test('ไม่สามารถดู report/summary ได้ถ้าไม่มีสิทธิ์ (reports:view → 403)', async () => {
  573 |     const r = await fetch(`${BASE}/api/reports/dashboard`, {
  574 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  575 |     });
  576 |     expect(r.status).toBe(403);
  577 |   });
  578 | 
  579 |   test('ไม่สามารถสร้างบันทึกน้ำมันได้ (fuel:create → 403)', async () => {
  580 |     const r = await fetch(`${BASE}/api/fuel/requests`, {
  581 |       method: 'POST',
  582 |       headers: {
  583 |         'Authorization': `Bearer ${ctx.driverToken}`,
  584 |         'Content-Type': 'application/json',
  585 |       },
  586 |       body: JSON.stringify({ car_id: ctx.carId || 'xxx', liters: 10 }),
  587 |     });
  588 |     expect(r.status).toBe(403);
  589 |   });
  590 | 
  591 |   test('เรียก API โดยไม่มี token → 401', async () => {
  592 |     const r = await fetch(`${BASE}/api/auth/me`);
  593 |     expect(r.status).toBe(401);
  594 |   });
  595 | });
  596 | 
  597 | // ══════════════════════════════════════════════════════════════
  598 | // 9. UI / Browser — การเข้าถึงหน้าต่างๆ
  599 | // ══════════════════════════════════════════════════════════════
  600 | test.describe('9. UI — หน้าที่พนักงานขับรถเข้าได้', () => {
  601 |   // inject auth ก่อนโหลดหน้า
  602 |   async function loginAsDriver(page) {
  603 |     await page.addInitScript(({ token, userId, driverId }) => {
  604 |       localStorage.setItem('ppk_token', token);
  605 |       localStorage.setItem('ppk_user', JSON.stringify({
  606 |         id: userId || 'driver-test-id',
  607 |         username: 'driver_test@ppk.ac.th',
  608 |         display_name: 'ทดสอบ พนักงานขับ',
  609 |         role: 'driver',
  610 |         driver_id: driverId || 'driver-rec-1',
  611 |         permissions: {},
  612 |       }));
  613 |     }, {
  614 |       token: ctx.driverToken,
  615 |       userId: ctx.driverUserId,
  616 |       driverId: ctx.driverRecordId,
  617 |     });
  618 |   }
  619 | 
  620 |   const allowedPages = [
  621 |     { path: '/dashboard.html',       name: 'Dashboard' },
  622 |     { path: '/vehicle-request.html', name: 'ขอใช้รถ' },
  623 |     { path: '/driver-history.html',  name: 'คิวและประวัติส่วนตัว' },
  624 |     { path: '/repair.html',          name: 'แจ้งซ่อม' },
  625 |     { path: '/incident.html',        name: 'รายงานเหตุการณ์' },
  626 |     { path: '/qr-scan.html',         name: 'สแกน QR Code' },
  627 |     { path: '/profile.html',         name: 'โปรไฟล์' },
  628 |     { path: '/notifications.html',   name: 'การแจ้งเตือน' },
  629 |     { path: '/change-password.html', name: 'เปลี่ยนรหัสผ่าน' },
  630 |     { path: '/user-guide.html',      name: 'คู่มือการใช้งาน' },
  631 |     { path: '/about.html',           name: 'เกี่ยวกับโปรแกรม' },
  632 |   ];
  633 | 
  634 |   for (const { path, name } of allowedPages) {
  635 |     test(`เข้า ${name} (${path}) ได้ — ไม่ redirect ไป login`, async ({ page }) => {
  636 |       await loginAsDriver(page);
  637 |       await page.goto(path);
  638 |       await page.waitForLoadState('networkidle');
  639 |       await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  640 |     });
  641 |   }
```