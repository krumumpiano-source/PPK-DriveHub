# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 8. ขอบเขตสิทธิ์ — Permission Boundaries (API) >> ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)
- Location: tests\e2e\driver.spec.mjs:546:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

# Test source

```ts
  450 |   test('driver ไม่สามารถดูรายการความเหนื่อยล้าของทั้งหมดได้ (drivers:view → 403)', async () => {
  451 |     const r = await fetch(`${BASE}/api/drivers/fatigue/list`, {
  452 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  453 |     });
  454 |     expect(r.status).toBe(403);
  455 |   });
  456 | });
  457 | 
  458 | // ══════════════════════════════════════════════════════════════
  459 | // 6. โปรไฟล์ส่วนตัว — Profile & Account
  460 | // ══════════════════════════════════════════════════════════════
  461 | test.describe('6. โปรไฟล์ส่วนตัว — Profile & Account', () => {
  462 |   test('ดูโปรไฟล์ตัวเองได้ (GET /api/auth/me)', async () => {
  463 |     const r = await apiGet('/api/auth/me', ctx.driverToken);
  464 |     expect(r?.success).toBe(true);
  465 |     expect(r?.data?.role).toBe('driver');
  466 |   });
  467 | 
  468 |   test('เปลี่ยนรหัสผ่านได้ (change-password flow)', async () => {
  469 |     clearRateLimits();
  470 |     // เปลี่ยนเป็นรหัสใหม่
  471 |     const r1 = await apiPost('/api/auth/change-password', {
  472 |       old_password: DRIVER_USER.password,
  473 |       new_password: TEST_DRIVER_PASS_NEW,
  474 |     }, ctx.driverToken);
  475 |     expect(r1?.success).toBe(true);
  476 | 
  477 |     // Login ด้วยรหัสใหม่
  478 |     clearRateLimits();
  479 |     const r2 = await apiPost('/api/auth/login', {
  480 |       username: DRIVER_USER.email,
  481 |       password: TEST_DRIVER_PASS_NEW,
  482 |     });
  483 |     expect(r2?.data?.token).toBeTruthy();
  484 | 
  485 |     // เปลี่ยนเป็นรหัสที่ 3 (ห้ามใช้รหัสเดิมเพราะอยู่ใน password_history)
  486 |     clearRateLimits();
  487 |     const r3 = await apiPost('/api/auth/change-password', {
  488 |       old_password: TEST_DRIVER_PASS_NEW,
  489 |       new_password: TEST_DRIVER_PASS_ALT,
  490 |     }, r2.data.token);
  491 |     expect(r3?.success).toBe(true);
  492 |     clearRateLimits();
  493 |   });
  494 | 
  495 |   test('เปลี่ยนรหัสผ่านด้วยรหัสเดิมผิด → error', async () => {
  496 |     clearRateLimits();
  497 |     const r = await apiPost('/api/auth/change-password', {
  498 |       old_password: 'WrongOld@999',
  499 |       new_password: 'NewPass@123',
  500 |     }, ctx.driverToken);
  501 |     expect(r?.success).toBe(false);
  502 |     clearRateLimits();
  503 |   });
  504 | });
  505 | 
  506 | // ══════════════════════════════════════════════════════════════
  507 | // 7. การแจ้งเตือน — Notifications
  508 | // ══════════════════════════════════════════════════════════════
  509 | test.describe('7. การแจ้งเตือน — Notifications', () => {
  510 |   test('ดูการแจ้งเตือนของตัวเองได้', async () => {
  511 |     const r = await apiGet('/api/notifications', ctx.driverToken);
  512 |     expect(r?.success).toBe(true);
  513 |     expect(Array.isArray(r?.data?.notifications)).toBe(true);
  514 |   });
  515 | 
  516 |   test('ดูจำนวนแจ้งเตือนที่ยังไม่อ่านได้', async () => {
  517 |     const r = await apiGet('/api/notifications?unread=true', ctx.driverToken);
  518 |     expect(r?.success).toBe(true);
  519 |   });
  520 | });
  521 | 
  522 | // ══════════════════════════════════════════════════════════════
  523 | // 8. ขอบเขตสิทธิ์ — Permission Boundaries
  524 | // ══════════════════════════════════════════════════════════════
  525 | test.describe('8. ขอบเขตสิทธิ์ — Permission Boundaries (API)', () => {
  526 |   test('ดูรายการรถได้ (vehicles:view → 200, driver เห็นได้)', async () => {
  527 |     const r = await fetch(`${BASE}/api/vehicles`, {
  528 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  529 |     });
  530 |     // API อนุญาต driver ดูรายการรถ
  531 |     expect(r.status).toBe(200);
  532 |   });
  533 | 
  534 |   test('ไม่สามารถสร้างรถได้ (vehicles:create → 403)', async () => {
  535 |     const r = await fetch(`${BASE}/api/vehicles`, {
  536 |       method: 'POST',
  537 |       headers: {
  538 |         'Authorization': `Bearer ${ctx.driverToken}`,
  539 |         'Content-Type': 'application/json',
  540 |       },
  541 |       body: JSON.stringify({ license_plate: 'ผิดกฎ-999', brand: 'Hack' }),
  542 |     });
  543 |     expect(r.status).toBe(403);
  544 |   });
  545 | 
  546 |   test('ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)', async () => {
  547 |     const r = await fetch(`${BASE}/api/drivers`, {
  548 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  549 |     });
> 550 |     expect(r.status).toBe(403);
      |                      ^ Error: expect(received).toBe(expected) // Object.is equality
  551 |   });
  552 | 
  553 |   test('ไม่สามารถดูรายการน้ำมันได้ (fuel:view → 403)', async () => {
  554 |     const r = await fetch(`${BASE}/api/fuel/log`, {
  555 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  556 |     });
  557 |     expect(r.status).toBe(403);
  558 |   });
  559 | 
  560 |   test('ไม่สามารถดูรายการผู้ใช้ระบบได้ (admin only → 403)', async () => {
  561 |     const r = await fetch(`${BASE}/api/admin/users`, {
  562 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  563 |     });
  564 |     expect(r.status).toBe(403);
  565 |   });
  566 | 
  567 |   test('ไม่สามารถอนุมัติคำขอสมาชิกได้ (admin only → 403)', async () => {
  568 |     const r = await fetch(`${BASE}/api/admin/requests`, {
  569 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  570 |     });
  571 |     expect(r.status).toBe(403);
  572 |   });
  573 | 
  574 |   test('ไม่สามารถดู audit log ได้ (admin only → 403)', async () => {
  575 |     const r = await fetch(`${BASE}/api/admin/audit-log`, {
  576 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  577 |     });
  578 |     expect(r.status).toBe(403);
  579 |   });
  580 | 
  581 |   test('ไม่สามารถดู report/summary ได้ถ้าไม่มีสิทธิ์ (reports:view → 403)', async () => {
  582 |     const r = await fetch(`${BASE}/api/reports/dashboard`, {
  583 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  584 |     });
  585 |     expect(r.status).toBe(403);
  586 |   });
  587 | 
  588 |   test('ไม่สามารถสร้างบันทึกน้ำมันได้ (fuel:create → 403)', async () => {
  589 |     const r = await fetch(`${BASE}/api/fuel/requests`, {
  590 |       method: 'POST',
  591 |       headers: {
  592 |         'Authorization': `Bearer ${ctx.driverToken}`,
  593 |         'Content-Type': 'application/json',
  594 |       },
  595 |       body: JSON.stringify({ car_id: ctx.carId || 'xxx', liters: 10 }),
  596 |     });
  597 |     expect(r.status).toBe(403);
  598 |   });
  599 | 
  600 |   test('เรียก API โดยไม่มี token → 401', async () => {
  601 |     const r = await fetch(`${BASE}/api/auth/me`);
  602 |     expect(r.status).toBe(401);
  603 |   });
  604 | });
  605 | 
  606 | // ══════════════════════════════════════════════════════════════
  607 | // 9. UI / Browser — การเข้าถึงหน้าต่างๆ
  608 | // ══════════════════════════════════════════════════════════════
  609 | test.describe('9. UI — หน้าที่พนักงานขับรถเข้าได้', () => {
  610 |   // inject auth ก่อนโหลดหน้า
  611 |   async function loginAsDriver(page) {
  612 |     await page.addInitScript(({ token, userId, driverId }) => {
  613 |       localStorage.setItem('ppk_token', token);
  614 |       localStorage.setItem('ppk_user', JSON.stringify({
  615 |         id: userId || 'driver-test-id',
  616 |         username: 'driver_test@ppk.ac.th',
  617 |         display_name: 'ทดสอบ พนักงานขับ',
  618 |         role: 'driver',
  619 |         driver_id: driverId || 'driver-rec-1',
  620 |         permissions: {},
  621 |       }));
  622 |     }, {
  623 |       token: ctx.driverToken,
  624 |       userId: ctx.driverUserId,
  625 |       driverId: ctx.driverRecordId,
  626 |     });
  627 |   }
  628 | 
  629 |   const allowedPages = [
  630 |     { path: '/dashboard.html',       name: 'Dashboard' },
  631 |     { path: '/vehicle-request.html', name: 'ขอใช้รถ' },
  632 |     { path: '/driver-history.html',  name: 'คิวและประวัติส่วนตัว' },
  633 |     { path: '/repair.html',          name: 'แจ้งซ่อม' },
  634 |     { path: '/incident.html',        name: 'รายงานเหตุการณ์' },
  635 |     { path: '/qr-scan.html',         name: 'สแกน QR Code' },
  636 |     { path: '/profile.html',         name: 'โปรไฟล์' },
  637 |     { path: '/notifications.html',   name: 'การแจ้งเตือน' },
  638 |     { path: '/change-password.html', name: 'เปลี่ยนรหัสผ่าน' },
  639 |     { path: '/user-guide.html',      name: 'คู่มือการใช้งาน' },
  640 |     { path: '/about.html',           name: 'เกี่ยวกับโปรแกรม' },
  641 |   ];
  642 | 
  643 |   for (const { path, name } of allowedPages) {
  644 |     test(`เข้า ${name} (${path}) ได้ — ไม่ redirect ไป login`, async ({ page }) => {
  645 |       await loginAsDriver(page);
  646 |       await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  647 |       await page.goto(path, { waitUntil: 'domcontentloaded' });
  648 |       await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  649 |     });
  650 |   }
```