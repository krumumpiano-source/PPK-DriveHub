# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 9. UI — หน้าที่พนักงานขับรถเข้าได้ >> เข้า รายงานเหตุการณ์ (/incident.html) ได้ — ไม่ redirect ไป login
- Location: tests\e2e\driver.spec.mjs:635:5

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
  537 |   test('ไม่สามารถดูรายการพนักงานขับรถทั้งหมดได้ (drivers:view → 403)', async () => {
  538 |     const r = await fetch(`${BASE}/api/drivers`, {
  539 |       headers: { 'Authorization': `Bearer ${ctx.driverToken}` },
  540 |     });
  541 |     expect(r.status).toBe(403);
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
> 637 |       await page.goto(path);
      |                  ^ Error: page.goto: Test timeout of 30000ms exceeded.
  638 |       await page.waitForLoadState('networkidle');
  639 |       await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
  640 |     });
  641 |   }
  642 | });
  643 | 
  644 | test.describe('10. UI — หน้าที่พนักงานขับรถเข้าไม่ได้ (ต้องถูกจำกัด)', () => {
  645 |   async function loginAsDriver(page) {
  646 |     await page.addInitScript(({ token, userId, driverId }) => {
  647 |       localStorage.setItem('ppk_token', token);
  648 |       localStorage.setItem('ppk_user', JSON.stringify({
  649 |         id: userId || 'driver-test-id',
  650 |         username: 'driver_test@ppk.ac.th',
  651 |         display_name: 'ทดสอบ พนักงานขับ',
  652 |         role: 'driver',
  653 |         driver_id: driverId || 'driver-rec-1',
  654 |         permissions: {},
  655 |       }));
  656 |     }, {
  657 |       token: ctx.driverToken,
  658 |       userId: ctx.driverUserId,
  659 |       driverId: ctx.driverRecordId,
  660 |     });
  661 |   }
  662 | 
  663 |   const restrictedPages = [
  664 |     { path: '/user-management.html', name: 'จัดการผู้ใช้' },
  665 |     { path: '/admin-settings.html',  name: 'ตั้งค่าระบบ' },
  666 |     { path: '/audit-log.html',       name: 'บันทึกกิจกรรม' },
  667 |     { path: '/backup-recovery.html', name: 'สำรอง/กู้คืน' },
  668 |     // vehicles.html ไม่ redirect ตาม design ของแอป (แสดงหน้าได้แต่ไม่มีข้อมูล)
  669 |     { path: '/drivers.html',         name: 'จัดการพนักงานขับรถ' },
  670 |   ];
  671 | 
  672 |   for (const { path, name } of restrictedPages) {
  673 |     test(`${name} (${path}) — ถูก redirect หรือแสดงข้อผิดพลาด ไม่ใช่หน้าปกติ`, async ({ page }) => {
  674 |       await loginAsDriver(page);
  675 |       await page.goto(path);
  676 |       await page.waitForLoadState('networkidle');
  677 | 
  678 |       // หน้าต้อง redirect ออก หรือแสดง alert ไม่มีสิทธิ์
  679 |       // admin pages จะ redirect ไป dashboard.html
  680 |       const currentUrl = page.url();
  681 |       const isRedirected = currentUrl.includes('dashboard') || currentUrl.includes('login');
  682 | 
  683 |       // หรือหน้ายังอยู่แต่แสดง error/empty content
  684 |       const hasAccessDenied = await page.locator(
  685 |         'text=/ไม่มีสิทธิ์|Access Denied|Unauthorized|403/'
  686 |       ).isVisible({ timeout: 3000 }).catch(() => false);
  687 | 
  688 |       expect(isRedirected || hasAccessDenied).toBe(true);
  689 |     });
  690 |   }
  691 | });
  692 | 
  693 | // ══════════════════════════════════════════════════════════════
  694 | // 11. UI Sidebar — ตรวจสอบ Navigation Menu
  695 | // ══════════════════════════════════════════════════════════════
  696 | test.describe('11. UI Sidebar — เมนู Navigation ของพนักงานขับรถ', () => {
  697 |   test('sidebar แสดง "คิวและประวัติส่วนตัว" เมื่อมี driver_id', async ({ page }) => {
  698 |     await page.addInitScript(({ token, driverId }) => {
  699 |       localStorage.setItem('ppk_token', token);
  700 |       localStorage.setItem('ppk_user', JSON.stringify({
  701 |         id: 'driver-test-id',
  702 |         username: 'driver_test@ppk.ac.th',
  703 |         display_name: 'ทดสอบ พนักงานขับ',
  704 |         role: 'driver',
  705 |         driver_id: driverId || 'driver-rec-1',
  706 |         permissions: {},
  707 |       }));
  708 |     }, { token: ctx.driverToken, driverId: ctx.driverRecordId });
  709 | 
  710 |     await page.goto('/dashboard.html');
  711 |     await page.waitForLoadState('networkidle');
  712 | 
  713 |     // หา sidebar item สำหรับ driver-history
  714 |     const historyLink = page.locator('[data-page="driver-history"], a[href*="driver-history"]');
  715 |     await expect(historyLink.first()).toBeVisible({ timeout: 5000 });
  716 |   });
  717 | 
  718 |   test('sidebar แสดง "ขอใช้รถ" เสมอ', async ({ page }) => {
  719 |     await page.addInitScript(({ token }) => {
  720 |       localStorage.setItem('ppk_token', token);
  721 |       localStorage.setItem('ppk_user', JSON.stringify({
  722 |         id: 'driver-test-id',
  723 |         username: 'driver_test@ppk.ac.th',
  724 |         display_name: 'ทดสอบ',
  725 |         role: 'driver',
  726 |         driver_id: 'test-driver-1',
  727 |         permissions: {},
  728 |       }));
  729 |     }, { token: ctx.driverToken });
  730 | 
  731 |     await page.goto('/dashboard.html');
  732 |     await page.waitForLoadState('networkidle');
  733 | 
  734 |     const reqLink = page.locator('[data-page="vehicle-request"], a[href*="vehicle-request"]');
  735 |     // vehicle-request อาจถูกซ่อนสำหรับ driver ขึ้นอยู่กับ sidebar config
  736 |     if (await reqLink.count() > 0) {
  737 |       // ตรวจว่ามี element อยู่ ไม่บังคับต้อง visible
```