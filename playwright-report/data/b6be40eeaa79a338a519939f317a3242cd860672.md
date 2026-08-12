# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\queue.spec.mjs >> 9. Permission Boundaries — ขอบเขตสิทธิ์ >> queue recorder → POST /api/vehicles ได้ (vehicle role มีสิทธิ์ vehicles:delete)
- Location: tests\e2e\queue.spec.mjs:806:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  712 |   test('POST /:id/evaluate — ประเมินคิวที่ completed ได้', async () => {
  713 |     if (!ctx.queueIdForEval) return;
  714 |     const r = await apiPost(`/api/queue/${ctx.queueIdForEval}/evaluate`, {
  715 |       driver_behavior_score: 5,
  716 |       vehicle_condition_score: 4,
  717 |       punctuality_score: 5,
  718 |       overall_score: 5,
  719 |       problems: '',
  720 |       suggestions: 'ดีมาก',
  721 |     }, ctx.queueToken);
  722 |     expect(r?.success).toBe(true);
  723 |     expect(r?.data?.id).toBeTruthy();
  724 |   });
  725 | 
  726 |   test('ประเมินซ้ำ (duplicate) → error', async () => {
  727 |     if (!ctx.queueIdForEval) return;
  728 |     const r = await apiPost(`/api/queue/${ctx.queueIdForEval}/evaluate`, {
  729 |       overall_score: 3,
  730 |     }, ctx.queueToken);
  731 |     expect(r?.success).toBe(false);
  732 |     expect(r?.message || r?.error || '').toMatch(/ประเมิน.*แล้ว|already/i);
  733 |   });
  734 | 
  735 |   test('ประเมินคิวที่ยังไม่ completed → error', async () => {
  736 |     if (!ctx.queueId) return;
  737 |     // queueId ยังอยู่ใน scheduled
  738 |     const r = await apiPost(`/api/queue/${ctx.queueId}/evaluate`, {
  739 |       overall_score: 4,
  740 |     }, ctx.queueToken);
  741 |     expect(r?.success).toBe(false);
  742 |     expect(r?.message || r?.error || '').toMatch(/เสร็จสิ้น|completed/i);
  743 |   });
  744 | 
  745 |   test('GET /:id/evaluation — ดูผลประเมินได้', async () => {
  746 |     if (!ctx.queueIdForEval) return;
  747 |     const r = await apiGet(`/api/queue/${ctx.queueIdForEval}/evaluation`, ctx.queueToken);
  748 |     expect(r?.success).toBe(true);
  749 |     expect(Array.isArray(r?.data)).toBe(true);
  750 |     expect(r.data.length).toBeGreaterThan(0);
  751 |     // ตรวจ structure
  752 |     const ev = r.data[0];
  753 |     expect(ev).toHaveProperty('queue_id');
  754 |     expect(ev).toHaveProperty('overall_score');
  755 |     expect(ev).toHaveProperty('evaluator_name');
  756 |   });
  757 | });
  758 | 
  759 | // ══════════════════════════════════════════════════════════════
  760 | // 8. DELETE QUEUE — ลบคิว
  761 | // ══════════════════════════════════════════════════════════════
  762 | test.describe('8. DELETE /api/queue/:id — ลบคิว', () => {
  763 |   test('ลบคิวที่มีอยู่ได้', async () => {
  764 |     if (!ctx.queueIdForDelete) return;
  765 |     const r = await apiDelete(`/api/queue/${ctx.queueIdForDelete}`, ctx.queueToken);
  766 |     expect(r?.success).toBe(true);
  767 | 
  768 |     // ยืนยันว่าหายไปจริง
  769 |     const check = await apiGet(`/api/queue/${ctx.queueIdForDelete}`, ctx.queueToken);
  770 |     expect(check?.success).toBe(false);
  771 |   });
  772 | 
  773 |   test('ลบคิวที่ไม่มี → ไม่ error (idempotent)', async () => {
  774 |     const r = await apiDelete('/api/queue/non-existent-id-delete', ctx.queueToken);
  775 |     // อาจ success (DELETE idempotent) หรือ false ก็ได้
  776 |     expect(r).toBeTruthy();
  777 |   });
  778 | });
  779 | 
  780 | // ══════════════════════════════════════════════════════════════
  781 | // 9. PERMISSION BOUNDARIES — ขอบเขตสิทธิ์
  782 | // ══════════════════════════════════════════════════════════════
  783 | test.describe('9. Permission Boundaries — ขอบเขตสิทธิ์', () => {
  784 |   // ─── สิ่งที่ทำได้ ───
  785 |   test('queue recorder → GET /api/vehicles ได้ (view)', async () => {
  786 |     const r = await apiGet('/api/vehicles', ctx.queueToken);
  787 |     expect(r?.success).toBe(true);
  788 |   });
  789 | 
  790 |   test('queue recorder → GET /api/drivers ได้ (view)', async () => {
  791 |     const r = await apiGet('/api/drivers', ctx.queueToken);
  792 |     expect(r?.success).toBe(true);
  793 |   });
  794 | 
  795 |   test('queue recorder → GET /api/reports/dashboard ได้ (view)', async () => {
  796 |     const r = await apiGet('/api/reports/dashboard', ctx.queueToken);
  797 |     expect(r?.success).toBe(true);
  798 |   });
  799 | 
  800 |   test('queue recorder → GET /api/queue ได้ (queue:view)', async () => {
  801 |     const r = await apiGet('/api/queue', ctx.queueToken);
  802 |     expect(r?.success).toBe(true);
  803 |   });
  804 | 
  805 |   // ─── สิ่งที่ทำไม่ได้ ───
  806 |   test('queue recorder → POST /api/vehicles ได้ (vehicle role มีสิทธิ์ vehicles:delete)', async () => {
  807 |     // vehicle role มี vehicles:delete → ครอบคลุม create ได้ (delete > edit > create > view)
  808 |     const r = await apiPost('/api/vehicles', {
  809 |       license_plate: 'QTEST-ALLOWED', brand: 'Toyota', model: 'Hiace',
  810 |       fuel_type: 'diesel', status: 'active',
  811 |     }, ctx.queueToken);
> 812 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  813 |     // cleanup ถ้าสร้างสำเร็จ
  814 |     if (r?.data?.id) await apiDelete(`/api/vehicles/${r.data.id}`, ctx.queueToken);
  815 |   });
  816 | 
  817 |   test('queue recorder → POST /api/fuel/log ต้อง 403 (ไม่มีสิทธิ์ fuel)', async () => {
  818 |     if (!ctx.carId) return;
  819 |     const r = await apiPost('/api/fuel/log', {
  820 |       car_id: ctx.carId,
  821 |       date: new Date().toISOString().slice(0, 10),
  822 |       liters: 30, price_per_liter: 35,
  823 |     }, ctx.queueToken);
  824 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  825 |     expect([401, 403]).toContain(status);
  826 |   });
  827 | 
  828 |   test('queue recorder → POST /api/repair/log ได้ (ทุกคนแจ้งซ่อมได้ ไม่ต้องมีสิทธิ์ repair)', async () => {
  829 |     // API comment: "ทุกคนแจ้งซ่อมได้ (driver, repair, admin)" — ไม่มี permission guard
  830 |     if (!ctx.carId) return;
  831 |     const r = await apiPost('/api/repair/log', {
  832 |       car_id: ctx.carId,
  833 |       date: new Date().toISOString().slice(0, 10),
  834 |       issue_description: 'ทดสอบแจ้งซ่อม',
  835 |       cost: 1000,
  836 |     }, ctx.queueToken);
  837 |     expect(r?.success).toBe(true);
  838 |   });
  839 | 
  840 |   test('queue recorder → GET /api/admin/users ต้อง 403 (ไม่ใช่ admin)', async () => {
  841 |     const r = await apiGet('/api/admin/users', ctx.queueToken);
  842 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  843 |     expect([401, 403]).toContain(status);
  844 |   });
  845 | 
  846 |   test('queue recorder → GET /api/admin/audit-log ต้อง 403 (ไม่ใช่ admin)', async () => {
  847 |     // path ถูกต้องคือ /api/admin/audit-log ซึ่ง requireAdmin(user)
  848 |     const r = await apiGet('/api/admin/audit-log', ctx.queueToken);
  849 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  850 |     expect([401, 403]).toContain(status);
  851 |   });
  852 | 
  853 |   test('queue recorder → GET /api/backup ต้อง 403 (ไม่ใช่ admin)', async () => {
  854 |     const r = await apiGet('/api/backup', ctx.queueToken);
  855 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  856 |     expect([401, 403]).toContain(status);
  857 |   });
  858 | });
  859 | 
  860 | // ══════════════════════════════════════════════════════════════
  861 | // 10. UI — ทดสอบหน้า queue-manage.html ผ่าน browser
  862 | // ══════════════════════════════════════════════════════════════
  863 | test.describe('10. UI — queue-manage.html', () => {
  864 |   async function setQueueAuth(page) {
  865 |     await page.addInitScript(({ token, userId }) => {
  866 |       localStorage.setItem('ppk_token', token);
  867 |       localStorage.setItem('ppk_user', JSON.stringify({
  868 |         id: userId || 'queue-user-id',
  869 |         username: 'queue_recorder@ppk.ac.th',
  870 |         display_name: 'ผู้บันทึกคิว',
  871 |         role: 'vehicle',
  872 |         permissions: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
  873 |       }));
  874 |     }, { token: ctx.queueToken, userId: ctx.queueUserId });
  875 |   }
  876 | 
  877 |   test('queue-manage.html โหลดได้โดยไม่ redirect ไป login', async ({ page }) => {
  878 |     if (!ctx.queueToken) return test.skip();
  879 |     await setQueueAuth(page);
  880 |     await page.goto('/queue-manage.html');
  881 |     await page.waitForLoadState('networkidle');
  882 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 });
  883 |   });
  884 | 
  885 |   test('หน้าแสดง header "จัดคิว"', async ({ page }) => {
  886 |     if (!ctx.queueToken) return test.skip();
  887 |     await setQueueAuth(page);
  888 |     await page.goto('/queue-manage.html');
  889 |     await page.waitForLoadState('networkidle');
  890 |     const heading = await page.locator('h1').first().textContent().catch(() => '');
  891 |     expect(heading).toMatch(/คิว/);
  892 |   });
  893 | 
  894 |   test('ปฏิทินหรือตาราง queue แสดงผลได้', async ({ page }) => {
  895 |     if (!ctx.queueToken) return test.skip();
  896 |     await setQueueAuth(page);
  897 |     await page.goto('/queue-manage.html');
  898 |     await page.waitForLoadState('networkidle');
  899 |     // ตรวจว่ามี calendar grid หรือ container
  900 |     const calendar = page.locator('.calendar-grid, .calendar-container, #calendarGrid, [class*="calendar"]').first();
  901 |     await expect(calendar).toBeVisible({ timeout: 10000 });
  902 |   });
  903 | 
  904 |   test('ปุ่ม "สร้างคิวใหม่" หรือ "เพิ่มคิว" ปรากฏ (มีสิทธิ์ create)', async ({ page }) => {
  905 |     if (!ctx.queueToken) return test.skip();
  906 |     await setQueueAuth(page);
  907 |     await page.goto('/queue-manage.html');
  908 |     await page.waitForLoadState('networkidle');
  909 |     // ค้นหาปุ่มที่น่าจะเป็น "สร้างคิว" / "เพิ่มคิว"
  910 |     const btn = page.getByRole('button', { name: /สร้างคิว|เพิ่มคิว|จองคิว|คิวใหม่/i }).first();
  911 |     await expect(btn).toBeVisible({ timeout: 8000 });
  912 |   });
```