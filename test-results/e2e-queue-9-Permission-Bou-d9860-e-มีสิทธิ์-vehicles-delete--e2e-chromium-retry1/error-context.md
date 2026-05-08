# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\queue.spec.mjs >> 9. Permission Boundaries — ขอบเขตสิทธิ์ >> queue recorder → POST /api/vehicles ได้ (vehicle role มีสิทธิ์ vehicles:delete)
- Location: tests\e2e\queue.spec.mjs:805:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  711 |   test('POST /:id/evaluate — ประเมินคิวที่ completed ได้', async () => {
  712 |     if (!ctx.queueIdForEval) return;
  713 |     const r = await apiPost(`/api/queue/${ctx.queueIdForEval}/evaluate`, {
  714 |       driver_behavior_score: 5,
  715 |       vehicle_condition_score: 4,
  716 |       punctuality_score: 5,
  717 |       overall_score: 5,
  718 |       problems: '',
  719 |       suggestions: 'ดีมาก',
  720 |     }, ctx.queueToken);
  721 |     expect(r?.success).toBe(true);
  722 |     expect(r?.data?.id).toBeTruthy();
  723 |   });
  724 | 
  725 |   test('ประเมินซ้ำ (duplicate) → error', async () => {
  726 |     if (!ctx.queueIdForEval) return;
  727 |     const r = await apiPost(`/api/queue/${ctx.queueIdForEval}/evaluate`, {
  728 |       overall_score: 3,
  729 |     }, ctx.queueToken);
  730 |     expect(r?.success).toBe(false);
  731 |     expect(r?.message || r?.error || '').toMatch(/ประเมิน.*แล้ว|already/i);
  732 |   });
  733 | 
  734 |   test('ประเมินคิวที่ยังไม่ completed → error', async () => {
  735 |     if (!ctx.queueId) return;
  736 |     // queueId ยังอยู่ใน scheduled
  737 |     const r = await apiPost(`/api/queue/${ctx.queueId}/evaluate`, {
  738 |       overall_score: 4,
  739 |     }, ctx.queueToken);
  740 |     expect(r?.success).toBe(false);
  741 |     expect(r?.message || r?.error || '').toMatch(/เสร็จสิ้น|completed/i);
  742 |   });
  743 | 
  744 |   test('GET /:id/evaluation — ดูผลประเมินได้', async () => {
  745 |     if (!ctx.queueIdForEval) return;
  746 |     const r = await apiGet(`/api/queue/${ctx.queueIdForEval}/evaluation`, ctx.queueToken);
  747 |     expect(r?.success).toBe(true);
  748 |     expect(Array.isArray(r?.data)).toBe(true);
  749 |     expect(r.data.length).toBeGreaterThan(0);
  750 |     // ตรวจ structure
  751 |     const ev = r.data[0];
  752 |     expect(ev).toHaveProperty('queue_id');
  753 |     expect(ev).toHaveProperty('overall_score');
  754 |     expect(ev).toHaveProperty('evaluator_name');
  755 |   });
  756 | });
  757 | 
  758 | // ══════════════════════════════════════════════════════════════
  759 | // 8. DELETE QUEUE — ลบคิว
  760 | // ══════════════════════════════════════════════════════════════
  761 | test.describe('8. DELETE /api/queue/:id — ลบคิว', () => {
  762 |   test('ลบคิวที่มีอยู่ได้', async () => {
  763 |     if (!ctx.queueIdForDelete) return;
  764 |     const r = await apiDelete(`/api/queue/${ctx.queueIdForDelete}`, ctx.queueToken);
  765 |     expect(r?.success).toBe(true);
  766 | 
  767 |     // ยืนยันว่าหายไปจริง
  768 |     const check = await apiGet(`/api/queue/${ctx.queueIdForDelete}`, ctx.queueToken);
  769 |     expect(check?.success).toBe(false);
  770 |   });
  771 | 
  772 |   test('ลบคิวที่ไม่มี → ไม่ error (idempotent)', async () => {
  773 |     const r = await apiDelete('/api/queue/non-existent-id-delete', ctx.queueToken);
  774 |     // อาจ success (DELETE idempotent) หรือ false ก็ได้
  775 |     expect(r).toBeTruthy();
  776 |   });
  777 | });
  778 | 
  779 | // ══════════════════════════════════════════════════════════════
  780 | // 9. PERMISSION BOUNDARIES — ขอบเขตสิทธิ์
  781 | // ══════════════════════════════════════════════════════════════
  782 | test.describe('9. Permission Boundaries — ขอบเขตสิทธิ์', () => {
  783 |   // ─── สิ่งที่ทำได้ ───
  784 |   test('queue recorder → GET /api/vehicles ได้ (view)', async () => {
  785 |     const r = await apiGet('/api/vehicles', ctx.queueToken);
  786 |     expect(r?.success).toBe(true);
  787 |   });
  788 | 
  789 |   test('queue recorder → GET /api/drivers ได้ (view)', async () => {
  790 |     const r = await apiGet('/api/drivers', ctx.queueToken);
  791 |     expect(r?.success).toBe(true);
  792 |   });
  793 | 
  794 |   test('queue recorder → GET /api/reports/dashboard ได้ (view)', async () => {
  795 |     const r = await apiGet('/api/reports/dashboard', ctx.queueToken);
  796 |     expect(r?.success).toBe(true);
  797 |   });
  798 | 
  799 |   test('queue recorder → GET /api/queue ได้ (queue:view)', async () => {
  800 |     const r = await apiGet('/api/queue', ctx.queueToken);
  801 |     expect(r?.success).toBe(true);
  802 |   });
  803 | 
  804 |   // ─── สิ่งที่ทำไม่ได้ ───
  805 |   test('queue recorder → POST /api/vehicles ได้ (vehicle role มีสิทธิ์ vehicles:delete)', async () => {
  806 |     // vehicle role มี vehicles:delete → ครอบคลุม create ได้ (delete > edit > create > view)
  807 |     const r = await apiPost('/api/vehicles', {
  808 |       license_plate: 'QTEST-ALLOWED', brand: 'Toyota', model: 'Hiace',
  809 |       fuel_type: 'diesel', status: 'active',
  810 |     }, ctx.queueToken);
> 811 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  812 |     // cleanup ถ้าสร้างสำเร็จ
  813 |     if (r?.data?.id) await apiDelete(`/api/vehicles/${r.data.id}`, ctx.queueToken);
  814 |   });
  815 | 
  816 |   test('queue recorder → POST /api/fuel/log ต้อง 403 (ไม่มีสิทธิ์ fuel)', async () => {
  817 |     if (!ctx.carId) return;
  818 |     const r = await apiPost('/api/fuel/log', {
  819 |       car_id: ctx.carId,
  820 |       date: new Date().toISOString().slice(0, 10),
  821 |       liters: 30, price_per_liter: 35,
  822 |     }, ctx.queueToken);
  823 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  824 |     expect([401, 403]).toContain(status);
  825 |   });
  826 | 
  827 |   test('queue recorder → POST /api/repair/log ได้ (ทุกคนแจ้งซ่อมได้ ไม่ต้องมีสิทธิ์ repair)', async () => {
  828 |     // API comment: "ทุกคนแจ้งซ่อมได้ (driver, repair, admin)" — ไม่มี permission guard
  829 |     if (!ctx.carId) return;
  830 |     const r = await apiPost('/api/repair/log', {
  831 |       car_id: ctx.carId,
  832 |       date: new Date().toISOString().slice(0, 10),
  833 |       issue_description: 'ทดสอบแจ้งซ่อม',
  834 |       cost: 1000,
  835 |     }, ctx.queueToken);
  836 |     expect(r?.success).toBe(true);
  837 |   });
  838 | 
  839 |   test('queue recorder → GET /api/admin/users ต้อง 403 (ไม่ใช่ admin)', async () => {
  840 |     const r = await apiGet('/api/admin/users', ctx.queueToken);
  841 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  842 |     expect([401, 403]).toContain(status);
  843 |   });
  844 | 
  845 |   test('queue recorder → GET /api/admin/audit-log ต้อง 403 (ไม่ใช่ admin)', async () => {
  846 |     // path ถูกต้องคือ /api/admin/audit-log ซึ่ง requireAdmin(user)
  847 |     const r = await apiGet('/api/admin/audit-log', ctx.queueToken);
  848 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  849 |     expect([401, 403]).toContain(status);
  850 |   });
  851 | 
  852 |   test('queue recorder → GET /api/backup ต้อง 403 (ไม่ใช่ admin)', async () => {
  853 |     const r = await apiGet('/api/backup', ctx.queueToken);
  854 |     const status = r?.status ?? (r?.success === false ? 403 : 200);
  855 |     expect([401, 403]).toContain(status);
  856 |   });
  857 | });
  858 | 
  859 | // ══════════════════════════════════════════════════════════════
  860 | // 10. UI — ทดสอบหน้า queue-manage.html ผ่าน browser
  861 | // ══════════════════════════════════════════════════════════════
  862 | test.describe('10. UI — queue-manage.html', () => {
  863 |   async function setQueueAuth(page) {
  864 |     await page.addInitScript(({ token, userId }) => {
  865 |       localStorage.setItem('ppk_token', token);
  866 |       localStorage.setItem('ppk_user', JSON.stringify({
  867 |         id: userId || 'queue-user-id',
  868 |         username: 'queue_recorder@ppk.ac.th',
  869 |         display_name: 'ผู้บันทึกคิว',
  870 |         role: 'vehicle',
  871 |         permissions: { vehicles: 'delete', drivers: 'view', queue: 'delete', reports: 'view' },
  872 |       }));
  873 |     }, { token: ctx.queueToken, userId: ctx.queueUserId });
  874 |   }
  875 | 
  876 |   test('queue-manage.html โหลดได้โดยไม่ redirect ไป login', async ({ page }) => {
  877 |     if (!ctx.queueToken) return test.skip();
  878 |     await setQueueAuth(page);
  879 |     await page.goto('/queue-manage.html');
  880 |     await page.waitForLoadState('networkidle');
  881 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 });
  882 |   });
  883 | 
  884 |   test('หน้าแสดง header "จัดคิว"', async ({ page }) => {
  885 |     if (!ctx.queueToken) return test.skip();
  886 |     await setQueueAuth(page);
  887 |     await page.goto('/queue-manage.html');
  888 |     await page.waitForLoadState('networkidle');
  889 |     const heading = await page.locator('h1').first().textContent().catch(() => '');
  890 |     expect(heading).toMatch(/คิว/);
  891 |   });
  892 | 
  893 |   test('ปฏิทินหรือตาราง queue แสดงผลได้', async ({ page }) => {
  894 |     if (!ctx.queueToken) return test.skip();
  895 |     await setQueueAuth(page);
  896 |     await page.goto('/queue-manage.html');
  897 |     await page.waitForLoadState('networkidle');
  898 |     // ตรวจว่ามี calendar grid หรือ container
  899 |     const calendar = page.locator('.calendar-grid, .calendar-container, #calendarGrid, [class*="calendar"]').first();
  900 |     await expect(calendar).toBeVisible({ timeout: 10000 });
  901 |   });
  902 | 
  903 |   test('ปุ่ม "สร้างคิวใหม่" หรือ "เพิ่มคิว" ปรากฏ (มีสิทธิ์ create)', async ({ page }) => {
  904 |     if (!ctx.queueToken) return test.skip();
  905 |     await setQueueAuth(page);
  906 |     await page.goto('/queue-manage.html');
  907 |     await page.waitForLoadState('networkidle');
  908 |     // ค้นหาปุ่มที่น่าจะเป็น "สร้างคิว" / "เพิ่มคิว"
  909 |     const btn = page.getByRole('button', { name: /สร้างคิว|เพิ่มคิว|จองคิว|คิวใหม่/i }).first();
  910 |     await expect(btn).toBeVisible({ timeout: 8000 });
  911 |   });
```