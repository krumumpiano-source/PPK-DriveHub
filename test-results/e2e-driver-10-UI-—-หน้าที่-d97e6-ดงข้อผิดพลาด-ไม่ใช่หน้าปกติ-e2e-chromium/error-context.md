# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\driver.spec.mjs >> 10. UI — หน้าที่พนักงานขับรถเข้าไม่ได้ (ต้องถูกจำกัด) >> จัดการพนักงานขับรถ (/drivers.html) — ถูก redirect หรือแสดงข้อผิดพลาด ไม่ใช่หน้าปกติ
- Location: tests\e2e\driver.spec.mjs:682:5

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
      - generic [ref=e17]:
        - generic [ref=e18] [cursor=pointer]:
          - generic [ref=e19]: 📅
          - generic [ref=e20]: คิวและการใช้รถ
          - generic [ref=e21]: ▼
        - generic:
          - link "📋 คิวและประวัติส่วนตัว" [ref=e22] [cursor=pointer]:
            - /url: driver-history.html
            - generic [ref=e23]: 📋
            - generic [ref=e24]: คิวและประวัติส่วนตัว
          - link "📱 สแกน QR Code" [ref=e25] [cursor=pointer]:
            - /url: qr-scan.html
            - generic [ref=e26]: 📱
            - generic [ref=e27]: สแกน QR Code
      - generic [ref=e28]:
        - generic [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: 🔧
          - generic [ref=e31]: ระบบซ่อมและตรวจสภาพ
          - generic [ref=e32]: ▼
        - generic:
          - link "🔧 แจ้งซ่อม" [ref=e33] [cursor=pointer]:
            - /url: repair.html
            - generic [ref=e34]: 🔧
            - generic [ref=e35]: แจ้งซ่อม
          - link "🚨 รายงานเหตุการณ์" [ref=e36] [cursor=pointer]:
            - /url: incident.html
            - generic [ref=e37]: 🚨
            - generic [ref=e38]: รายงานเหตุการณ์
      - generic [ref=e39]:
        - generic [ref=e40] [cursor=pointer]:
          - generic [ref=e41]: ⭐
          - generic [ref=e42]: ระบบประเมิน
          - generic [ref=e43]: ▼
        - generic:
          - link "📖 เกณฑ์และคำอธิบาย" [ref=e44] [cursor=pointer]:
            - /url: evaluation-guide.html
            - generic [ref=e45]: 📖
            - generic [ref=e46]: เกณฑ์และคำอธิบาย
          - link "📝 ประเมินโดยผู้ใช้บริการ" [ref=e47] [cursor=pointer]:
            - /url: evaluate-trip.html
            - generic [ref=e48]: 📝
            - generic [ref=e49]: ประเมินโดยผู้ใช้บริการ
          - link "⚖️ ประเมินโดยกรรมการ/สถิติ" [ref=e50] [cursor=pointer]:
            - /url: driver-performance.html
            - generic [ref=e51]: ⚖️
            - generic [ref=e52]: ประเมินโดยกรรมการ/สถิติ
          - link "📑 สรุปผลประเมินเสนอ ผอ." [ref=e53] [cursor=pointer]:
            - /url: print-executive-summary.html
            - generic [ref=e54]: 📑
            - generic [ref=e55]: สรุปผลประเมินเสนอ ผอ.
      - generic [ref=e56]:
        - generic [ref=e57] [cursor=pointer]:
          - generic [ref=e58]: 👤
          - generic [ref=e59]: ตั้งค่าส่วนตัว
          - generic [ref=e60]: ▼
        - generic:
          - link "👤 โปรไฟล์ของฉัน" [ref=e61] [cursor=pointer]:
            - /url: profile.html
            - generic [ref=e62]: 👤
            - generic [ref=e63]: โปรไฟล์ของฉัน
          - link "🔔 การแจ้งเตือน" [ref=e64] [cursor=pointer]:
            - /url: notifications.html
            - generic [ref=e65]: 🔔
            - generic [ref=e66]: การแจ้งเตือน
          - link "🔑 เปลี่ยนรหัสผ่าน" [ref=e67] [cursor=pointer]:
            - /url: change-password.html
            - generic [ref=e68]: 🔑
            - generic [ref=e69]: เปลี่ยนรหัสผ่าน
      - generic [ref=e70]:
        - generic [ref=e71] [cursor=pointer]:
          - generic [ref=e72]: ❓
          - generic [ref=e73]: ช่วยเหลือ
          - generic [ref=e74]: ▼
        - generic:
          - link "📖 วิธีใช้งาน" [ref=e75] [cursor=pointer]:
            - /url: user-guide.html
            - generic [ref=e76]: 📖
            - generic [ref=e77]: วิธีใช้งาน
          - link "📚 อภิธานศัพท์" [ref=e78] [cursor=pointer]:
            - /url: glossary.html
            - generic [ref=e79]: 📚
            - generic [ref=e80]: อภิธานศัพท์
      - link "🚪 ออกจากระบบ" [ref=e82] [cursor=pointer]:
        - /url: "#"
        - generic [ref=e83]: 🚪
        - generic [ref=e84]: ออกจากระบบ
  - generic [ref=e85]:
    - generic [ref=e86]:
      - generic [ref=e87]: 👤 ทะเบียนข้อมูลพนักงานขับรถ
      - generic [ref=e89]: D
    - generic [ref=e90]:
      - generic [ref=e91]:
        - heading "👤 ทะเบียนข้อมูลพนักงานขับรถ" [level=1] [ref=e92]
        - paragraph [ref=e93]: ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
      - generic [ref=e94]:
        - generic [ref=e95]:
          - button "🚗 พนักงานขับรถหลัก" [ref=e96] [cursor=pointer]
          - button "🚐 พนักงานขับรถสำรอง" [ref=e97] [cursor=pointer]
          - button "⚪ พนักงานพ้นสภาพ / ลาออก" [ref=e98] [cursor=pointer]
        - generic [ref=e99]:
          - button "➕ เพิ่มพนักงานขับรถใหม่" [ref=e100] [cursor=pointer]
          - button "🔃 รีเฟรช" [ref=e101] [cursor=pointer]
        - generic [ref=e102]: กำลังโหลดข้อมูล...
    - paragraph [ref=e104]: ออกแบบและพัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
```

# Test source

```ts
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
  651 | });
  652 | 
  653 | test.describe('10. UI — หน้าที่พนักงานขับรถเข้าไม่ได้ (ต้องถูกจำกัด)', () => {
  654 |   async function loginAsDriver(page) {
  655 |     await page.addInitScript(({ token, userId, driverId }) => {
  656 |       localStorage.setItem('ppk_token', token);
  657 |       localStorage.setItem('ppk_user', JSON.stringify({
  658 |         id: userId || 'driver-test-id',
  659 |         username: 'driver_test@ppk.ac.th',
  660 |         display_name: 'ทดสอบ พนักงานขับ',
  661 |         role: 'driver',
  662 |         driver_id: driverId || 'driver-rec-1',
  663 |         permissions: {},
  664 |       }));
  665 |     }, {
  666 |       token: ctx.driverToken,
  667 |       userId: ctx.driverUserId,
  668 |       driverId: ctx.driverRecordId,
  669 |     });
  670 |   }
  671 | 
  672 |   const restrictedPages = [
  673 |     { path: '/user-management.html', name: 'จัดการผู้ใช้' },
  674 |     { path: '/admin-settings.html',  name: 'ตั้งค่าระบบ' },
  675 |     { path: '/audit-log.html',       name: 'บันทึกกิจกรรม' },
  676 |     { path: '/backup-recovery.html', name: 'สำรอง/กู้คืน' },
  677 |     // vehicles.html ไม่ redirect ตาม design ของแอป (แสดงหน้าได้แต่ไม่มีข้อมูล)
  678 |     { path: '/drivers.html',         name: 'จัดการพนักงานขับรถ' },
  679 |   ];
  680 | 
  681 |   for (const { path, name } of restrictedPages) {
  682 |     test(`${name} (${path}) — ถูก redirect หรือแสดงข้อผิดพลาด ไม่ใช่หน้าปกติ`, async ({ page }) => {
  683 |       await loginAsDriver(page);
  684 |       await page.goto(path);
  685 |       await page.waitForLoadState('networkidle');
  686 | 
  687 |       // หน้าต้อง redirect ออก หรือแสดง alert ไม่มีสิทธิ์
  688 |       // admin pages จะ redirect ไป dashboard.html
  689 |       const currentUrl = page.url();
  690 |       const isRedirected = currentUrl.includes('dashboard') || currentUrl.includes('login');
  691 | 
  692 |       // หรือหน้ายังอยู่แต่แสดง error/empty content
  693 |       const hasAccessDenied = await page.locator(
  694 |         'text=/ไม่มีสิทธิ์|Access Denied|Unauthorized|403/'
  695 |       ).isVisible({ timeout: 3000 }).catch(() => false);
  696 | 
> 697 |       expect(isRedirected || hasAccessDenied).toBe(true);
      |                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  698 |     });
  699 |   }
  700 | });
  701 | 
  702 | // ══════════════════════════════════════════════════════════════
  703 | // 11. UI Sidebar — ตรวจสอบ Navigation Menu
  704 | // ══════════════════════════════════════════════════════════════
  705 | test.describe('11. UI Sidebar — เมนู Navigation ของพนักงานขับรถ', () => {
  706 |   test('sidebar แสดง "คิวและประวัติส่วนตัว" เมื่อมี driver_id', async ({ page }) => {
  707 |     await page.addInitScript(({ token, driverId }) => {
  708 |       localStorage.setItem('ppk_token', token);
  709 |       localStorage.setItem('ppk_user', JSON.stringify({
  710 |         id: 'driver-test-id',
  711 |         username: 'driver_test@ppk.ac.th',
  712 |         display_name: 'ทดสอบ พนักงานขับ',
  713 |         role: 'driver',
  714 |         driver_id: driverId || 'driver-rec-1',
  715 |         permissions: {},
  716 |       }));
  717 |     }, { token: ctx.driverToken, driverId: ctx.driverRecordId });
  718 | 
  719 |     await page.goto('/dashboard.html');
  720 |     await page.waitForLoadState('networkidle');
  721 | 
  722 |     // หา sidebar item สำหรับ driver-history
  723 |     const historyLink = page.locator('[data-page="driver-history"], a[href*="driver-history"]');
  724 |     await expect(historyLink.first()).toBeVisible({ timeout: 5000 });
  725 |   });
  726 | 
  727 |   test('sidebar แสดง "ขอใช้รถ" เสมอ', async ({ page }) => {
  728 |     await page.addInitScript(({ token }) => {
  729 |       localStorage.setItem('ppk_token', token);
  730 |       localStorage.setItem('ppk_user', JSON.stringify({
  731 |         id: 'driver-test-id',
  732 |         username: 'driver_test@ppk.ac.th',
  733 |         display_name: 'ทดสอบ',
  734 |         role: 'driver',
  735 |         driver_id: 'test-driver-1',
  736 |         permissions: {},
  737 |       }));
  738 |     }, { token: ctx.driverToken });
  739 | 
  740 |     await page.goto('/dashboard.html');
  741 |     await page.waitForLoadState('networkidle');
  742 | 
  743 |     const reqLink = page.locator('[data-page="vehicle-request"], a[href*="vehicle-request"]');
  744 |     // vehicle-request อาจถูกซ่อนสำหรับ driver ขึ้นอยู่กับ sidebar config
  745 |     if (await reqLink.count() > 0) {
  746 |       // ตรวจว่ามี element อยู่ ไม่บังคับต้อง visible
  747 |       expect(await reqLink.count()).toBeGreaterThan(0);
  748 |     }
  749 |   });
  750 | 
  751 |   test('sidebar ไม่แสดงเมนู "จัดการผู้ใช้" ให้พนักงานขับรถ', async ({ page }) => {
  752 |     await page.addInitScript(({ token }) => {
  753 |       localStorage.setItem('ppk_token', token);
  754 |       localStorage.setItem('ppk_user', JSON.stringify({
  755 |         id: 'driver-test-id',
  756 |         username: 'driver_test@ppk.ac.th',
  757 |         display_name: 'ทดสอบ',
  758 |         role: 'driver',
  759 |         permissions: {},
  760 |       }));
  761 |     }, { token: ctx.driverToken });
  762 | 
  763 |     await page.goto('/dashboard.html');
  764 |     await page.waitForLoadState('networkidle');
  765 | 
  766 |     const adminLink = page.locator('[data-page="user-management"], a[href*="user-management"]');
  767 |     await expect(adminLink.first()).not.toBeVisible({ timeout: 3000 });
  768 |   });
  769 | 
  770 |   test('sidebar ไม่แสดงเมนูผู้ดูแลระบบ (admin section) ให้พนักงานขับรถ', async ({ page }) => {
  771 |     await page.addInitScript(({ token }) => {
  772 |       localStorage.setItem('ppk_token', token);
  773 |       localStorage.setItem('ppk_user', JSON.stringify({
  774 |         id: 'driver-test-id',
  775 |         username: 'driver_test@ppk.ac.th',
  776 |         display_name: 'ทดสอบ',
  777 |         role: 'driver',
  778 |         permissions: {},
  779 |       }));
  780 |     }, { token: ctx.driverToken });
  781 | 
  782 |     await page.goto('/dashboard.html');
  783 |     await page.waitForLoadState('networkidle');
  784 | 
  785 |     const auditLink = page.locator('[data-page="audit-log"], a[href*="audit-log"]');
  786 |     await expect(auditLink.first()).not.toBeVisible({ timeout: 3000 });
  787 |   });
  788 | });
  789 | 
  790 | // ══════════════════════════════════════════════════════════════
  791 | // 12. QR Code — สแกน QR
  792 | // ══════════════════════════════════════════════════════════════
  793 | test.describe('12. QR Code — การสแกน QR Code', () => {
  794 |   test('เข้าหน้า qr-scan.html ได้โดยไม่ต้อง login', async ({ page }) => {
  795 |     // QR pages รองรับการเข้าถึงโดยไม่ต้อง login
  796 |     await page.goto('/qr-scan.html');
  797 |     await page.waitForLoadState('networkidle');
```