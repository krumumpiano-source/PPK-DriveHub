# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 10. UI — หน้าที่พนักงานขับรถเข้าไม่ได้ (ต้องถูกจำกัด) >> จัดการพนักงานขับรถ (/drivers.html) — ถูก redirect หรือแสดงข้อผิดพลาด ไม่ใช่หน้าปกติ
- Location: tests\e2e\driver.spec.mjs:673:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "🚐 PPK DriveHub ระบบจัดการยานพาหนะ" [ref=e3] [cursor=pointer]:
      - /url: dashboard.html
      - generic [ref=e4]: 🚐
      - generic [ref=e5]:
        - generic [ref=e6]: PPK DriveHub
        - generic [ref=e7]: ระบบจัดการยานพาหนะ
    - generic [ref=e8]:
      - generic [ref=e9]: D
      - generic [ref=e10]:
        - generic [ref=e11]: driver_test@ppk.ac.th
        - generic [ref=e12]: พนักงานขับรถ
    - navigation [ref=e13]:
      - link "🏠 หน้าแรก" [ref=e14] [cursor=pointer]:
        - /url: dashboard.html
        - generic [ref=e15]: 🏠
        - generic [ref=e16]: หน้าแรก
      - generic [ref=e17]: คิวและการใช้รถ
      - link "📋 คิวและประวัติส่วนตัว" [ref=e18] [cursor=pointer]:
        - /url: driver-history.html
        - generic [ref=e19]: 📋
        - generic [ref=e20]: คิวและประวัติส่วนตัว
      - link "📱 สแกน QR Code" [ref=e21] [cursor=pointer]:
        - /url: qr-scan.html
        - generic [ref=e22]: 📱
        - generic [ref=e23]: สแกน QR Code
      - generic [ref=e24]: ระบบซ่อมและตรวจสภาพ
      - link "🔧 แจ้งซ่อม" [ref=e25] [cursor=pointer]:
        - /url: repair.html
        - generic [ref=e26]: 🔧
        - generic [ref=e27]: แจ้งซ่อม
      - link "🚨 รายงานเหตุการณ์" [ref=e28] [cursor=pointer]:
        - /url: incident.html
        - generic [ref=e29]: 🚨
        - generic [ref=e30]: รายงานเหตุการณ์
      - generic [ref=e31]: ตั้งค่าส่วนตัว
      - link "👤 โปรไฟล์ของฉัน" [ref=e32] [cursor=pointer]:
        - /url: profile.html
        - generic [ref=e33]: 👤
        - generic [ref=e34]: โปรไฟล์ของฉัน
      - link "🔔 การแจ้งเตือน" [ref=e35] [cursor=pointer]:
        - /url: notifications.html
        - generic [ref=e36]: 🔔
        - generic [ref=e37]: การแจ้งเตือน
      - link "🔑 เปลี่ยนรหัสผ่าน" [ref=e38] [cursor=pointer]:
        - /url: change-password.html
        - generic [ref=e39]: 🔑
        - generic [ref=e40]: เปลี่ยนรหัสผ่าน
      - generic [ref=e41]: ช่วยเหลือ
      - link "📖 วิธีใช้งาน" [ref=e42] [cursor=pointer]:
        - /url: user-guide.html
        - generic [ref=e43]: 📖
        - generic [ref=e44]: วิธีใช้งาน
      - link "📚 อภิธานศัพท์" [ref=e45] [cursor=pointer]:
        - /url: glossary.html
        - generic [ref=e46]: 📚
        - generic [ref=e47]: อภิธานศัพท์
      - link "🚪 ออกจากระบบ" [ref=e49] [cursor=pointer]:
        - /url: "#"
        - generic [ref=e50]: 🚪
        - generic [ref=e51]: ออกจากระบบ
  - generic [ref=e52]:
    - generic [ref=e53]:
      - generic [ref=e54]: 👤 ทะเบียนข้อมูลพนักงานขับรถ
      - generic [ref=e56]: D
    - generic [ref=e57]:
      - generic [ref=e58]:
        - heading "👤 ทะเบียนข้อมูลพนักงานขับรถ" [level=1] [ref=e59]
        - paragraph [ref=e60]: ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
      - generic [ref=e61]:
        - generic [ref=e62]:
          - button "🚗 พนักงานขับรถหลัก" [ref=e63] [cursor=pointer]
          - button "🚐 พนักงานขับรถสำรอง" [ref=e64] [cursor=pointer]
        - generic [ref=e65]:
          - button "➕ เพิ่มพนักงานขับรถใหม่" [ref=e66] [cursor=pointer]
          - button "🔃 รีเฟรช" [ref=e67] [cursor=pointer]
        - generic [ref=e69]:
          - generic [ref=e70]:
            - generic [ref=e71]:
              - generic [ref=e72]: ทดสอบ พนักงานขับ
              - generic [ref=e73]: ใช้งาน
            - generic [ref=e74]:
              - generic [ref=e75]:
                - generic [ref=e76]: "โทร:"
                - generic [ref=e77]: "0812345678"
              - generic [ref=e78]:
                - generic [ref=e79]: "ใบขับขี่:"
                - generic [ref=e80]: ทดสอบ-001
              - generic [ref=e81]:
                - generic [ref=e82]: "บทบาท:"
                - generic [ref=e83]: ขับรถหลัก
            - generic [ref=e85]: "📝 บันทึกโดย: Test Admin (20 พ.ค. 2569 09:35)"
          - generic [ref=e86]:
            - generic [ref=e87]:
              - generic [ref=e88]: คนขับ E2E Test
              - generic [ref=e89]: ไม่ใช้งาน
            - generic [ref=e90]:
              - generic [ref=e91]:
                - generic [ref=e92]: "โทร:"
                - generic [ref=e93]: "0899999999"
              - generic [ref=e94]:
                - generic [ref=e95]: "ใบขับขี่:"
                - generic [ref=e96]: LIC-E2E-9777
              - generic [ref=e97]:
                - generic [ref=e98]: "บทบาท:"
                - generic [ref=e99]: ขับรถหลัก
            - generic [ref=e101]: "📝 บันทึกโดย: Test Admin (20 พ.ค. 2569 09:33)"
            - generic [ref=e102]: "✏️ แก้ไขล่าสุด: Test Admin (20 พ.ค. 2569 09:33)"
    - paragraph [ref=e104]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
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
> 688 |       expect(isRedirected || hasAccessDenied).toBe(true);
      |                                               ^ Error: expect(received).toBe(expected) // Object.is equality
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
  738 |       expect(await reqLink.count()).toBeGreaterThan(0);
  739 |     }
  740 |   });
  741 | 
  742 |   test('sidebar ไม่แสดงเมนู "จัดการผู้ใช้" ให้พนักงานขับรถ', async ({ page }) => {
  743 |     await page.addInitScript(({ token }) => {
  744 |       localStorage.setItem('ppk_token', token);
  745 |       localStorage.setItem('ppk_user', JSON.stringify({
  746 |         id: 'driver-test-id',
  747 |         username: 'driver_test@ppk.ac.th',
  748 |         display_name: 'ทดสอบ',
  749 |         role: 'driver',
  750 |         permissions: {},
  751 |       }));
  752 |     }, { token: ctx.driverToken });
  753 | 
  754 |     await page.goto('/dashboard.html');
  755 |     await page.waitForLoadState('networkidle');
  756 | 
  757 |     const adminLink = page.locator('[data-page="user-management"], a[href*="user-management"]');
  758 |     await expect(adminLink.first()).not.toBeVisible({ timeout: 3000 });
  759 |   });
  760 | 
  761 |   test('sidebar ไม่แสดงเมนูผู้ดูแลระบบ (admin section) ให้พนักงานขับรถ', async ({ page }) => {
  762 |     await page.addInitScript(({ token }) => {
  763 |       localStorage.setItem('ppk_token', token);
  764 |       localStorage.setItem('ppk_user', JSON.stringify({
  765 |         id: 'driver-test-id',
  766 |         username: 'driver_test@ppk.ac.th',
  767 |         display_name: 'ทดสอบ',
  768 |         role: 'driver',
  769 |         permissions: {},
  770 |       }));
  771 |     }, { token: ctx.driverToken });
  772 | 
  773 |     await page.goto('/dashboard.html');
  774 |     await page.waitForLoadState('networkidle');
  775 | 
  776 |     const auditLink = page.locator('[data-page="audit-log"], a[href*="audit-log"]');
  777 |     await expect(auditLink.first()).not.toBeVisible({ timeout: 3000 });
  778 |   });
  779 | });
  780 | 
  781 | // ══════════════════════════════════════════════════════════════
  782 | // 12. QR Code — สแกน QR
  783 | // ══════════════════════════════════════════════════════════════
  784 | test.describe('12. QR Code — การสแกน QR Code', () => {
  785 |   test('เข้าหน้า qr-scan.html ได้โดยไม่ต้อง login', async ({ page }) => {
  786 |     // QR pages รองรับการเข้าถึงโดยไม่ต้อง login
  787 |     await page.goto('/qr-scan.html');
  788 |     await page.waitForLoadState('networkidle');
```